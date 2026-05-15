import { prisma } from "$lib/prisma";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

type MeaningPatch = {
	id: string;
	type?: "noun" | "verb" | "adjective" | "adverb";
	personalMeaning?: string | null;
	personalExample?: string | null;
	dictionaryMeaning?: string | null;
};

const VALID_POS = ["noun", "verb", "adjective", "adverb"] as const;

function isValidPos(
	v: unknown,
): v is (typeof VALID_POS)[number] {
	return typeof v === "string" && VALID_POS.includes(v as (typeof VALID_POS)[number]);
}

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) {
		return json({ error: "Unauthorized" }, { status: 401 });
	}

	const id = params.id;
	if (!id) {
		return json({ error: "Word ID required" }, { status: 400 });
	}

	try {
		const body = (await request.json()) as {
			isFavorite?: boolean;
			meanings?: MeaningPatch[];
		};

		const hasFavorite = typeof body?.isFavorite === "boolean";
		const hasMeanings =
			Array.isArray(body?.meanings) && body.meanings.length > 0;

		if (!hasFavorite && !hasMeanings) {
			return json(
				{
					error:
						"Send isFavorite (boolean) and/or a non-empty meanings array",
				},
				{ status: 400 },
			);
		}

		const owned = await prisma.word.findFirst({
			where: { id, userId: locals.user.id },
			select: { id: true },
		});

		if (!owned) {
			return json({ error: "Word not found" }, { status: 404 });
		}

		if (hasMeanings && body.meanings) {
			for (const m of body.meanings) {
				if (!m?.id || typeof m.id !== "string") continue;

				const exists = await prisma.meaning.findFirst({
					where: { id: m.id, wordId: id },
				});
				if (!exists) continue;

				const meaningData: {
					type?: "noun" | "verb" | "adjective" | "adverb";
					personalMeaning?: string | null;
					dictionaryMeaning?: string | null;
				} = {};

				if ("type" in m && isValidPos(m.type)) {
					meaningData.type = m.type;
				}

				if ("personalMeaning" in m) {
					meaningData.personalMeaning =
						m.personalMeaning === "" || m.personalMeaning === undefined
							? null
							: m.personalMeaning;
				}
				if ("dictionaryMeaning" in m) {
					meaningData.dictionaryMeaning =
						m.dictionaryMeaning === "" || m.dictionaryMeaning === undefined
							? null
							: m.dictionaryMeaning;
				}

				if (Object.keys(meaningData).length > 0) {
					await prisma.meaning.update({
						where: { id: m.id },
						data: meaningData,
					});
				}

				if ("personalExample" in m) {
					const val =
						m.personalExample === "" || m.personalExample === undefined
							? null
							: m.personalExample;

					const first = await prisma.example.findFirst({
						where: { meaningId: m.id },
					});

					if (first) {
						await prisma.example.update({
							where: { id: first.id },
							data: { personalExample: val },
						});
					} else if (val) {
						await prisma.example.create({
							data: {
								meaningId: m.id,
								personalExample: val,
							},
						});
					}
				}
			}
		}

		if (hasFavorite) {
			await prisma.word.updateMany({
				where: { id, userId: locals.user.id },
				data: { isFavorite: body.isFavorite! },
			});
		}

		const updated = await prisma.word.findUnique({ where: { id } });
		return json(updated);
	} catch (err: unknown) {
		console.error("PATCH /api/words/[id]:", err);
		return json({ error: "Failed to update word" }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		return json({ error: "Unauthorized" }, { status: 401 });
	}

	const id = params.id;
	if (!id) {
		return json({ error: "Word ID required" }, { status: 400 });
	}

	try {
		const result = await prisma.word.deleteMany({
			where: { id, userId: locals.user.id },
		});

		if (result.count === 0) {
			return json({ error: "Word not found" }, { status: 404 });
		}

		return new Response(null, { status: 204 });
	} catch (err: unknown) {
		console.error("DELETE /api/words/[id]:", err);
		return json({ error: "Failed to delete word" }, { status: 500 });
	}
};
