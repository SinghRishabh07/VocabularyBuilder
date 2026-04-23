import { prisma } from "$lib/prisma";
import { json } from "@sveltejs/kit";
import type { AddWordPayload } from "$lib/types";
import type { RequestHandler } from "./$types";

const VALID_POS = ["noun", "verb", "adjective", "adverb"] as const;

function toPartOfSpeech(pos: string): "noun" | "verb" | "adjective" | "adverb" {
	const normalized = pos?.toLowerCase();
	return VALID_POS.includes(normalized as (typeof VALID_POS)[number])
		? (normalized as (typeof VALID_POS)[number])
		: "noun";
}

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const body = (await request.json()) as AddWordPayload;
		const { word: wordText, meanings } = body;

		if (!wordText || !Array.isArray(meanings)) {
			return json({ error: "word and meanings are required" }, { status: 400 });
		}

		const normalizedWord = wordText.toLowerCase().trim();

		const word = await prisma.word.create({
			data: {
				word: normalizedWord,
				userId: locals.user.id,
				meanings: {
					create: meanings.map((m: AddWordPayload["meanings"][number]) => ({
						type: toPartOfSpeech(m.pos ?? ""),
						dictionaryMeaning: Array.isArray(m.definitions) ? m.definitions[0] ?? null : null,
						personalMeaning: m.personalMeaning || null,
						examples: {
							create: m.personalExample
								? [{ personalExample: m.personalExample, dictionaryExample: null }]
								: [],
						},
					})),
				},
			},
			include: {
				meanings: {
					include: {
						examples: true,
					},
				},
			},
		});

		return json(word);
	} catch (err: unknown) {
		const anyErr = err as { code?: string };
		if (anyErr?.code === "P2002") {
			return json({ error: "Word already exists in vocabulary" }, { status: 409 });
		}
		console.error("POST /api/words:", err);
		return json({ error: "Failed to save word" }, { status: 500 });
	}
};
