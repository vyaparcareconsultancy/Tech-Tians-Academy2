import React, { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, ChevronsUpDown, Inbox } from 'lucide-react'
import { Pagination } from './ui.jsx'
import { cx } from '../lib/utils.js'

/**
 * Generic table with client-side sorting + pagination + empty state.
 * columns: [{ key, label, sortable?, render?, className? }]
 */
export default function DataTable({ columns, data, pageSize = 8, emptyTitle = 'No records found', emptyMessage, rowKey = 'id', onRowClick }) {
  const [sort, setSort] = useState({ key: null, dir: 'asc' })
  const [page, setPage] = useState(1)

  const sorted = useMemo(() => {
    if (!sort.key) return data
    return [...data].sort((a, b) => {
      const av = a[sort.key]
      const bv = b[sort.key]
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv))
      return sort.dir === 'asc' ? cmp : -cmp
    })
  }, [data, sort])

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const safePage = Math.min(page, pages)
  const rows = sorted.slice((safePage - 1) * pageSize, safePage * pageSize)

  const toggleSort = (key) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02]">
              {columns.map((c) => (
                <th key={c.key} className={cx('px-4 py-3 font-mono text-xs font-semibold uppercase tracking-wider text-muted', c.className)}>
                  {c.sortable ? (
                    <button onClick={() => toggleSort(c.key)} className="inline-flex items-center gap-1.5 transition-colors hover:text-white">
                      {c.label}
                      {sort.key !== c.key ? <ChevronsUpDown className="h-3.5 w-3.5 text-muted/40" /> :
                       sort.dir === 'asc' ? <ChevronUp className="h-3.5 w-3.5 text-brand" /> :
                       <ChevronDown className="h-3.5 w-3.5 text-brand" />}
                    </button>
                  ) : c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row[rowKey]}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cx('border-b border-white/5 transition-colors last:border-0 hover:bg-white/5', onRowClick && 'cursor-pointer')}
              >
                {columns.map((c) => {
                  const val = row[c.key]
                  const isNumber = typeof val === 'number'
                  return (
                    <td
                      key={c.key}
                      className={cx(
                        'px-4 py-3.5 align-middle text-slate-200',
                        isNumber && 'font-mono',
                        c.className
                      )}
                    >
                      {c.render ? c.render(row) : val}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Inbox className="h-9 w-9 text-muted/30" />
            <p className="mt-3 font-heading text-sm font-medium text-white">{emptyTitle}</p>
            {emptyMessage && <p className="mt-1 max-w-sm text-xs text-muted">{emptyMessage}</p>}
          </div>
        )}
      </div>
      <div className="flex items-center justify-between border-t border-white/10 px-4 py-3">
        <p className="font-mono text-xs text-muted">
          Showing <span className="text-white">{rows.length === 0 ? 0 : (safePage - 1) * pageSize + 1}</span>–<span className="text-white">{Math.min(safePage * pageSize, sorted.length)}</span> of <span className="text-white">{sorted.length}</span>
        </p>
        <Pagination page={safePage} pageSize={pageSize} total={sorted.length} onChange={setPage} />
      </div>
    </div>
  )
}
