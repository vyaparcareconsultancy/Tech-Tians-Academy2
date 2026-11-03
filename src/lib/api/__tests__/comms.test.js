import { describe, it, expect, beforeEach, vi } from 'vitest'
import { announcementsApi } from '../comms.js'

const { mockSupabase, makeChain } = vi.hoisted(() => {
  const makeChain = (record) => {
    const chain = {
      select: vi.fn(() => chain),
      insert: vi.fn((payload) => {
        chain.insertPayload = payload
        return chain
      }),
      update: vi.fn(() => chain),
      delete: vi.fn(() => chain),
      eq: vi.fn(() => chain),
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

const VALID_UUID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'

describe('announcementsApi.toDb', () => {
  beforeEach(() => {
    mockSupabase.from.mockReset()
    mockSupabase.from.mockImplementation(() => makeChain({ id: 'a1' }))
  })

  async function insertAndGetPayload(data) {
    await announcementsApi.insert(data)
    const chain = mockSupabase.from.mock.results[0].value
    return chain.insertPayload
  }

  it('drops unknown UI-only keys like authorId and author_id', async () => {
    const payload = await insertAndGetPayload({
      title: 'Hello',
      body: 'Body',
      authorId: 'u1',
      author_id: 'u2',
      extraField: 'nope',
    })
    expect(payload.title).toBe('Hello')
    expect(payload.body).toBe('Body')
    expect(payload).not.toHaveProperty('author_id')
    expect(payload).not.toHaveProperty('authorId')
    expect(payload).not.toHaveProperty('extra_field')
  })

  it('turns an empty batchId into null', async () => {
    const payload = await insertAndGetPayload({ title: 'T', batchId: '' })
    expect(payload.batch_id).toBeNull()
  })

  it('keeps a null batchId as null', async () => {
    const payload = await insertAndGetPayload({ title: 'T', batchId: null })
    expect(payload.batch_id).toBeNull()
  })

  it('coerces a non-UUID createdBy to null', async () => {
    const payload = await insertAndGetPayload({ title: 'T', createdBy: 'not-a-uuid' })
    expect(payload.created_by).toBeNull()
  })

  it('keeps a valid UUID createdBy', async () => {
    const payload = await insertAndGetPayload({ title: 'T', createdBy: VALID_UUID })
    expect(payload.created_by).toBe(VALID_UUID)
  })
})
