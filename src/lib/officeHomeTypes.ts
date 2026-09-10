export type OfficeHomeResponse = {
  kpis: {
    bookedToday: number;
    outstanding: number;
    awaitingConfirm: number;
    lowStock: number;
    ordersToday: number;
    bookedTodayDeltaPct: number | null;
    ordersTodayDeltaPct: number | null;
  };
  bookedByDay: { date: string; revenue: number }[];
  returns: {
    todayCount: number;
    todayAmount: number;
    todayRatePct: number | null;
    last7: {
      day: string;
      date: string;
      amount: number;
      count: number;
      returnRate: number;
    }[];
  };
  categoryShare: { category: string; share: number }[];
  submitted: {
    id: string;
    code: string;
    createdAt: string;
    booker: string;
    customer: string;
    subtotal: number;
  }[];
  lowStock: {
    sku: string;
    name: string;
    stockQty: number;
    reorderLevel: number | null;
  }[];
  outstandingInvoices: {
    id: string;
    code: string;
    customer: string;
    balance: number;
  }[];
};
