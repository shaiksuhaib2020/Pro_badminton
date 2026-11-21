'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, Calendar, CheckCircle2, Download, Loader2, PieChart, Users, Wallet } from 'lucide-react'
import { ALL_BATCHES, rollUpFeesPeriod, selectFeesReport } from '@/lib/reports/fees'
import type { FeesPeriod, FeesWindowResult } from '@/lib/reports/fees'
import FeesSegment from './fees/FeesSegment'
import { useFeesWindow } from './fees/useFeesWindow'
import { buildFeesExport } from './fees/fees-export'
import { fetchFeesExport } from './fees/fees-client'
import { rollUpAccountsPeriod } from '@/lib/reports/accounts'
import AccountsSegment from './accounts/AccountsSegment'
import { useAccountsWindow } from './accounts/useAccountsWindow'
import { fetchAccountsExport } from './accounts/accounts-client'
import { buildAccountsExport } from './accounts/accounts-export'
import StudentsSegment from './StudentsSegment'
import AttendanceSegment from './AttendanceSegment'
import { downloadCsv, printPdf, ReportExportProvider, useCurrentExporter } from '../export'
import type { ReportExportPayload } from '../export'
import styles from './reports.module.css'

type ReportTab = 'fees' | 'accounts' | 'students' | 'attendance'

const reportTabs = [
  { key: 'fees', label: 'Fees', icon: PieChart },
  { key: 'accounts', label: 'Accounts', icon: Wallet },
  { key: 'students', label: 'Students', icon: Users },
  { key: 'attendance', label: 'Attendance', icon: Calendar },
] as const

function ExportButton({ activeTab, getPayload, loadPayload }: {
  activeTab: ReportTab
  getPayload?: () => ReportExportPayload | undefined
  loadPayload?: (signal: AbortSignal) => Promise<ReportExportPayload>
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const current = useRef<{ controller: AbortController; popup: Window | null } | null>(null)
  const enabled = !loading && (!!getPayload || !!loadPayload)

  useEffect(() => () => {
    current.current?.controller.abort()
    current.current?.popup?.close()
  }, [])

  const handleExport = async (format: 'csv' | 'pdf') => {
    if (!enabled || current.current) return
    setOpen(false)
    setStatus(null)
    const controller = new AbortController()
    let popup: Window | null = null
    try {
      if (loadPayload) {
        if (format === 'pdf') {
          popup = window.open('', '_blank')
          if (!popup) throw new Error('Allow pop-ups to generate the PDF report.')
          popup.document.title = `Preparing ${activeTab} report`
          popup.document.body.textContent = `Preparing ${activeTab} report…`
        }
        current.current = { controller, popup }
        setLoading(true)
      }
      const payload = loadPayload ? await loadPayload(controller.signal) : getPayload?.()
      if (controller.signal.aborted) return
      if (!payload) throw new Error('The selected report is still loading. Please try again.')
      if (format === 'csv') downloadCsv(payload)
      else printPdf(payload, popup ?? undefined)
      setStatus({ type: 'success', message: `${activeTab[0].toUpperCase() + activeTab.slice(1)} report ready to export.` })
    } catch (error) {
      popup?.close()
      if (controller.signal.aborted) return
      setStatus({ type: 'error', message: error instanceof Error ? error.message : 'Export failed. Please try again.' })
    } finally {
      if (current.current?.controller === controller) {
        current.current = null
        if (!controller.signal.aborted) setLoading(false)
      }
    }
  }

  return (
    <div className="relative shrink-0">
      <button type="button" onClick={() => setOpen(value => !value)} disabled={!enabled} aria-busy={loading} aria-expanded={open && enabled}
        className="flex items-center justify-center gap-2 bg-so-accent text-so-accent-text px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm disabled:opacity-50">
        {loading ? <Loader2 className="w-4 h-4 shrink-0 animate-spin" strokeWidth={1.75} /> : <Download className="w-4 h-4 shrink-0" strokeWidth={1.75} />}
        {loading ? 'Preparing export…' : 'Export'}
      </button>
      {open && enabled && (
        <div className="absolute right-0 top-full mt-1 w-32 bg-so-card border border-so-border rounded-lg shadow-lg z-50 py-1 text-left">
          <button type="button" onClick={() => handleExport('csv')} className="w-full text-left px-4 py-2 text-xs font-medium text-so-text hover:bg-so-surface">CSV</button>
          <button type="button" onClick={() => handleExport('pdf')} className="w-full text-left px-4 py-2 text-xs font-medium text-so-text hover:bg-so-surface">PDF</button>
        </div>
      )}
      {status && (
        <div role={status.type === 'success' ? 'status' : 'alert'} className="fixed bottom-6 right-6 z-[60] bg-so-text text-so-accent-text px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-sm">
          {status.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 text-so-emerald" strokeWidth={1.75} /> : <AlertCircle className="w-4 h-4 shrink-0 text-so-red" strokeWidth={1.75} />}
          <span>{status.message}</span>
        </div>
      )}
    </div>
  )
}

function SegmentExport({ activeTab }: { activeTab: 'students' | 'attendance' }) {
  const { getExporter } = useCurrentExporter()
  return <ExportButton activeTab={activeTab} getPayload={() => getExporter()?.()} />
}

export default function ReportsView({ period, data, accountsAllowed }: { period: FeesPeriod; data: Promise<FeesWindowResult>; accountsAllowed: boolean }) {
  const [activeTab, setActiveTab] = useState<ReportTab>('fees')
  const [batchId, setBatchId] = useState(ALL_BATCHES)
  const fees = useFeesWindow(period, data, activeTab === 'fees')
  const accounts = useAccountsWindow(activeTab === 'accounts' && accountsAllowed)
  const report = useMemo(() => fees.data ? rollUpFeesPeriod(fees.data, fees.period) : null, [fees.data, fees.period])
  const selection = useMemo(() => report ? selectFeesReport(report, batchId) : null, [report, batchId])
  const accountsReport = useMemo(() => accounts.data ? rollUpAccountsPeriod(accounts.data.days, accounts.period) : null,
    [accounts.data, accounts.period])
  const loadFeesExport = selection && !fees.loading?.blocking ? async (signal: AbortSignal) => {
    const fresh = await fetchFeesExport(fees.period, selection.batchId, signal)
    return buildFeesExport(fresh.period, fresh.selection, fresh.refreshedAt)
  } : undefined
  const loadAccountsExport = accountsReport && !accounts.loading?.blocking ? async (signal: AbortSignal) => {
    const fresh = await fetchAccountsExport(accounts.period, signal)
    return buildAccountsExport(fresh.period, fresh.report, fresh.refreshedAt)
  } : undefined
  const selectTab = (tab: ReportTab) => {
    if (tab === activeTab || (tab === 'accounts' && !accountsAllowed)) return
    if (tab === 'fees') fees.refresh(true)
    if (tab === 'accounts') accounts.open()
    setActiveTab(tab)
  }

  return (
    <ReportExportProvider>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-so-text tracking-tight">Reports & Analysis</h1>
            <p className="text-sm text-so-muted mt-1">Track key metrics across financials, enrollments, and attendance.</p>
          </div>
          {activeTab === 'fees' || activeTab === 'accounts' ? <ExportButton key={activeTab} activeTab={activeTab}
              loadPayload={activeTab === 'fees' ? loadFeesExport : accountsAllowed ? loadAccountsExport : undefined} />
            : <SegmentExport key={activeTab} activeTab={activeTab} />}
        </div>

        {/* Segment Tabs */}
        <div className="inline-flex bg-so-surface p-1 rounded-lg border border-so-border overflow-x-auto w-full md:w-auto">
        {reportTabs.filter(tab => tab.key !== 'accounts' || accountsAllowed).map(({ key, label, icon: Icon }) => (
          <button type="button" aria-pressed={activeTab === key}
            key={key}
            onClick={() => selectTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === key ? 'bg-so-accent text-so-accent-text shadow-sm' : 'text-so-muted hover:text-so-text'
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" strokeWidth={1.75} />
            {label}
          </button>
        ))}
        </div>

        <div key={activeTab} className={styles.segment}>
          {activeTab === 'fees' && <FeesSegment period={fees.period} batchId={batchId} onBatchChange={setBatchId}
            onNavigate={fees.navigate} onRetry={fees.retry} report={report} selection={selection}
            pending={!!fees.loading?.blocking} error={fees.error?.message} refreshedAt={fees.data?.refreshedAt}
            loadingLabel={fees.loading?.blocking ? `Loading ${fees.loading.period.label}…` : fees.loading ? 'Refreshing data…' : undefined} />}
          {activeTab === 'accounts' && accountsAllowed && <AccountsSegment period={accounts.period} report={accountsReport}
            onNavigate={accounts.navigate} onRetry={accounts.retry} pending={!!accounts.loading?.blocking}
            error={accounts.error?.message} refreshedAt={accounts.data?.refreshedAt}
            loadingLabel={accounts.loading?.blocking ? `Loading ${accounts.loading.period.label}…` : accounts.loading ? 'Refreshing data…' : undefined} />}
          {activeTab === 'students' && <StudentsSegment />}
          {activeTab === 'attendance' && <AttendanceSegment />}
        </div>
      </div>
    </ReportExportProvider>
  )
}
