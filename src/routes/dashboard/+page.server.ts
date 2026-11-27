import { prisma } from "$lib/prisma";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user) {
        return { recentWords: [], readyToRevise: 0 };
    }

    const [recentWords, readyToRevise] = await Promise.all([
        prisma.word.findMany({
            where: { userId: locals.user.id },
            take: 9,
            orderBy: {
                createdAt: "desc",
            },
            include: {
                meanings: { include: { examples: true } },
            },
        }),
        prisma.word.count({
            where: { userId: locals.user.id, reviewDueAt: { lte: new Date() } },
        }),
    ]);

    return { recentWords, readyToRevise };
};
