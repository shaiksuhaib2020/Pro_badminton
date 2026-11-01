'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { InventoryItem } from '@/lib/mock-data'
import { BUILTIN_INVENTORY_CATEGORIES } from '@/lib/mock-data'
import {
  Plus, Trash2, Pencil, Search, ChevronDown, Check, Package, X,
  AlertCircle, AlertTriangle, CheckCircle2, MoreVertical, Filter, ArrowUpDown,
} from 'lucide-react'
import EditInventoryModal from '@/components/accounts/EditInventoryModal'
import AddInventoryModal from '@/components/accounts/AddInventoryModal'
import InventoryDetailsModal from '@/components/accounts/InventoryDetailsModal'
import {
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
} from '../actions'

interface Props {
  initialItems: InventoryItem[]
}

export default function InventoryView({ initialItems }: Props) {
  const router = useRouter()

  // UI interaction states
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [viewingItem, setViewingItem] = useState<InventoryItem | null>(null)
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null)
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Filters & sorting
  const [invCategoryFilter, setInvCategoryFilter] = useState<string>('all')
  const [invSort, setInvSort] = useState<string>('name-asc')
  const [invSearchQuery, setInvSearchQuery] = useState('')

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!(e.target as HTMLElement)?.closest('.actions-menu-container')) {
        setActiveMenuId(null)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const allInvCategories = useMemo(() => {
    const set = new Set<string>(BUILTIN_INVENTORY_CATEGORIES)
    initialItems.forEach(i => set.add(i.category))
    return Array.from(set)
  }, [initialItems])

  // Summary Metrics
  const totalItemsCount = initialItems.length
  const lowStockCount = initialItems.filter(i => i.quantity >= 4 && i.quantity <= 7).length
  const outOfStockCount = initialItems.filter(i => i.quantity === 0).length
  const criticalStockCount = initialItems.filter(i => i.quantity >= 1 && i.quantity <= 3).length

  // Filtered & sorted items
  const displayedItems = useMemo(() => {
    let items = [...initialItems]
    if (invCategoryFilter !== 'all') {
      items = items.filter(i => i.category === invCategoryFilter)
    }
    if (invSearchQuery.trim()) {
      const q = invSearchQuery.toLowerCase()
      items = items.filter(i => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q))
    }
    items.sort((a, b) => {
      switch (invSort) {
        case 'name-asc': return a.name.localeCompare(b.name)
        case 'name-desc': return b.name.localeCompare(a.name)
        case 'price-asc': return a.price - b.price
        case 'price-desc': return b.price - a.price
        case 'stock-asc': return a.quantity - b.quantity
        case 'stock-desc': return b.quantity - a.quantity
        default: return 0
      }
    })
    return items
  }, [initialItems, invCategoryFilter, invSort, invSearchQuery])

  // Save handler (create / update)
  const handleSaveItem = async (data: Omit<InventoryItem, 'id'>) => {
    setSaving(true)
    const result = editingItem
      ? await updateInventoryItem(editingItem.id, data)
      : await createInventoryItem(data)
    setSaving(false)

    if ('error' in result) {
      setToast({ message: result.error, type: 'error' })
      return
    }

    setToast({
      message: editingItem ? 'Item updated successfully.' : 'Item added successfully!',
      type: 'success',
    })
    setShowAddModal(false)
    setEditingItem(null)
    router.refresh()
  }

  // Delete handler
  const handleConfirmDelete = async () => {
    if (!deletingItemId) return
    const result = await deleteInventoryItem(deletingItemId)
    if ('error' in result) {
      setToast({ message: result.error, type: 'error' })
      return
    }
    setToast({ message: 'Item deleted from inventory.', type: 'success' })
    setDeletingItemId(null)
    router.refresh()
  }

  const getStockBadge = (quantity: number) => {
    if (quantity === 0) {
      return {
        label: 'Out of stock',
        badge: 'bg-red-50 text-red-700 border-red-200',
        dot: 'bg-red-500',
      }
    }
    if (quantity >= 1 && quantity <= 3) {
      return {
        label: 'Critically low',
        badge: 'bg-red-50 text-red-700 border-red-200',
        dot: 'bg-red-500',
      }
    }
    if (quantity >= 4 && quantity <= 7) {
      return {
        label: 'Low stock',
        badge: 'bg-amber-50 text-amber-700 border-amber-200',
        dot: 'bg-amber-500',
      }
    }
    return {
      label: 'Sufficient stock',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dot: 'bg-emerald-500',
    }
  }

  return (
    <div className="max-w-7xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-sm animate-in fade-in slide-in-from-bottom-2 ${
          toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-so-text text-white'
        }`}>
          {toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-white" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-so-emerald" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-so-text flex items-center gap-2">
            <Package className="w-6 h-6 text-so-accent" />
            Inventory
          </h1>
          <p className="text-so-muted text-sm mt-1">Manage items, equipment, and stock levels</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-so-accent text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Item
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Total Items in Stock */}
        <div className="bg-white border border-so-border rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-so-muted uppercase tracking-wider">Total Items in Stock</p>
            <h3 className="text-2xl font-bold text-so-text mt-1">{totalItemsCount}</h3>
            <p className="text-xs text-so-muted mt-1">Unique items in inventory</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-so-surface border border-so-border flex items-center justify-center text-so-accent">
            <Package className="w-6 h-6" />
          </div>
        </div>

        {/* Low Stock Items */}
        <div className="bg-white border border-so-border rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-so-muted uppercase tracking-wider">Low Stock Items</p>
            <div className="flex items-baseline gap-2 mt-1">
              <h3 className="text-2xl font-bold text-amber-600">{lowStockCount}</h3>
              {criticalStockCount > 0 && (
                <span className="text-xs text-red-600 font-medium">({criticalStockCount} critical)</span>
              )}
            </div>
            <p className="text-xs text-amber-700/80 mt-1">4–7 items remaining</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* Out of Stock Items */}
        <div className="bg-white border border-so-border rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-so-muted uppercase tracking-wider">Out of Stock Items</p>
            <h3 className="text-2xl font-bold text-red-600 mt-1">{outOfStockCount}</h3>
            <p className="text-xs text-red-700/80 mt-1">0 items remaining</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-so-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search items or SKU..."
            value={invSearchQuery}
            onChange={(e) => setInvSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-so-border rounded-lg text-sm focus:outline-none focus:border-so-accent shadow-sm"
          />
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Filter className="w-4 h-4 text-so-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={invCategoryFilter}
              onChange={(e) => setInvCategoryFilter(e.target.value)}
              className="pl-9 pr-8 py-2 bg-white border border-so-border rounded-lg text-sm text-so-text focus:outline-none focus:border-so-accent shadow-sm cursor-pointer appearance-none"
            >
              <option value="all">All Categories</option>
              {allInvCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown className="w-4 h-4 text-so-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <div className="relative">
            <ArrowUpDown className="w-4 h-4 text-so-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={invSort}
              onChange={(e) => setInvSort(e.target.value)}
              className="pl-9 pr-8 py-2 bg-white border border-so-border rounded-lg text-sm text-so-text focus:outline-none focus:border-so-accent shadow-sm cursor-pointer appearance-none"
            >
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="price-desc">Price (High-Low)</option>
              <option value="price-asc">Price (Low-High)</option>
              <option value="stock-desc">Stock (High-Low)</option>
              <option value="stock-asc">Stock (Low-High)</option>
            </select>
            <ChevronDown className="w-4 h-4 text-so-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {showAddModal && (
        <AddInventoryModal
          categories={allInvCategories}
          onClose={() => setShowAddModal(false)}
          onSave={handleSaveItem}
          saving={saving}
        />
      )}

      {/* Table Section */}
      <div className="bg-white border border-so-border rounded-xl shadow-sm overflow-hidden min-h-[400px]">
        {displayedItems.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <Package className="w-10 h-10 text-so-muted/40 mb-3" />
            <p className="text-so-text font-medium">No items found</p>
            <p className="text-so-muted text-sm mt-1">Add items to manage your inventory</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-so-surface border-b border-so-border">
                  <th className="text-left px-5 py-3 text-xs font-medium text-so-muted uppercase tracking-wider w-16">Icon</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-so-muted uppercase tracking-wider">SKU</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-so-muted uppercase tracking-wider">Name</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-so-muted uppercase tracking-wider">Category</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-so-muted uppercase tracking-wider">Stock Qty</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-so-muted uppercase tracking-wider">Selling Price</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-so-muted uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-so-border">
                {displayedItems.map(item => {
                  const statusInfo = getStockBadge(item.quantity)
                  return (
                    <tr key={item.id} className="hover:bg-so-surface/40 transition-colors">
                      <td className="px-5 py-3">
                        <div className="w-8 h-8 rounded-lg bg-so-surface border border-so-border flex items-center justify-center overflow-hidden">
                          {item.icon ? (
                            <span className="text-lg">{item.icon}</span>
                          ) : (
                            <span className="text-xs font-bold text-so-muted">{item.name.charAt(0)}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-so-muted font-mono text-xs">{item.sku}</td>
                      <td className="px-5 py-3 font-medium text-so-text">{item.name}</td>
                      <td className="px-5 py-3">
                        <span className="px-2.5 py-1 bg-so-surface border border-so-border text-so-muted rounded-md text-[11px] font-medium uppercase tracking-wider">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${statusInfo.badge}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                            {item.quantity}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3 font-bold text-so-emerald">₹ {item.sellingPrice?.toLocaleString() || item.price.toLocaleString()}</td>
                      <td className="px-5 py-3 text-right">
                        {deletingItemId === item.id ? (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-xs text-so-muted">Delete?</span>
                            <button
                              onClick={handleConfirmDelete}
                              className="text-xs px-2 py-1 bg-red-600 text-white rounded-md font-medium hover:bg-red-700 transition-colors"
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setDeletingItemId(null)}
                              className="text-xs px-2 py-1 border border-so-border rounded-md text-so-muted hover:text-so-text transition-colors"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <div className="relative inline-block text-left actions-menu-container">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation()
                                setActiveMenuId(activeMenuId === item.id ? null : item.id)
                              }}
                              className="p-1.5 rounded-md text-so-muted hover:text-so-text hover:bg-so-surface transition-colors"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            {activeMenuId === item.id && (
                              <div className="absolute right-0 mt-1 w-32 bg-white border border-so-border rounded-lg shadow-lg z-50 py-1 overflow-hidden text-left">
                                <button
                                  onClick={() => { setActiveMenuId(null); setViewingItem(item) }}
                                  className="w-full text-left px-4 py-2 text-sm text-so-text hover:bg-so-surface"
                                >
                                  Details
                                </button>
                                <button
                                  onClick={() => { setActiveMenuId(null); setEditingItem(item) }}
                                  className="w-full text-left px-4 py-2 text-sm text-so-text hover:bg-so-surface"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => { setActiveMenuId(null); setDeletingItemId(item.id) }}
                                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editingItem && (
        <EditInventoryModal
          item={editingItem}
          categories={allInvCategories}
          onClose={() => setEditingItem(null)}
          onSave={handleSaveItem}
          saving={saving}
        />
      )}

      {viewingItem && (
        <InventoryDetailsModal
          item={viewingItem}
          onClose={() => setViewingItem(null)}
          onEdit={() => {
            const itemToEdit = viewingItem
            setViewingItem(null)
            setEditingItem(itemToEdit)
          }}
        />
      )}
    </div>
  )
}
