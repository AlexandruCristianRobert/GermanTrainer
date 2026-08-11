import { describe, test, expect } from 'vitest'
import seed from '../../src/data/nouns.seed.json'

interface SeedNoun { german: string; gender: string; english: string; group: string }
const NOUNS = seed as SeedNoun[]

// The 29 words the .NET / SQL Server / Docker Domains needed that the seed
// did not already carry (ADR-0018 — Domain word lists are references into the
// store, so the store has to have them).
const DOMAIN_ADDITIONS: Record<string, string> = {
  Abbild: 'das', Orchestrierung: 'die', Virtualisierung: 'die', Mikrodienst: 'der',
  Neustart: 'der', Ausfall: 'der', Überwachung: 'die', Instanz: 'die',
  Speicher: 'der', Zugriff: 'der', Registrierung: 'die', Ressource: 'die',
  Auslastung: 'die', Sicht: 'die', Verbund: 'der', Auswertung: 'die',
  Sperre: 'die', Migration: 'die', Wiederherstellung: 'die', Speicherung: 'die',
  Verbindung: 'die', Filter: 'der', Sortierung: 'die', Ausführungsplan: 'der',
  Kennzahl: 'die', Eigenschaft: 'die', Dienst: 'der', Umsetzung: 'die',
  Wartung: 'die'
}

describe('nouns.seed.json — Domain additions', () => {
  test('every Domain addition is seeded with the right gender and group', () => {
    const byGerman = new Map(NOUNS.map(n => [n.german, n]))
    for (const [german, gender] of Object.entries(DOMAIN_ADDITIONS)) {
      const row = byGerman.get(german)
      expect(row, `${german} missing from nouns.seed.json`).toBeDefined()
      expect(row!.gender, german).toBe(gender)
      expect(row!.group, german).toBe('Programming')
      expect(row!.english.trim().length, german).toBeGreaterThan(0)
    }
  })
  test('the seed has no duplicate german keys', () => {
    const germans = NOUNS.map(n => n.german)
    expect(new Set(germans).size).toBe(germans.length)
  })
})
