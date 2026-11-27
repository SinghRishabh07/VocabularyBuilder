/**
 * Dictionary-backed analyzer (no AI key required).
 *
 * 1. Tokenize, drop proper nouns / basic words / transparent derivations.
 * 2. Group inflections ("mitigate", "mitigating") under one entry.
 * 3. Rank candidates by learning value (morphology, rarity cues) — not raw length.
 * 4. Verify each against the dictionary and resolve its base form.
 * 5. Pick the sense that best fits the sentence: part-of-speech cues from the
 *    surrounding words + gloss overlap with the sentence (simplified Lesk).
 */
import type { DictEntry } from "$lib/types";
import type { AnalyzedWord, PosKey } from "$lib/types";
import { lookupWord } from "$lib/server/dictionary";
import {
	baseFormCandidates,
	contentStems,
	groupKey,
	isCommon,
	isDerivedFromCommon,
	type Token,
} from "./text";

const VALID_POS: PosKey[] = ["noun", "verb", "adjective", "adverb"];

type Candidate = {
	key: string;
	tokens: Token[];
	score: number;
};

const ADVANCED_SUFFIX =
	/(ous|ious|eous|uous|ize|ise|ify|ate|ity|ism|ive|esque|ence|ance|ency|ancy|tude|cious|tious|ology|ial|ient|uent|ile|ine|ic|ical|ary|ory|ure|ent|ant|ible|able|ae|um|us)$/;
const ADVANCED_PREFIX = /^(circum|ambi|bene|mal|omni|pseudo|quasi|retro|ante|anti|contra|counter|inter|intra|trans|sub|super|hyper|hypo|ob|per|pro)/;

const NOUN_CUES = new Set(["the", "a", "an", "this", "that", "these", "those", "his", "her", "their", "its", "our", "my", "your", "of", "some", "any", "no", "every", "each"]);
const VERB_CUES = new Set(["to", "will", "would", "can", "could", "should", "may", "might", "must", "shall", "did", "does", "do", "don't", "didn't", "not", "they", "we", "i", "you", "he", "she", "who"]);
const ADJ_CUES = new Set(["very", "so", "too", "more", "most", "quite", "rather", "extremely", "highly", "is", "are", "was", "were", "be", "been", "seem", "seems", "seemed", "become", "becomes", "became", "remain", "remains", "remained", "less", "least", "increasingly", "deeply"]);

/** Words that can't be the noun an adjective modifies */
const FUNCTION_WORDS = new Set([
	"of", "to", "in", "on", "at", "by", "for", "with", "from", "and", "or", "but", "is", "are",
	"was", "were", "be", "been", "has", "have", "had", "that", "which", "who", "as", "than",
	"will", "would", "can", "could", "should", "may", "might", "must", "did", "does", "do",
]);

/** Drop dictionary usage labels such as "(modal)" or "(by extension)". */
function cleanDefinition(d: string): string {
	return d.replace(/^(\s*\([^)]{1,40}\)\s*)+/, "").trim();
}

function learningValueScore(w: string, count: number): number {
	let s = 1;
	s += Math.min(Math.max(w.length - 5, 0), 4) * 0.06; // very mild — length is not value
	if (ADVANCED_SUFFIX.test(w)) s += 0.6;
	if (w.length > 7 && ADVANCED_PREFIX.test(w)) s += 0.3;
	if (/(ph|ps|pt|gn|rh|xy|y[^aeiou])/.test(w)) s += 0.2; // Greek/Latinate spelling cues
	if (count > 1) s += 0.2; // repeated words matter to the text
	return s;
}

function guessPos(token: Token): PosKey[] {
	const w = token.lower;
	const prev = token.prev;
	const order: PosKey[] = [];
	const add = (p: PosKey) => {
		if (!order.includes(p)) order.push(p);
	};
	if (w.endsWith("ly") && !w.endsWith("ily") && w.length > 5) add("adverb");
	// "had been tempered", "was exacerbated", "has plagued" → passive / perfect verb
	if (w.endsWith("ed") && prev && /^(been|was|were|is|are|be|being|has|have|had|get|got)$/.test(prev)) {
		add("verb");
	}
	if (prev && ADJ_CUES.has(prev)) add("adjective");
	if (prev && VERB_CUES.has(prev)) add("verb");
	if (prev && NOUN_CUES.has(prev)) {
		// "the wry observer": determiner + word + another content word → adjective
		const next = token.next;
		if (next && !FUNCTION_WORDS.has(next) && !/(ly)$/.test(next)) {
			add("adjective");
			add("noun");
		} else {
			add("noun");
			add("adjective");
		}
	}
	// Plural-looking word not right after a pronoun ("dwindling provisions") → noun
	if (/[^su]s$/.test(w) && !(prev && /^(he|she|it|who|that|which)$/.test(prev))) add("noun");
	if (w.endsWith("ed") || w.endsWith("ing")) {
		add("verb");
		add("adjective");
	}
	if (/(ous|ive|ful|less|able|ible|ic|al|ent|ant)$/.test(w)) add("adjective");
	if (/(tion|sion|ment|ness|ity|ism|ance|ence|tude|ure)$/.test(w)) add("noun");
	if (/(ize|ise|ify|ate)$/.test(w)) add("verb");
	return order;
}

type Sense = { pos: PosKey; definition: string; example?: string; score: number };

function pickSense(
	entries: DictEntry[],
	tokens: Token[],
	sentences: string[],
	surfaceEntries: DictEntry[] = [],
): Sense | null {
	const posPrefs = guessPos(tokens[0]!);
	// Score against the first occurrence's sentence — that's the one shown to the user,
	// and a word repeated later may be used in a different sense
	const context = contentStems(sentences[tokens[0]!.sentenceIndex] ?? "");
	const selfKey = groupKey(tokens[0]!.lower);
	context.delete(selfKey);

	let best: Sense | null = null;
	const surfaceSet = new Set(surfaceEntries);
	for (const entry of [...surfaceEntries, ...entries]) {
		// Senses listed under the exact inflected form are more specific to this usage
		const formBonus = surfaceSet.has(entry) ? 0.75 : 0;
		for (const meaning of entry.meanings) {
			const pos = meaning.partOfSpeech?.toLowerCase() as PosKey;
			const posOk = VALID_POS.includes(pos);
			const prefIdx = posPrefs.indexOf(pos);
			for (const [rank, d] of meaning.definitions.entries()) {
				if (!d.definition) continue;
				const gloss = contentStems(`${d.definition} ${d.example ?? ""}`);
				let overlap = 0;
				for (const [g, wt] of gloss) {
					const c = context.get(g);
					if (c !== undefined) overlap += Math.min(wt, c);
				}
				const score =
					overlap + // rarity-weighted context overlap (simplified Lesk)
					(prefIdx === -1 ? 0 : 2 - prefIdx * 0.5) +
					1.5 / (rank + 1) + // dictionaries list the most common sense first
					(posOk ? 0.5 : -3) +
					formBonus;
				if (!best || score > best.score) {
					best = {
						pos: posOk ? pos : "noun",
						definition: cleanDefinition(d.definition) || d.definition,
						example: d.example,
						score,
					};
				}
			}
		}
	}
	return best;
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
	const results: R[] = new Array(items.length);
	let next = 0;
	async function worker() {
		while (next < items.length) {
			const i = next++;
			results[i] = await fn(items[i]!);
		}
	}
	await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
	return results;
}

/**
 * Resolve the dictionary base form (prefer an existing base form, else the
 * surface form). When the inflected form has its own entry ("provisions" =
 * supplies), its senses are kept too — they're often the meaning in context.
 */
async function resolveEntry(
	surface: string,
	fetchFn: typeof fetch,
): Promise<{ lemma: string; entries: DictEntry[]; surfaceEntries: DictEntry[] } | null> {
	// Adverbs ending in -ly are dictionary headwords themselves
	const tries = surface.endsWith("ly")
		? [surface]
		: [...baseFormCandidates(surface), surface];
	for (const t of tries) {
		const entries = await lookupWord(t, fetchFn);
		if (!entries) continue;
		const lemma = entries[0]!.word.toLowerCase() || t;
		const surfaceEntries =
			t !== surface ? ((await lookupWord(surface, fetchFn).catch(() => null)) ?? []) : [];
		return { lemma, entries, surfaceEntries };
	}
	return null;
}

export type HeuristicOptions = {
	maxWords: number;
	excluded: Set<string>;
	fetchFn?: typeof fetch;
};

export async function analyzeWithDictionary(
	sentences: string[],
	tokens: Token[],
	{ maxWords, excluded, fetchFn = fetch }: HeuristicOptions,
): Promise<{ words: AnalyzedWord[]; skippedSaved: string[] }> {
	const groups = new Map<string, Candidate>();

	for (const t of tokens) {
		const w = t.lower;
		// 3 letters is enough for words like "wry"; the common-word filter removes the rest
		if (w.length < 3 || w.includes("-") || w.includes("'")) continue;
		// Capitalized mid-sentence → almost certainly a proper noun
		if (t.position > 0 && /^[A-Z]/.test(t.raw)) continue;
		if (/^[A-Z]{2,}$/.test(t.raw)) continue; // acronyms
		if (isCommon(w) || isDerivedFromCommon(w)) continue;

		const key = groupKey(w);
		const g = groups.get(key);
		if (g) g.tokens.push(t);
		else groups.set(key, { key, tokens: [t], score: 0 });
	}

	const skippedSaved = new Set<string>();
	const ranked = [...groups.values()]
		.filter((g) => {
			const forms = g.tokens.map((t) => t.lower);
			const hit = forms.find(
				(f) => excluded.has(f) || baseFormCandidates(f).some((b) => excluded.has(b)),
			);
			if (hit) skippedSaved.add(hit);
			return !hit;
		})
		.map((g) => ({ ...g, score: learningValueScore(g.tokens[0]!.lower, g.tokens.length) }))
		.sort((a, b) => b.score - a.score)
		// Verify a few more than needed — some won't be dictionary words
		.slice(0, maxWords * 2);

	const resolved = await mapLimit(ranked, 6, async (g) => {
		try {
			const surface = g.tokens[0]!.lower;
			const r = await resolveEntry(surface, fetchFn);
			if (!r) return null;
			if (isCommon(r.lemma)) return null;
			if (excluded.has(r.lemma)) {
				skippedSaved.add(r.lemma);
				return null;
			}
			const sense = pickSense(r.entries, g.tokens, sentences, r.surfaceEntries);
			if (!sense) return null;
			const first = g.tokens[0]!;
			const word: AnalyzedWord = {
				word: r.lemma,
				surface: first.raw,
				pos: sense.pos,
				meaning: sense.definition,
				simple: null,
				example: sense.example ?? null,
				sentence: sentences[first.sentenceIndex] ?? "",
				occurrences: g.tokens.length,
			};
			return { word, score: g.score, order: first.sentenceIndex * 1000 + first.position };
		} catch (err) {
			console.warn("[analyzer] dictionary lookup failed:", (err as Error).message);
			return null;
		}
	});

	// Two different surface forms can resolve to the same lemma — keep one
	const byLemma = new Map<string, NonNullable<(typeof resolved)[number]>>();
	for (const r of resolved) {
		if (!r) continue;
		const prev = byLemma.get(r.word.word);
		if (!prev) byLemma.set(r.word.word, r);
		else prev.word.occurrences += r.word.occurrences;
	}

	const words = [...byLemma.values()]
		.sort((a, b) => b.score - a.score)
		.slice(0, maxWords)
		.sort((a, b) => a.order - b.order) // present in reading order
		.map((r) => r.word);

	return { words, skippedSaved: [...skippedSaved] };
}
