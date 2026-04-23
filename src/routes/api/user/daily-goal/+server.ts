import { prisma } from "$lib/prisma";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const PATCH: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: "Unauthorized" }, { status: 401 });
	}
	let body: { dailyWordGoal?: unknown };
	try {
		body = (await request.json()) as { dailyWordGoal?: unknown };
	} catch {
		return json({ error: "Invalid JSON" }, { status: 400 });
	}
	const raw = body.dailyWordGoal;
	if (raw === undefined || typeof raw !== "number" || !Number.isInteger(raw)) {
		return json({ error: "dailyWordGoal must be a whole number" }, { status: 400 });
	}
	if (raw < 1 || raw > 500) {
		return json({ error: "dailyWordGoal must be between 1 and 500" }, { status: 400 });
	}

	await prisma.user.update({
		where: { id: locals.user.id },
		data: { dailyWordGoal: raw },
	});

	return json({ dailyWordGoal: raw });
};
