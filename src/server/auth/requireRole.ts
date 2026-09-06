import { NextRequest } from "next/server";
import type { Role } from "@/lib/enums";
import { getSession, type SessionUser } from "./session";
import { ApiError, errorResponse } from "@/server/http";

export type RouteContext<P = Record<string, string>> = {
  params: P;
};

export type AuthedHandler<P = Record<string, string>> = (
  req: NextRequest,
  ctx: RouteContext<P> & { session: SessionUser },
) => Promise<Response> | Response;

// Single wrapper used by EVERY protected API route. No inline role checks
// anywhere else. Pass zero roles to require only authentication.
export function requireRole<P = Record<string, string>>(
  ...roles: Role[]
): (handler: AuthedHandler<P>) => (req: NextRequest, ctx: RouteContext<P>) => Promise<Response> {
  return (handler) =>
    async (req: NextRequest, ctx: RouteContext<P>) => {
      try {
        const session = await getSession();
        if (!session) {
          throw new ApiError(401, "Not authenticated");
        }
        if (roles.length > 0 && !roles.includes(session.role)) {
          throw new ApiError(403, "Forbidden: insufficient role");
        }
        return await handler(req, { ...ctx, session });
      } catch (err) {
        return errorResponse(err);
      }
    };
}
