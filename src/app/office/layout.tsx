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
    <div className="office-root">
      <aside className="rail no-print">
        <Link href="/office" className="rbrand">
          <span className="rmark">R</span>
          Raseed
        </Link>
        <OfficeNav variant="main" />
        <div className="rfoot">
          <OfficeNav variant="foot" />
          <p className="meta" style={{ padding: "10px 8px 4px" }}>
            {session.name} · {session.role}
          </p>
          <LogoutButton />
        </div>
      </aside>
      <div className="main">{children}</div>
    </div>
  );
}
