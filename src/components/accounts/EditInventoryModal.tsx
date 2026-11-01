import { useState, useRef, useEffect } from 'react'
import { X, Smile, Loader2 } from 'lucide-react'
import type { InventoryItem } from '@/lib/mock-data'
import EmojiPicker from 'emoji-picker-react'

interface EditInventoryModalProps {
  item: InventoryItem
  categories?: string[]
  onClose: () => void
  onSave: (item: Omit<InventoryItem, 'id'>) => void
  saving?: boolean
}

export default function EditInventoryModal({ item, categories, onClose, onSave, saving }: EditInventoryModalProps) {
  const [sku, setSku] = useState(item.sku || '')
  const [name, setName] = useState(item.name)
  const [description, setDescription] = useState(item.description || '')
  const [category, setCategory] = useState(item.category)
  
  const UNIT_PRESETS = ['piece', 'tube', 'pair', 'roll', 'box', 'set']
  const isPreset = UNIT_PRESETS.includes(item.unit)
  const [unitMode, setUnitMode] = useState<'preset'|'custom'>(isPreset ? 'preset' : 'custom')
  const [unit, setUnit] = useState(isPreset ? item.unit : 'piece')
  const [unitCustom, setUnitCustom] = useState(isPreset ? '' : item.unit)

  const [quantity, setQuantity] = useState(item.quantity)
  const [price, setPrice] = useState(item.price)
  const [sellingPrice, setSellingPrice] = useState(item.sellingPrice || item.price)
  const [icon, setIcon] = useState(item.icon || '')
  const [error, setError] = useState('')

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedSku = sku.trim()
    if (!trimmedSku) { setError('SKU is required.'); return }
    if (!name.trim()) { setError('Item name is required.'); return }
    if (quantity < 0) { setError('Enter a valid quantity.'); return }
    if (price <= 0) { setError('Enter a valid purchase price.'); return }
    if (sellingPrice <= 0) { setError('Enter a valid selling price.'); return }

    setError('')
    
    const finalUnit = unitMode === 'custom' ? (unitCustom.trim() || 'piece') : unit
    
    onSave({
      sku: sku.trim(),
      name: name.trim(),
      category,
      description: description.trim(),
      unit: finalUnit,
      quantity,
      price,
      sellingPrice,
      icon: icon.trim() || undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl bg-so-card flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-so-border">
          <h2 className="font-semibold text-so-text">Edit Inventory Item</h2>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-so-muted" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-so-muted uppercase tracking-wider mb-1.5">SKU</label>
              <input
                type="text"
                value={sku}
                onChange={e => setSku(e.target.value)}
                className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-accent"
              />
            </div>
            <div>
              <label className="block text-xs text-so-muted uppercase tracking-wider mb-1.5">Item Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-accent"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-so-muted uppercase tracking-wider mb-1.5">Description</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-accent"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
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
            <div>
              <label className="block text-xs text-so-muted uppercase tracking-wider mb-1.5">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text appearance-none focus:outline-none focus:border-so-accent"
              >
                {(categories || []).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            
            <div className="relative" ref={emojiPickerRef}>
              <label className="block text-xs font-medium text-so-muted mb-1.5 uppercase tracking-wider">Icon Emoji</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="flex items-center justify-center w-10 h-10 bg-white border border-so-border rounded-lg hover:bg-so-surface transition-colors shrink-0"
                >
                  {icon ? <span className="text-lg">{icon}</span> : <Smile className="w-5 h-5 text-so-muted" />}
                </button>
                <input type="text" value={icon} onChange={e => setIcon(e.target.value)} placeholder="Emoji"
                  className="flex-1 min-w-0 px-2 py-2 bg-white border border-so-border rounded-lg text-sm focus:outline-none focus:border-so-accent" />
              </div>
              
              {showEmojiPicker && (
                <div className="absolute top-full mt-2 z-50 right-0 shadow-xl rounded-lg overflow-hidden border border-so-border">
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

            <div>
              <label className="block text-xs text-so-muted uppercase tracking-wider mb-1.5">Quantity</label>
              <input
                type="number"
                min="0"
                value={quantity}
                onChange={e => setQuantity(Number(e.target.value))}
                className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-accent"
              />
            </div>
            <div>
              <label className="block text-xs text-so-muted uppercase tracking-wider mb-1.5">Purchase Price (₹)</label>
              <input
                type="number"
                min="0"
                value={price}
                onChange={e => setPrice(Number(e.target.value))}
                className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-accent"
              />
            </div>
            <div>
              <label className="block text-xs text-so-muted uppercase tracking-wider mb-1.5">Selling Price (₹)</label>
              <input
                type="number"
                min="0"
                value={sellingPrice}
                onChange={e => setSellingPrice(Number(e.target.value))}
                className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-accent"
              />
            </div>
          </div>
          
          {error && <p className="text-xs text-red-500">{error}</p>}
          
          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 py-2 border border-so-border rounded-lg text-sm text-so-muted hover:text-so-text disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 bg-so-accent text-so-accent-text rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
