import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { OfficeShell } from "@/components/OfficeShell";

export default async function OfficeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "booker") redirect("/booker");

  return (
    <OfficeShell userLabel={`${session.name} · ${session.role}`}>
      {children}
    </OfficeShell>
  );
}
