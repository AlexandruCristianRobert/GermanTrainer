import { describe, test, expect } from 'vitest'
import { DOMAINS, domainById, domainsByIds } from '../../src/data/domains'
import seed from '../../src/data/nouns.seed.json'
import { VERBS } from '../../src/data/verbs'

const SEEDED = new Set((seed as Array<{ german: string }>).map(n => n.german))
const VERB_INFINITIVES = new Set(VERBS.map(v => v.german))

describe('Domain bank', () => {
  test('ids and labels are unique and non-empty', () => {
    const ids = DOMAINS.map(d => d.id)
    const labels = DOMAINS.map(d => d.label)
    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(labels).size).toBe(labels.length)
    for (const d of DOMAINS) {
      expect(d.id).toMatch(/^[a-z0-9-]+$/)
      expect(d.label.trim().length).toBeGreaterThan(0)
    }
  })
  test('the three shipped Domains are present', () => {
    expect(DOMAINS.map(d => d.id).sort()).toEqual(['docker', 'dotnet', 'sql-server'])
  })
  test('every Domain noun resolves against the seeded store', () => {
    for (const d of DOMAINS) {
      for (const n of d.nouns) {
        expect(SEEDED.has(n), `${d.id}: "${n}" is not in nouns.seed.json`).toBe(true)
      }
    }
  })
  test('every Domain verb exists in verbs.ts', () => {
    for (const d of DOMAINS) {
      for (const v of d.verbs) {
        expect(VERB_INFINITIVES.has(v), `${d.id}: "${v}" is not in verbs.ts`).toBe(true)
      }
    }
  })
  test('word lists are deduplicated and big enough to carry a run', () => {
    for (const d of DOMAINS) {
      expect(new Set(d.nouns).size, d.id).toBe(d.nouns.length)
      expect(new Set(d.verbs).size, d.id).toBe(d.verbs.length)
      // PACKED_MAX.noun is 3 per card; a Domain needs a real bag behind it.
      expect(d.nouns.length, d.id).toBeGreaterThanOrEqual(25)
      expect(d.verbs.length, d.id).toBeGreaterThanOrEqual(10)
    }
  })
  test('every Domain has at least six distinct scenes', () => {
    for (const d of DOMAINS) {
      expect(d.scenes.length, d.id).toBeGreaterThanOrEqual(6)
      expect(new Set(d.scenes).size, d.id).toBe(d.scenes.length)
      for (const s of d.scenes) expect(s.trim().length).toBeGreaterThan(0)
    }
  })
  test('lookup helpers', () => {
    expect(domainById('docker')?.label).toBe('Docker')
    expect(domainById('nope')).toBeUndefined()
    expect(domainsByIds(['sql-server', 'nope', 'dotnet']).map(d => d.id)).toEqual(['dotnet', 'sql-server'])
    expect(domainsByIds([])).toEqual([])
  })
})
