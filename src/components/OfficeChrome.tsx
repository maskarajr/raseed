import type { ReactNode } from "react";

export function OfficeChrome({
  title,
  kicker,
  subtitle,
  status,
  actions,
  trailing,
  children,
}: {
  title: string;
  kicker?: string;
  subtitle?: string;
  status?: ReactNode;
  actions?: ReactNode;
  /** Rendered at the far end of the appbar (v3: the Live chip). */
  trailing?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <header className="appbar">
        <div>
          {kicker ? <p className="meta">{kicker}</p> : null}
          <div
            className="row"
            style={{ gap: 10, marginTop: kicker ? 2 : 0, alignItems: "center" }}
          >
            <h1 className="ptitle">{title}</h1>
            {status}
          </div>
          {!kicker && subtitle ? <p className="psub">{subtitle}</p> : null}
        </div>
        {actions ? <div className="acts">{actions}</div> : null}
        {trailing}
      </header>
      <div className="content">{children}</div>
    </>
  );
}
