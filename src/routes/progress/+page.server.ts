import { prisma } from "$lib/prisma";
import { getVocabularyLevelInfo } from "$lib/server/vocabularyLevel";
import {
	buildDateIndex,
	buildHeatmapGrid,
	buildMilestones,
	currentStreak,
	longestStreakFromDates,
	weeklyBarSeries,
	monthlyBarSeries,
	yearlyBarSeries,
	totalsByPrimaryPos,
	type WordForProgress,
} from "$lib/server/progressStats";
import type { PageServerLoad } from "./$types";

function startUtcDay(d: Date): Date {
	const x = new Date(d);
	x.setUTCHours(0, 0, 0, 0);
	return x;
}

function addUtcDays(d: Date, n: number): Date {
	const x = new Date(d);
	x.setUTCDate(x.getUTCDate() + n);
	return x;
}

function utcKey(d: Date): string {
	return d.toISOString().slice(0, 10);
}

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
	const endDay = startUtcDay(now);

	let weeklyWordsAdded = 0;
	const weekStart = addUtcDays(endDay, -6);
	for (let d = new Date(weekStart); d <= endDay; d = addUtcDays(d, 1)) {
		weeklyWordsAdded += countByDate.get(utcKey(d)) ?? 0;
	}
	const goal = Math.max(1, user.dailyWordGoal);
	const weeklyTarget = 7 * goal;
	const weeklyProgressPercent = Math.min(
		100,
		Math.round((weeklyWordsAdded / weeklyTarget) * 100),
	);

	let activeDays28 = 0;
	for (let i = 0; i < 28; i++) {
		const d = addUtcDays(endDay, -i);
		if ((countByDate.get(utcKey(d)) ?? 0) > 0) activeDays28++;
	}
	const consistencyRate = Math.round((activeDays28 / 28) * 100);

	const level = getVocabularyLevelInfo(totalWords);
	const posTotals = totalsByPrimaryPos(wfp);

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
		weeklyWordsAdded,
		weeklyTarget,
		weeklyProgressPercent,
		consistencyRate,
		level,
		posTotals,
		barWeekly,
		barMonthly,
		barYearly,
		heatmap,
		milestones,
	};
};
