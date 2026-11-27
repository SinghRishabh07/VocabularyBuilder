import { prisma } from "$lib/prisma";
import { getVocabularyLevelInfo } from "$lib/server/vocabularyLevel";
import type { AddWordPayload, PosKey, SaveWordsResponse } from "$lib/types";

const VALID_POS: PosKey[] = ["noun", "verb", "adjective", "adverb"];
const MAX_WORD_LEN = 64;
const MAX_TEXT_LEN = 2000;
export const MAX_BATCH = 30;

export function toPartOfSpeech(pos: string | undefined | null): PosKey {
	const normalized = pos?.toLowerCase() as PosKey;
	return VALID_POS.includes(normalized) ? normalized : "noun";
}

export function normalizeWord(w: unknown): string | null {
	if (typeof w !== "string") return null;
	const n = w.toLowerCase().trim().replace(/\s+/g, " ");
	if (!n || n.length > MAX_WORD_LEN) return null;
	if (!/^\p{L}[\p{L}' .-]*$/u.test(n)) return null;
	return n;
}

function clip(s: unknown): string | null {
	if (typeof s !== "string") return null;
	const t = s.trim();
	return t ? t.slice(0, MAX_TEXT_LEN) : null;
}

function isValidPayload(p: unknown): p is AddWordPayload {
	const x = p as AddWordPayload;
	return Boolean(x) && typeof x.word === "string" && Array.isArray(x.meanings);
}

function isUniqueViolation(err: unknown): boolean {
	return (err as { code?: string })?.code === "P2002";
}

/**
 * The single code path for adding words to a user's vocabulary (used by the
 * dashboard lookup and the paragraph analyzer). Skips words that already
 * exist instead of failing the whole batch, and records a pending level-up.
 */
export async function saveWordsForUser(
	userId: string,
	payloads: unknown[],
): Promise<SaveWordsResponse> {
	const invalid: string[] = [];
	const unique = new Map<string, AddWordPayload>();
	for (const p of payloads) {
		const word = isValidPayload(p) ? normalizeWord(p.word) : null;
		if (!word) {
			invalid.push(String((p as AddWordPayload)?.word ?? ""));
			continue;
		}
		if (!unique.has(word)) unique.set(word, { ...(p as AddWordPayload), word });
	}

	const words = [...unique.keys()];
	const existing = words.length
		? await prisma.word.findMany({
				where: { userId, word: { in: words } },
				select: { word: true },
			})
		: [];
	const existingSet = new Set(existing.map((e) => e.word));
	const skipped = words.filter((w) => existingSet.has(w));
	const toCreate = [...unique.values()].filter((p) => !existingSet.has(p.word));

	const totalBefore = await prisma.word.count({ where: { userId } });
	const created: SaveWordsResponse["created"] = [];

	for (const p of toCreate) {
		try {
			const row = await prisma.word.create({
				data: {
					word: p.word,
					userId,
					meanings: {
						create: p.meanings.slice(0, 10).map((m) => {
							const dictionaryExample = clip(m.examples?.[0]);
							const personalExample = clip(m.personalExample);
							const examples =
								dictionaryExample || personalExample
									? [{ dictionaryExample, personalExample }]
									: [];
							return {
								type: toPartOfSpeech(m.pos),
								dictionaryMeaning: clip(Array.isArray(m.definitions) ? m.definitions[0] : null),
								personalMeaning: clip(m.personalMeaning),
								examples: { create: examples },
							};
						}),
					},
				},
				select: { id: true, word: true },
			});
			created.push(row);
		} catch (err) {
			// Concurrent request saved the same word first — treat as a duplicate
			if (isUniqueViolation(err)) skipped.push(p.word);
			else throw err;
		}
	}

	if (created.length) {
		const before = getVocabularyLevelInfo(totalBefore);
		const after = getVocabularyLevelInfo(totalBefore + created.length);
		if (after.level > before.level) {
			await prisma.user.update({
				where: { id: userId },
				data: { levelUpFrom: before.level, levelUpTo: after.level },
			});
		}
	}

	return { created, skipped, invalid };
}
