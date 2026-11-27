import { json } from "@sveltejs/kit";
import { MAX_BATCH, saveWordsForUser } from "$lib/server/words";
import type { RequestHandler } from "./$types";

/**
 * Add words to the current user's vocabulary.
 *
 * - `{ word, meanings }` → single add (dashboard lookup). 409 if it already exists.
 * - `{ words: [{ word, meanings }, …] }` → batch add (paragraph analyzer).
 *   Existing words are reported in `skipped` instead of failing the batch.
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: "Unauthorized" }, { status: 401 });
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: "Invalid JSON" }, { status: 400 });
	}

	const batch = (body as { words?: unknown })?.words;
	const isBatch = Array.isArray(batch);
	const payloads = isBatch ? (batch as unknown[]) : [body];

	if (payloads.length === 0) {
		return json({ error: "No words to save" }, { status: 400 });
	}
	if (payloads.length > MAX_BATCH) {
		return json({ error: `You can save up to ${MAX_BATCH} words at once` }, { status: 400 });
	}

	try {
		const result = await saveWordsForUser(locals.user.id, payloads);

		if (isBatch) return json(result);

		if (result.invalid.length) {
			return json({ error: "word and meanings are required" }, { status: 400 });
		}
		if (result.skipped.length) {
			return json({ error: "Word already exists in vocabulary" }, { status: 409 });
		}
		return json(result.created[0]);
	} catch (err) {
		console.error("POST /api/words:", err);
		return json({ error: "Failed to save word" }, { status: 500 });
	}
};
