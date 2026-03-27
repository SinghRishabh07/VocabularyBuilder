import { prisma } from "$lib/prisma";
import { json } from "@sveltejs/kit";
import type { AddWordPayload } from "$lib/types";

const VALID_POS = ["noun", "verb", "adjective", "adverb"] as const;

function toPartOfSpeech(pos: string): "noun" | "verb" | "adjective" | "adverb" {
	const normalized = pos?.toLowerCase();
	return VALID_POS.includes(normalized as (typeof VALID_POS)[number])
		? (normalized as (typeof VALID_POS)[number])
		: "noun";
}

export async function POST({ request }) {
	try {
		const body = (await request.json()) as AddWordPayload;
		const { word: wordText, meanings } = body;

		if (!wordText || !Array.isArray(meanings)) {
			return json({ error: "word and meanings are required" }, { status: 400 });
		}

		const word = await prisma.word.create({
			data: {
				word: wordText.toLowerCase().trim(),
				meanings: {
					create: meanings.map((m: AddWordPayload["meanings"][number]) => ({
						type: toPartOfSpeech(m.pos ?? ""),
						dictionaryMeaning: Array.isArray(m.definitions) ? m.definitions[0] ?? null : null,
						personalMeaning: m.personalMeaning || null,
						examples: {
							create: m.personalExample
								? [{ personalExample: m.personalExample, dictionaryExample: null }]
								: []
						}
					}))
				}
			},
			include: {
				meanings: {
					include: {
						examples: true
					}
				}
			}
		});

		return json(word);
	} catch (err: any) {
		if (err?.code === "P2002") {
			return json({ error: "Word already exists in vocabulary" }, { status: 409 });
		}
		console.error("POST /api/words:", err);
		return json({ error: "Failed to save word" }, { status: 500 });
	}
}