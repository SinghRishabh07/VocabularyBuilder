import type { ProgressBarBucket } from "$lib/types";

const POS = ["noun", "verb", "adjective", "adverb"] as const;
export type PartOfSpeechKey = (typeof POS)[number];

export type WordForProgress = {
	createdAt: Date;
	meanings: { type: PartOfSpeechKey; id: string }[];
};

export const POS_LIST: PartOfSpeechKey[] = [...POS];

/** Shared helper for streak / cron: word rows → per-UTC-day counts. */
export function countByDateFromCreatedRows(
	rows: { createdAt: Date }[],
): Map<string, number> {
	const m = new Map<string, number>();
	for (const { createdAt } of rows) {
		const k = createdAt.toISOString().slice(0, 10);
		m.set(k, (m.get(k) ?? 0) + 1);
	}
	return m;
}

function utcDateKey(d: Date): string {
	return d.toISOString().slice(0, 10);
}

function addUtcDays(d: Date, n: number): Date {
	const x = new Date(d);
	x.setUTCDate(x.getUTCDate() + n);
	return x;
}

function startUtcDay(d: Date): Date {
	const x = new Date(d);
	x.setUTCHours(0, 0, 0, 0);
	return x;
}

function startOfWeekSundayUtc(d: Date): Date {
	const t = startUtcDay(d);
	return addUtcDays(t, -t.getUTCDay());
}

function primaryPos(w: WordForProgress): PartOfSpeechKey {
	if (!w.meanings.length) return "noun";
	return [...w.meanings].sort((a, b) => a.id.localeCompare(b.id))[0]!.type;
}

export function buildDateIndex(words: WordForProgress[]) {
	const countByDate = new Map<string, number>();
	const byDateCategory = new Map<string, Partial<Record<PartOfSpeechKey, number>>>();

	for (const w of words) {
		const k = utcDateKey(w.createdAt);
		countByDate.set(k, (countByDate.get(k) ?? 0) + 1);
		const pos = primaryPos(w);
		const byCat = byDateCategory.get(k) ?? {};
		byCat[pos] = (byCat[pos] ?? 0) + 1;
		byDateCategory.set(k, byCat);
	}
	return { countByDate, byDateCategory };
}

/**
 * Streak: consecutive calendar days (UTC) with at least one word, ending on the
 * last active day. If you miss both today and yesterday, streak is 0.
 * If you have words yesterday but not yet today, streak continues from yesterday backward.
 */
export function currentStreak(countByDate: Map<string, number>, now: Date = new Date()): number {
	const today = utcDateKey(now);
	const yesterday = utcDateKey(addUtcDays(startUtcDay(now), -1));

	let start = today;
	if (!countByDate.get(today)) {
		if (!countByDate.get(yesterday)) return 0;
		start = yesterday;
	}

	let c = 0;
	for (
		let d = new Date(start + "T12:00:00.000Z");
		(countByDate.get(utcDateKey(d)) ?? 0) > 0;
		d = addUtcDays(d, -1)
	) {
		c++;
	}
	return c;
}

export function longestStreakFromDates(dates: string[]): number {
	return longestStreakEndInfo(dates).len;
}

/** End key (YYYY-MM-DD) = last day of a longest consecutive run. */
function longestStreakEndInfo(dates: string[]): { len: number; end: string } {
	if (!dates.length) return { len: 0, end: "" };
	const s = [...new Set(dates)].sort();
	let best = 1;
	let bestEnd = s[0]!;
	let run = 1;
	let runEnd = s[0]!;
	for (let i = 1; i < s.length; i++) {
		const pa = new Date(s[i - 1]! + "T12:00:00.000Z");
		const cur = new Date(s[i]! + "T12:00:00.000Z");
		if ((cur.getTime() - pa.getTime()) / 86_400_000 === 1) {
			run++;
			runEnd = s[i]!;
		} else {
			if (run > best) {
				best = run;
				bestEnd = runEnd;
			}
			run = 1;
			runEnd = s[i]!;
		}
	}
	if (run > best) {
		best = run;
		bestEnd = runEnd;
	}
	return { len: best, end: bestEnd };
}

function emptyCats(): Record<PartOfSpeechKey, number> {
	return { noun: 0, verb: 0, adjective: 0, adverb: 0 };
}

function sumRange(
	countByDate: Map<string, number>,
	byDateCategory: Map<string, Partial<Record<PartOfSpeechKey, number>>>,
	from: Date,
	to: Date,
): Record<PartOfSpeechKey, number> {
	const acc = emptyCats();
	for (let d = startUtcDay(new Date(from)); d <= to; d = addUtcDays(d, 1)) {
		const k = utcDateKey(d);
		if ((countByDate.get(k) ?? 0) < 1) continue;
		const byCat = byDateCategory.get(k) ?? {};
		for (const p of POS) {
			acc[p] += byCat[p] ?? 0;
		}
	}
	return acc;
}

function bucketWithTotal(
	cats: Record<PartOfSpeechKey, number>,
	label: string,
	start: string,
	end: string,
): ProgressBarBucket {
	const total = POS.reduce((s, p) => s + cats[p], 0);
	return {
		label,
		periodStart: start,
		periodEnd: end,
		noun: cats.noun,
		verb: cats.verb,
		adjective: cats.adjective,
		adverb: cats.adverb,
		total,
	};
}

export function weeklyBarSeries(
	countByDate: Map<string, number>,
	byDateCategory: Map<string, Partial<Record<PartOfSpeechKey, number>>>,
	now: Date,
): ProgressBarBucket[] {
	const end = startUtcDay(now);
	const start = addUtcDays(end, -6);
	const out: ProgressBarBucket[] = [];
	for (let d = new Date(start); d <= end; d = addUtcDays(d, 1)) {
		const s = d;
		const e = d;
		const label = new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(d);
		const k = utcDateKey(d);
		const cats = emptyCats();
		if ((countByDate.get(k) ?? 0) > 0) {
			const byCat = byDateCategory.get(k) ?? {};
			for (const p of POS) {
				cats[p] = byCat[p] ?? 0;
			}
		}
		out.push(
			bucketWithTotal(
				cats,
				label,
				utcDateKey(s),
				utcDateKey(e),
			),
		);
	}
	return out;
}

/** Last 4 full weeks: each week runs Sun–Sat, oldest first */
export function monthlyBarSeries(
	countByDate: Map<string, number>,
	byDateCategory: Map<string, Partial<Record<PartOfSpeechKey, number>>>,
	now: Date,
): ProgressBarBucket[] {
	const thisWeekStart = startOfWeekSundayUtc(now);
	const out: ProgressBarBucket[] = [];
	for (let w = 3; w >= 0; w--) {
		const weekStart = addUtcDays(thisWeekStart, -w * 7);
		const weekEnd = addUtcDays(weekStart, 6);
		const cats = sumRange(countByDate, byDateCategory, weekStart, weekEnd);
		const wk = 4 - w;
		out.push(
			bucketWithTotal(
				cats,
				`W${wk}`,
				utcDateKey(weekStart),
				utcDateKey(weekEnd),
			),
		);
	}
	return out;
}

export function yearlyBarSeries(
	countByDate: Map<string, number>,
	byDateCategory: Map<string, Partial<Record<PartOfSpeechKey, number>>>,
	now: Date,
): ProgressBarBucket[] {
	const y = now.getUTCFullYear();
	const todayU = startUtcDay(now);
	const out: ProgressBarBucket[] = [];
	for (let m = 0; m < 12; m++) {
		const from = new Date(Date.UTC(y, m, 1));
		const lastOfMonth = new Date(Date.UTC(y, m + 1, 0, 0, 0, 0, 0));
		const label = new Intl.DateTimeFormat(undefined, { month: "short" }).format(from);
		if (from.getTime() > todayU.getTime()) {
			out.push(bucketWithTotal(emptyCats(), label, utcDateKey(from), utcDateKey(from)));
			continue;
		}
		const to = lastOfMonth.getTime() > todayU.getTime() ? todayU : lastOfMonth;
		const cats = sumRange(countByDate, byDateCategory, from, to);
		out.push(bucketWithTotal(cats, label, utcDateKey(from), utcDateKey(to)));
	}
	return out;
}

export type HeatmapCell = { dateKey: string; count: number; level: 0 | 1 | 2 | 3 };

const WEEKS = 53;
const DOW = 7;

function countLevel(n: number): 0 | 1 | 2 | 3 {
	if (n <= 0) return 0;
	if (n === 1) return 1;
	if (n <= 3) return 2;
	return 3;
}

/** 7 rows × 53 columns: row 0 = Sunday. Columns left→right, oldest → newest. */
export function buildHeatmapGrid(
	countByDate: Map<string, number>,
	now: Date,
): {
	cells: HeatmapCell[][];
	columnMonthLabels: (string | null)[];
	totalWordsInWindow: number;
	activeDaysInWindow: number;
} {
	const thisWeekSun = startOfWeekSundayUtc(now);
	// Oldest cell is Sunday 52 weeks before this week; 53 full weeks in view
	const gridStart = addUtcDays(thisWeekSun, -52 * DOW);
	const cells: HeatmapCell[][] = Array.from({ length: DOW }, () => new Array(WEEKS));
	let totalWordsInWindow = 0;
	const active = new Set<string>();
	const today0 = startUtcDay(now);
	for (let c = 0; c < WEEKS; c++) {
		for (let r = 0; r < DOW; r++) {
			const idx = c * DOW + r;
			const d = addUtcDays(gridStart, idx);
			if (d > today0) {
				cells[r]![c] = { dateKey: utcDateKey(d), count: 0, level: 0 };
			} else {
				const dk = utcDateKey(d);
				const n = countByDate.get(dk) ?? 0;
				if (n > 0) active.add(dk);
				totalWordsInWindow += n;
				cells[r]![c] = { dateKey: dk, count: n, level: countLevel(n) };
			}
		}
	}
	// one label per column (at week start) for header row
	const columnMonthLabels: (string | null)[] = new Array(WEEKS).fill(null);
	let lastM = -1;
	for (let c = 0; c < WEEKS; c++) {
		const d = addUtcDays(gridStart, c * DOW);
		const m = d.getUTCMonth();
		if (m !== lastM) {
			lastM = m;
			columnMonthLabels[c] = new Intl.DateTimeFormat(undefined, { month: "short" }).format(d);
		}
	}
	return {
		cells,
		columnMonthLabels,
		totalWordsInWindow,
		activeDaysInWindow: active.size,
	};
}

export type MilestoneItem = { title: string; detail: string; at: string };

function relTime(from: Date, at: Date): string {
	const days = Math.floor((from.getTime() - at.getTime()) / 86_400_000);
	if (days <= 0) return "Today";
	if (days === 1) return "Yesterday";
	if (days < 7) return `${days} days ago`;
	if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) === 1 ? "" : "s"} ago`;
	if (days < 365) return `${Math.floor(days / 30)} month${Math.floor(days / 30) === 1 ? "" : "s"} ago`;
	return `${Math.floor(days / 365)} year${Math.floor(days / 365) === 1 ? "" : "s"} ago`;
}

export function buildMilestones(
	words: WordForProgress[],
	countByDate: Map<string, number>,
	longest: number,
	now: Date = new Date(),
): MilestoneItem[] {
	const items: MilestoneItem[] = [];

	// Best day
	let bestCount = 0;
	let bestKey = "";
	for (const [k, v] of countByDate) {
		if (v > bestCount) {
			bestCount = v;
			bestKey = k;
		}
	}
	if (bestKey && bestCount > 0) {
		items.push({
			title: "Best day",
			detail: `${bestCount} word${bestCount === 1 ? "" : "s"}`,
			at: new Date(bestKey + "T12:00:00.000Z").toISOString(),
		});
	}

	// Word count milestones: first time crossing thresholds
	const sorted = [...words].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
	const thresholds = [10, 25, 50, 100, 250, 500, 1000] as const;
	for (const t of thresholds) {
		if (sorted.length < t) continue;
		const w = sorted[t - 1]!;
		items.push({
			title: `Reached ${t} words`,
			detail: relTime(now, w.createdAt),
			at: w.createdAt.toISOString(),
		});
	}

	// Longest learning streak in history
	if (longest > 0) {
		const { len, end: endK } = longestStreakEndInfo([...countByDate.keys()]);
		if (len > 0 && endK) {
			const endD = new Date(endK + "T12:00:00.000Z");
			items.push({
				title: `${len}-day learning streak`,
				detail: `Ended ${relTime(now, endD)}`,
				at: endD.toISOString(),
			});
		}
	}

	// Deduplicate and sort by recency (at desc)
	return [...new Map(items.map((m) => [m.title + m.detail, m])).values()]
		.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
		.slice(0, 5);
}
