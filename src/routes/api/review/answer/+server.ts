import { json } from "@sveltejs/kit";
import { prisma } from "$lib/prisma";
import { applyGrade, isGrade } from "$lib/server/srs";
import type { RequestHandler } from "./$types";

/**
 * Record one graded answer. Updates the word's spaced-repetition schedule and
 * the session tally atomically. Idempotent per (session, word): retries or
 * double-taps never double-count.
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: "Unauthorized" }, { status: 401 });
	}
	const userId = locals.user.id;

	let body: { sessionId?: unknown; wordId?: unknown; grade?: unknown };
	try {
		body = (await request.json()) as typeof body;
	} catch {
		return json({ error: "Invalid JSON" }, { status: 400 });
	}
	const { sessionId, wordId, grade } = body;
	if (typeof sessionId !== "string" || typeof wordId !== "string" || !isGrade(grade)) {
		return json({ error: "sessionId, wordId and a valid grade are required" }, { status: 400 });
	}

	try {
		const result = await prisma.$transaction(async (tx) => {
			const word = await tx.word.findFirst({
				where: { id: wordId, userId },
				select: {
					reviewEase: true,
					reviewInterval: true,
					reviewCount: true,
					correctCount: true,
					lapseCount: true,
				},
			});
			if (!word) return { status: 404 as const };

			const correct = grade !== "forgot";
			// Conditional update = atomic "first answer wins" guard
			const claimed = await tx.reviewSession.updateMany({
				where: { id: sessionId, userId, NOT: { answeredWordIds: { has: wordId } } },
				data: {
					answeredWordIds: { push: wordId },
					answeredCount: { increment: 1 },
					correctCount: { increment: correct ? 1 : 0 },
				},
			});
			if (claimed.count === 0) {
				const exists = await tx.reviewSession.count({ where: { id: sessionId, userId } });
				return { status: exists ? (200 as const) : (404 as const), duplicate: true };
			}

			const next = applyGrade(word, grade);
			await tx.word.update({ where: { id: wordId }, data: next });
			return { status: 200 as const, duplicate: false, nextDueAt: next.reviewDueAt.toISOString() };
		});

		if (result.status === 404) {
			return json({ error: "Session or word not found" }, { status: 404 });
		}
		const { status: _status, ...rest } = result;
		return json({ ok: true, ...rest });
	} catch (err) {
		console.error("POST /api/review/answer:", err);
		return json({ error: "Couldn't save your answer" }, { status: 500 });
	}
};
