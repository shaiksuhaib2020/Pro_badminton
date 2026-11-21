'use client'

import { createContext, useCallback, useContext, useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

export type ExportSection = {
  title: string
  note?: string
  columns: string[]
  rows: (string | number)[][]
}

export type ReportExportPayload = {
  title: string
  dateRange: string
  batch?: string
  dataRefreshed?: string
  metrics: [string, string | number][]
  sections: ExportSection[]
}

type Exporter = () => ReportExportPayload

type ExportContextValue = {
  register: (exporter: Exporter) => () => void
  getExporter: () => Exporter | null
}

const ExportContext = createContext<ExportContextValue | null>(null)

export function ReportExportProvider({ children }: { children: ReactNode }) {
  const exporterRef = useRef<Exporter | null>(null)
  const register = useCallback((exporter: Exporter) => {
    exporterRef.current = exporter
    return () => {
      if (exporterRef.current === exporter) exporterRef.current = null
    }
  }, [])
  const getExporter = useCallback(() => exporterRef.current, [])

  return (
    <ExportContext.Provider value={{ register, getExporter }}>
      {children}
    </ExportContext.Provider>
  )
}

export function useReportExporter(exporter: Exporter) {
  const context = useContext(ExportContext)
  useEffect(() => {
    return context?.register(exporter)
  }, [context, exporter])
}

export function useCurrentExporter() {
  const context = useContext(ExportContext)
  return { getExporter: context?.getExporter ?? (() => null) }
}

function csvValue(value: string | number) {
  const raw = String(value)
  const text = typeof value === 'string' && /^\s*[=+\-@]/.test(raw) ? "'" + raw : raw
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function downloadCsv(payload: ReportExportPayload) {
  const rows: (string | number)[][] = [
    ['Report', payload.title],
    ['Date range', payload.dateRange],
    ...(payload.batch ? [['Batch', payload.batch]] : []),
    ...(payload.dataRefreshed ? [['Data refreshed', payload.dataRefreshed]] : []),
    ['Generated', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })],
    [],
    ['Summary'],
    ...payload.metrics,
  ]

  payload.sections.forEach(section => {
    rows.push([], [section.title], ...(section.note ? [[section.note]] : []), section.columns, ...section.rows)
  })

  const csv = rows.map(row => row.map(csvValue).join(',')).join('\r\n')
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${payload.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

function escapeHtml(value: string | number) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function printPdf(payload: ReportExportPayload, popup = window.open('', '_blank')) {
  if (!popup || popup.closed) throw new Error('Open a print window to generate the PDF report.')

  const metrics = payload.metrics.map(([label, value]) => (
    `<div class="metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`
  )).join('')
  const sections = payload.sections.map(section => {
    const header = section.columns.map(column => `<th>${escapeHtml(column)}</th>`).join('')
    const body = section.rows.length
      ? section.rows.map(row => `<tr>${row.map(value => `<td>${escapeHtml(value)}</td>`).join('')}</tr>`).join('')
      : `<tr><td colspan="${section.columns.length}" class="empty">No records match the selected filters.</td></tr>`
    const note = section.note ? `<p>${escapeHtml(section.note)}</p>` : ''
    return `<section><h2>${escapeHtml(section.title)}</h2>${note}<table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table></section>`
  }).join('')

  popup.document.write(`<!doctype html><html><head><title>${escapeHtml(payload.title)}</title>
    <style>
      @page { margin: 16mm; } body { font: 12px Arial, sans-serif; color: #0f1729; }
      h1 { margin: 0 0 4px; font-size: 22px; } .meta { color: #64748b; margin-bottom: 18px; }
      .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 22px; }
      .metric { border: 1px solid #dde3ee; padding: 9px; border-radius: 6px; }
      .metric span { display: block; color: #64748b; font-size: 10px; margin-bottom: 4px; }
      .metric strong { font-size: 14px; } section { break-inside: avoid; margin-bottom: 18px; }
      h2 { font-size: 15px; border-bottom: 1px solid #dde3ee; padding-bottom: 5px; }
      table { width: 100%; border-collapse: collapse; } th, td { border: 1px solid #dde3ee; padding: 6px; text-align: left; }
      th { background: #eef1f8; font-size: 10px; text-transform: uppercase; } .empty { text-align: center; color: #64748b; }
    </style></head><body><h1>${escapeHtml(payload.title)}</h1>
    <div class="meta">Date range: ${escapeHtml(payload.dateRange)}${payload.batch ? `<br>Batch: ${escapeHtml(payload.batch)}` : ''}${payload.dataRefreshed ? `<br>Data refreshed: ${escapeHtml(payload.dataRefreshed)}` : ''}<br>Generated: ${escapeHtml(new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }))}</div>
    <div class="metrics">${metrics}</div>${sections}</body></html>`)
  popup.document.close()
  popup.focus()
  popup.print()
}
