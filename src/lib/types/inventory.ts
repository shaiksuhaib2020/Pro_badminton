export type InventoryItem = {
  id: string
  sku: string
  name: string
  category: string
  description: string
  unit: string
  quantity: number
  price: number          // unit price (purchase) in ₹
  sellingPrice: number   // selling price in ₹
  icon?: string          // product logo or icon
}
