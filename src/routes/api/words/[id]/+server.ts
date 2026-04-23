import { prisma } from "$lib/prisma";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) {
		return json({ error: "Unauthorized" }, { status: 401 });
	}

	const id = params.id;
	if (!id) {
		return json({ error: "Word ID required" }, { status: 400 });
	}

	try {
		const body = (await request.json()) as { isFavorite?: boolean };
		const isFavorite = body?.isFavorite;

		if (typeof isFavorite !== "boolean") {
			return json({ error: "isFavorite (boolean) required" }, { status: 400 });
		}

		const word = await prisma.word.updateMany({
			where: { id, userId: locals.user.id },
			data: { isFavorite },
		});

		if (word.count === 0) {
			return json({ error: "Word not found" }, { status: 404 });
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
