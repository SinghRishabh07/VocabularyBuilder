import { Resend } from "resend";
import { env } from "$env/dynamic/private";

/**
 * Transactional email via Resend.
 *
 * Config (server-only env vars, never exposed to the browser):
 *   RESEND_API_KEY  – required
 *   RESEND_FROM     – required for real users, e.g. "VocabVault <hello@mail.yourdomain.com>"
 *                     on a domain verified in Resend. Without it we fall back to Resend's
 *                     sandbox sender, which only delivers to the Resend account owner.
 *
 * Every send is awaited and returns a result (it never throws), and uses a
 * Resend idempotency key so a retried request can't deliver the same email twice.
 */

const SANDBOX_FROM = "VocabVault <onboarding@resend.dev>";

export type EmailResult =
	| { ok: true; id: string | null }
	| { ok: false; reason: "not_configured" | "provider_error" | "exception"; message: string };

let client: Resend | null = null;
let clientKey = "";
let warnedSandbox = false;

function getClient(): Resend | null {
	const key = env.RESEND_API_KEY?.trim();
	if (!key) return null;
	if (!client || clientKey !== key) {
		client = new Resend(key);
		clientKey = key;
	}
	return client;
}

function getFrom(): string {
	const from = env.RESEND_FROM?.trim();
	if (from) return from;
	if (!warnedSandbox) {
		warnedSandbox = true;
		console.warn(
			"[email] RESEND_FROM is not set — using Resend's sandbox sender (onboarding@resend.dev). " +
				"Resend only delivers sandbox mail to the account owner's address; other users will not " +
				"receive emails until you verify a domain in Resend and set RESEND_FROM.",
		);
	}
	return SANDBOX_FROM;
}

export function emailConfigStatus() {
	return {
		apiKey: Boolean(env.RESEND_API_KEY?.trim()),
		customFrom: Boolean(env.RESEND_FROM?.trim()),
	};
}

type SendArgs = {
	to: string;
	subject: string;
	html: string;
	text: string;
	/** Stable per logical email, e.g. `welcome/<userId>` */
	idempotencyKey: string;
	/** Short label for logs (never log addresses) */
	kind: string;
};

async function sendEmail({ to, subject, html, text, idempotencyKey, kind }: SendArgs): Promise<EmailResult> {
	const resend = getClient();
	if (!resend) {
		console.warn(`[email] RESEND_API_KEY is not set; ${kind} email skipped`);
		return { ok: false, reason: "not_configured", message: "RESEND_API_KEY is not set" };
	}
	try {
		const { data, error } = await resend.emails.send(
			{ from: getFrom(), to, subject, html, text },
			{ idempotencyKey },
		);
		if (error) {
			console.error(`[email] ${kind} rejected by Resend: ${error.name} (${error.statusCode}) ${error.message}`);
			return { ok: false, reason: "provider_error", message: error.message };
		}
		return { ok: true, id: data?.id ?? null };
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		console.error(`[email] ${kind} failed:`, message);
		return { ok: false, reason: "exception", message };
	}
}

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
        <li>Discover words while you read with the paragraph analyzer</li>
        <li>Revise with quick quizzes and flashcards</li>
        <li>Keep your learning streak</li>
      </ul>
      <p style="margin-top: 20px; color: #64748b; font-size: 14px;">— The VocabVault team</p>
    </div>
  `;
}

function getStreakRiskTemplate(displayName: string, streakDays: number) {
	const safe = escapeHtml(displayName);
	return `
    <div style="font-family: system-ui, Arial, sans-serif; padding: 20px; color: #0f172a;">
      <h2 style="margin: 0 0 12px;">${safe}, your streak needs you today</h2>
      <p>You're on a <strong>${streakDays}</strong>-day VocabVault streak — and you haven’t added a word yet today (UTC).</p>
      <p>Add at least <strong>one new word</strong> before midnight UTC, or the streak will reset when the calendar day flips.</p>
      <p style="margin-top: 20px; color: #64748b; font-size: 14px;">— The VocabVault team</p>
    </div>
  `;
}

type WelcomeParams = { userId: string; email: string; displayName: string };

export function sendWelcomeEmail({ userId, email, displayName }: WelcomeParams): Promise<EmailResult> {
	return sendEmail({
		kind: "welcome",
		to: email,
		subject: "Welcome to VocabVault",
		html: getWelcomeTemplate(displayName),
		text: `Welcome, ${displayName}! We're excited to have you on VocabVault. Learn new words every day, discover words while you read, revise with quick quizzes, and keep your streak going. — The VocabVault team`,
		idempotencyKey: `welcome/${userId}`,
	});
}

type StreakRiskParams = {
	userId: string;
	email: string;
	displayName: string;
	streakDays: number;
	/** UTC day (YYYY-MM-DD) — at most one reminder per user per day */
	dayKey: string;
};

export function sendStreakRiskEmail({
	userId,
	email,
	displayName,
	streakDays,
	dayKey,
}: StreakRiskParams): Promise<EmailResult> {
	return sendEmail({
		kind: "streak-risk",
		to: email,
		subject: "Don’t lose your VocabVault streak",
		html: getStreakRiskTemplate(displayName, streakDays),
		text: `${displayName}, you're on a ${streakDays}-day VocabVault streak and haven't added a word yet today (UTC). Add one before midnight UTC to keep it alive. — The VocabVault team`,
		idempotencyKey: `streak-risk/${userId}/${dayKey}`,
	});
}
