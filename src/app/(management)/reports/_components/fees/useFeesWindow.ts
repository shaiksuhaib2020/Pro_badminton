'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { coversFeesPeriod, getFeesPeriod } from '@/lib/reports/fees'
import type { FeesMode, FeesPeriod, FeesWindow, FeesWindowResult } from '@/lib/reports/fees'
import { getTodayIST } from '@/lib/utils'
import { FeesReadError, fetchFeesWindow } from './fees-client'

const FRESH_FOR_MS = 60_000

type WindowRequest = { period: FeesPeriod; followToday: boolean; blocking: boolean }
type View = {
  period: FeesPeriod
  data: FeesWindow | null
  loading: WindowRequest | null
  error: { message: string; retry?: WindowRequest } | null
}

function replaceFeesPeriod(period: FeesPeriod) {
  const url = new URL(window.location.href)
  url.searchParams.set('mode', period.mode)
  url.searchParams.set('date', period.anchor)
  window.history.replaceState(null, '', url)
}

export function useFeesWindow(initialPeriod: FeesPeriod, initialData: Promise<FeesWindowResult>, active: boolean) {
  const [view, setView] = useState<View>({ period: initialPeriod, data: null, loading: null, error: null })
  const inFlight = useRef<AbortController | null>(null)

  const request = useCallback(async (target: WindowRequest) => {
    inFlight.current?.abort()
    const controller = new AbortController()
    inFlight.current = controller
    setView(previous => ({ ...previous, loading: target, error: null }))
    try {
      const data = await fetchFeesWindow(target.period.mode, target.followToday ? null : target.period.anchor, controller.signal)
      if (inFlight.current !== controller) return
      const period = getFeesPeriod(target.period.mode, target.followToday ? data.today : target.period.anchor, data.today)
      if (!coversFeesPeriod(data.range, period)) throw new Error('The requested period did not finish loading. Try again.')
      setView({ period, data, loading: null, error: null })
      replaceFeesPeriod(period)
    } catch (error) {
      if (inFlight.current !== controller || controller.signal.aborted) return
      const denied = error instanceof FeesReadError && (error.status === 401 || error.status === 403)
      setView(previous => ({ ...previous, data: denied ? null : previous.data, loading: null, error: {
        message: error instanceof Error ? error.message : 'Could not load the fees report. Try again.',
        retry: denied ? undefined : target,
      } }))
    } finally {
      if (inFlight.current === controller) inFlight.current = null
    }
  }, [])

  useEffect(() => {
    let mounted = true
    void initialData.then(result => {
      if (!mounted) return
      if ('window' in result) {
        setView({ period: initialPeriod, data: result.window, loading: null, error: null })
        const today = getTodayIST()
        if (today !== result.window.today || Date.now() - Date.parse(result.window.refreshedAt) >= FRESH_FOR_MS) {
          const followToday = !initialPeriod.past
          const period = getFeesPeriod(initialPeriod.mode, followToday ? today : initialPeriod.anchor, today)
          void request({ period, followToday, blocking: period.start !== initialPeriod.start || period.end !== initialPeriod.end })
        }
      } else {
        setView({ period: initialPeriod, data: null, loading: null, error: {
          message: result.error,
          retry: result.unavailable ? undefined : { period: initialPeriod, blocking: true, followToday: !initialPeriod.past },
        } })
      }
    })
    return () => {
      mounted = false
      inFlight.current?.abort()
      inFlight.current = null
    }
  }, [initialData, initialPeriod, request])

  const navigate = (mode: FeesMode, date: string) => {
    const today = getTodayIST()
    const period = getFeesPeriod(mode, date, today)
    if (mode === view.period.mode && period.anchor === view.period.anchor && period.through === view.period.through) return
    if (view.data && coversFeesPeriod(view.data.range, period)) {
      inFlight.current?.abort()
      inFlight.current = null
      setView({ period, data: view.data, loading: null, error: null })
      replaceFeesPeriod(period)
    } else {
      void request({ period, followToday: false, blocking: true })
    }
  }

  const refresh = useCallback((force = false) => {
    if (!view.data || inFlight.current) return
    const today = getTodayIST()
    if (!force && today === view.data.today && Date.now() - Date.parse(view.data.refreshedAt) < FRESH_FOR_MS) return
    const followToday = !view.period.past
    const period = getFeesPeriod(view.period.mode, followToday ? today : view.period.anchor, today)
    void request({ period, followToday, blocking: period.start !== view.period.start || period.end !== view.period.end })
  }, [request, view.data, view.period])

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
  const retry = retryTarget ? () => { void request(retryTarget) } : undefined
  return { ...view, navigate, refresh, retry }
}
