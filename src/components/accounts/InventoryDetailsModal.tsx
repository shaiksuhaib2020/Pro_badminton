import { X, Pencil } from 'lucide-react'
import { InventoryItem } from '@/lib/mock-data'

interface InventoryDetailsModalProps {
  item: InventoryItem
  onClose: () => void
  onEdit: () => void
}

export default function InventoryDetailsModal({ item, onClose, onEdit }: InventoryDetailsModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl bg-so-card flex flex-col shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-so-border bg-so-surface">
          <h2 className="font-semibold text-so-text">Product Details</h2>
          <div className="flex items-center gap-2">
            <button onClick={onEdit} className="p-1.5 text-so-muted hover:text-so-accent hover:bg-so-border rounded-md transition-colors" title="Edit">
              <Pencil className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="p-1.5 text-so-muted hover:text-so-text hover:bg-so-border rounded-md transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="p-6">
          <div className="flex items-start gap-5 mb-6">
            <div className="w-20 h-20 shrink-0 bg-so-surface border border-so-border rounded-xl flex items-center justify-center overflow-hidden">
              {item.icon ? (
                <span className="text-4xl">{item.icon}</span>
              ) : (
                <span className="text-2xl font-bold text-so-muted">{item.name.charAt(0)}</span>
              )}
            </div>
            <div>
              <div className="text-xs font-mono text-so-muted mb-1">{item.sku}</div>
              <h3 className="text-lg font-bold text-so-text">{item.name}</h3>
              <div className="inline-block mt-2 px-2.5 py-1 bg-so-surface border border-so-border rounded-md text-[11px] font-medium text-so-muted uppercase tracking-wider">
                {item.category}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-y-6 gap-x-4">
            <div>
              <p className="text-xs font-semibold text-so-muted uppercase tracking-wider mb-1">Description</p>
              <p className="text-sm text-so-text">{item.description || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-so-muted uppercase tracking-wider mb-1">Unit Type</p>
              <p className="text-sm text-so-text">{item.unit}</p>
            </div>
            
            <div className="col-span-2 border-t border-so-border pt-4"></div>
            
            <div>
              <p className="text-xs font-semibold text-so-muted uppercase tracking-wider mb-1">Stock Quantity</p>
              <div className="flex items-center gap-2">
                <p className="text-lg font-semibold text-so-text">{item.quantity}</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-so-muted uppercase tracking-wider mb-1">Inventory Value</p>
              <p className="text-lg font-semibold text-so-text">₹ {(item.quantity * item.price).toLocaleString()}</p>
            </div>
            
            <div>
              <p className="text-xs font-semibold text-so-muted uppercase tracking-wider mb-1">Purchase Price</p>
              <p className="text-sm font-medium text-so-text">₹ {item.price.toLocaleString()} <span className="text-xs font-normal text-so-muted">/ {item.unit}</span></p>
            </div>
            <div>
              <p className="text-xs font-semibold text-so-muted uppercase tracking-wider mb-1">Selling Price</p>
              <p className="text-sm font-bold text-so-emerald">₹ {item.sellingPrice.toLocaleString()} <span className="text-xs font-normal text-so-muted">/ {item.unit}</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
