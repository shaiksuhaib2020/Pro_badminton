import type { AccountsReport, AccountsWindow } from '@/lib/reports/accounts'
import type { ReportMode, ReportPeriod } from '@/lib/reports/period'

export class AccountsReadError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

async function readAccounts<T>(params: URLSearchParams, signal: AbortSignal): Promise<T> {
  const response = await fetch(`/api/reports/accounts?${params}`, { cache: 'no-store', signal })
  if (!response.ok) {
    const body: { error?: string } | null = await response.json().catch(() => null)
    throw new AccountsReadError(body?.error ?? 'Could not load the accounts report. Try again.', response.status)
  }
  return response.json()
}

export async function fetchAccountsWindow(mode: ReportMode, date: string | null, signal: AbortSignal) {
  const params = new URLSearchParams({ view: 'window', mode })
  if (date !== null) params.set('date', date)
  const { window } = await readAccounts<{ window: AccountsWindow }>(params, signal)
  return window
}

export function fetchAccountsExport(period: ReportPeriod, signal: AbortSignal) {
  const params = new URLSearchParams({ view: 'period', mode: period.mode, date: period.anchor })
  return readAccounts<{ period: ReportPeriod; refreshedAt: string; report: AccountsReport }>(params, signal)
}
