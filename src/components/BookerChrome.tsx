import type { ReactNode } from "react";
import Link from "next/link";

export function BookerChrome({
  title,
  meta,
  backHref,
  children,
}: {
  title: string;
  meta?: ReactNode;
  backHref?: string;
  children: ReactNode;
}) {
  return (
    <>
      <div className="pbar">
        {backHref ? (
          <Link href={backHref} className="btn-ghost btn-sm" aria-label="Back">
            ←
          </Link>
        ) : null}
        <span className="pbar-t">{title}</span>
        <span className="grow" />
        {meta ? <span className="meta">{meta}</span> : null}
      </div>
      <div className="pbody">{children}</div>
    </>
  );
}
