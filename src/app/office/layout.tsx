import Link from "next/link";
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
    <div className="flex min-h-screen">
      <aside className="no-print flex w-[200px] shrink-0 flex-col border-r border-line bg-surface">
        <div className="border-b border-line px-4 py-4">
          <Link href="/office" className="text-xl font-bold text-primary">
            Raseed
          </Link>
          <p className="mt-0.5 text-xs text-muted">Office</p>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <OfficeNav />
        </div>
        <div className="border-t border-line p-3">
          <p className="mb-2 truncate text-xs text-muted">
            {session.name} · {session.role}
          </p>
          <LogoutButton />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
