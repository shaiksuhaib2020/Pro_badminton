import type { FeesMode, FeesPeriod, FeesSelection, FeesWindow } from '@/lib/reports/fees'

export class FeesReadError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

async function readFees<T>(params: URLSearchParams, signal: AbortSignal): Promise<T> {
  const response = await fetch(`/api/reports/fees?${params}`, { cache: 'no-store', signal })
  if (!response.ok) {
    const body: { error?: string } | null = await response.json().catch(() => null)
    throw new FeesReadError(body?.error ?? 'Could not load the fees report. Try again.', response.status)
  }
  return response.json()
}

export async function fetchFeesWindow(mode: FeesMode, date: string | null, signal: AbortSignal) {
  const params = new URLSearchParams({ view: 'window', mode })
  if (date !== null) params.set('date', date)
  const { window } = await readFees<{ window: FeesWindow }>(params, signal)
  return window
}

export function fetchFeesExport(period: FeesPeriod, batchId: string, signal: AbortSignal) {
  const params = new URLSearchParams({ view: 'period', mode: period.mode, date: period.anchor, batch: batchId })
  return readFees<{ period: FeesPeriod; selection: FeesSelection; refreshedAt: string }>(params, signal)
}
