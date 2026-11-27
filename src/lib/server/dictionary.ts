import type { DictEntry } from "$lib/types";

/**
 * Server-side client for the free dictionaryapi.dev API (the same source the
 * dashboard lookup uses in the browser). Small in-memory cache so repeated
 * analyses of similar text don't hammer the upstream API.
 */
const API = "https://api.dictionaryapi.dev/api/v2/entries/en/";
const TIMEOUT_MS = 6000;
const CACHE_MAX = 500;
const CACHE_TTL_MS = 1000 * 60 * 60 * 12;

type CacheEntry = { at: number; value: DictEntry[] | null };
const cache = new Map<string, CacheEntry>();

function remember(key: string, value: DictEntry[] | null) {
	if (cache.size >= CACHE_MAX) {
		// Map preserves insertion order — drop the oldest entry
		const oldest = cache.keys().next().value;
		if (oldest !== undefined) cache.delete(oldest);
	}
	cache.set(key, { at: Date.now(), value });
}

/**
 * Returns all dictionary entries for `word`, `null` when the word is unknown,
 * and throws only on network/upstream failures (so callers can tell
 * "not a word" apart from "dictionary unavailable").
 */
export async function lookupWord(
	word: string,
	fetchFn: typeof fetch = fetch,
): Promise<DictEntry[] | null> {
	const key = word.toLowerCase().trim();
	if (!key) return null;

	const hit = cache.get(key);
	if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
	try {
		const res = await fetchFn(API + encodeURIComponent(key), {
			signal: controller.signal,
			headers: { Accept: "application/json" },
		});
		if (res.status === 404) {
			remember(key, null);
			return null;
		}
		if (!res.ok) {
			throw new Error(`Dictionary responded with ${res.status}`);
		}
		const data = (await res.json()) as DictEntry[];
		const value = Array.isArray(data) && data.length ? data : null;
		remember(key, value);
		return value;
	} finally {
		clearTimeout(timer);
	}
}
