export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { loginSchema } from "@/server/schemas/auth";
import { parseBody, json, errorResponse, ApiError } from "@/server/http";
import { signSession, setSessionCookie } from "@/server/auth/session";
import type { Role } from "@/lib/enums";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await parseBody(req, loginSchema);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.active) {
      throw new ApiError(401, "Invalid credentials");
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      throw new ApiError(401, "Invalid credentials");
    }

    const sessionUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as Role,
    };
    const token = await signSession(sessionUser);
    setSessionCookie(token);

    return json({ user: sessionUser });
  } catch (err) {
    return errorResponse(err);
  }
}
