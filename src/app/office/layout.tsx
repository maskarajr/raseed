import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { OfficeNav } from "@/components/OfficeNav";
import { LogoutButton } from "@/components/LogoutButton";

export default async function OfficeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "booker") redirect("/booker");

  return (
    <div className="min-h-screen">
      <header className="no-print border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-4">
            <span className="text-xl font-bold text-brand-700">Raseed</span>
            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
              Office
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">
              {session.name} ({session.role})
            </span>
            <LogoutButton />
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-3">
          <OfficeNav />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
