import { describe, test, expect } from 'vitest'
import { DW_FAMILIES, DAC_PHASES } from '../../src/data/drillCatalogue'
import { router } from '../../src/router'

const dwCards = DW_FAMILIES.flatMap(f => f.cards)
const dacCards = DAC_PHASES.flatMap(f => f.cards)
const routeNames = new Set(router.getRoutes().map(r => r.name))

describe('drillCatalogue', () => {
  test('Direction Words: 7 families, 10 cards (T1–T9 + A)', () => {
    expect(DW_FAMILIES).toHaveLength(7)
    expect(dwCards).toHaveLength(10)
  })

  test('Da-Compounds: 9 phases, 21 cards (T1–T20 + A)', () => {
    expect(DAC_PHASES).toHaveLength(9)
    expect(dacCards).toHaveLength(21)
  })

  test('every DW card code is unique', () => {
    const codes = dwCards.map(c => c.code)
    expect(new Set(codes).size).toBe(codes.length)
  })

  test('every DAC card code is unique', () => {
    const codes = dacCards.map(c => c.code)
    expect(new Set(codes).size).toBe(codes.length)
  })

  test('every DW card route resolves against router.ts', () => {
    const bad = dwCards.filter(c => !routeNames.has(c.route))
    expect(bad.map(c => c.code)).toEqual([])
  })

  test('every DAC card route resolves against router.ts', () => {
    const bad = dacCards.filter(c => !routeNames.has(c.route))
    expect(bad.map(c => c.code)).toEqual([])
  })

  test('T14 and T15 share a route but carry distinct query.direction', () => {
    const t14 = dacCards.find(c => c.code === 'T14')!
    const t15 = dacCards.find(c => c.code === 'T15')!
    expect(t14.route).toBe(t15.route)
    expect(t14.query?.direction).toBe('en-de')
    expect(t15.query?.direction).toBe('de-en')
    expect(t14.query?.direction).not.toBe(t15.query?.direction)
  })

  test('every family has a stable kebab-case id', () => {
    const bad = [...DW_FAMILIES, ...DAC_PHASES].filter(f => !/^[a-z]+$/.test(f.id))
    expect(bad.map(f => f.id)).toEqual([])
  })

  test('the two Reference cards are level Ref', () => {
    const dwRef = dwCards.find(c => c.code === 'A')!
    const dacRef = dacCards.find(c => c.code === 'A')!
    expect(dwRef.level).toBe('Ref')
    expect(dacRef.level).toBe('Ref')
  })

  test('exactly the designed cards are marked ai: true', () => {
    const aiCodes = (cards: typeof dwCards) => cards.filter(c => c.ai).map(c => c.code)
    expect(aiCodes(dwCards).sort()).toEqual(['T6', 'T7'])
    expect(aiCodes(dacCards).sort()).toEqual(['T14', 'T15', 'T17'])
  })
})
