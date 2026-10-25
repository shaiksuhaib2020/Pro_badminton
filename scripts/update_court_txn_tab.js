const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src/app/(management)/court-memberships/[id]/page.tsx');
let code = fs.readFileSync(filePath, 'utf8');

// Replace standard variables
code = code.replace(
  "const planName = mockCourtPlans.find(p => p.id === membership.planId)?.name ?? '—'",
  `const planName = mockCourtPlans.find(p => p.id === membership.planId)?.name ?? '—'
  const plan = mockCourtPlans.find(p => p.id === membership.planId)
  const totalDue = membership.pendingAmount > 0 ? membership.pendingAmount : ((membership.planType === 'monthly' && (membership.status === 'expired' || membership.status === 'due-soon')) || (membership.planType === 'sessions' && membership.status === 'exhausted') ? (plan?.price ?? 0) : 0)
  const totalCollected = membership.amountPaid
  
  const isPending = (membership.planType === 'monthly' && (membership.status === 'expired' || membership.status === 'due-soon')) || (membership.planType === 'sessions' && membership.status === 'exhausted')
  const isPartial = membership.pendingAmount > 0
  
  const formatDateLabel = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'dd MMM yyyy')
    } catch {
      return dateStr
    }
  }
  
  const getDaysLabel = (m: CourtMembership) => {
    if (m.planType === 'sessions') return \`\${m.remainingSessions} sessions left\`
    if (!m.endDate) return 'No end date'
    const today = new Date()
    const due = parseISO(m.endDate)
    const diff = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (diff < 0) return \`\${Math.abs(diff)} day\${Math.abs(diff) !== 1 ? 's' : ''} overdue\`
    if (diff === 0) return 'Due today'
    return \`\${diff} day\${diff !== 1 ? 's' : ''} remaining\`
  }`
);

// We need to import Receipt, Wallet, Trash2, CheckCircle, AlertCircle, Clock
code = code.replace(
  "import { ArrowLeft, UserPlus, Pencil, RefreshCw, HandCoins, UserX, X, History, Plus } from 'lucide-react'",
  "import { ArrowLeft, UserPlus, Pencil, RefreshCw, HandCoins, UserX, X, History, Plus, Receipt, Wallet, Trash2, CheckCircle, AlertCircle, Clock } from 'lucide-react'"
);

const oldTxnBlockStart = `      {activeTab === 'transactions' && (`;
const oldTxnBlockEnd = `      {activeTab === 'checkins' && (`;
const startIndex = code.indexOf(oldTxnBlockStart);
const endIndex = code.indexOf(oldTxnBlockEnd);

const newTxnBlock = `      {activeTab === 'transactions' && (
        <div>
          {/* 3 Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-so-card border border-so-border rounded-xl shadow-sm p-4">
              <span className="text-so-muted text-xs uppercase tracking-wider font-semibold">Total Due</span>
              <div className={\`text-2xl font-bold mt-2 \${totalDue > 0 ? 'text-so-red' : 'text-so-muted'}\`}>
                ₹ {totalDue.toLocaleString('en-IN')}
              </div>
            </div>
            <div className="bg-so-card border border-so-border rounded-xl shadow-sm p-4">
              <span className="text-so-muted text-xs uppercase tracking-wider font-semibold">Collected <span className="lowercase font-normal">(All Time)</span></span>
              <div className="text-2xl font-bold mt-2 text-so-emerald">
                ₹ {totalCollected.toLocaleString('en-IN')}
              </div>
            </div>
            <div className="bg-so-card border border-so-border rounded-xl shadow-sm p-4">
              <span className="text-so-muted text-xs uppercase tracking-wider font-semibold">Plan</span>
              <div className="text-2xl font-bold mt-2 text-so-text capitalize">
                {planName}
              </div>
            </div>
          </div>

          {/* Transaction section */}
          <div className="flex items-center justify-between mt-6 mb-4">
            <div className="flex gap-1 p-1 bg-so-surface rounded-lg border border-so-border">
              {(['recent', 'paid', 'pending', 'partial'] as const).map(tab => {
                const labels = { recent: 'Recent', paid: 'Paid', pending: 'Pending', partial: 'Partially Paid' }
                return (
                  <button key={tab} onClick={() => setTxnTab(tab)}
                    className={\`px-4 py-1.5 text-xs font-medium rounded-md transition-colors \${
                      txnTab === tab
                        ? 'bg-so-accent text-white shadow-sm'
                        : 'text-so-muted hover:text-so-text hover:bg-so-surface/80'
                    }\`}
                  >
                    {labels[tab]}
                  </button>
                )
              })}
            </div>
          </div>

          {/* TX Tabs Content */}
          <div className="bg-so-card border border-so-border rounded-xl shadow-sm overflow-hidden min-h-[300px]">
            {txnTab === 'recent' && (
              <div>
                {filteredTxns.length === 0 ? (
                  <div className="py-20 flex flex-col items-center justify-center">
                    <Receipt className="w-12 h-12 text-so-muted mb-4" strokeWidth={1.5} />
                    <p className="text-so-text font-semibold">No transactions found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-so-surface border-b border-so-border">
                          <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Date</th>
                          <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Type</th>
                          <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Amount</th>
                          <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Method</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-so-border">
                        {filteredTxns.map(t => (
                          <tr key={t.id} className="bg-so-card hover:bg-so-surface/60 border-b border-so-border transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-so-text">{formatDateLabel(t.date)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-so-text capitalize">{t.entryType.replace('-', ' ')}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className={\`font-semibold \${t.status === 'deleted' ? 'text-so-muted line-through' : 'text-so-emerald'}\`}>
                                ₹ {t.amount.toLocaleString('en-IN')}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-so-muted capitalize">{t.paymentMethod}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {txnTab === 'paid' && (
              <div>
                <div className="px-6 py-3 border-b border-so-border bg-so-surface flex items-center gap-4 text-sm text-so-muted">
                  <span>{filteredTxns.length} transactions</span>
                  <span>•</span>
                  <span className="text-so-emerald font-medium">
                    ₹ {filteredTxns.reduce((s, t) => s + t.amount, 0).toLocaleString('en-IN')} collected
                  </span>
                </div>
                {filteredTxns.length === 0 ? (
                  <div className="py-20 flex flex-col items-center justify-center">
                    <CheckCircle className="w-12 h-12 text-so-muted mb-4" strokeWidth={1.5} />
                    <p className="text-so-text font-semibold">No paid transactions</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-so-surface border-b border-so-border">
                          <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Date</th>
                          <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Amount</th>
                          <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Mode</th>
                          <th className="text-right px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-so-border">
                        {filteredTxns.map(t => (
                          <tr key={t.id} className="bg-so-card hover:bg-so-surface/60 border-b border-so-border transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-so-text">{formatDateLabel(t.date)}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="font-semibold text-so-emerald">
                                ₹ {t.amount.toLocaleString('en-IN')}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-so-muted capitalize">{t.paymentMethod}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <button onClick={() => handleVoidTxn(t.id)}
                                className="p-1.5 inline-flex rounded-md text-so-muted hover:text-so-red hover:bg-so-surface transition-colors" title="Void Payment">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {txnTab === 'pending' && (
              <div>
                {!isPending ? (
                  <div className="py-20 flex flex-col items-center justify-center">
                    <CheckCircle className="w-12 h-12 text-so-emerald mb-4" strokeWidth={1.5} />
                    <p className="text-so-text font-semibold">No pending payments — member is up to date</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-so-surface border-b border-so-border">
                          <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Member</th>
                          <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Phone</th>
                          <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Due Date</th>
                          <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Amount</th>
                          <th className="text-right px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-so-border">
                        <tr className="bg-so-card hover:bg-so-surface/60 border-b border-so-border transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-so-text">{label}</span>
                              {membership.status === 'expired' || membership.status === 'exhausted' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-red-50 text-red-600 border border-red-200">
                                  <AlertCircle className="w-3 h-3" />
                                  Overdue
                                </span>
                              ) : membership.status === 'due-soon' || membership.status === 'sessions-low' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-600 border border-amber-200">
                                  <Clock className="w-3 h-3" />
                                  Due Soon
                                </span>
                              ) : null}
                            </div>
                            <p className={\`text-xs mt-0.5 font-medium \${
                              membership.status === 'expired' || membership.status === 'exhausted' ? 'text-red-500' : 'text-amber-500'
                            }\`}>
                              {getDaysLabel(membership)}
                            </p>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-so-muted">
                            {membership.contactPhone}
                          </td>
                          <td className={\`px-6 py-4 whitespace-nowrap font-medium \${membership.status === 'expired' ? 'text-so-red' : 'text-so-yellow'}\`}>
                            {membership.endDate ? formatDateLabel(membership.endDate) : '—'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-so-emerald font-semibold">
                            ₹ {plan?.price?.toLocaleString('en-IN') ?? 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex justify-end">
                              {membership.planType === 'sessions' ? (
                                <button onClick={() => setShowBuySessions(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-so-accent text-white rounded-md text-xs font-medium hover:opacity-90 transition-opacity">
                                  <Plus className="w-3 h-3" /> Buy Sessions
                                </button>
                              ) : (
                                <button onClick={() => setShowRenew(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-so-accent text-white rounded-md text-xs font-medium hover:opacity-90 transition-opacity">
                                  <RefreshCw className="w-3 h-3" /> Renew
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {txnTab === 'partial' && (
              <div>
                {!isPartial ? (
                  <div className="py-20 flex flex-col items-center justify-center">
                    <CheckCircle className="w-12 h-12 text-so-emerald mb-4" strokeWidth={1.5} />
                    <p className="text-so-text font-semibold">No partial payments outstanding</p>
                  </div>
                ) : (
                  (() => {
                    const latestPartial = membership.paymentHistory
                      .filter(p => p.status !== 'deleted')
                      .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())[0]

                    return (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-so-surface border-b border-so-border">
                              <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Member</th>
                              <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Phone</th>
                              <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Date</th>
                              <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Paid</th>
                              <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Remaining</th>
                              <th className="text-left px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Mode</th>
                              <th className="text-right px-6 py-4 text-xs font-semibold text-so-muted uppercase tracking-wider">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-so-border">
                            <tr className="bg-so-card hover:bg-so-surface/60 border-b border-so-border transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap text-so-text font-medium">{label}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-so-muted">{membership.contactPhone}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-so-text">
                                {latestPartial ? formatDateLabel(latestPartial.date) : '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-so-emerald font-semibold">
                                {latestPartial ? \`₹ \${membership.amountPaid.toLocaleString('en-IN')}\` : '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-amber-600 font-semibold">
                                ₹ {membership.pendingAmount.toLocaleString('en-IN')}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-so-muted capitalize">
                                {latestPartial?.paymentMethod || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right">
                                <div className="flex justify-end">
                                  <button
                                    onClick={() => setShowCollect(true)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 border border-amber-500/30 rounded-md text-xs font-medium hover:bg-amber-500/30 transition-colors"
                                  >
                                    <Wallet className="w-3 h-3" />
                                    Collect Remaining
                                  </button>
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )
                  })()
                )}
              </div>
            )}
          </div>
        </div>
      )}
`;

code = code.substring(0, startIndex) + newTxnBlock + "\n" + code.substring(endIndex);

fs.writeFileSync(filePath, code);
console.log('Successfully updated court memberships profile page');
