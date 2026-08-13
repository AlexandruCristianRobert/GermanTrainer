import { describe, test, expect } from 'vitest'
import { KATALOGE } from '../../src/data/kataloge'
import { DOMAINS, domainById } from '../../src/data/domains'

describe('Katalog bank', () => {
  test('exactly one Katalog ships in Release 1', () => {
    expect(KATALOGE.length).toBe(1)
    expect(KATALOGE[0].id).toBe('tier1-pharma')
  })
  test('every referenced Domain id resolves', () => {
    for (const k of KATALOGE) {
      for (const sec of k.sections) {
        for (const id of sec.domainIds) {
          expect(domainById(id), `${k.id} / ${sec.title}: "${id}"`).toBeDefined()
        }
      }
    }
  })
  test('no Domain id repeats within a Katalog, no section is empty', () => {
    for (const k of KATALOGE) {
      const all = k.sections.flatMap(s => [...s.domainIds])
      expect(new Set(all).size).toBe(all.length)
      for (const sec of k.sections) expect(sec.domainIds.length, sec.title).toBeGreaterThan(0)
    }
  })
  test('every Domain lives in some Katalog — no ungrouped list (ADR-0022)', () => {
    const referenced = new Set(KATALOGE.flatMap(k => k.sections.flatMap(s => [...s.domainIds])))
    for (const d of DOMAINS) expect(referenced.has(d.id), d.id).toBe(true)
  })
})
