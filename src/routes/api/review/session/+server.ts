import { json } from "@sveltejs/kit";
import { prisma } from "$lib/prisma";
import { buildSession, SESSION_SIZES, type ReviewMode } from "$lib/server/review";
import type { RequestHandler } from "./$types";

/** Start a revision session: returns the queue of activities to work through. */
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: "Unauthorized" }, { status: 401 });
	}

	let body: { mode?: unknown; size?: unknown } = {};
	try {
		body = (await request.json()) as typeof body;
	} catch {
		// empty body → defaults
	}
	const mode: ReviewMode = body.mode === "flashcards" ? "flashcards" : "smart";
	const size = SESSION_SIZES.includes(body.size as (typeof SESSION_SIZES)[number])
		? (body.size as number)
		: 10;

	try {
		const items = await buildSession(locals.user.id, mode, size);
		if (!items.length) {
			return json(
				{ error: "Add a few words to your collection first — then come back to revise them." },
				{ status: 400 },
			);
		}
		const session = await prisma.reviewSession.create({
			data: { userId: locals.user.id, mode, plannedCount: items.length },
			select: { id: true },
		});
		return json({ sessionId: session.id, items });
	} catch (err) {
		console.error("POST /api/review/session:", err);
		return json({ error: "Couldn't start a revision session" }, { status: 500 });
	}
};
