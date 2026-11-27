import { timingSafeEqual } from "node:crypto";
import { env } from "$env/dynamic/private";
import { json } from "@sveltejs/kit";
import { sendStreakRiskEmail } from "$lib/server/email";
import { prisma } from "$lib/prisma";
import { countByDateFromCreatedRows, currentStreak } from "$lib/server/progressStats";
import type { RequestHandler } from "./$types";

/** 18:00–23:59 UTC = last 6 hours before the next UTC midnight (streak day boundary). */
const UTC_REMINDER_HOUR_START = 18;
/** Only recent activity matters for the current streak; bounds the query. */
const LOOKBACK_DAYS = 400;

function secretMatches(given: string | null, expected: string): boolean {
	if (!given) return false;
	const a = Buffer.from(given);
	const b = Buffer.from(expected);
	return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Call from an external scheduler (Vercel Cron, GitHub Actions, crontab) once per
 * hour in the 18:00–23:59 UTC window, e.g. `0 18-23 * * *`.
 *
 * Secured with `Authorization: Bearer <CRON_SECRET>` (preferred) or `?key=<CRON_SECRET>`.
 *
 * Duplicate protection: a user is "claimed" for the day with a conditional update
 * before sending, so overlapping cron runs can't both email them. If the send
 * fails, the claim is released so the next hourly run retries.
 */
const handler: RequestHandler = async ({ request, url }) => {
	const expected = env.CRON_SECRET?.trim();
	if (!expected) {
		console.error("[cron] CRON_SECRET is not set — streak reminders are disabled");
		return json({ error: "Server misconfigured: CRON_SECRET is not set" }, { status: 500 });
	}
	const auth = request.headers.get("authorization");
	const bearer = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null;
	if (!secretMatches(bearer || url.searchParams.get("key"), expected)) {
		return json({ error: "Unauthorized" }, { status: 401 });
	}

	const now = new Date();
	const hourUtc = now.getUTCHours();
	if (hourUtc < UTC_REMINDER_HOUR_START) {
		return json({
			ok: true,
			skipped: "outside_utc_window",
			window: `${UTC_REMINDER_HOUR_START}:00–24:00 UTC`,
			utcHour: hourUtc,
		});
	}

	const todayYmd = now.toISOString().slice(0, 10);
	const todayStart = new Date(`${todayYmd}T00:00:00.000Z`);
	const since = new Date(todayStart.getTime() - LOOKBACK_DAYS * 86_400_000);

	// Users with a word yesterday (could have a live streak), none today, not yet reminded today
	const candidates = await prisma.user.findMany({
		where: {
			OR: [{ streakRemindYmd: null }, { streakRemindYmd: { not: todayYmd } }],
			words: {
				some: { createdAt: { gte: new Date(todayStart.getTime() - 86_400_000), lt: todayStart } },
				none: { createdAt: { gte: todayStart } },
			},
		},
		select: {
			id: true,
			email: true,
			name: true,
			streakRemindYmd: true,
			words: { where: { createdAt: { gte: since } }, select: { createdAt: true } },
		},
	});

	let sent = 0;
	let failed = 0;
	for (const u of candidates) {
		const streak = currentStreak(countByDateFromCreatedRows(u.words), now);
		if (streak < 1) continue;

		const claim = await prisma.user.updateMany({
			where: { id: u.id, OR: [{ streakRemindYmd: null }, { streakRemindYmd: { not: todayYmd } }] },
			data: { streakRemindYmd: todayYmd },
		});
		if (claim.count === 0) continue; // another run already handled this user

		const displayName = u.name?.trim() || u.email.split("@")[0] || "there";
		const result = await sendStreakRiskEmail({
			userId: u.id,
			email: u.email,
			displayName,
			streakDays: streak,
			dayKey: todayYmd,
		});
		if (result.ok) {
			sent++;
		} else {
			failed++;
			await prisma.user.updateMany({
				where: { id: u.id, streakRemindYmd: todayYmd },
				data: { streakRemindYmd: u.streakRemindYmd },
			});
		}
	}

	return json({ ok: true, sent, failed, checked: candidates.length, todayYmd, utcHour: hourUtc });
};

export const GET = handler;
export const POST = handler;
