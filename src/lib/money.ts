// All money values are integer PKR (whole rupees).

export function formatPKR(amount: number): string {
  return `Rs ${amount.toLocaleString("en-PK")}`;
}
