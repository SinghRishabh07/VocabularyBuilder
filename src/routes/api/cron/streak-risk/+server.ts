import { env } from "$env/dynamic/private";
import { json } from "@sveltejs/kit";
import { sendStreakRiskEmail } from "$lib/server/email";
import { prisma } from "$lib/prisma";
import { countByDateFromCreatedRows, currentStreak } from "$lib/server/progressStats";
import type { RequestHandler } from "./$types";

/** 18:00–23:59 UTC = last 6 hours before the next UTC midnight (streak day boundary). */
const UTC_REMINDER_HOUR_START = 18;

/**
 * Call from an external scheduler (Vercel Cron, GitHub Actions, crontab) once per
 * hour in the 18:00–23:59 UTC window, e.g. `0 18-23 * * *`.
 *
 * Secured with `Authorization: Bearer <CRON_SECRET>` or `?key=<CRON_SECRET>`.
 */
export const GET: RequestHandler = async ({ request, url }) => {
	const expected = env.CRON_SECRET?.trim();
	if (!expected) {
		console.error("[cron] CRON_SECRET is not set");
		return json({ error: "Server misconfigured" }, { status: 500 });
	}
	const auth = request.headers.get("authorization");
	const bearer = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null;
	const key = url.searchParams.get("key");
	const given = bearer || key;
	if (given !== expected) {
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

	const candidates = await prisma.user.findMany({
		where: { words: { some: {} } },
		select: {
			id: true,
			email: true,
			name: true,
			streakRemindYmd: true,
			words: { select: { createdAt: true } },
		},
	});

	let sent = 0;
	for (const u of candidates) {
		if (u.streakRemindYmd === todayYmd) {
			continue;
		}
		const countByDate = countByDateFromCreatedRows(u.words);
		const todayWords = countByDate.get(todayYmd) ?? 0;
		if (todayWords > 0) {
			continue;
		}
		const streak = currentStreak(countByDate, now);
		if (streak < 1) {
			continue;
		}
		const displayName =
			u.name?.trim() || u.email.split("@")[0] || "there";
		sendStreakRiskEmail({ email: u.email, displayName, streakDays: streak });
		await prisma.user.update({
			where: { id: u.id },
			data: { streakRemindYmd: todayYmd },
		});
		sent++;
	}

	return json({ ok: true, sent, checked: candidates.length, todayYmd, utcHour: hourUtc });
};
