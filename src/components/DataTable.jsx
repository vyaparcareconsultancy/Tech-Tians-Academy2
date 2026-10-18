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
            <tr className="border-b border-slate-200 bg-slate-50/70">
              {columns.map((c) => (
                <th key={c.key} className={cx('px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500', c.className)}>
                  {c.sortable ? (
                    <button onClick={() => toggleSort(c.key)} className="inline-flex items-center gap-1 hover:text-slate-800">
                      {c.label}
                      {sort.key !== c.key ? <ChevronsUpDown className="h-3.5 w-3.5 text-slate-400" /> :
                       sort.dir === 'asc' ? <ChevronUp className="h-3.5 w-3.5 text-indigo-600" /> :
                       <ChevronDown className="h-3.5 w-3.5 text-indigo-600" />}
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
                className={cx('border-b border-slate-100 last:border-0', onRowClick && 'cursor-pointer hover:bg-navy-50/50')}
              >
                {columns.map((c) => (
                  <td key={c.key} className={cx('px-4 py-3 align-middle text-slate-700', c.className)}>
                    {c.render ? c.render(row) : row[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Inbox className="h-9 w-9 text-slate-300" />
            <p className="mt-3 text-sm font-medium text-slate-700">{emptyTitle}</p>
            {emptyMessage && <p className="mt-1 max-w-sm text-sm text-slate-500">{emptyMessage}</p>}
          </div>
        )}
      </div>
      <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
        <p className="text-xs text-slate-500">
          Showing {rows.length === 0 ? 0 : (safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, sorted.length)} of {sorted.length}
        </p>
        <Pagination page={safePage} pageSize={pageSize} total={sorted.length} onChange={setPage} />
      </div>
    </div>
  )
}
