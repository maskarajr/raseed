"use client";

// Right-hand slide-over panel used for office create/record actions.
export function SideSheet({
  title,
  onClose,
  children,
  contained = false,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  contained?: boolean;
}) {
  return (
    <div
      className={
        contained
          ? "flex h-full w-full flex-col"
          : "fixed inset-0 z-40 flex justify-end"
      }
    >
      {!contained && (
        <div
          className="absolute inset-0 bg-black/30"
          onClick={onClose}
          aria-hidden
        />
      )}
      <div
        className={
          contained
            ? "relative flex h-full w-full flex-col bg-surface"
            : "relative flex h-full w-full max-w-md flex-col bg-surface"
        }
        style={
          contained
            ? undefined
            : { boxShadow: "0 4px 16px rgba(26,29,35,0.08)" }
        }
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" className="text-sm text-muted" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}
