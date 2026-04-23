import { randomBytes } from "node:crypto";
import type { PublicUser } from "$lib/types";
import { prisma } from "$lib/prisma";

export const SESSION_COOKIE = "session";
export const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 days

export type { PublicUser };

export function toPublicUser(user: {
	id: string;
	email: string;
	name: string | null;
	image: string | null;
	createdAt: Date;
}): PublicUser {
	return {
		id: user.id,
		email: user.email,
		name: user.name,
		image: user.image,
		createdAt: user.createdAt.toISOString(),
	};
}

function sessionExpiresAt(): Date {
	return new Date(Date.now() + SESSION_MAX_AGE_SEC * 1000);
}

export async function createSession(userId: string): Promise<string> {
	const token = randomBytes(32).toString("base64url");
	await prisma.session.create({
		data: {
			token,
			userId,
			expiresAt: sessionExpiresAt(),
		},
	});
	return token;
}

export async function getUserBySessionToken(
	token: string | undefined | null
): Promise<PublicUser | null> {
	if (!token) return null;

	const session = await prisma.session.findUnique({
		where: { token },
		include: { user: true },
	});

	if (!session || session.expiresAt < new Date()) {
		if (session) {
			await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
		}
		return null;
	}

	return toPublicUser(session.user);
}

export async function deleteSessionByToken(token: string) {
	await prisma.session.deleteMany({ where: { token } });
}
