import { prisma } from "$lib/prisma";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user) {
        return { recentWords: [] };
    }

    const recentWords = await prisma.word.findMany({
        where: { userId: locals.user.id },
        take: 9,
        orderBy: {
            createdAt: "desc",
        },
        include: {
            meanings: true,
        },
    });

    return { recentWords };
};