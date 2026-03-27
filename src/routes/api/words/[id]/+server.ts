import { prisma } from "$lib/prisma";
import { json } from "@sveltejs/kit";

export async function PATCH(
	{ params, request }: { params: { id: string }; request: Request }
) {
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

		const word = await prisma.word.update({
			where: { id },
			data: { isFavorite },
		});

		return json(word);
	} catch (err: unknown) {
		const e = err as { code?: string };
		if (e?.code === "P2025") {
			return json({ error: "Word not found" }, { status: 404 });
		}
		console.error("PATCH /api/words/[id]:", err);
		return json({ error: "Failed to update word" }, { status: 500 });
	}
}

export async function DELETE({ params }: { params: { id: string } }) {
	const id = params.id;
	if (!id) {
		return json({ error: "Word ID required" }, { status: 400 });
	}

	try {
		await prisma.word.delete({
			where: { id },
		});
		return new Response(null, { status: 204 });
	} catch (err: unknown) {
		const e = err as { code?: string };
		if (e?.code === "P2025") {
			return json({ error: "Word not found" }, { status: 404 });
		}
		console.error("DELETE /api/words/[id]:", err);
		return json({ error: "Failed to delete word" }, { status: 500 });
	}
}
