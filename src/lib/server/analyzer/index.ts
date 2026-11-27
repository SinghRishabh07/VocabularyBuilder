import { prisma } from "$lib/prisma";
import type { AnalyzeResponse } from "$lib/types";
import { aiAnalyzerEnabled, analyzeWithAi } from "./ai";
import { analyzeWithDictionary } from "./heuristic";
import { normalizeText, splitSentences, tokenize } from "./text";

export const MAX_PARAGRAPH_CHARS = 5000;
export const MIN_PARAGRAPH_CHARS = 20;

/** Scale the number of suggestions with text length, but never overwhelm. */
function maxWordsFor(wordCount: number): number {
	return Math.max(3, Math.min(12, Math.round(wordCount / 6) + 1));
}

export async function analyzeParagraph(
	userId: string,
	input: string,
	fetchFn: typeof fetch = fetch,
): Promise<AnalyzeResponse> {
	const text = normalizeText(input);
	const sentences = splitSentences(text);
	const tokens = tokenize(sentences);
	const maxWords = maxWordsFor(tokens.length);

	const saved = await prisma.word.findMany({
		where: { userId },
		select: { word: true },
		orderBy: { createdAt: "desc" },
	});
	const excluded = new Set(saved.map((w) => w.word.toLowerCase()));

	if (aiAnalyzerEnabled()) {
		try {
			const r = await analyzeWithAi(text, sentences, { maxWords, excluded });
			return { engine: "ai", ...r };
		} catch (err) {
			// Never fail the request because the optional AI engine is down
			console.error("[analyzer] AI engine failed, using dictionary engine:", (err as Error).message);
		}
	}

	const r = await analyzeWithDictionary(sentences, tokens, { maxWords, excluded, fetchFn });
	return { engine: "dictionary", ...r };
}
