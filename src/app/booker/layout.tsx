import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { BookerNav } from "@/components/BookerNav";
import { LogoutButton } from "@/components/LogoutButton";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

export default async function BookerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "booker") redirect("/office");

  return (
    <div className="mx-auto min-h-screen max-w-md pb-20">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <div>
          <span className="text-lg font-bold text-brand-700">Raseed</span>
          <span className="ml-2 rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
            Booker
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">{session.name}</span>
          <LogoutButton />
        </div>
      </header>
      <main className="px-4 py-4">{children}</main>
      <BookerNav />
      <ServiceWorkerRegister />
    </div>
  );
}
