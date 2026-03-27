import { prisma } from "$lib/prisma";
// import type { RecentWord } from "$lib/types";

export const load = async () => {
    const recentWords = await prisma.word.findMany({
        take: 9, // Limit to 9 for a nice 3x3 grid
        orderBy: {
            createdAt: 'desc' // Newest first
        },
        include: {
            meanings: true
        }
    });

    return { recentWords };
};