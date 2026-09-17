export const dynamic = "force-dynamic";
import { json } from "@/server/http";
import { clearSessionCookie } from "@/server/auth/session";

export async function POST() {
  clearSessionCookie();
  return json({ ok: true });
}
