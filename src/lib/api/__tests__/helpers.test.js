import { describe, it, expect } from 'vitest'
import { toCamel, toSnake } from '../helpers.js'

describe('toCamel / toSnake round trip', () => {
  it('converts snake_case keys to camelCase', () => {
    expect(toCamel({ first_name: 'Ada', last_name: 'Lovelace' })).toEqual({
      firstName: 'Ada',
      lastName: 'Lovelace',
    })
  })

  it('converts camelCase keys to snake_case', () => {
    expect(toSnake({ firstName: 'Ada', courseId: 7 })).toEqual({
      first_name: 'Ada',
      course_id: 7,
    })
  })

  it('round-trips through both directions', () => {
    const input = { someKey: 1, anotherField: { nestedValue: true }, list: [1, 2] }
    expect(toCamel(toSnake(input))).toEqual(input)
  })
})

describe('null / undefined value handling', () => {
  it('keeps null values', () => {
    expect(toCamel({ updated_at: null })).toEqual({ updatedAt: null })
    expect(toSnake({ updatedAt: null })).toEqual({ updated_at: null })
  })

  it('drops undefined values in toSnake but keeps them in toCamel', () => {
    expect(toSnake({ a: undefined, b: 1 })).toEqual({ b: 1 })
    expect(toCamel({ a: undefined, b: 1 })).toEqual({ a: undefined, b: 1 })
  })
})

describe('non-object / array handling', () => {
  it('passes through non-objects unchanged', () => {
    expect(toCamel(null)).toBeNull()
    expect(toCamel('x')).toBe('x')
    expect(toSnake(undefined)).toBeUndefined()
  })

  it('passes arrays through without mapping elements', () => {
    const arr = [{ first_name: 'A' }]
    expect(toCamel(arr)).toEqual(arr)
    expect(toSnake(arr)).toEqual(arr)
  })
})

describe('nested objects and customMap', () => {
  it('maps only the top level, preserving nested objects as-is', () => {
    expect(toCamel({ parent_child: { grand_child: 1 } })).toEqual({
      parentChild: { grand_child: 1 },
    })
  })

  it('supports customMap key overrides', () => {
    expect(toCamel({ created_by: 'x' }, { created_by: 'creator' })).toEqual({
      creator: 'x',
    })
    expect(toSnake({ creator: 'x' }, { creator: 'created_by' })).toEqual({
      created_by: 'x',
    })
  })
})
