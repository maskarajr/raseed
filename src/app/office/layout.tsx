import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { OfficeNav } from "@/components/OfficeNav";
import { BrandMark } from "@/components/BrandMark";
import { RailUser } from "@/components/RailUser";

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
          <BrandMark compact className="rmark" />
          Raseed
        </Link>
        <OfficeNav variant="main" />
        <div className="rfoot">
          <OfficeNav variant="foot" />
          <RailUser
            name={session.name}
            role={session.role === "owner" ? "Owner" : "Office"}
          />
        </div>
      </aside>
      <div className="main">{children}</div>
    </div>
  );
}
