import { prisma } from "$lib/prisma";
import {
	buildDateIndex,
	buildHeatmapGrid,
	buildMilestones,
	currentStreak,
	longestStreakFromDates,
	weeklyBarSeries,
	monthlyBarSeries,
	yearlyBarSeries,
	type WordForProgress,
} from "$lib/server/progressStats";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		return { loggedIn: false as const };
	}

	const [user, words] = await Promise.all([
		prisma.user.findUniqueOrThrow({
			where: { id: locals.user.id },
			select: { dailyWordGoal: true },
		}),
		prisma.word.findMany({
			where: { userId: locals.user.id },
			select: {
				createdAt: true,
				meanings: { select: { type: true, id: true } },
			},
		}),
	]);

	const wfp: WordForProgress[] = words.map((o) => ({
		createdAt: o.createdAt,
		meanings: o.meanings.map((m) => ({ type: m.type, id: m.id })),
	}));

	const { countByDate, byDateCategory } = buildDateIndex(wfp);
	const todayKey = new Date().toISOString().slice(0, 10);
	const todayWords = countByDate.get(todayKey) ?? 0;
	const allDates = [...countByDate.keys()];
	const longSt = longestStreakFromDates(allDates);
	const curSt = currentStreak(countByDate, new Date());
	const totalWords = wfp.length;
	const activeDays = countByDate.size;
	const now = new Date();

	const barWeekly = weeklyBarSeries(countByDate, byDateCategory, now);
	const barMonthly = monthlyBarSeries(countByDate, byDateCategory, now);
	const barYearly = yearlyBarSeries(countByDate, byDateCategory, now);
	const heatmap = buildHeatmapGrid(countByDate, now);
	const milestones = buildMilestones(wfp, countByDate, longSt, now);

	return {
		loggedIn: true as const,
		currentStreak: curSt,
		longestStreak: longSt,
		totalWords,
		activeDays,
		todayWords,
		dailyWordGoal: user.dailyWordGoal,
		barWeekly,
		barMonthly,
		barYearly,
		heatmap,
		milestones,
	};
};
