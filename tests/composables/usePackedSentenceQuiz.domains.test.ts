import { describe, test, expect } from 'vitest'
import {
  buildPackedSpecs,
  type PackedPools, type PackedCounts, type PackedDomainPool
} from '../../src/composables/usePackedSentenceQuiz'
import type { NounRef } from '../../src/composables/useSentenceQuiz'

const BASE: PackedPools = {
  verbs: [
    { german: 'bereitstellen', english: 'provide', level: 'B2.1', case: 'accusative' },
    { german: 'tanzen', english: 'dance', level: 'A1', case: 'none' },
    { german: 'kochen', english: 'cook', level: 'A1', case: 'accusative' },
    { german: 'speichern', english: 'save', level: 'B2.1', case: 'accusative' }
  ],
  nouns: [{ german: 'Zwiebel', article: 'die', english: 'onion' }] as NounRef[],
  preps: [],
  collocs: [],
  conns: []
}

const DOCKER: PackedDomainPool = {
  id: 'docker', label: 'Docker',
  scenes: ['set it during a failed deployment', 'set it while a container restarts'],
  nouns: [
    { german: 'Container', article: 'der', english: 'container' },
    { german: 'Bereitstellung', article: 'die', english: 'deployment' },
    { german: 'Abbild', article: 'das', english: 'image' }
  ] as NounRef[],
  verbs: ['bereitstellen']
}
const SQL: PackedDomainPool = {
  id: 'sql-server', label: 'SQL Server',
  scenes: ['set it while a query is slow'],
  nouns: [
    { german: 'Abfrage', article: 'die', english: 'query' },
    { german: 'Spalte', article: 'die', english: 'column' }
  ] as NounRef[],
  verbs: ['speichern']
}

const COUNTS: PackedCounts = { verb: 2, noun: 2, prep: 0, dac: 0, conn: 0 }

describe('buildPackedSpecs — Fachgebiete', () => {
  test('with no domains the specs are unchanged (no domain field)', () => {
    const specs = buildPackedSpecs(BASE, COUNTS, 3)
    for (const s of specs) expect(s.domain).toBeUndefined()
  })

  test('with no domains the nouns come from the generic pool', () => {
    const specs = buildPackedSpecs(BASE, { ...COUNTS, noun: 1 }, 3)
    for (const s of specs) {
      const noun = s.items.find(i => i.cat === 'noun')!.noun!
      expect(noun.german).toBe('Zwiebel')
    }
  })

  test('every card gets exactly one Domain, with one of that Domain\'s scenes', () => {
    const specs = buildPackedSpecs({ ...BASE, domains: [DOCKER, SQL] }, COUNTS, 6)
    for (const s of specs) {
      expect(s.domain).toBeDefined()
      const pool = [DOCKER, SQL].find(d => d.id === s.domain!.id)!
      expect(pool.scenes).toContain(s.domain!.scene)
      expect(s.domain!.label).toBe(pool.label)
    }
  })

  test('a card\'s nouns come only from its own Domain, never the generic pool', () => {
    const specs = buildPackedSpecs({ ...BASE, domains: [DOCKER, SQL] }, COUNTS, 6)
    for (const s of specs) {
      const pool = [DOCKER, SQL].find(d => d.id === s.domain!.id)!
      const allowed = new Set(pool.nouns.map(n => n.german))
      for (const it of s.items.filter(i => i.cat === 'noun')) {
        expect(allowed.has(it.noun!.german), `${s.domain!.id} got ${it.noun!.german}`).toBe(true)
      }
    }
  })

  test('both Domains are used across a run', () => {
    const specs = buildPackedSpecs({ ...BASE, domains: [DOCKER, SQL] }, COUNTS, 8)
    expect(new Set(specs.map(s => s.domain!.id)).size).toBe(2)
  })

  test('the first verb of each card is a Domain verb; the rest are free', () => {
    const specs = buildPackedSpecs({ ...BASE, domains: [DOCKER, SQL] }, COUNTS, 8)
    for (const s of specs) {
      const verbs = s.items.filter(i => i.cat === 'verb').map(i => i.verb!.german)
      expect(verbs).toHaveLength(2)
      const pool = [DOCKER, SQL].find(d => d.id === s.domain!.id)!
      expect(pool.verbs).toContain(verbs[0])
      expect(new Set(verbs).size).toBe(2)
    }
  })

  test('a Domain whose verbs are absent from the verb pool falls back cleanly', () => {
    const orphan: PackedDomainPool = { ...DOCKER, verbs: ['kompilieren'] }
    const specs = buildPackedSpecs({ ...BASE, domains: [orphan] }, COUNTS, 3)
    for (const s of specs) {
      const verbs = s.items.filter(i => i.cat === 'verb')
      expect(verbs).toHaveLength(2)
    }
  })

  test('a Domain with no nouns yields cards with no noun items rather than throwing', () => {
    const empty: PackedDomainPool = { ...DOCKER, nouns: [] }
    const specs = buildPackedSpecs({ ...BASE, domains: [empty] }, COUNTS, 2)
    for (const s of specs) {
      expect(s.items.filter(i => i.cat === 'noun')).toHaveLength(0)
      expect(s.domain!.id).toBe('docker')
    }
  })
})
