import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/server/auth/requireRole";
import { parseBody, json, ApiError } from "@/server/http";
import { createBookerSchema } from "@/server/schemas/bookers";
import { hashPassword } from "@/lib/password";

export const GET = requireRole(
  "owner",
  "office",
)(async () => {
  const bookers = await prisma.user.findMany({
    where: { role: "booker" },
    select: {
      id: true,
      name: true,
      email: true,
      active: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return json({ bookers });
});

export const POST = requireRole(
  "owner",
  "office",
)(async (req: NextRequest) => {
  const input = await parseBody(req, createBookerSchema);
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
  });
  if (existing) throw new ApiError(409, "Email already in use");

  const passwordHash = await hashPassword(input.password);
  const booker = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      role: "booker",
    },
    select: {
      id: true,
      name: true,
      email: true,
      active: true,
      createdAt: true,
    },
  });
  return json({ booker }, 201);
});
