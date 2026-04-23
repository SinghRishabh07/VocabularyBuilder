import { redirect } from "@sveltejs/kit";
import { dev } from "$app/environment";
import { env } from "$env/dynamic/private";
import {
	createSession,
	SESSION_COOKIE,
	SESSION_MAX_AGE_SEC,
} from "$lib/server/auth";
import { prisma } from "$lib/prisma";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ url, cookies }) => {
	const code = url.searchParams.get("code");
	const redirectUri = `${url.origin}/api/auth/google/callback`;

	if (!code) {
		throw redirect(302, "/?error=oauth_missing_code");
	}

	const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			code,
			client_id: env.GOOGLE_CLIENT_ID,
			client_secret: env.GOOGLE_CLIENT_SECRET,
			redirect_uri: redirectUri,
			grant_type: "authorization_code",
		}),
	});

	const tokenData = (await tokenRes.json()) as {
		access_token?: string;
		error?: string;
	};

	if (!tokenRes.ok || !tokenData.access_token) {
		console.error("Google token exchange failed:", tokenData);
		throw redirect(302, "/?error=oauth_token");
	}

	const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
		headers: { Authorization: `Bearer ${tokenData.access_token}` },
	});

	const profile = (await userRes.json()) as {
		id?: string;
		email?: string;
		name?: string;
		picture?: string;
	};

	if (!userRes.ok || !profile.id || !profile.email) {
		console.error("Google userinfo failed:", profile);
		throw redirect(302, "/?error=oauth_profile");
	}

	const user = await prisma.user.upsert({
		where: { googleId: profile.id },
		create: {
			googleId: profile.id,
			email: profile.email,
			name: profile.name ?? null,
			image: profile.picture ?? null,
		},
		update: {
			email: profile.email,
			name: profile.name ?? null,
			image: profile.picture ?? null,
		},
	});

	const token = await createSession(user.id);

	cookies.set(SESSION_COOKIE, token, {
		path: "/",
		httpOnly: true,
		sameSite: "lax",
		secure: !dev,
		maxAge: SESSION_MAX_AGE_SEC,
	});

	throw redirect(302, "/dashboard");
};
