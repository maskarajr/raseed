// All money values are integer PKR (whole rupees).
// Rendered as `Rs 12,450` with grouped thousands.

const GROUPED = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export function formatPKR(amount: number): string {
  return `Rs ${GROUPED.format(amount)}`;
}
