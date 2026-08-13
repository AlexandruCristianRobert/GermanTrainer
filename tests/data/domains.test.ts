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
  test('the shipped Domains are present', () => {
    expect(DOMAINS.map(d => d.id).sort()).toEqual([
      'arbeitsweise', 'architektur', 'async', 'audit-trail', 'behoerden',
      'datenintegritaet', 'docker', 'dotnet', 'eigenverantwortung', 'gxp',
      'hr-runde', 'kommunikation', 'konflikt', 'legacy', 'motivation',
      'pharma-systeme', 'qualitaetsprozesse', 'sql-server', 'teamarbeit',
      'testing', 'validierung', 'web-integration', 'wertschoepfung'
    ])
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
  test('every Domain has at least six distinct framings', () => {
    for (const d of DOMAINS) {
      expect(d.scenes.length, d.id).toBeGreaterThanOrEqual(6)
      expect(new Set(d.scenes).size, d.id).toBe(d.scenes.length)
      for (const s of d.scenes) expect(s.trim().length).toBeGreaterThan(0)
    }
  })
  // A framing asks for a DEFINITION of a concept in the field, not an anecdote
  // from it (ADR-0018) — the interview answer, not the Friday-night deployment.
  const FORM_PREFIX = { erklaerend: /^explain\b/, erzaehlend: /^tell\b/, persoenlich: /^state\b/ } as const
  test('every framing matches its Domain\'s Darstellungsform', () => {
    for (const d of DOMAINS) {
      for (const s of d.scenes) {
        expect(s, `${d.id}: "${s}"`).toMatch(FORM_PREFIX[d.form])
        expect(s.toLowerCase(), d.id).not.toContain('set it')
        expect(s.toLowerCase(), d.id).not.toContain('set the scene')
      }
    }
  })
  test('the framings name the concepts an interview in that field would ask about', () => {
    expect(domainById('sql-server')!.scenes.join(' | ')).toContain('stored procedure')
    expect(domainById('docker')!.scenes.join(' | ')).toContain('image and a container')
    expect(domainById('dotnet')!.scenes.join(' | ')).toContain('interface')
  })
  test('interview-critical concepts are covered', () => {
    expect(domainById('validierung')!.scenes.join(' | ')).toContain('GAMP')
    expect(domainById('audit-trail')!.scenes.join(' | ')).toContain('audit trail')
    expect(domainById('hr-runde')!.scenes.join(' | ')).toContain('salary')
  })
  test('lookup helpers', () => {
    expect(domainById('docker')?.label).toBe('DevOps & Betrieb')
    expect(domainById('nope')).toBeUndefined()
    expect(domainsByIds(['sql-server', 'nope', 'dotnet']).map(d => d.id)).toEqual(['dotnet', 'sql-server'])
    expect(domainsByIds([])).toEqual([])
  })
  test('every Domain declares a Darstellungsform', () => {
    for (const d of DOMAINS) {
      expect(['erklaerend', 'erzaehlend', 'persoenlich']).toContain(d.form)
    }
  })
  test('all three Darstellungsformen ship (ADR-0021)', () => {
    expect(new Set(DOMAINS.map(d => d.form)))
      .toEqual(new Set(['erklaerend', 'erzaehlend', 'persoenlich']))
  })
})
