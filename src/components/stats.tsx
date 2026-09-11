import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Delta, DeltaIcon, DeltaValue } from "@/components/delta";
import { formatPKR } from "@/lib/money";
import { formatInteger } from "@/components/formater";

export type KpiStat = {
  label: string;
  value: string;
  delta: number | null;
  hint: string;
};

export function DashboardStats({ stats }: { stats: readonly KpiStat[] }) {
  return (
    <>
      {stats.map((s) => (
        <StatCard key={s.label} stat={s} />
      ))}
    </>
  );
}

export function homeKpiStats(kpis: {
  bookedToday: number;
  outstanding: number;
  awaitingConfirm: number;
  lowStock: number;
  bookedTodayDeltaPct: number | null;
  ordersTodayDeltaPct: number | null;
}): KpiStat[] {
  return [
    {
      label: "Booked today",
      value: formatPKR(kpis.bookedToday),
      delta: kpis.bookedTodayDeltaPct,
      hint: "vs yesterday",
    },
    {
      label: "Outstanding",
      value: formatPKR(kpis.outstanding),
      delta: null,
      hint: "open invoice balances",
    },
    {
      label: "Awaiting confirm",
      value: formatInteger(kpis.awaitingConfirm),
      delta: null,
      hint: "submitted orders",
    },
    {
      label: "Low stock",
      value: formatInteger(kpis.lowStock),
      delta: null,
      hint: "at or below reorder",
    },
  ];
}

function StatCard({ stat }: { stat: KpiStat }) {
  const { label, value, delta, hint } = stat;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-normal text-sm text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="hero text-balance font-semibold tracking-tight">
          {value}
        </p>
      </CardContent>
      <CardFooter className="gap-1.5 text-xs">
        {delta != null ? (
          <Delta value={delta} variant="default">
            <DeltaIcon />
            <DeltaValue />
          </Delta>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
        <span className="text-pretty text-muted-foreground">{hint}</span>
      </CardFooter>
    </Card>
  );
}
