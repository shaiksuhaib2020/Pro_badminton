'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AttendanceRecord } from '@/lib/types/attendance'
import type { Batch } from '@/lib/types/batches'
import type { Student } from '@/lib/types/students'
import { saveAttendance } from '../../actions'
import {
  getAttendanceAverage, getAttendanceDraft, getAttendanceStatus, getAttendanceSummary,
  getInsightDates, isBatchAttendance, markAllPresent, updateAttendanceRecords,
} from './attendance-utils'
import type { AttendanceDraft, AttendanceStatus, AttInsightFilter, BatchNavigation } from './attendance-utils'

type MarkingState = {
  navigationKey: string
  view: 'insights' | 'marking'
  date: string
  draft: AttendanceDraft
  isDirty: boolean
}

type Options = {
  batch: Batch
  attendanceStudents: Student[]
  attendance: AttendanceRecord[]
  todayStr: string
  navigation: BatchNavigation
}

export default function useBatchAttendance({ batch, attendanceStudents, attendance, todayStr, navigation }: Options) {
  const router = useRouter()
  const [saved, setSaved] = useState({ source: attendance, records: attendance })
  // Refresh authoritative records without an effect or resetting an in-progress draft.
  if (saved.source !== attendance) setSaved({ source: attendance, records: attendance })
  const attendanceRecords = saved.source === attendance ? saved.records : attendance

  const [marking, setMarking] = useState<MarkingState>(() => ({
    navigationKey: navigation.key,
    view: navigation.shouldMark ? 'marking' : 'insights',
    date: navigation.markingDate,
    draft: navigation.shouldMark ? getAttendanceDraft(attendanceRecords, batch, navigation.markingDate) : {},
    isDirty: false,
  }))
  // Only a changed URL request may reinitialize marking; ordinary rerenders and tab clicks cannot.
  if (marking.navigationKey !== navigation.key) {
    setMarking({
      ...marking,
      navigationKey: navigation.key,
      ...(navigation.shouldMark ? {
        view: 'marking', date: navigation.markingDate,
        draft: getAttendanceDraft(attendanceRecords, batch, navigation.markingDate), isDirty: false,
      } : {}),
    })
  }

  const [attSearchQuery, setAttSearchQuery] = useState('')
  const [insightFilter, setInsightFilter] = useState<AttInsightFilter>('last5')
  const [isSaving, setIsSaving] = useState(false)
  const saving = useRef(false)
  const [toast, setToast] = useState('')
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(''), 3000)
    return () => clearTimeout(timer)
  }, [toast])

  const filteredAttStudents = useMemo(() => {
    if (!attSearchQuery.trim()) return attendanceStudents
    const query = attSearchQuery.toLowerCase()
    return attendanceStudents.filter(student =>
      student.name.toLowerCase().includes(query) || student.phone.includes(attSearchQuery))
  }, [attendanceStudents, attSearchQuery])

  const insightDates = useMemo(() => getInsightDates(todayStr, insightFilter), [todayStr, insightFilter])
  const allBatchRecords = useMemo(() => attendanceRecords.filter(record =>
    isBatchAttendance(record, batch)), [attendanceRecords, batch])
  const datesWithRecords = insightDates.filter(date => allBatchRecords.some(record => record.date === date))
  const batchAvgPct = getAttendanceAverage(attendanceStudents, allBatchRecords, datesWithRecords)
  const getStatus = (studentId: string, date: string) => getAttendanceStatus(allBatchRecords, studentId, date)

  const enterMarkingMode = (date: string) => {
    setMarking(previous => ({
      ...previous, view: 'marking', date,
      draft: getAttendanceDraft(attendanceRecords, batch, date), isDirty: false,
    }))
  }
  const handleCancelAttendance = () => {
    setMarking(previous => ({ ...previous, view: 'insights', isDirty: false }))
  }
  const handleMark = (studentId: string, status: AttendanceStatus) => {
    setMarking(previous => ({ ...previous, draft: { ...previous.draft, [studentId]: status }, isDirty: true }))
  }
  const handleMarkAllPresent = () => {
    setMarking(previous => ({ ...previous, draft: markAllPresent(attendanceStudents, previous.draft), isDirty: true }))
  }
  const handleSaveAttendance = async () => {
    if (saving.current) return
    saving.current = true
    setIsSaving(true)
    try {
      await saveAttendance(batch.id, marking.date, marking.draft)
      setSaved(previous => ({
        ...previous, records: updateAttendanceRecords(previous.records, batch, marking.date, marking.draft),
      }))
      setMarking(previous => ({ ...previous, view: 'insights', isDirty: false }))
      setToast('Attendance saved')
      router.refresh()
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : 'Failed to save attendance')
    } finally {
      saving.current = false
      setIsSaving(false)
    }
  }

  return {
    batch, attendanceStudents, attendanceRecords, todayStr, attSearchQuery, setAttSearchQuery,
    filteredAttStudents, insightFilter, setInsightFilter, insightDates, allBatchRecords,
    datesWithRecords, batchAvgPct, getStatus,
    attView: marking.view, markingDate: marking.date, draftRecords: marking.draft, isDirty: marking.isDirty,
    isSaving, toast, ...getAttendanceSummary(attendanceStudents, marking.draft),
    enterMarkingMode, handleCancelAttendance, handleMark, handleMarkAllPresent, handleSaveAttendance,
  }
}

export type BatchAttendanceController = ReturnType<typeof useBatchAttendance>
