"use client";

import type { ReactNode } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export function DocumentSheet({
  title,
  subtitle,
  onClose,
  footer,
  overlay,
  children,
  wide = true,
}: {
  title: string;
  subtitle?: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
  overlay?: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className={cn(
          "relative flex h-full w-full flex-col border-l border-line bg-canvas",
          wide ? "sm:max-w-xl" : "sm:max-w-md",
        )}
      >
        <div className="flex items-start justify-between border-b border-line bg-surface px-5 py-4 pr-12">
          <div className="min-w-0">
            <SheetTitle className="font-serif text-2xl font-semibold text-ink">
              {title}
            </SheetTitle>
            {subtitle ? (
              <div className="mt-1 text-sm text-muted">{subtitle}</div>
            ) : null}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer ? (
          <div className="flex flex-wrap gap-2 border-t border-line bg-surface px-5 py-3">
            {footer}
          </div>
        ) : null}
        {overlay ? (
          <div className="absolute inset-0 z-10 flex flex-col bg-surface">
            {overlay}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
