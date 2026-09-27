"use client";

import { Icon } from "@/components/Icon";

export function SideSheet({
  title,
  onClose,
  children,
  variant = "drawer",
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  variant?: "drawer" | "sheet";
}) {
  return (
    <>
      <button
        type="button"
        className="scrim is-open"
        aria-label="Close overlay"
        onClick={onClose}
      />
      {variant === "drawer" ? (
        <div className="drawer is-open" role="dialog" aria-modal>
          <div className="drawer-h">
            <h2 className="h3s">{title}</h2>
            <button
              type="button"
              className="btn-ghost btn-sm"
              aria-label={`Close ${title}`}
              onClick={onClose}
            >
              <Icon name="x" className="ic ic-sm" />
            </button>
          </div>
          <div className="drawer-b">{children}</div>
        </div>
      ) : (
        <div className="sheet sheet-d is-open" role="dialog" aria-modal>
          <div className="grab" />
          <div className="sheet-h">
            <h2 className="h3s">{title}</h2>
            <button
              type="button"
              className="btn-ghost btn-sm"
              aria-label={`Close ${title}`}
              onClick={onClose}
            >
              <Icon name="x" className="ic ic-sm" />
            </button>
          </div>
          {children}
        </div>
      )}
    </>
  );
}
