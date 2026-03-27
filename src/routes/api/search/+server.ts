import { prisma } from "$lib/prisma";
import { json } from "@sveltejs/kit";


export async function GET({ url }) {
    try {
        const word = url.searchParams.get("word");
        console.log("Word:", word);

        if (!word) {
            return json(
                {
                    status: "failed",
                    statusCode: 400,
                    message: "Word required!",
                    data: null,
                },
                { status: 400 },
            );
        }

        // check vocabulary, database lookup
        const existingWord = await prisma.word.findUnique({
            where: { word },
            include: {
                meanings: {
                    include: {
                        examples: true,
                    },
                },
            },
        });

        if (existingWord) {
            // Transform DB shape to SearchResult format for consistent UI rendering
            const searchResult = {
                word: existingWord.word,
                allMeanings: existingWord.meanings.map((m) => ({
                    pos: m.type,
                    definitions: m.dictionaryMeaning ? [m.dictionaryMeaning] : [],
                })),
            };
            return json({
                status: "success",
                statusCode: 200,
                message: "Word found in vocabulary.",
                data: searchResult,
            });
        }

        // Still 200 because the request worked, even if word is missing
        return json({
            status: "success",
            statusCode: 200,
            message: "Word not found in the your vocabulary.",
            data: null,
        });
    } catch (error) {
        // 4. Handle Database/Server errors
        console.error("Database Error:", error);
        return json(
            {
                status: "failed",
                statusCode: 500,
                message: "Internal server error while accessing vocabulary.",
                data: null,
            },
            { status: 500 },
        );
    }
}
