import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { OfficeNav } from "@/components/OfficeNav";
import { initials } from "@/lib/person";

export default async function OfficeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) return children;
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
          <div className="row" style={{ gap: 9, padding: "10px 9px 0" }}>
            <span className="avatar">{initials(session.name)}</span>
            <span>
              <span className="pname">{session.name}</span>
              <br />
              <span className="pmeta">
                {session.role === "owner" ? "Owner" : "Office"}
              </span>
            </span>
          </div>
        </div>
      </aside>
      <div className="main">{children}</div>
    </div>
  );
}
