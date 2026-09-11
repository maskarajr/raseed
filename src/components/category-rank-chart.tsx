"use client";

import React from "react";
import { Pie, PieChart } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import {
  OTHERS_CATEGORY,
  shareLabelInsideSlice,
} from "@/lib/categoryShare";

export type CategoryMixDatum = {
  category: string;
  share: number;
};

const SLICE_PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const;

const MAX_NAMED_SLICES = 4;
const periodDays = 7;

function consolidateTopFourAndOthers(
  data: readonly CategoryMixDatum[],
): CategoryMixDatum[] {
  const merged = new Map<string, number>();
  for (const row of data) {
    const key = row.category.trim() || OTHERS_CATEGORY;
    merged.set(key, (merged.get(key) ?? 0) + row.share);
  }
  const rows = Array.from(merged.entries())
    .map(([category, share]) => ({ category, share }))
    .sort((a, b) => b.share - a.share);

  if (rows.length <= MAX_NAMED_SLICES) {
    return rows;
  }

  const named = rows
    .filter((row) => row.category !== OTHERS_CATEGORY)
    .slice(0, MAX_NAMED_SLICES);
  const namedSet = new Set(named.map((row) => row.category));
  const othersShare = rows
    .filter((row) => !namedSet.has(row.category))
    .reduce((sum, row) => sum + row.share, 0);

  if (othersShare <= 0) return named;
  return [...named, { category: OTHERS_CATEGORY, share: othersShare }];
}

type SliceRow = {
  key: string;
  category: string;
  share: number;
  fill: string;
};

function buildSlices(data: readonly CategoryMixDatum[]): {
  chartConfig: ChartConfig;
  pieData: SliceRow[];
} {
  const chartConfig: ChartConfig = {
    share: {
      label: "Share",
    },
  };

  const pieData: SliceRow[] = data.map((row, i) => {
    const key = `s${i}`;
    const color = SLICE_PALETTE[i % SLICE_PALETTE.length];
    chartConfig[key] = {
      label: row.category,
      color,
    };
    return {
      key,
      category: row.category,
      share: row.share,
      fill: `var(--color-${key})`,
    };
  });

  return { chartConfig, pieData };
}

function sliceInsideLabel(props: {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number | string;
  outerRadius?: number | string;
  payload?: SliceRow;
}) {
  const share = props.payload?.share ?? 0;
  const text = shareLabelInsideSlice(share);
  if (
    !text ||
    props.cx == null ||
    props.cy == null ||
    props.midAngle == null ||
    props.innerRadius == null ||
    props.outerRadius == null
  ) {
    return null;
  }
  const RADIAN = Math.PI / 180;
  const inner = Number(props.innerRadius);
  const outer = Number(props.outerRadius);
  const radius = inner + (outer - inner) * 0.55;
  const x = props.cx + radius * Math.cos(-props.midAngle * RADIAN);
  const y = props.cy + radius * Math.sin(-props.midAngle * RADIAN);
  const fill = share >= 20 ? "#ffffff" : "#1a1d21";
  return (
    <text
      dominantBaseline="central"
      fill={fill}
      fontSize={12}
      fontWeight={500}
      textAnchor="middle"
      x={x}
      y={y}
    >
      {text}
    </text>
  );
}

export function CategoryRankChart({ data }: { data: CategoryMixDatum[] }) {
  const { chartConfig, pieData } = React.useMemo(
    () => buildSlices(consolidateTopFourAndOthers(data)),
    [data],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue Share by Category</CardTitle>
        <CardDescription>Last {periodDays} days.</CardDescription>
      </CardHeader>
      <CardContent className="my-auto p-0">
        {data.length === 0 ? (
          <p className="flex h-72 items-center justify-center px-4 text-center text-sm text-muted-foreground">
            No invoiced sales in the last 7 days to split by category.
          </p>
        ) : (
          <ChartContainer
            className="aspect-auto h-72 w-full"
            config={chartConfig}
          >
            <PieChart accessibilityLayer>
              <Pie
                cornerRadius={4}
                data={pieData}
                dataKey="share"
                innerRadius={50}
                label={sliceInsideLabel}
                labelLine={false}
                nameKey="key"
                outerRadius="88%"
                stroke="var(--card)"
                strokeWidth={4}
              />
              <ChartLegend
                content={
                  <ChartLegendContent
                    className="flex flex-wrap gap-3 pt-2"
                    nameKey="key"
                  />
                }
              />
            </PieChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
