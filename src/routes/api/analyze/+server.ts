import { json } from "@sveltejs/kit";
import {
	analyzeParagraph,
	MAX_PARAGRAPH_CHARS,
	MIN_PARAGRAPH_CHARS,
} from "$lib/server/analyzer";
import type { RequestHandler } from "./$types";

/** Simple per-user throttle (in-memory; good enough for a single Node instance). */
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 20;
const hits = new Map<string, number[]>();

function rateLimited(userId: string): boolean {
	const now = Date.now();
	const recent = (hits.get(userId) ?? []).filter((t) => now - t < WINDOW_MS);
	if (recent.length >= MAX_PER_WINDOW) {
		hits.set(userId, recent);
		return true;
	}
	recent.push(now);
	hits.set(userId, recent);
	return false;
}

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: "Unauthorized" }, { status: 401 });
	}

	let text: unknown;
	try {
		({ text } = (await request.json()) as { text?: unknown });
	} catch {
		return json({ error: "Invalid JSON" }, { status: 400 });
	}

	if (typeof text !== "string" || text.trim().length < MIN_PARAGRAPH_CHARS) {
		return json(
			{ error: `Paste a sentence or paragraph (at least ${MIN_PARAGRAPH_CHARS} characters).` },
			{ status: 400 },
		);
	}
	if (text.length > MAX_PARAGRAPH_CHARS) {
		return json(
			{ error: `Text is too long — keep it under ${MAX_PARAGRAPH_CHARS.toLocaleString()} characters.` },
			{ status: 400 },
		);
	}
	if (rateLimited(locals.user.id)) {
		return json(
			{ error: "You're analyzing a lot of text — take a short break and try again in a few minutes." },
			{ status: 429 },
		);
	}

	try {
		const result = await analyzeParagraph(locals.user.id, text);
		return json(result);
	} catch (err) {
		console.error("POST /api/analyze:", err);
		return json(
			{ error: "Couldn't analyze the text right now. Please try again." },
			{ status: 502 },
		);
	}
};
