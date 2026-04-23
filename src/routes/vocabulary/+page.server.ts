import { prisma } from "$lib/prisma";
import type { VocabularyWord } from "$lib/types";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user) {
        return { data: [] satisfies VocabularyWord[] };
    }

    const rows = await prisma.word.findMany({
        where: { userId: locals.user.id },
        include: {
            meanings: {
                include: {
                    examples: true,
                },
            },
        },
        orderBy: { createdAt: "desc" },
    });

    const vocabulary: VocabularyWord[] = rows.map((w) => ({
        id: w.id,
        word: w.word,
        createdAt: w.createdAt,
        isFavorite: w.isFavorite ?? false,
        meanings: w.meanings.map((m) => ({
            dictionaryMeaning: m.dictionaryMeaning ?? "",
            type: m.type,
            personalMeaning: m.personalMeaning,
            examples: m.examples.map((e) => ({
                dictionaryExample: e.dictionaryExample,
                personalExample: e.personalExample,
            })),
        })),
    }));

    return { data: vocabulary };
};