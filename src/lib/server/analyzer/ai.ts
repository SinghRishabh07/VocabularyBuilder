/**
 * Optional AI engine (enabled only when ANTHROPIC_API_KEY is set).
 * Claude reads the whole paragraph, so it can pick genuinely useful words and
 * explain the sense actually used in context. Output is constrained to JSON
 * with structured outputs and then validated against the original text.
 */
import Anthropic from "@anthropic-ai/sdk";
import { env } from "$env/dynamic/private";
import type { AnalyzedWord, PosKey } from "$lib/types";

const MODEL = "claude-opus-5-5";
const VALID_POS: PosKey[] = ["noun", "verb", "adjective", "adverb"];

let client: Anthropic | null = null;

export function aiAnalyzerEnabled(): boolean {
	return Boolean(env.ANTHROPIC_API_KEY?.trim());
}

function getClient(): Anthropic {
	if (!client) {
		client = new Anthropic({
			apiKey: env.ANTHROPIC_API_KEY!.trim(),
			timeout: 45_000,
			maxRetries: 1,
		});
	}
	return client;
}

const SYSTEM = `You are a vocabulary tutor for an adult English learner using a vocabulary-building app.
Given a passage, choose the words that are most worth learning from it.

Selection rules:
- Pick advanced, uncommon, academic or nuanced words, and words used in a notable sense.
- Never pick basic everyday words, function words (articles, prepositions, conjunctions, pronouns, auxiliaries), proper nouns, or names.
- Length is not a signal: a short sophisticated word ("terse", "wry") beats a long common one ("information").
- One entry per word: merge different forms (plural, tense, -ing) and report the dictionary base form.
- Only noun, verb, adjective or adverb.
- Fewer, better words: return at most {MAX}. Return an empty list if nothing qualifies.

For each word:
- "word": dictionary base form, lowercase.
- "surface": the word exactly as it appears in the passage.
- "pos": part of speech as used in this passage.
- "meaning": a concise dictionary-style definition of the sense used in THIS passage (not other senses).
- "simple": a plain-English explanation a 12-year-old would understand, max 20 words.
- "sentence": the sentence from the passage where it appears, copied verbatim.`;

const SCHEMA = {
	type: "object",
	properties: {
		words: {
			type: "array",
			items: {
				type: "object",
				properties: {
					word: { type: "string" },
					surface: { type: "string" },
					pos: { type: "string", enum: VALID_POS },
					meaning: { type: "string" },
					simple: { type: "string" },
					sentence: { type: "string" },
				},
				required: ["word", "surface", "pos", "meaning", "simple", "sentence"],
				additionalProperties: false,
			},
		},
	},
	required: ["words"],
	additionalProperties: false,
} as const;

type RawAiWord = {
	word: string;
	surface: string;
	pos: string;
	meaning: string;
	simple: string;
	sentence: string;
};

export async function analyzeWithAi(
	text: string,
	sentences: string[],
	{ maxWords, excluded }: { maxWords: number; excluded: Set<string> },
): Promise<{ words: AnalyzedWord[]; skippedSaved: string[] }> {
	// Tell the model about (a bounded sample of) words already saved so it can
	// spend its picks elsewhere; we still filter strictly afterwards.
	const known = [...excluded].slice(0, 300);
	const userContent =
		(known.length
			? `Words the learner already knows (do not pick these or their forms): ${known.join(", ")}\n\n`
			: "") + `Passage:\n"""\n${text}\n"""`;

	const response = await getClient().beta.messages.create({
		model: MODEL,
		max_tokens: 16000,
		betas: ["server-side-fallback-2026-07-01"],
		fallbacks: "default",
		output_config: {
			effort: "low",
			format: { type: "json_schema", schema: SCHEMA as unknown as Record<string, unknown> },
		},
		system: SYSTEM.replace("{MAX}", String(maxWords)),
		messages: [{ role: "user", content: userContent }],
	});

	if (response.stop_reason === "refusal") {
		throw new Error("AI analyzer declined the request");
	}
	const textBlock = response.content.find((b) => b.type === "text");
	if (!textBlock || textBlock.type !== "text") throw new Error("AI analyzer returned no text");

	const parsed = JSON.parse(textBlock.text) as { words?: RawAiWord[] };
	const lowerText = text.toLowerCase();
	const seen = new Set<string>();
	const skippedSaved: string[] = [];
	const words: AnalyzedWord[] = [];

	for (const w of parsed.words ?? []) {
		const lemma = w.word?.toLowerCase().trim();
		const surface = w.surface?.trim();
		if (!lemma || !surface || seen.has(lemma)) continue;
		// Guard against hallucinated words that are not in the passage
		if (!lowerText.includes(surface.toLowerCase())) continue;
		if (excluded.has(lemma) || excluded.has(surface.toLowerCase())) {
			skippedSaved.push(lemma);
			continue;
		}
		seen.add(lemma);
		const sentence =
			sentences.find((s) => s === w.sentence) ??
			sentences.find((s) => s.toLowerCase().includes(surface.toLowerCase())) ??
			w.sentence;
		words.push({
			word: lemma,
			surface,
			pos: VALID_POS.includes(w.pos as PosKey) ? (w.pos as PosKey) : "noun",
			meaning: w.meaning.trim(),
			simple: w.simple?.trim() || null,
			example: null,
			sentence,
			occurrences: Math.max(
				1,
				lowerText.split(new RegExp(`\\b${surface.toLowerCase().replace(/[^a-z]/g, "")}\\b`)).length - 1,
			),
		});
		if (words.length >= maxWords) break;
	}
	return { words, skippedSaved };
}
