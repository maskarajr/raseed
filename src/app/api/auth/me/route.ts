export const dynamic = "force-dynamic";
import { json } from "@/server/http";
import { getSession } from "@/server/auth/session";

export async function GET() {
  const session = await getSession();
  return json({ user: session });
}
