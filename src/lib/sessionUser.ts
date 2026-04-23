import { page } from "$app/state";
import type { PublicUser } from "$lib/types";

/**
 * Logged-in user from root `+layout.server.ts` (merged into `page.data`).
 * Use in any `.svelte` component; prefer server `locals.user` in load/actions.
 */
export function getSessionUser(): PublicUser | null {
	return page.data.user ?? null;
}
