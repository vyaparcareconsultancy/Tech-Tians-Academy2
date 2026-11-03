import { describe, it, expect } from 'vitest'
import { settleAll } from '../store.jsx'

describe('settleAll', () => {
  it('collects results and errors without letting one rejection stop the others', async () => {
    const errors = []
    const p1 = Promise.reject(new Error('boom one'))
    const p2 = Promise.resolve(42)
    const p3 = Promise.reject('plain string reason')

    const results = await settleAll(errors, [p1, p2, p3])

    // The successful promise still resolves.
    expect(results[1]).toBe(42)
    // Failed promises resolve to null and their messages are collected.
    expect(results[0]).toBeNull()
    expect(results[2]).toBeNull()
    expect(errors).toContain('boom one')
    expect(errors).toContain('plain string reason')
  })
})
