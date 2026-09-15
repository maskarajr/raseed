import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { BookerNav } from "@/components/BookerNav";
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
    <div className="pwa-root">
      <div className="pwa">
        <div className="pstatus">
          <span>Raseed</span>
          <span>Booker</span>
        </div>
        <main className="pbody">{children}</main>
        <BookerNav />
      </div>
      <ServiceWorkerRegister />
    </div>
  );
}
