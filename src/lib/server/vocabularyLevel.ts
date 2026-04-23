import type { VocabularyLevelInfo } from "$lib/types";

/**
 * Vocabulary “player” level: +1 every 50 words, capped at 2500+ words = max level.
 * Level 1 with 0 words; level 2 from 50 words; max level 51 at 2500+ words.
 */
export const WORDS_PER_LEVEL = 50;
export const MAX_VOCAB_WORDS_FOR_LEVEL = 2500;
export const MAX_LEVEL = 1 + Math.floor(MAX_VOCAB_WORDS_FOR_LEVEL / WORDS_PER_LEVEL);

export function getVocabularyLevelInfo(totalWords: number): VocabularyLevelInfo {
	const n = Math.max(0, totalWords);
	const isMaxed = n >= MAX_VOCAB_WORDS_FOR_LEVEL;
	if (isMaxed) {
		return {
			level: MAX_LEVEL,
			isMaxed: true,
			progressInLevel: 100,
			wordsToNext: 0,
		};
	}
	const level = 1 + Math.floor(n / WORDS_PER_LEVEL);
	const floorStart = (level - 1) * WORDS_PER_LEVEL;
	const progressInLevel = ((n - floorStart) / WORDS_PER_LEVEL) * 100;
	// Next 50-word threshold (e.g. at 100 words, next is 150 — not 100)
	const nextBoundary = (Math.floor(n / WORDS_PER_LEVEL) + 1) * WORDS_PER_LEVEL;
	const wordsToNext = Math.max(0, nextBoundary - n);
	return { level, isMaxed: false, progressInLevel, wordsToNext };
}
