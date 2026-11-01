import { getExpenses, getCustomExpenseCategories } from '@/lib/queries/accounts'
import { getSales } from '@/lib/queries/sales'
import { getInventoryItems } from '@/lib/queries/inventory'
import AccountsView from './_components/AccountsView'

export default async function AccountsPage() {
  const [expenses, customCategories, sales, inventoryItems] = await Promise.all([
    getExpenses(),
    getCustomExpenseCategories(),
    getSales(),
    getInventoryItems(),
  ])

  return (
    <AccountsView
      initialExpenses={expenses}
      initialCustomCategories={customCategories}
      initialSales={sales}
      initialInventoryItems={inventoryItems}
    />
  )
}
