"use client";

import Link from "next/link";
import { CartesianGrid, Line, LineChart, XAxis } from "recharts";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Delta, DeltaIcon, DeltaValue } from "@/components/delta";
import { ArrowRightIcon } from "lucide-react";
import { formatPKR } from "@/lib/money";

const chartConfig = {
  amount: {
    label: "Returns Rs",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function RefundReturnRateChart({
  todayCount,
  todayAmount,
  todayRatePct,
  last7,
}: {
  todayCount: number;
  todayAmount: number;
  todayRatePct: number | null;
  last7: { day: string; date: string; amount: number; count: number }[];
}) {
  const first = last7[0];
  const lastW = last7.at(-1) ?? first;
  const trendPct =
    first && lastW && first.amount > 0
      ? ((lastW.amount - first.amount) / first.amount) * 100
      : 0;
  const hasAny = last7.some((r) => r.amount > 0 || r.count > 0);

  return (
    <Card className="md:col-span-2">
      <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle>Return rate</CardTitle>
          <CardDescription>Last 7 days</CardDescription>
        </div>
        <div className="space-y-1">
          <CardTitle className="text-right font-mono text-base tabular-nums">
            {formatPKR(todayAmount)}
          </CardTitle>
          <CardDescription>
            {todayCount} return{todayCount === 1 ? "" : "s"} today
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="mt-auto">
        {!hasAny ? (
          <p className="flex h-56 items-center justify-center text-sm text-muted-foreground">
            No returns logged in the last 7 days.
          </p>
        ) : (
          <ChartContainer
            className="aspect-auto h-56 w-full"
            config={chartConfig}
          >
            <LineChart
              accessibilityLayer
              data={last7}
              margin={{ left: 12, right: 12, top: 12, bottom: 0 }}
            >
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis
                axisLine={false}
                dataKey="day"
                interval={1}
                minTickGap={8}
                tickLine={false}
                tickMargin={8}
              />
              <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
              <Line
                dataKey="amount"
                dot={false}
                stroke="var(--color-amount)"
                strokeWidth={2.5}
                type="monotone"
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
      <CardFooter>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1 text-muted-foreground text-xs">
          {hasAny ? (
            <>
              <Delta value={trendPct}>
                <DeltaIcon />
                <DeltaValue />
              </Delta>
              <span className="inline-flex min-w-0 text-pretty">
                vs first day (last 7 days)
              </span>
            </>
          ) : (
            <span>From logged returns — not estimated.</span>
          )}
        </div>
        <Button
          className="text-muted-foreground"
          nativeButton={false}
          render={<Link href="/office/invoices" />}
          size="xs"
          variant="ghost"
        >
          Invoices
          <ArrowRightIcon aria-hidden="true" data-icon="inline-end" />
        </Button>
      </CardFooter>
    </Card>
  );
}
