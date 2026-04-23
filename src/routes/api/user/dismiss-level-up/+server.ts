import { prisma } from "$lib/prisma";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ error: "Unauthorized" }, { status: 401 });
	}
	await prisma.user.update({
		where: { id: locals.user.id },
		data: { levelUpFrom: null, levelUpTo: null },
	});
	return json({ ok: true });
};
