import { redirect, type Handle } from "@sveltejs/kit";
import { sequence } from "@sveltejs/kit/hooks";
import {
	getUserBySessionToken,
	SESSION_COOKIE
} from "$lib/server/auth";

const PROTECTED_PREFIXES = ["/dashboard", "/vocabulary", "/profile"];
const PROTECTED_API_PREFIXES = ["/api/words", "/api/search"];

function isProtectedPath(pathname: string): boolean {
	if (PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
		return true;
	}
	if (PROTECTED_API_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
		return true;
	}
	return false;
}

function isAuthRoute(pathname: string): boolean {
	return (
		pathname.startsWith("/api/auth/google") ||
		pathname === "/api/auth/logout"
	);
}

const authHandle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get(SESSION_COOKIE);
	event.locals.user = await getUserBySessionToken(token);

	const { pathname } = event.url;

	if (!event.locals.user && isProtectedPath(pathname) && !isAuthRoute(pathname)) {
		if (pathname.startsWith("/api/")) {
			return new Response(JSON.stringify({ error: "Unauthorized" }), {
				status: 401,
				headers: { "Content-Type": "application/json" },
			});
		}
		throw redirect(302, "/?login=required");
	}

	if (event.locals.user && pathname === "/") {
		throw redirect(302, "/dashboard");
	}

	return resolve(event);
};

export const handle = sequence(authHandle);
