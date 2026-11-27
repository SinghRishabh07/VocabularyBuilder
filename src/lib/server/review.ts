import { prisma } from "$lib/prisma";
import { splitPersonalNote } from "$lib/personalNoteSplit";
import { countByDateFromCreatedRows, currentStreak } from "$lib/server/progressStats";
import {
	MASTERED_INTERVAL,
	STRUGGLING_MAX_INTERVAL,
	reviewPriority,
	weaknessScore,
	type PriorityInput,
} from "$lib/server/srs";
import type { PosKey, ReviewActivity, ReviewItem, ReviewOverview } from "$lib/types";

export type ReviewMode = "smart" | "flashcards";
export const SESSION_SIZES = [5, 10, 20] as const;
const NEW_WORDS_PER_SESSION = 4;
const MIN_WORDS_FOR_MCQ = 4;
const MAX_MEANING_LEN = 160;

type Candidate = PriorityInput & { id: string; word: string };
type Reason = ReviewItem["reason"];

function shuffle<T>(arr: T[]): T[] {
	const a = [...arr];
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j]!, a[i]!];
	}
	return a;
}

function truncate(s: string, n = MAX_MEANING_LEN): string {
	const t = s.trim().replace(/\s+/g, " ");
	return t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t;
}

function escapeRe(s: string) {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Pick which words go into a session:
 *  1. due words that were reviewed before (most urgent first),
 *  2. a few never-reviewed words (most recently added first),
 *  3. if still short, extra practice on the weakest not-yet-due words.
 */
function pickWords(all: Candidate[], size: number, now: Date): { c: Candidate; reason: Reason }[] {
	const due = all
		.filter((w) => w.reviewCount > 0 && w.reviewDueAt <= now)
		.sort((a, b) => reviewPriority(b, now) - reviewPriority(a, now));
	const fresh = all
		.filter((w) => w.reviewCount === 0)
		.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
	const practice = all
		.filter((w) => w.reviewCount > 0 && w.reviewDueAt > now)
		.sort((a, b) => weaknessScore(b, now) - weaknessScore(a, now));

	const picked: { c: Candidate; reason: Reason }[] = [];
	const used = new Set<string>();
	const take = (list: Candidate[], n: number, reason: (c: Candidate) => Reason) => {
		for (const c of list) {
			if (picked.length >= size || n <= 0) break;
			if (used.has(c.id)) continue;
			used.add(c.id);
			picked.push({ c, reason: reason(c) });
			n--;
		}
	};
	const dueReason = (c: Candidate): Reason =>
		c.lapseCount > 0 && c.reviewInterval < STRUGGLING_MAX_INTERVAL ? "struggling" : "due";

	const newSlots = Math.min(fresh.length, NEW_WORDS_PER_SESSION);
	take(due, size - newSlots, dueReason);
	take(fresh, size - picked.length, () => "new");
	take(due, size - picked.length, dueReason);
	take(practice, size - picked.length, (c) => (c.lapseCount > 0 ? "struggling" : "practice"));
	return picked;
}

/** Harder activities as a word becomes better known. */
function chooseActivity(
	c: Candidate,
	reason: Reason,
	canMcq: boolean,
	hasCloze: boolean,
): ReviewActivity {
	if (!canMcq) return hasCloze && c.reviewInterval >= 1 ? "fill-blank" : "flashcard";
	if (reason === "new") return Math.random() < 0.5 ? "flashcard" : "meaning-mcq";
	if (reason === "struggling") return Math.random() < 0.5 ? "meaning-mcq" : "flashcard";
	if (c.reviewInterval < 3) return Math.random() < 0.5 ? "meaning-mcq" : "word-mcq";
	if (hasCloze && Math.random() < 0.6) return "fill-blank";
	return Math.random() < 0.5 ? "word-mcq" : "meaning-mcq";
}

type Detail = {
	id: string;
	word: string;
	meanings: {
		type: PosKey;
		dictionaryMeaning: string | null;
		personalMeaning: string | null;
		examples: { dictionaryExample: string | null; personalExample: string | null }[];
	}[];
};

function primaryMeaning(d: Detail): { pos: PosKey; meaning: string } | null {
	for (const m of d.meanings) {
		const text = m.dictionaryMeaning?.trim() || splitPersonalNote(m.personalMeaning).body.trim();
		if (text) return { pos: m.type, meaning: truncate(text) };
	}
	return null;
}

function findCloze(d: Detail): { cloze: string; answerForm: string; example: string } | null {
	// "mitigate" should also match "mitigating"; "remedy" → "remedies"
	const stem = d.word.length > 4 ? d.word.replace(/[ey]$/, "") : d.word;
	const re = new RegExp(`\\b(${escapeRe(stem)}[a-z]{0,5})\\b`, "i");
	for (const m of d.meanings) {
		for (const ex of m.examples) {
			for (const sentence of [ex.dictionaryExample, ex.personalExample]) {
				if (!sentence) continue;
				const match = sentence.match(re);
				if (match?.[1]) {
					return {
						cloze: sentence.replace(re, "_____"),
						answerForm: match[1],
						example: sentence,
					};
				}
			}
		}
	}
	return null;
}

function anyExample(d: Detail): string | null {
	for (const m of d.meanings)
		for (const ex of m.examples) {
			const s = ex.dictionaryExample || ex.personalExample;
			if (s) return s;
		}
	return null;
}

export async function buildSession(
	userId: string,
	mode: ReviewMode,
	size: number,
	now: Date = new Date(),
): Promise<ReviewItem[]> {
	// Lightweight scheduling fields for every word; full details only for what we use
	const all: Candidate[] = await prisma.word.findMany({
		where: { userId, meanings: { some: {} } },
		select: {
			id: true,
			word: true,
			createdAt: true,
			reviewEase: true,
			reviewInterval: true,
			reviewDueAt: true,
			lastReviewedAt: true,
			reviewCount: true,
			correctCount: true,
			lapseCount: true,
		},
	});
	if (!all.length) return [];

	const picked = pickWords(all, size, now);
	const pickedIds = new Set(picked.map((p) => p.c.id));
	const distractorIds = shuffle(all.filter((w) => !pickedIds.has(w.id)))
		.slice(0, 40)
		.map((w) => w.id);

	const details: Detail[] = await prisma.word.findMany({
		where: { userId, id: { in: [...pickedIds, ...distractorIds] } },
		select: {
			id: true,
			word: true,
			meanings: {
				orderBy: { id: "asc" },
				select: {
					type: true,
					dictionaryMeaning: true,
					personalMeaning: true,
					examples: { select: { dictionaryExample: true, personalExample: true } },
				},
			},
		},
	});
	const byId = new Map(details.map((d) => [d.id, d]));

	// Pool of (word, meaning) pairs to draw wrong options from
	const pool = details
		.map((d) => ({ id: d.id, word: d.word, pm: primaryMeaning(d) }))
		.filter((p): p is { id: string; word: string; pm: { pos: PosKey; meaning: string } } => !!p.pm);
	const canMcq = pool.length >= MIN_WORDS_FOR_MCQ;

	const items: ReviewItem[] = [];
	for (const { c, reason } of picked) {
		const d = byId.get(c.id);
		const pm = d && primaryMeaning(d);
		if (!d || !pm) continue;
		const cloze = findCloze(d);
		const activity: ReviewActivity =
			mode === "flashcards" ? "flashcard" : chooseActivity(c, reason, canMcq, Boolean(cloze));

		const item: ReviewItem = {
			wordId: d.id,
			word: d.word,
			pos: pm.pos,
			meaning: pm.meaning,
			activity,
			reason,
			example: cloze?.example ?? anyExample(d),
		};

		if (activity === "meaning-mcq" || activity === "word-mcq") {
			// Prefer distractors with the same part of speech — makes guessing harder
			const others = shuffle(pool.filter((p) => p.id !== d.id && p.pm.meaning !== pm.meaning));
			others.sort((a, b) => Number(b.pm.pos === pm.pos) - Number(a.pm.pos === pm.pos));
			const wrong = others.slice(0, 3);
			item.options = shuffle(
				activity === "meaning-mcq"
					? [pm.meaning, ...wrong.map((w) => w.pm.meaning)]
					: [d.word, ...wrong.map((w) => w.word)],
			);
		} else if (activity === "fill-blank" && cloze) {
			item.cloze = cloze.cloze;
			item.answerForm = cloze.answerForm;
		}
		items.push(item);
	}
	return shuffle(items);
}

function utcDayStart(d: Date): Date {
	const x = new Date(d);
	x.setUTCHours(0, 0, 0, 0);
	return x;
}

export async function getReviewOverview(userId: string, now: Date = new Date()): Promise<ReviewOverview> {
	const base = { userId };
	const [totalWords, dueNow, newWords, mastered, struggling, weak, sessions] = await Promise.all([
		prisma.word.count({ where: base }),
		prisma.word.count({ where: { ...base, reviewCount: { gt: 0 }, reviewDueAt: { lte: now } } }),
		prisma.word.count({ where: { ...base, reviewCount: 0 } }),
		prisma.word.count({ where: { ...base, reviewInterval: { gte: MASTERED_INTERVAL } } }),
		prisma.word.count({
			where: { ...base, lapseCount: { gt: 0 }, reviewInterval: { lt: STRUGGLING_MAX_INTERVAL } },
		}),
		prisma.word.findMany({
			where: { ...base, lapseCount: { gt: 0 }, reviewInterval: { lt: STRUGGLING_MAX_INTERVAL } },
			orderBy: [{ lapseCount: "desc" }, { reviewEase: "asc" }],
			take: 6,
			select: { id: true, word: true, lapseCount: true, reviewCount: true, correctCount: true },
		}),
		prisma.reviewSession.findMany({
			where: { ...base, answeredCount: { gt: 0 }, startedAt: { gte: new Date(now.getTime() - 400 * 86_400_000) } },
			orderBy: { startedAt: "desc" },
			select: { startedAt: true, answeredCount: true, correctCount: true, completedAt: true },
		}),
	]);

	const countByDate = countByDateFromCreatedRows(sessions.map((s) => ({ createdAt: s.startedAt })));
	const today = utcDayStart(now);
	const reviewedToday = sessions
		.filter((s) => s.startedAt >= today)
		.reduce((sum, s) => sum + s.answeredCount, 0);
	const last = sessions[0];

	return {
		totalWords,
		dueNow,
		newWords,
		mastered,
		struggling,
		reviewStreak: currentStreak(countByDate, now),
		reviewedToday,
		lastSession: last
			? {
					answered: last.answeredCount,
					correct: last.correctCount,
					completedAt: last.completedAt?.toISOString() ?? null,
				}
			: null,
		needsPractice: weak.map((w) => ({
			id: w.id,
			word: w.word,
			lapses: w.lapseCount,
			accuracy: w.reviewCount ? Math.round((w.correctCount / w.reviewCount) * 100) : null,
		})),
	};
}
