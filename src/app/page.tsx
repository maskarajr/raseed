import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";

export default async function Home() {
  const session = await getSession();
  if (!session) redirect("/office/login");
  if (session.role === "booker") redirect("/booker");
  redirect("/office");
}
