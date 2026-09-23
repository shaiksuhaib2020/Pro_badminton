import { useState, useRef, useEffect } from 'react'
import { X, ChevronDown, Smile } from 'lucide-react'
import { InventoryItem, mockInventoryItems } from '@/lib/mock-data'
import EmojiPicker from 'emoji-picker-react'

interface AddInventoryModalProps {
  categories: string[]
  onClose: () => void
  onSave: (item: Omit<InventoryItem, 'id'>, newCategory?: string) => void
}

export default function AddInventoryModal({ categories, onClose, onSave }: AddInventoryModalProps) {
  const [sku, setSku] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState(categories[0] || '')
  const [newCategory, setNewCategory] = useState('')
  const [icon, setIcon] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const emojiPickerRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])
  
  const UNIT_PRESETS = ['piece', 'tube', 'pair', 'roll', 'box', 'set']
  const [unitMode, setUnitMode] = useState<'preset'|'custom'>('preset')
  const [unit, setUnit] = useState('piece')
  const [unitCustom, setUnitCustom] = useState('')

  const [quantity, setQuantity] = useState('')
  const [price, setPrice] = useState('')
  const [sellingPrice, setSellingPrice] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedSku = sku.trim()
    if (!trimmedSku) { setError('SKU is required.'); return }
    if (!name.trim()) { setError('Item name is required.'); return }
    if (category === 'create_new' && !newCategory.trim()) { setError('New category name is required.'); return }
    if (!quantity || Number(quantity) < 0) { setError('Enter a valid quantity.'); return }
    if (!price || Number(price) <= 0) { setError('Enter a valid purchase price.'); return }
    if (!sellingPrice || Number(sellingPrice) <= 0) { setError('Enter a valid selling price.'); return }
    
    const existingSku = mockInventoryItems.find(i => i.sku.toLowerCase() === trimmedSku.toLowerCase())
    if (existingSku) { setError('SKU must be unique. Another item already uses this SKU.'); return }

    setError('')
    
    const finalUnit = unitMode === 'custom' ? (unitCustom.trim() || 'piece') : unit
    const finalCategory = category === 'create_new' ? newCategory.trim() : category
    
    onSave({
      sku: sku.trim(),
      name: name.trim(),
      category: finalCategory,
      description: description.trim(),
      unit: finalUnit,
      quantity: Number(quantity),
      price: Number(price),
      sellingPrice: Number(sellingPrice),
      icon: icon.trim() || undefined
    }, category === 'create_new' ? newCategory.trim() : undefined)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-2xl bg-so-card flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-so-border">
          <h2 className="font-semibold text-so-text">Add New Item</h2>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-so-muted" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="col-span-2 md:col-span-1">
              <label className="block text-xs text-so-muted uppercase tracking-wider mb-1.5">SKU *</label>
              <input
                type="text"
                value={sku}
                onChange={e => setSku(e.target.value)}
                placeholder="Required & unique"
                className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-accent"
              />
            </div>
            <div className="col-span-2 md:col-span-2">
              <label className="block text-xs text-so-muted uppercase tracking-wider mb-1.5">Item Name *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-accent"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-so-muted mb-1.5 uppercase tracking-wider">Category</label>
              <div className="relative">
                <select value={category} onChange={e => setCategory(e.target.value)}
                  className="w-full pl-3 pr-8 py-2 bg-white border border-so-border rounded-lg text-sm appearance-none focus:outline-none focus:border-so-accent">
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  <option value="create_new">+ Create New Category</option>
                </select>
                <ChevronDown className="w-4 h-4 text-so-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
            {category === 'create_new' && (
              <div>
                <label className="block text-xs font-medium text-so-muted mb-1.5 uppercase tracking-wider">New Category Name *</label>
                <input type="text" value={newCategory} onChange={e => setNewCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-so-border rounded-lg text-sm focus:outline-none focus:border-so-accent" />
              </div>
            )}
            
            <div className="relative" ref={emojiPickerRef}>
              <label className="block text-xs font-medium text-so-muted mb-1.5 uppercase tracking-wider">Icon Emoji (Optional)</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="flex items-center justify-center w-10 h-10 bg-white border border-so-border rounded-lg hover:bg-so-surface transition-colors"
                >
                  {icon ? <span className="text-lg">{icon}</span> : <Smile className="w-5 h-5 text-so-muted" />}
                </button>
                <input type="text" value={icon} onChange={e => setIcon(e.target.value)} placeholder="Pick or type emoji"
                  className="flex-1 px-3 py-2 bg-white border border-so-border rounded-lg text-sm focus:outline-none focus:border-so-accent" />
              </div>
              
              {showEmojiPicker && (
                <div className="absolute top-full mt-2 z-50 left-0 shadow-xl rounded-lg overflow-hidden border border-so-border">
                  <EmojiPicker
                    onEmojiClick={(emojiData) => {
                      setIcon(emojiData.emoji)
                      setShowEmojiPicker(false)
                    }}
                    width={320}
                    height={350}
                  />
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs text-so-muted uppercase tracking-wider mb-1.5">Description (Optional)</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-accent"
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="col-span-2 md:col-span-1">
              <label className="block text-xs text-so-muted uppercase tracking-wider mb-1.5">Unit</label>
              <div className="flex flex-col gap-2">
                <select 
                  value={unitMode === 'custom' ? 'custom' : unit}
                  onChange={e => {
                    if (e.target.value === 'custom') setUnitMode('custom')
                    else { setUnitMode('preset'); setUnit(e.target.value) }
                  }}
                  className="w-full px-3 py-2 bg-white border border-so-border rounded-lg text-sm appearance-none focus:outline-none focus:border-so-accent"
                >
                  {UNIT_PRESETS.map(u => <option key={u} value={u}>{u}</option>)}
                  <option value="custom">Other</option>
                </select>
                {unitMode === 'custom' && (
                  <input type="text" value={unitCustom} onChange={e => setUnitCustom(e.target.value)} placeholder="e.g. bundle"
                    className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-so-accent" />
                )}
              </div>
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className="block text-xs text-so-muted uppercase tracking-wider mb-1.5">Quantity *</label>
              <input
                type="number"
                min="0"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-accent"
              />
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className="block text-xs text-so-muted uppercase tracking-wider mb-1.5">Purchase (₹) *</label>
              <input
                type="number"
                min="0"
                value={price}
                onChange={e => setPrice(e.target.value)}
                className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-accent"
              />
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className="block text-xs text-so-muted uppercase tracking-wider mb-1.5">Selling (₹) *</label>
              <input
                type="number"
                min="0"
                value={sellingPrice}
                onChange={e => setSellingPrice(e.target.value)}
                className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-accent"
              />
            </div>
          </div>
          
          {error && <p className="text-xs text-red-500">{error}</p>}
          
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-5 py-2 border border-so-border rounded-lg text-sm text-so-muted hover:text-so-text">Cancel</button>
            <button type="submit" className="px-5 py-2 bg-so-accent text-so-accent-text rounded-lg text-sm font-semibold shadow-sm">Save Item</button>
          </div>
        </form>
      </div>
    </div>
  )
}
