import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { AppShell } from "@/components/app-shell";

export default async function OfficeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "booker") redirect("/booker");

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <AppShell userName={session.name} userRole={session.role}>
        {children}
      </AppShell>
    </div>
  );
}
