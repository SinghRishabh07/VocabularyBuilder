/**
 * Simplified SM-2 spaced repetition. Pure functions — no DB access — so the
 * scheduling rules are easy to reason about and test.
 *
 *   forgot → relearn soon (10 min), ease drops, counts as a lapse
 *   hard   → recalled with effort: interval grows slowly, ease drops a little
 *   good   → 1 day → 3 days → interval × ease (ease recovers slowly)
 */
import type { ReviewGrade } from "$lib/types";

export const MIN_EASE = 1.3;
export const MAX_EASE = 3.0;
export const MAX_INTERVAL_DAYS = 180;
/** Interval (days) at which a word counts as "mastered" */
export const MASTERED_INTERVAL = 21;
/** A word that lapsed and hasn't stabilised past this interval is "struggling" */
export const STRUGGLING_MAX_INTERVAL = 7;

const DAY_MS = 86_400_000;
const RELEARN_MS = 10 * 60 * 1000;

export type SrsState = {
	reviewEase: number;
	reviewInterval: number;
	reviewCount: number;
	correctCount: number;
	lapseCount: number;
};

export type SrsUpdate = SrsState & { reviewDueAt: Date; lastReviewedAt: Date };

export const GRADES: readonly ReviewGrade[] = ["forgot", "hard", "good"];

export function isGrade(v: unknown): v is ReviewGrade {
	return typeof v === "string" && (GRADES as readonly string[]).includes(v);
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export function applyGrade(s: SrsState, grade: ReviewGrade, now: Date = new Date()): SrsUpdate {
	let ease = s.reviewEase;
	let interval = s.reviewInterval;
	let lapses = s.lapseCount;
	let dueMs: number;

	if (grade === "forgot") {
		ease -= 0.2;
		interval = 0;
		lapses += 1;
		dueMs = now.getTime() + RELEARN_MS;
	} else if (grade === "hard") {
		ease -= 0.15;
		interval = Math.max(1, Math.round(interval * 1.2));
		dueMs = now.getTime() + interval * DAY_MS;
	} else {
		interval = interval <= 0 ? 1 : interval === 1 ? 3 : Math.round(interval * ease);
		ease += 0.05;
		dueMs = now.getTime() + clamp(interval, 1, MAX_INTERVAL_DAYS) * DAY_MS;
	}

	interval = clamp(interval, 0, MAX_INTERVAL_DAYS);
	return {
		reviewEase: Math.round(clamp(ease, MIN_EASE, MAX_EASE) * 100) / 100,
		reviewInterval: interval,
		reviewCount: s.reviewCount + 1,
		correctCount: s.correctCount + (grade === "forgot" ? 0 : 1),
		lapseCount: lapses,
		reviewDueAt: new Date(dueMs),
		lastReviewedAt: now,
	};
}

export type PriorityInput = SrsState & {
	reviewDueAt: Date;
	createdAt: Date;
	lastReviewedAt: Date | null;
};

/**
 * Higher = more urgent. Overdue relative to the interval, frequently missed,
 * and low-accuracy words float to the top.
 */
export function reviewPriority(w: PriorityInput, now: Date = new Date()): number {
	const overdueDays = (now.getTime() - w.reviewDueAt.getTime()) / DAY_MS;
	const overdueRatio = overdueDays / Math.max(1, w.reviewInterval);
	const accuracy = w.reviewCount ? w.correctCount / w.reviewCount : 1;
	return overdueRatio + w.lapseCount * 0.6 + (1 - accuracy) * 1.5 + (MAX_EASE - w.reviewEase);
}

/** For extra practice when nothing is due: weakest and least recently seen first. */
export function weaknessScore(w: PriorityInput, now: Date = new Date()): number {
	const sinceDays = w.lastReviewedAt
		? (now.getTime() - w.lastReviewedAt.getTime()) / DAY_MS
		: 30;
	const accuracy = w.reviewCount ? w.correctCount / w.reviewCount : 0.5;
	return (1 - accuracy) * 3 + w.lapseCount + (MAX_EASE - w.reviewEase) * 2 + Math.min(sinceDays, 30) / 10;
}
