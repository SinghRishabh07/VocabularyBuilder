/** Fallback avatar when user has no image (DiceBear SVG). */
export function dicebearAvatarUrl(seed: string): string {
	return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}&backgroundColor=c27aff`;
}

/** Use for Google-hosted profile photos so the image is not blocked by referrer checks. */
export const imgReferrerPolicy = "no-referrer" as const;
