import { describe, test, expect } from 'vitest'
import { csv } from '../../src/composables/quizQuery'

const ALLOWED = ['a1', 'a2', 'b1', 'b2'] as const
type Level = typeof ALLOWED[number]

describe('csv', () => {
  test('non-string value returns all allowed', () => {
    expect(csv<Level>(undefined, ALLOWED)).toEqual([...ALLOWED])
  })

  test('null returns all allowed', () => {
    expect(csv<Level>(null, ALLOWED)).toEqual([...ALLOWED])
  })

  test('number returns all allowed', () => {
    expect(csv<Level>(42, ALLOWED)).toEqual([...ALLOWED])
  })

  test('empty string returns all allowed', () => {
    expect(csv<Level>('', ALLOWED)).toEqual([...ALLOWED])
  })

  test('single valid value returns that value', () => {
    expect(csv<Level>('a1', ALLOWED)).toEqual(['a1'])
  })

  test('multiple valid values returns them in order', () => {
    expect(csv<Level>('a1,b2', ALLOWED)).toEqual(['a1', 'b2'])
  })

  test('trims whitespace around values', () => {
    expect(csv<Level>(' a1 , b1 ', ALLOWED)).toEqual(['a1', 'b1'])
  })

  test('filters out unknown values', () => {
    expect(csv<Level>('a1,c3,b2', ALLOWED)).toEqual(['a1', 'b2'])
  })

  test('all unknown values returns empty array', () => {
    expect(csv<Level>('c3,d4', ALLOWED)).toEqual([])
  })

  test('does not mutate the allowed array', () => {
    const copy = [...ALLOWED]
    csv<Level>(undefined, ALLOWED)
    expect([...ALLOWED]).toEqual(copy)
  })
})
