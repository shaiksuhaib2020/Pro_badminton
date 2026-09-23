'use client'

import { PERMISSION_MATRIX, AccessLevel } from '@/lib/mock-data'
import { ShieldCheck, Info } from 'lucide-react'

const ACCESS_CHIP: Record<AccessLevel, { label: string; className: string }> = {
  full: { label: 'Full', className: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  view: { label: 'View', className: 'bg-blue-50 text-blue-700 border border-blue-200' },
  partial: { label: 'Partial', className: 'bg-yellow-50 text-yellow-700 border border-yellow-200' },
  collect: { label: 'Collect', className: 'bg-orange-50 text-orange-700 border border-orange-200' },
  mark: { label: 'Mark', className: 'bg-purple-50 text-purple-700 border border-purple-200' },
  none: { label: '—', className: 'text-so-muted font-normal' },
}

export default function PermissionsMatrix() {
  return (
    <div className="bg-so-card border border-so-border rounded-2xl p-6 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-so-accent/10 flex items-center justify-center">
          <ShieldCheck className="w-4 h-4 text-so-accent" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-so-text">Role Permissions Matrix</h2>
          <p className="text-xs text-so-muted">Default system privileges per role across modules</p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50/60 border border-blue-200/80 rounded-xl p-3 flex items-start gap-2 text-xs text-blue-800">
        <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          This matrix shows the default access levels per role. Custom per-member overrides can be set from the three-dot menu on each staff member.
        </p>
      </div>

      {/* Permissions Table */}
      <div className="overflow-x-auto bg-white border border-so-border rounded-xl shadow-xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-so-surface border-b border-so-border text-so-muted font-bold uppercase">
              <th className="px-4 py-3">Module</th>
              <th className="px-4 py-3 text-purple-700">Owner</th>
              <th className="px-4 py-3 text-blue-700">Manager</th>
              <th className="px-4 py-3 text-emerald-700">Coach</th>
              <th className="px-4 py-3 text-yellow-700">Accountant</th>
              <th className="px-4 py-3 text-gray-700">Receptionist</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-so-border">
            {PERMISSION_MATRIX.map(row => (
              <tr key={row.module} className="hover:bg-so-surface/30 transition-colors">
                <td className="px-4 py-2.5 font-bold text-so-text whitespace-nowrap">{row.module}</td>
                {(['owner', 'manager', 'coach', 'accountant', 'receptionist'] as const).map(roleKey => {
                  const level = row[roleKey]
                  const chip = ACCESS_CHIP[level]
                  return (
                    <td key={roleKey} className="px-4 py-2.5 whitespace-nowrap">
                      <span className={`inline-block px-2.5 py-0.5 text-[11px] font-bold rounded ${chip.className}`}>
                        {chip.label}
                      </span>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
