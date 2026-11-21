'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { AccountsWindow } from '@/lib/reports/accounts'
import { coversReportPeriod, getReportPeriod } from '@/lib/reports/period'
import type { ReportMode, ReportPeriod } from '@/lib/reports/period'
import { getTodayIST } from '@/lib/utils'
import { AccountsReadError, fetchAccountsWindow } from './accounts-client'

const FRESH_FOR_MS = 60_000
type RequestTarget = { period: ReportPeriod; followToday: boolean; blocking: boolean }
type View = {
  period: ReportPeriod
  data: AccountsWindow | null
  loading: RequestTarget | null
  error: { message: string; retry?: RequestTarget } | null
}

export function useAccountsWindow(active: boolean) {
  const [view, setView] = useState<View>(() => ({
    period: getReportPeriod('month', undefined, getTodayIST()), data: null, loading: null, error: null,
  }))
  const inFlight = useRef<AbortController | null>(null)

  const request = useCallback(async (target: RequestTarget) => {
    inFlight.current?.abort()
    const controller = new AbortController()
    inFlight.current = controller
    setView(previous => ({ ...previous, loading: target, error: null }))
    try {
      const data = await fetchAccountsWindow(target.period.mode, target.followToday ? null : target.period.anchor, controller.signal)
      if (inFlight.current !== controller) return
      const period = getReportPeriod(target.period.mode, target.followToday ? data.today : target.period.anchor, data.today)
      if (!coversReportPeriod(data.range, period)) throw new Error('The requested period did not finish loading. Try again.')
      setView({ period, data, loading: null, error: null })
    } catch (error) {
      if (inFlight.current !== controller || controller.signal.aborted) return
      const denied = error instanceof AccountsReadError && (error.status === 401 || error.status === 403)
      setView(previous => ({ ...previous, data: denied ? null : previous.data, loading: null, error: {
        message: error instanceof AccountsReadError ? error.message : 'Could not load the accounts report. Try again.',
        retry: denied ? undefined : target,
      } }))
    } finally {
      if (inFlight.current === controller) inFlight.current = null
    }
  }, [])

  const refresh = useCallback((force = false) => {
    if (inFlight.current) return
    const today = getTodayIST()
    if (!view.data) {
      if (force && !view.error) void request({ period: getReportPeriod('month', undefined, today), followToday: true, blocking: true })
      return
    }
    if (!force && today === view.data.today && Date.now() - Date.parse(view.data.refreshedAt) < FRESH_FOR_MS) return
    const followToday = !view.period.past
    const period = getReportPeriod(view.period.mode, followToday ? today : view.period.anchor, today)
    void request({ period, followToday, blocking: period.start !== view.period.start || period.end !== view.period.end })
  }, [request, view.data, view.error, view.period])

  const navigate = (mode: ReportMode, date: string) => {
    const period = getReportPeriod(mode, date, getTodayIST())
    if (mode === view.period.mode && period.anchor === view.period.anchor && period.through === view.period.through) return
    if (view.data && coversReportPeriod(view.data.range, period)) {
      inFlight.current?.abort()
      inFlight.current = null
      setView({ period, data: view.data, loading: null, error: null })
    } else {
      void request({ period, followToday: false, blocking: true })
    }
  }

  useEffect(() => () => {
    inFlight.current?.abort()
    inFlight.current = null
  }, [])

  useEffect(() => {
    if (!active) return
    const onFocus = () => refresh()
    const onPageShow = (event: PageTransitionEvent) => { if (event.persisted) refresh(true) }
    const onVisibility = () => { if (document.visibilityState === 'visible') refresh() }
    window.addEventListener('focus', onFocus)
    window.addEventListener('pageshow', onPageShow)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('pageshow', onPageShow)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [active, refresh])

  const retryTarget = view.error?.retry
  return { ...view, navigate, open: () => refresh(true), retry: retryTarget ? () => { void request(retryTarget) } : undefined }
}
