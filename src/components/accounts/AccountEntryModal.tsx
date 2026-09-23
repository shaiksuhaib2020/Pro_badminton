import { useState, useEffect } from 'react'
import { X, AlertCircle } from 'lucide-react'
import { AccountEntry, EXPENSE_CATEGORIES, INCOME_CATEGORIES, mockCustomExpenseCategories, mockCustomInventoryCategories } from '@/lib/mock-data'
import { format } from 'date-fns'

interface AccountEntryModalProps {
  type: 'expense' | 'income'
  entry?: AccountEntry
  onClose: () => void
  onSave: (entry: AccountEntry) => void
}

export default function AccountEntryModal({ type, entry, onClose, onSave }: AccountEntryModalProps) {
  const isEdit = !!entry
  const title = isEdit ? `Edit ${type === 'expense' ? 'Expense' : 'Income'}` : `Add ${type === 'expense' ? 'Expense' : 'Income'}`
  
  const allExpenseCategories = [...EXPENSE_CATEGORIES, ...mockCustomExpenseCategories]
  const allIncomeCategories = [...INCOME_CATEGORIES, ...mockCustomInventoryCategories]
  const categories = type === 'expense' ? allExpenseCategories : allIncomeCategories

  const [date, setDate] = useState(entry?.date || format(new Date(), 'yyyy-MM-dd'))
  const [description, setDescription] = useState(entry?.description || '')
  const [category, setCategory] = useState(entry?.category || categories[0])
  const [amount, setAmount] = useState(entry?.amount ? entry.amount.toString() : '')
  const [paymentMethod, setPaymentMethod] = useState<'cash'|'upi'|'card'|'other'>(entry?.paymentMethod || 'cash')
  const [notes, setNotes] = useState(entry?.notes || '')
  
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!description.trim()) { setError('Description is required.'); return }
    if (!amount || Number(amount) <= 0) { setError('Enter a valid amount.'); return }
    
    setError('')
    
    const newEntry: AccountEntry = {
      id: entry ? entry.id : Date.now().toString(),
      date,
      description: description.trim(),
      category,
      amount: Number(amount),
      paymentMethod,
      notes: notes.trim() || undefined
    }
    
    onSave(newEntry)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl bg-so-card flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-so-border">
          <h2 className={`font-semibold ${type === 'income' ? 'text-emerald-800' : 'text-so-text'}`}>{title}</h2>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-so-muted" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-so-muted uppercase tracking-wider mb-1.5">Date</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-accent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-so-muted uppercase tracking-wider mb-1.5">Amount (₹)</label>
              <input
                type="number"
                min="1"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-accent"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-so-muted uppercase tracking-wider mb-1.5">Description</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What was this for?"
              className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-accent"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-so-muted uppercase tracking-wider mb-1.5">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text appearance-none focus:outline-none focus:border-so-accent"
              >
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-so-muted uppercase tracking-wider mb-1.5">Method</label>
              <div className="flex bg-so-surface border border-so-border rounded-lg p-1">
                {(['cash', 'upi', 'card', 'other'] as const).map(m => (
                  <button key={m} type="button" onClick={() => setPaymentMethod(m)} className={`flex-1 py-1.5 text-[11px] font-bold rounded-md uppercase tracking-wider transition-colors ${paymentMethod === m ? 'bg-white shadow-sm text-so-text' : 'text-so-muted hover:text-so-text'}`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-so-muted uppercase tracking-wider mb-1.5">Notes (Optional)</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-accent"
            />
          </div>
          
          {error && (
            <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}
          
          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2 border border-so-border rounded-lg text-sm text-so-muted hover:text-so-text font-medium">Cancel</button>
            <button type="submit" className={`flex-1 py-2 rounded-lg text-sm font-bold text-white shadow-sm ${type === 'income' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-so-accent hover:opacity-90'}`}>
              {isEdit ? 'Save Changes' : `Add ${type === 'expense' ? 'Expense' : 'Income'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
