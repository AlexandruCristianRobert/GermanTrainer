import { describe, expect, test } from 'vitest'
import { migrateVerbLevels, verbLevelToCefr } from '../../src/data/verbs'

describe('migrateVerbLevels', () => {
  test('legacy "B2" becomes "B2.1" only — never B2.2', () => {
    expect(migrateVerbLevels(['B1', 'B2'])).toEqual(['B1', 'B2.1'])
  })
  test('current labels pass through', () => {
    expect(migrateVerbLevels(['A1', 'B2.1', 'B2.2'])).toEqual(['A1', 'B2.1', 'B2.2'])
  })
  test('unknown labels are dropped', () => {
    expect(migrateVerbLevels(['A1', 'C1', 'garbage'])).toEqual(['A1'])
  })
})

describe('verbLevelToCefr', () => {
  test('batch labels collapse to their CEFR band', () => {
    expect(verbLevelToCefr('B2.1')).toBe('B2')
    expect(verbLevelToCefr('B2.2')).toBe('B2')
  })
  test('plain CEFR levels are unchanged', () => {
    expect(verbLevelToCefr('A1')).toBe('A1')
    expect(verbLevelToCefr('B1')).toBe('B1')
  })
})
