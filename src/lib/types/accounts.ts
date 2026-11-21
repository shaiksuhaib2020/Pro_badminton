import type { PaymentMethod } from './payments'

export type AccountEntry = {
  id: string
  date: string           // yyyy-MM-dd
  category: string
  description: string
  amount: number         // always positive
  paymentMethod?: PaymentMethod
  vendor?: string
  notes?: string
}

export type SaleType = 'inventory' | 'quick'

export type SaleEntry = {
  id: string
  date: string                // YYYY-MM-DD
  saleType: SaleType
  itemName: string            // product name (inventory) or free-text label (quick)
  category: string            // inventory item's category, or 'Quick Sale' for quick sales
  inventoryItemId?: string    // inventory sales only — references InventoryItem.id
  quantity?: number           // inventory sales only — units sold
  unitPrice: number           // per-unit selling price (inventory) or full price (quick)
  amount: number              // quantity × unitPrice for inventory; unitPrice for quick
  paymentMethod: PaymentMethod
  notes?: string
}
