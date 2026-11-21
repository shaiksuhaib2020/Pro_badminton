'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import { mockCourtMemberships, mockCourtPlans } from '@/lib/mock-data'
import { getMembershipDisplayLabel } from '@/lib/court-utils'
import type { CourtMembership } from '@/lib/types/court'
import RenewCourtMembershipModal from '@/components/court/RenewCourtMembershipModal'
import { formatCurrency, formatDate, getTodayIST } from '@/lib/utils'

export default function CourtTransactionsView() {
  const [tab, setTab] = useState<'recent' | 'paid' | 'pending' | 'partial'>('recent')
  const [search, setSearch] = useState('')
  const [target, setTarget] = useState<CourtMembership | null>(null)
  const [, refresh] = useState(0)
  const members = mockCourtMemberships.filter(member => !search.trim() || getMembershipDisplayLabel(member).toLowerCase().includes(search.toLowerCase()) || member.contactPhone.includes(search))
  const entries = members.flatMap(member => member.paymentHistory.map(payment => ({ member, payment })))
    .sort((a, b) => b.payment.date.localeCompare(a.payment.date))
  const pending = members.filter(member => member.status === 'expired' || member.status === 'due-soon' || member.status === 'exhausted')
  const partial = members.filter(member => member.pendingAmount > 0)
  return <div>
    <div className="flex items-center gap-2 border-b border-so-border mb-6">{(['recent', 'paid', 'pending', 'partial'] as const).map(value => <button key={value} onClick={() => setTab(value)} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${tab === value ? 'border-so-accent text-so-accent' : 'border-transparent text-so-muted hover:text-so-text'}`}>{value === 'partial' ? 'Partially Paid' : value}</button>)}</div>
    <div className="relative mb-4"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-so-muted" strokeWidth={1.75} /><input type="text" placeholder="Search by name or phone..." value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-white border border-so-border rounded-lg pl-9 pr-4 py-2 text-sm text-so-text placeholder:text-so-muted focus:outline-none focus:border-so-accent" /></div>
    <div className="bg-so-card border border-so-border rounded-xl shadow-sm overflow-hidden min-h-[400px]"><div className="overflow-x-auto"><table className="w-full text-sm">
      <thead><tr className="bg-so-surface border-b border-so-border">{['Member', 'Date / Status', 'Amount', 'Action'].map(label => <th key={label} className="text-left px-5 py-3 text-xs font-semibold text-so-muted uppercase tracking-wider">{label}</th>)}</tr></thead>
      <tbody className="divide-y divide-so-border">
        {(tab === 'recent' ? entries : tab === 'paid' ? entries.filter(row => row.payment.status === 'active') : []).map(({member, payment}) => <tr key={payment.id} className="hover:bg-so-surface/50 transition-colors"><td className="px-5 py-3 font-medium text-so-text">{getMembershipDisplayLabel(member)}</td><td className="px-5 py-3 text-so-muted">{formatDate(payment.date)}</td><td className="px-5 py-3 font-bold text-so-emerald">{formatCurrency(payment.amount)}</td><td className="px-5 py-3 text-right">{payment.status === 'active' ? <button onClick={() => {
          if (!window.confirm('Void this court payment?')) return
          payment.status = 'deleted'
          member.amountPaid -= payment.amount
          refresh(n => n + 1)
        }} className="p-1.5 rounded-md text-so-muted hover:text-red-500 hover:bg-red-50 transition-colors">Void</button> : <span className="text-so-muted">Voided</span>}</td></tr>)}
        {tab === 'pending' && pending.map(member => <tr key={member.id} className="hover:bg-so-surface/50 transition-colors"><td className="px-5 py-3 font-medium text-so-text">{getMembershipDisplayLabel(member)}</td><td className="px-5 py-3 text-so-muted capitalize">{member.status.replace('-', ' ')}</td><td className="px-5 py-3 text-so-text">{formatCurrency(mockCourtPlans.find(plan => plan.id === member.planId)?.price ?? 0)}</td><td className="px-5 py-3 text-right"><button onClick={() => setTarget(member)} className="flex items-center gap-2 bg-so-accent text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm">Renew / Buy Sessions</button></td></tr>)}
        {tab === 'partial' && partial.map(member => <tr key={member.id} className="hover:bg-so-surface/50 transition-colors"><td className="px-5 py-3 font-medium text-so-text">{getMembershipDisplayLabel(member)}</td><td className="px-5 py-3 text-so-muted">{member.contactPhone}</td><td className="px-5 py-3 font-bold text-so-yellow">{formatCurrency(member.pendingAmount)}</td><td className="px-5 py-3 text-right"><button onClick={() => {
          const value = window.prompt(`Amount to collect (up to ${member.pendingAmount})`, String(member.pendingAmount))
          if (!value) return
          const amount = Number(value)
          if (!Number.isFinite(amount) || amount <= 0 || amount > member.pendingAmount) return
          member.pendingAmount -= amount
          member.amountPaid += amount
          member.paymentHistory.push({ id: crypto.randomUUID(), membershipId: member.id, date: getTodayIST(), amount, paymentMethod: 'cash', entryType: 'renewal', status: 'active' })
          refresh(n => n + 1)
        }} className="flex items-center gap-2 bg-so-accent text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm">Collect Remaining</button></td></tr>)}
      </tbody>
    </table></div></div>
    {target && <RenewCourtMembershipModal membership={target} onClose={() => setTarget(null)} onSuccess={() => { setTarget(null); refresh(n => n + 1) }} />}
  </div>
}
