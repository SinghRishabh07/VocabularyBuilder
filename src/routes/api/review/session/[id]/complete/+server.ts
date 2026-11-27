import { json } from "@sveltejs/kit";
import { prisma } from "$lib/prisma";
import { getReviewOverview } from "$lib/server/review";
import type { RequestHandler } from "./$types";

/** Mark a session finished and return fresh revision stats for the summary screen. */
export const POST: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		return json({ error: "Unauthorized" }, { status: 401 });
	}
	try {
		const updated = await prisma.reviewSession.updateMany({
			where: { id: params.id, userId: locals.user.id, completedAt: null },
			data: { completedAt: new Date() },
		});
		if (updated.count === 0) {
			const exists = await prisma.reviewSession.count({
				where: { id: params.id, userId: locals.user.id },
			});
			if (!exists) return json({ error: "Session not found" }, { status: 404 });
		}
		const overview = await getReviewOverview(locals.user.id);
		return json({ ok: true, overview });
	} catch (err) {
		console.error("POST /api/review/session/[id]/complete:", err);
		return json({ error: "Couldn't finish the session" }, { status: 500 });
	}
};
