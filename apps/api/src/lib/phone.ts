// Phone normalization used for customer deduplication during sync.
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1)
  }
  if (digits.length === 12 && digits.startsWith('92')) {
    return digits.slice(2)
  }
  return digits
}
