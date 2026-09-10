import { CategoryRankChart } from "@/components/category-rank-chart";
import { QuickActions } from "@/components/quick-actions";
import { RefundReturnRateChart } from "@/components/refund-return-rate-chart";
import { RevenueChart } from "@/components/revenue-chart";
import { DashboardStats, homeKpiStats } from "@/components/stats";
import type { OfficeHomeResponse } from "@/lib/officeHomeTypes";

export function Dashboard({ data }: { data: OfficeHomeResponse }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      <DashboardStats stats={homeKpiStats(data.kpis)} />
      <RevenueChart series={data.bookedByDay} />
      <RefundReturnRateChart
        last7={data.returns.last7}
        todayAmount={data.returns.todayAmount}
        todayCount={data.returns.todayCount}
        todayRatePct={data.returns.todayRatePct}
      />
      <CategoryRankChart data={data.categoryShare} />
      <QuickActions />
    </div>
  );
}
