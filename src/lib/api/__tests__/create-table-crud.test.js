import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTableCrud } from '../helpers.js'

const { mockSupabase, makeChain } = vi.hoisted(() => {
  const makeChain = (record) => {
    const chain = {
      select: vi.fn(() => chain),
      insert: vi.fn((payload) => {
        chain.insertPayload = payload
        return chain
      }),
      update: vi.fn((payload) => {
        chain.updatePayload = payload
        return chain
      }),
      delete: vi.fn(() => chain),
      eq: vi.fn((col, val) => {
        chain.eqCol = col
        chain.eqVal = val
        return chain
      }),
      in: vi.fn(() => chain),
      order: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      single: vi.fn(() => Promise.resolve({ data: record, error: null })),
      maybeSingle: vi.fn(() => Promise.resolve({ data: record, error: null })),
    }
    return chain
  }
  const mockSupabase = { from: vi.fn() }
  return { mockSupabase, makeChain }
})

vi.mock('../../supabase.js', () => ({
  isDemoMode: false,
  supabase: mockSupabase,
}))

describe('createTableCrud mapping', () => {
  beforeEach(() => {
    mockSupabase.from.mockReset()
  })

  it('insert sends snake_case and returns camelCase', async () => {
    const row = {
      id: 'row-1',
      created_at: '2024-01-01T00:00:00Z',
      student_name: 'Ada',
    }
    mockSupabase.from.mockImplementation(() => makeChain(row))

    const api = createTableCrud('students', {
      fromDb: (base) => ({ ...base, displayName: base.studentName }),
      toDb: (data) => ({ studentName: data.name, batchId: data.batchId }),
    })

    const result = await api.insert({ name: 'Ada', batchId: 'b-1' })

    // The payload sent to the Supabase client must be snake_case.
    const chain = mockSupabase.from.mock.results[0].value
    expect(chain.insertPayload).toEqual({ student_name: 'Ada', batch_id: 'b-1' })

    // The returned row is camelCase plus any fromDb transform.
    expect(result).toEqual({
      id: 'row-1',
      createdAt: '2024-01-01T00:00:00Z',
      studentName: 'Ada',
      displayName: 'Ada',
    })
  })

  it('list with a filter object maps keys to snake_case column names', async () => {
    const rows = [{ id: 'a', created_at: '2024-01-01' }]
    mockSupabase.from.mockImplementation(() => makeChain(rows))
    const api = createTableCrud('students', { toDb: (d) => d })

    await api.list({ batchId: 'b-2' })

    const chain = mockSupabase.from.mock.results[0].value
    expect(chain.eqCol).toBe('batch_id')
    expect(chain.eqVal).toBe('b-2')
  })

  it('removes the primary key id from update payloads', async () => {
    mockSupabase.from.mockImplementation(() =>
      makeChain({ id: 'a', created_at: '2024-01-01' })
    )
    const api = createTableCrud('students', { toDb: (d) => d })

    await api.update('a', { id: 'hijacked', name: 'Ada' })

    const chain = mockSupabase.from.mock.results[0].value
    expect(chain.updatePayload).toEqual({ name: 'Ada' })
  })
})
