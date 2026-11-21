'use client'

import { useId } from 'react'
import {
  Bar, BarChart, CartesianGrid, Cell, Label, Pie, PieChart, ResponsiveContainer, Text, Tooltip, XAxis, YAxis,
} from 'recharts'
import type { XAxisTickContentProps } from 'recharts'
import { ChartNoAxesColumn } from 'lucide-react'
import { formatReportPaise, formatReportShare } from '@/lib/reports/period'
import type { ReportBucket } from '@/lib/reports/period'

export const reportGridClass = 'grid grid-cols-1 gap-6 lg:grid-cols-2'

const colorToken = (color: string) => `var(--color-${color})`
const chartClass = 'h-72 w-full min-w-0 [&_.recharts-cartesian-axis-tick_text]:fill-so-muted [&_.recharts-cartesian-axis-tick_text]:text-[10px] sm:[&_.recharts-cartesian-axis-tick_text]:text-xs'

export type ReportSlice = { label: string; color: string; amount: number; pattern?: number }
export type ReportBars = {
  buckets: (ReportBucket & { amounts: Record<string, number> })[]
  series: { id: string; label: string; color: string; pattern: number; total: number }[]
  total: number
}

function BatchPattern({ id, color, pattern }: { id: string; color: string; pattern: number }) {
  const size = 5 + Math.floor(pattern / 2) * 2
  return <pattern id={id} width={size} height={size} patternUnits="userSpaceOnUse" patternTransform={`rotate(${pattern % 2 === 0 ? -45 : 45})`}>
    <rect width={size} height={size} fill={colorToken(color)} />
    <path d={`M 0 0 V ${size}`} stroke="var(--color-so-card)" strokeWidth={3} />
  </pattern>
}

function ChartLegend({ entries, percentOf }: { entries: ReportSlice[]; percentOf?: number }) {
  const id = useId()
  return <ul aria-label="Chart legend" className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-so-muted">
    {entries.map(({ label, color, amount, pattern = 0 }, index) => <li key={label} className="inline-flex min-w-0 items-center gap-2">
      <svg width="12" height="12" viewBox="0 0 12 12" className="shrink-0" aria-hidden="true">
        {pattern > 0 && <defs><BatchPattern id={`${id}-${index}`} color={color} pattern={pattern} /></defs>}
        <rect width="12" height="12" rx="2" fill={pattern ? `url(#${id}-${index})` : colorToken(color)} />
      </svg>
      <span className="break-words min-w-0">{label}</span><span className="font-semibold text-so-text whitespace-nowrap">{formatReportPaise(amount)}</span>
      {percentOf !== undefined && <span className="whitespace-nowrap">{formatReportShare(amount, percentOf)}</span>}
    </li>)}
  </ul>
}

function EmptyChart({ message, detail }: { message: string; detail: string }) {
  return <div className="py-20 flex flex-col items-center justify-center text-center">
    <ChartNoAxesColumn className="w-5 h-5 shrink-0 text-so-muted mb-3" strokeWidth={1.75} aria-hidden="true" />
    <p className="text-so-text font-medium">{message}</p>
    <p className="text-so-muted text-sm mt-1">{detail}</p>
  </div>
}

function ChartTooltip({ label, entries, percentOf }: { label?: string; entries: { label: string; amount: number }[]; percentOf?: number }) {
  if (entries.length === 0) return null
  return <div className="bg-so-card border border-so-border rounded-lg shadow-lg p-3 text-sm">
    {label && <p className="text-xs text-so-muted mb-1">{label}</p>}
    {entries.map(entry => <p key={entry.label} className="font-medium text-so-text">
      {entry.label}: {formatReportPaise(entry.amount)}{percentOf === undefined ? '' : ` (${formatReportShare(entry.amount, percentOf)})`}
    </p>)}
  </div>
}

export function ReportBarChart({ chart, stacked = false, month, empty, title }: {
  chart: ReportBars; stacked?: boolean; month: boolean; empty: string; title: string
}) {
  const id = useId()
  const data = chart.buckets.map((bucket, index) => ({ ...bucket, index }))
  const legend = chart.series.map(batch => ({ ...batch, amount: batch.total }))

  return <>
    <div className={chartClass}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart data={data} margin={{ top: 5, right: 8, bottom: 0, left: 0 }} aria-label={title}>
          <defs>
            {chart.series.map(batch => batch.pattern > 0 && <BatchPattern key={batch.id} id={`${id}-${batch.id}`} color={batch.color} pattern={batch.pattern} />)}
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--color-so-border)" />
          <XAxis dataKey="index" height={month ? 52 : 26} interval={0} tickLine={false} axisLine={false}
            tick={({ x, y, payload }: XAxisTickContentProps) => {
              const bucket = data[Number(payload.value)]
              if (!bucket) return <g />
              return <text x={x} y={y} textAnchor="middle">
                <tspan x={x} dy="1em">{bucket.label === 'Partial week' ? 'Partial' : bucket.label}</tspan>
                {bucket.label === 'Partial week' && <tspan x={x} dy="1.2em">week</tspan>}
                {month && <tspan x={x} dy="1.2em">{bucket.rangeLabel}</tspan>}
              </text>
            }} />
          <YAxis allowDecimals={false} domain={chart.total === 0 ? [0, 1] : [0, 'auto']} hide={chart.total === 0}
            width="auto" axisLine={false} tickLine={false} tickFormatter={value => formatReportPaise(Number(value))} />
          <Tooltip cursor={false} content={({ active, label, payload }) => {
            if (!active) return null
            const bucket = data[Number(label)]
            if (!bucket || bucket.future) return null
            return <ChartTooltip label={month ? `${bucket.label} · ${bucket.rangeLabel}` : bucket.rangeLabel} entries={payload.flatMap(entry =>
              typeof entry.value === 'number' && entry.value > 0 ? [{ label: String(entry.name), amount: entry.value }] : [])} />
          }} />
          {chart.series.map(batch => <Bar key={batch.id} name={batch.label} dataKey={entry => entry.amounts[batch.id] ?? null}
            stackId={stacked ? 'total' : undefined} maxBarSize={50} isAnimationActive={false}
            fill={batch.pattern ? `url(#${id}-${batch.id})` : colorToken(batch.color)} />)}
        </BarChart>
      </ResponsiveContainer>
    </div>
    {chart.total === 0 && <div className="mt-2 text-center text-sm text-so-muted">{empty}</div>}
    <ChartLegend entries={legend} />
  </>
}

export function ReportCategoryBars({ slices, empty, title }: { slices: ReportSlice[]; empty: string; title: string }) {
  const total = slices.reduce((sum, slice) => sum + slice.amount, 0)
  return <>
    {total === 0 ? <EmptyChart message={empty} detail="No amount for this period." /> :
      <div className="overflow-x-auto focus-visible:outline-so-accent" role="region" aria-label={title} tabIndex={0}>
        <div className={chartClass}>
          <ResponsiveContainer width="100%" height="100%" minWidth={slices.length * 96 + 68}>
            <BarChart data={slices} margin={{ top: 5, right: 8, bottom: 0, left: 0 }} aria-label={title}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--color-so-border)" />
              <XAxis dataKey="label" height={46} interval={0} tickLine={false} axisLine={false}
                tick={({ x, y, payload }: XAxisTickContentProps) => <Text x={x} y={y} width={88} maxLines={2}
                  lineHeight="1.2em" textAnchor="middle" verticalAnchor="start">{payload.value}</Text>} />
              <YAxis allowDecimals={false} domain={[0, 'auto']} width="auto" axisLine={false} tickLine={false}
                tickFormatter={value => formatReportPaise(Number(value))} />
              <Tooltip cursor={false} content={({ active, payload }) => {
                const expense = payload[0]?.payload as ReportSlice | undefined
                return active && expense ? <ChartTooltip label={expense.label}
                  entries={[{ label: 'Expenses', amount: expense.amount }]} percentOf={total} /> : null
              }} />
              <Bar dataKey="amount" name="Expenses" radius={[4, 4, 0, 0]} maxBarSize={50} isAnimationActive={false}>
                {slices.map(slice => <Cell key={slice.label} fill={colorToken(slice.color)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>}
    <ChartLegend entries={slices} percentOf={total} />
  </>
}

export function ReportDonut({ slices, empty, title, showShare = false, emptyDetail = 'No amount for this period.' }: {
  slices: ReportSlice[]; empty: string; title: string; showShare?: boolean; emptyDetail?: string
}) {
  const total = slices.reduce((sum, slice) => sum + slice.amount, 0)
  const data = slices.filter(slice => slice.amount > 0)
  return <>
    {total === 0 ? <EmptyChart message={empty} detail={emptyDetail} /> : <div className={chartClass}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <PieChart aria-label={title}>
          <Pie data={data} dataKey="amount" nameKey="label" cx="50%" cy="50%" innerRadius="54%" outerRadius="78%"
            stroke="var(--color-so-card)" isAnimationActive={false}>
            <Label position="center" value={formatReportPaise(total)} aria-label={`Total ${formatReportPaise(total)}`}
              className="fill-so-text text-xs font-semibold tabular-nums sm:text-sm" />
            {data.map(slice => <Cell key={slice.label} fill={colorToken(slice.color)} />)}
          </Pie>
          <Tooltip content={({ active, payload }) => active ? <ChartTooltip percentOf={showShare ? total : undefined} entries={payload.flatMap(entry =>
            typeof entry.value === 'number' ? [{ label: String(entry.name), amount: entry.value }] : [])} /> : null} />
        </PieChart>
      </ResponsiveContainer>
    </div>}
    <ChartLegend entries={slices} percentOf={showShare ? total : undefined} />
  </>
}

export function ReportChartSkeleton({ label, titles }: { label: string; titles: string[] }) {
  return <div className={`${reportGridClass} animate-pulse`} role="status" aria-label={label}>
    {titles.map(title =>
      <div key={title} aria-hidden="true" className="bg-so-card border border-so-border rounded-xl shadow-sm p-5 space-y-4">
        <div className="h-5 w-40 bg-so-border rounded-lg" />
        <div className="h-72 w-full bg-so-surface rounded-xl" />
        <div className="h-4 w-32 bg-so-border rounded-lg" />
      </div>)}
  </div>
}
