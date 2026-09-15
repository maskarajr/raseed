import type { ReactNode } from "react";

export function OfficeChrome({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <header className="appbar">
        <div>
          <h1 className="ptitle">{title}</h1>
          {subtitle ? <p className="psub">{subtitle}</p> : null}
        </div>
        {actions ? <div className="acts">{actions}</div> : null}
      </header>
      <div className="content">{children}</div>
    </>
  );
}
