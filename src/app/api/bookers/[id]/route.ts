import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/server/auth/requireRole";
import { parseBody, json, ApiError } from "@/server/http";
import { updateBookerSchema } from "@/server/schemas/bookers";
import { hashPassword } from "@/lib/password";

type Params = { id: string };

export const PATCH = requireRole<Params>(
  "owner",
  "office",
)(async (req: NextRequest, { params }) => {
  const input = await parseBody(req, updateBookerSchema);
  const existing = await prisma.user.findUnique({ where: { id: params.id } });
  if (!existing || existing.role !== "booker") {
    throw new ApiError(404, "Booker not found");
  }

  const data: {
    name?: string;
    active?: boolean;
    passwordHash?: string;
  } = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.active !== undefined) data.active = input.active;
  if (input.password !== undefined) {
    data.passwordHash = await hashPassword(input.password);
  }

  const booker = await prisma.user.update({
    where: { id: params.id },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      active: true,
      createdAt: true,
    },
  });
  return json({ booker });
});
