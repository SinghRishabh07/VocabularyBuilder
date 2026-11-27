import { getReviewOverview } from "$lib/server/review";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) return { overview: null };
	return { overview: await getReviewOverview(locals.user.id) };
};
