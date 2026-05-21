const inr2 = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const inr0 = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

/** Indian Rupees (₹) for amounts — default two decimal places. */
export function formatInr(amount: number | null | undefined): string {
  const n = Number(amount)
  return inr2.format(Number.isFinite(n) ? n : 0)
}

/** Rupees rounded to whole units (summary cards, etc.). */
export function formatInrWhole(amount: number | null | undefined): string {
  const n = Number(amount)
  return inr0.format(Number.isFinite(n) ? n : 0)
}
