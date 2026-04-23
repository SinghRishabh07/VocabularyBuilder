import { prisma } from "$lib/prisma";
import { currentStreak } from "$lib/server/progressStats";
import { getVocabularyLevelInfo } from "$lib/server/vocabularyLevel";
import type { PageServerLoad } from "./$types";
import type { ProfileStats } from "$lib/types";

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

function countByDateKey(rows: { createdAt: Date }[]): Map<string, number> {
	const m = new Map<string, number>();
	for (const { createdAt } of rows) {
		const k = createdAt.toISOString().slice(0, 10);
		m.set(k, (m.get(k) ?? 0) + 1);
	}
	return m;
}

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		return { profile: null as ProfileStats | null };
	}

	const [user, wordRows] = await Promise.all([
		prisma.user.findUniqueOrThrow({
			where: { id: locals.user.id },
			select: { dailyWordGoal: true },
		}),
		prisma.word.findMany({
			where: { userId: locals.user.id },
			select: { createdAt: true },
		}),
	]);

	const totalWords = wordRows.length;
	const countByDate = countByDateKey(wordRows);
	const streakDays = currentStreak(countByDate, new Date());

	const now = new Date();
	const weekStart = addUtcDays(startUtcDay(now), -6);
	const weeklyWords = wordRows.filter((r) => r.createdAt >= weekStart).length;
	const goal = Math.max(1, user.dailyWordGoal);
	const weeklyTarget = 7 * goal;
	const weeklyProgressPercent = Math.min(
		100,
		Math.round((weeklyWords / weeklyTarget) * 100),
	);

	const level = getVocabularyLevelInfo(totalWords);

	const profile: ProfileStats = {
		totalWords,
		streakDays,
		weeklyProgressPercent,
		level,
	};

	return { profile };
};
