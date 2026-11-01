import { getInventoryItems } from '@/lib/queries/inventory'
import InventoryView from './_components/InventoryView'

export default async function InventoryPage() {
  const items = await getInventoryItems()

  return <InventoryView initialItems={items} />
}
