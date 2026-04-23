import { Resend } from "resend";
import { env } from "$env/dynamic/private";

function escapeHtml(s: string) {
	return s
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

function getWelcomeTemplate(displayName: string) {
	const safe = escapeHtml(displayName);
	return `
    <div style="font-family: system-ui, Arial, sans-serif; padding: 20px; color: #0f172a;">
      <h2 style="margin: 0 0 12px;">Welcome, ${safe}!</h2>
      <p>We're excited to have you on VocabVault.</p>
      <p>
        Start building your vocabulary daily, track your streaks, and
        become a more confident communicator.
      </p>
      <ul style="padding-left: 20px;">
        <li>Learn new words every day</li>
        <li>Keep your learning streak</li>
        <li>Track your progress on the dashboard</li>
      </ul>
      <p style="margin-top: 20px; color: #64748b; font-size: 14px;">— The VocabVault team</p>
    </div>
  `;
}

type WelcomeParams = { email: string; displayName: string };

function getStreakRiskTemplate(displayName: string, streakDays: number) {
	const safe = escapeHtml(displayName);
	return `
    <div style="font-family: system-ui, Arial, sans-serif; padding: 20px; color: #0f172a;">
      <h2 style="margin: 0 0 12px;">${safe}, your streak needs you today</h2>
      <p>You're on a <strong>${streakDays}</strong> day VocabVault streak — and you haven’t added a word yet (UTC) today.</p>
      <p>Add at least <strong>one new word</strong> before the day ends in UTC, or the streak will reset to zero when the calendar day flips.</p>
      <p style="margin-top: 20px; color: #64748b; font-size: 14px;">— The VocabVault team</p>
    </div>
  `;
}

/**
 * Fire-and-forget. Does not throw to callers. Requires RESEND_API_KEY and
 * a verified RESEND_FROM (e.g. onboarding@mail.yourdomain.com in Resend).
 */
export function sendWelcomeEmail({ email, displayName }: WelcomeParams) {
	if (!env.RESEND_API_KEY?.trim()) {
		console.warn("[email] RESEND_API_KEY is not set; welcome email skipped");
		return;
	}
	const from = env.RESEND_FROM?.trim() || "VocabVault <onboarding@resend.dev>";
	const resend = new Resend(env.RESEND_API_KEY);
	void (async () => {
		try {
			const { error } = await resend.emails.send({
				from,
				to: email,
				subject: "Welcome to VocabVault",
				html: getWelcomeTemplate(displayName),
			});
			if (error) {
				console.error("[email] Resend error:", error);
			}
		} catch (err) {
			console.error("[email] Welcome email failed:", err);
		}
	})();
}

type StreakRiskParams = { email: string; displayName: string; streakDays: number };

/**
 * Streak at risk: user has a streak, no words yet today (UTC), in the
 * 6h-before-midnight-UTC window. Same Resend / env as welcome.
 */
export function sendStreakRiskEmail({ email, displayName, streakDays }: StreakRiskParams) {
	if (!env.RESEND_API_KEY?.trim()) {
		console.warn("[email] RESEND_API_KEY is not set; streak reminder skipped");
		return;
	}
	const from = env.RESEND_FROM?.trim() || "VocabVault <onboarding@resend.dev>";
	const resend = new Resend(env.RESEND_API_KEY);
	void (async () => {
		try {
			const { error } = await resend.emails.send({
				from,
				to: email,
				subject: "Don’t lose your VocabVault streak",
				html: getStreakRiskTemplate(displayName, streakDays),
			});
			if (error) {
				console.error("[email] Streak email Resend error:", error);
			}
		} catch (err) {
			console.error("[email] Streak email failed:", err);
		}
	})();
}
