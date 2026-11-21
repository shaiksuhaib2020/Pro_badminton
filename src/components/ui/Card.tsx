import type { ReactNode } from 'react'
export default function Card({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="bg-so-card border border-so-border rounded-xl shadow-sm p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-sm font-semibold text-so-text">{title}
        </h2>{note &&
          <span className="text-xs text-so-muted">{note}
          </span>}
      </div>{children}
    </section>)
}
