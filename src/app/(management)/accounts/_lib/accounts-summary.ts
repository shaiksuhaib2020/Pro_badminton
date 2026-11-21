import type { AccountEntry, SaleEntry } from '@/lib/types/accounts'

/** Application amounts are rupees; aggregate integer paise to avoid float drift. */
export function getAccountsSummary(expenses: AccountEntry[], sales: SaleEntry[]) {
  const categories = new Map<string, number>()
  let expensePaise = 0
  for (const expense of expenses) {
    const amount = Math.round(expense.amount * 100)
    expensePaise += amount
    categories.set(expense.category, (categories.get(expense.category) ?? 0) + amount)
  }
  let incomePaise = 0
  let inventoryPaise = 0
  let quickPaise = 0
  let inventoryCount = 0
  let quickCount = 0
  for (const sale of sales) {
    const amount = Math.round(sale.amount * 100)
    incomePaise += amount
    if (sale.saleType === 'inventory') { inventoryPaise += amount; inventoryCount++ }
    if (sale.saleType === 'quick') { quickPaise += amount; quickCount++ }
  }
  const top = [...categories].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]
  return {
    totalExpenses: expensePaise / 100,
    totalIncome: incomePaise / 100,
    netBalance: (incomePaise - expensePaise) / 100,
    inventoryTotal: inventoryPaise / 100,
    quickTotal: quickPaise / 100,
    inventoryCount,
    quickCount,
    topCategory: top ? { name: top[0], amount: top[1] / 100 } : null,
  }
}
