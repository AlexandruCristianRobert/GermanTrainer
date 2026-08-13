// src/data/kataloge.ts
//
// Katalog bank (CONTEXT.md → "Katalog", ADR-0022). A Katalog is a curated
// collection of Domains for one interview target. It REFERENCES Domain ids —
// never owns Domains — so future targets reuse them (the same reference
// discipline domains.ts applies to nouns and verbs). Sections are
// presentation only: not selectable, no data of their own.
// tests/data/kataloge.test.ts asserts every id resolves and every Domain is
// referenced by some Katalog.

export interface KatalogSection {
  /** German section heading shown in the accordion. */
  title: string
  /** References into DOMAINS — must resolve via domainById. */
  domainIds: readonly string[]
}

export interface Katalog {
  /** kebab id — stable forever once shipped. */
  id: string
  /** Header label. "Tier 1" stays inside a longer label so the English
   *  jargon never stands alone as a German word (das Tier). */
  label: string
  sections: readonly KatalogSection[]
}

export const KATALOGE: Katalog[] = [
  {
    id: 'tier1-pharma',
    label: 'Big Pharma IT (Tier 1)',
    sections: [
      { title: 'Technik & .NET', domainIds: ['dotnet', 'sql-server', 'docker'] },
      {
        title: 'Regulierte Industrie',
        domainIds: [
          'gxp', 'validierung', 'audit-trail', 'datenintegritaet',
          'qualitaetsprozesse', 'behoerden', 'wertschoepfung', 'pharma-systeme'
        ]
      },
      { title: 'HR-Gespräch', domainIds: ['hr-runde'] }
    ]
  }
]
