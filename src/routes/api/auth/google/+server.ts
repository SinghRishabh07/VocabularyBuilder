import { redirect } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ url }) => {
	const clientId = env.GOOGLE_CLIENT_ID;
	if (!clientId) {
		throw new Error("GOOGLE_CLIENT_ID is not configured");
	}

	const redirectUri = `${url.origin}/api/auth/google/callback`;

	const params = new URLSearchParams({
		client_id: clientId,
		redirect_uri: redirectUri,
		response_type: "code",
		scope: "openid email profile",
		access_type: "offline",
		prompt: "consent",
	});

	throw redirect(302, `https://accounts.google.com/o/oauth2/v2/auth?${params}`);
};
