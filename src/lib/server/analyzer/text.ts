/**
 * Text utilities shared by both analyzer engines: sentence splitting,
 * tokenizing, light lemmatization and "is this word too basic" checks.
 */
import { COMMON_WORDS } from "./commonWords";

export type Token = {
	/** Exact text as it appears */
	raw: string;
	/** Lowercased, possessive stripped */
	lower: string;
	sentenceIndex: number;
	/** Position within the sentence (0 = first word) */
	position: number;
	/** Previous token in the same sentence (lowercased), if any */
	prev: string | null;
	/** Next token (lowercased) when only whitespace separates them — no punctuation */
	next: string | null;
};

export function normalizeText(input: string): string {
	return input
		.replace(/[‘’ʼ]/g, "'")
		.replace(/[“”]/g, '"')
		.replace(/\r\n?/g, "\n")
		.trim();
}

/** Split into sentences, keeping each sentence's original text for display. */
export function splitSentences(text: string): string[] {
	return text
		.split(/(?<=[.!?…])\s+(?=["'(\[]?[A-Z0-9])|\n+/)
		.map((s) => s.trim())
		.filter(Boolean);
}

const WORD_RE = /[A-Za-z]+(?:['-][A-Za-z]+)*/g;

export function tokenize(sentences: string[]): Token[] {
	const out: Token[] = [];
	sentences.forEach((sentence, sentenceIndex) => {
		let position = 0;
		let prev: Token | null = null;
		let prevEnd = 0;
		for (const m of sentence.matchAll(WORD_RE)) {
			const raw = m[0];
			const lower = raw.toLowerCase().replace(/'s$/, "");
			const index = m.index ?? 0;
			if (prev && /^\s+$/.test(sentence.slice(prevEnd, index))) prev.next = lower;
			const tok: Token = { raw, lower, sentenceIndex, position, prev: prev?.lower ?? null, next: null };
			out.push(tok);
			prev = tok;
			prevEnd = index + raw.length;
			position++;
		}
	});
	return out;
}

/** Common irregular inflections → base form (only needed for basic words). */
const IRREGULAR: Record<string, string> = {
	ran: "run", went: "go", gone: "go", took: "take", taken: "take", made: "make",
	came: "come", saw: "see", seen: "see", gave: "give", given: "give", told: "tell",
	found: "find", knew: "know", known: "know", thought: "think", brought: "bring",
	bought: "buy", felt: "feel", kept: "keep", left: "leave", began: "begin",
	begun: "begin", wrote: "write", written: "write", spoke: "speak", spoken: "speak",
	broke: "break", broken: "break", chose: "choose", chosen: "choose", drove: "drive",
	driven: "drive", ate: "eat", eaten: "eat", fell: "fall", fallen: "fall",
	grew: "grow", grown: "grow", held: "hold", led: "lead", lost: "lose", met: "meet",
	paid: "pay", sat: "sit", sold: "sell", sent: "send", slept: "sleep", spent: "spend",
	stood: "stand", taught: "teach", threw: "throw", thrown: "throw",
	understood: "understand", woke: "wake", wore: "wear", worn: "wear", won: "win",
	children: "child", men: "man", women: "woman", feet: "foot", teeth: "tooth",
	mice: "mouse", people: "person", better: "good", worse: "bad", hid: "hide",
	hidden: "hide", flew: "fly", flown: "fly", drew: "draw", drawn: "draw",
	drank: "drink", drunk: "drink", sang: "sing", sung: "sing", swam: "swim",
	rode: "ride", ridden: "ride", rose: "rise", risen: "rise", shook: "shake",
	stole: "steal", stolen: "steal", forgot: "forget", forgotten: "forget",
	caught: "catch", fought: "fight", sought: "seek", dealt: "deal", meant: "mean",
	built: "build", lent: "lend", lit: "light", became: "become", did: "do",
	done: "do", had: "have", has: "have", was: "be", were: "be", been: "be",
	is: "be", are: "be", am: "be", said: "say", got: "get", gotten: "get",
	heard: "hear", lay: "lie", lain: "lie", laid: "lay", wives: "wife",
	lives: "life", knives: "knife", leaves: "leaf", halves: "half", shelves: "shelf",
};

const VOWELS = /[aeiou]/;

/**
 * Plausible base forms for an inflected word, most likely first.
 * The original word is NOT included.
 */
export function baseFormCandidates(w: string): string[] {
	const c: string[] = [];
	const push = (s: string) => {
		if (s.length >= 2 && s !== w && !c.includes(s)) c.push(s);
	};
	if (IRREGULAR[w]) push(IRREGULAR[w]);

	if (w.endsWith("ies") && w.length > 4) push(w.slice(0, -3) + "y");
	if (w.endsWith("ied") && w.length > 4) push(w.slice(0, -3) + "y");
	if (/(ches|shes|sses|xes|zes|oes)$/.test(w)) push(w.slice(0, -2));
	if (w.endsWith("s") && !/(ss|us|is)$/.test(w)) push(w.slice(0, -1));

	if (w.endsWith("ed") && w.length > 4) {
		const stem = w.slice(0, -2);
		if (/([b-df-hj-np-tv-z])\1$/.test(stem)) push(stem.slice(0, -1)); // stopped → stop
		push(w.slice(0, -1)); // ameliorated → ameliorate
		push(stem); // pondered → ponder
	}
	if (w.endsWith("ing") && w.length >= 5) {
		const stem = w.slice(0, -3);
		if (/([b-df-hj-np-tv-z])\1$/.test(stem)) push(stem.slice(0, -1));
		if (VOWELS.test(stem)) {
			push(stem + "e"); // mitigating → mitigate
			push(stem); // pondering → ponder
		}
	}
	if (w.endsWith("ier") || w.endsWith("iest")) push(w.replace(/i(er|est)$/, "y"));
	if (w.endsWith("er") && w.length > 5) push(w.slice(0, -2));
	if (w.endsWith("est") && w.length > 6) push(w.slice(0, -3));
	return c;
}

/** Crude stem used only to group different forms of the same word together. */
export function groupKey(w: string): string {
	const irr = IRREGULAR[w];
	if (irr) return irr;
	let s = w;
	for (const suf of ["ingly", "edly", "ing", "ed", "ies", "es", "ly", "s"]) {
		if (suf === "s" && /(ss|us|is)$/.test(s)) continue;
		if (s.endsWith(suf) && s.length - suf.length >= 4) {
			s = s.slice(0, -suf.length);
			if (suf === "ies") s += "y";
			break;
		}
	}
	return s.replace(/e$/, "").replace(/([b-df-hj-np-tv-z])\1$/, "$1");
}

export function isCommon(w: string): boolean {
	if (COMMON_WORDS.has(w)) return true;
	return baseFormCandidates(w).some((b) => COMMON_WORDS.has(b));
}

const DERIVATION_PREFIXES = ["un", "in", "im", "dis", "re", "over", "under", "out", "mis", "pre", "non"];
const DERIVATION_SUFFIXES: [string, string][] = [
	["iness", "y"], ["ily", "y"], ["ness", ""], ["fulness", ""], ["ful", ""],
	["less", ""], ["ment", ""], ["ably", "able"], ["ibly", "ible"], ["able", ""],
	["able", "e"], ["ible", ""], ["ly", ""],
	["ity", ""], ["ation", "e"], ["ation", ""], ["er", ""], ["ist", ""],
];

/**
 * True for transparent derivations of basic words that teach nothing new:
 * "unhappy", "reconsider", "carefulness", "comfortably", "teacher"…
 */
export function isDerivedFromCommon(word: string): boolean {
	// Check inflected forms too: "expectations" → "expectation" → expect + -ation
	return [word, ...baseFormCandidates(word)].some(isDerivedForm);
}

function isDerivedForm(w: string): boolean {
	for (const p of DERIVATION_PREFIXES) {
		if (w.startsWith(p) && w.length - p.length >= 5) {
			const rest = w.slice(p.length);
			if (isCommon(rest)) return true;
		}
	}
	for (const [suf, add] of DERIVATION_SUFFIXES) {
		if (w.endsWith(suf) && w.length - suf.length >= 3) {
			const base = w.slice(0, -suf.length) + add;
			if (isCommon(base)) return true;
		}
	}
	return false;
}

const STOP_FOR_OVERLAP = new Set(
	"a an the of to in on at for by with from and or but is are was were be been being it its this that these those as which who whom whose what when where how than then so such not no can could would should may might will shall do does did has have had into onto about over under very more most also just only some any each other their there they them he she his her we our you your i me my".split(
		" ",
	),
);

/**
 * Content words (lightly stemmed) for gloss-overlap scoring, each with a
 * weight: an overlap on an everyday word ("going", "current") is weak
 * evidence of a sense; an overlap on an uncommon word is strong evidence.
 */
export function contentStems(text: string): Map<string, number> {
	const out = new Map<string, number>();
	for (const m of text.toLowerCase().matchAll(/[a-z]+/g)) {
		const w = m[0];
		if (w.length < 3 || STOP_FOR_OVERLAP.has(w)) continue;
		const weight = isCommon(w) ? 0.25 : 1.2;
		const key = groupKey(w);
		out.set(key, Math.max(out.get(key) ?? 0, weight));
	}
	return out;
}
