import { prisma } from "$lib/prisma";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) {
		return { user: null, levelUp: null as { from: number; to: number } | null };
	}

	const row = await prisma.user.findUnique({
		where: { id: locals.user.id },
		select: { levelUpFrom: true, levelUpTo: true },
	});

	const levelUp =
		row != null && row.levelUpFrom != null && row.levelUpTo != null
			? { from: row.levelUpFrom, to: row.levelUpTo }
			: null;

	return { user: locals.user, levelUp };
};
