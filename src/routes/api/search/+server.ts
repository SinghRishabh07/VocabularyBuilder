import { prisma } from "$lib/prisma";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) {
		return json(
			{
				status: "failed",
				statusCode: 401,
				message: "Unauthorized",
				data: null,
			},
			{ status: 401 },
		);
	}

	try {
		const word = url.searchParams.get("word");

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

		const normalized = word.toLowerCase().trim();

		const existingWord = await prisma.word.findUnique({
			where: {
				userId_word: {
					userId: locals.user.id,
					word: normalized,
				},
			},
			include: {
				meanings: {
					include: {
						examples: true,
					},
				},
			},
		});

		if (existingWord) {
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

		return json({
			status: "success",
			statusCode: 200,
			message: "Word not found in the your vocabulary.",
			data: null,
		});
	} catch (error) {
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
};
