import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@/lib/enums";
import { ROLES } from "@/lib/enums";

export const SESSION_COOKIE = "raseed_session";
const SESSION_MAX_AGE = 60 * 60 * 12; // 12 hours (office-hours usage)

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "JWT_SECRET is missing or too short. Set a long random JWT_SECRET in .env",
    );
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(user: SessionUser): Promise<string> {
  return new SignJWT({
    name: user.name,
    email: user.email,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecret());
}

export async function verifySessionToken(
  token: string,
): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const role = payload.role as string;
    if (
      !payload.sub ||
      typeof payload.name !== "string" ||
      typeof payload.email !== "string" ||
      !ROLES.includes(role as Role)
    ) {
      return null;
    }
    return {
      id: payload.sub,
      name: payload.name,
      email: payload.email,
      role: role as Role,
    };
  } catch {
    return null;
  }
}

export function setSessionCookie(token: string): void {
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export function clearSessionCookie(): void {
  cookies().set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function getSession(): Promise<SessionUser | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
