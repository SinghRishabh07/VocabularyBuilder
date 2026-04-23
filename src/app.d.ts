import type { PublicUser } from "$lib/types";

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user: PublicUser | null;
		}
		interface PageData {
			user?: PublicUser | null;
			/** Set when a word add leveled the user; cleared by dismiss endpoint */
			levelUp?: { from: number; to: number } | null;
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
