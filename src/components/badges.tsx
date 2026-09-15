import { statusUi, type PillTone } from "@/lib/status";

const TONE_CLASS: Record<PillTone, string> = {
  ok: "s-ok",
  info: "s-info",
  warn: "s-warn",
  bad: "s-bad",
  neu: "s-neu",
};

export function StatusPill({
  status,
  label,
  tone,
}: {
  status?: string;
  label?: string;
  tone?: PillTone;
}) {
  const ui = status ? statusUi(status) : { label: label ?? "", tone: tone ?? "neu" };
  return (
    <span className={`status ${TONE_CLASS[tone ?? ui.tone]}`}>
      {label ?? ui.label}
    </span>
  );
}

export const PayBadge = StatusPill;
export const StatusBadge = StatusPill;
