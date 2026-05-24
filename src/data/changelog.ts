// Version format: X.YY.ZZ
//   X  — major redesign (rarely changes)
//   YY — a new module added
//   ZZ — regular improvements / fixes
//
// Bump rule: prepend the new entry to CHANGELOG, set APP_VERSION to its version.

export const APP_VERSION = '1.07.00'

export type ChangelogKind = 'major' | 'module' | 'polish' | 'fix'

export interface ChangelogEntry {
  version: string
  date: string         // YYYY-MM-DD
  kind: ChangelogKind
  title: string
  notes: string[]      // supports inline HTML like <code> + <em>
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.07.00', date: '2026-05-24', kind: 'module',
    title: 'Declension v2 · Pronouns & Case recognition',
    notes: [
      'New pronoun-forms drill — produce all four case forms for personal, possessive, and reflexive pronouns (4-row table layout, parallel to the decline-the-phrase quiz).',
      'New case-recognition drill — read a sentence with a highlighted noun phrase, pick the case it is in (single-card multiple choice with <code>1</code>–<code>4</code> hotkeys).',
      'Declension landing grows from 4 cards to 6.'
    ]
  },
  {
    version: '1.06.04', date: '2026-05-24', kind: 'polish',
    title: 'Pagination across long lists',
    notes: [
      'Reusable <code>Pagination</code> component with page-size selector (10 / 25 / 50 / 100).',
      'Applied to: version changelog, Manage Nouns, History table, all result lists.',
      'The verb translation worksheet keeps the single-view layout — by design.'
    ]
  },
  {
    version: '1.06.03', date: '2026-05-24', kind: 'polish',
    title: 'Version page · changelog',
    notes: [
      'New About · Version page accessible from the nav header (badge) and the mobile drawer.',
      'Changelog seeded with the full design history.',
      'Each commit going forward bumps the patch (or higher) and lands here.'
    ]
  },
  {
    version: '1.06.02', date: '2026-05-24', kind: 'polish',
    title: 'Declension prompt-size slider',
    notes: [
      'Fourth slider in Settings · Display · Sizes for the declension drills.',
      'New <code>--decl-prompt-size</code> CSS variable wired into all three declension runners.'
    ]
  },
  {
    version: '1.06.01', date: '2026-05-24', kind: 'fix',
    title: 'Mobile UI overhaul',
    notes: [
      'No more horizontal scroll on any route — page max-width 100% with min-width: 0 cascade.',
      'Settings rail is a 2×2 card grid on mobile (was a horizontal-scrolling pill strip).',
      'Two-line CTA buttons on long action labels.',
      'Continuous quiz-meter for runs with more than 25 questions.',
      'Noun + verb result pages redesigned with red/green row stamps.'
    ]
  },
  {
    version: '1.06.00', date: '2026-05-24', kind: 'module',
    title: 'Declension module',
    notes: [
      'Three drills: decline-the-phrase (4-row case table), article-in-context, adjective endings.',
      '190 curated examples across A1–B2 (30 tables + 80 article-fill + 80 adjective endings).',
      'Tables-reference page with the six canonical declension tables.'
    ]
  },
  {
    version: '1.05.01', date: '2026-05-24', kind: 'polish',
    title: 'Keyboard shortcuts in Prepositions · which-case',
    notes: [
      'Press <code>1</code>–<code>4</code> to pick the case for the focused row.',
      'Tab / Shift-Tab navigate between rows; case buttons are no longer in the tab order.'
    ]
  },
  {
    version: '1.05.00', date: '2026-05-24', kind: 'module',
    title: 'Prepositions module',
    notes: [
      '37 curated prepositions across A1–B2 with ~90 example sentences.',
      'Three drills: which-case (test-sheet), article-fill, two-way decision (acc vs dat).',
      'Browse table with case-colored tags.'
    ]
  },
  {
    version: '1.04.03', date: '2026-05-23', kind: 'polish',
    title: 'Quiz history · stats dashboard',
    notes: [
      '14 charts powered by ECharts: activity calendar, accuracy trend, cumulative progress, type distribution radar, etc.',
      'Editorial 3-panel summary row at the top of <code>/history</code>.',
      'Secondary stat strip with streak, best run, days active, avg duration, most-practiced type.'
    ]
  },
  {
    version: '1.04.02', date: '2026-05-23', kind: 'polish',
    title: 'Settings · Daten tab + tabbed layout',
    notes: [
      'Settings becomes a four-tab layout — API · Display · Palette · Data.',
      'JSON export/import for every preference, palette, and the full quiz history.'
    ]
  },
  {
    version: '1.04.01', date: '2026-05-22', kind: 'polish',
    title: 'Palette overrides per theme',
    notes: [
      'Settings · Farben lets you override each of the 12 design tokens, per-theme.',
      'JSON import &amp; export.'
    ]
  },
  {
    version: '1.04.00', date: '2026-05-22', kind: 'module',
    title: 'History module',
    notes: [
      'Quiz history records every completed run with score, duration, and per-question breakdown.',
      'Per-quiz-type filter; live-saved to localStorage capped at 100 entries.'
    ]
  },
  {
    version: '1.03.01', date: '2026-05-22', kind: 'polish',
    title: 'Verb-tip double-click + parenthetical acceptance',
    notes: [
      'Double-click any verb in the translation worksheet to swap it with a German tip.',
      'Acceptance strips <code>(…)</code> parentheticals so typing one word matches multi-meaning verbs.'
    ]
  },
  {
    version: '1.03.00', date: '2026-05-22', kind: 'module',
    title: 'Adjectives module',
    notes: [
      'Third vocabulary module — Gemini-generated sentence fill with the inflected adjective blanked.',
      'Group filters + case-aware acceptance.'
    ]
  },
  {
    version: '1.02.01', date: '2026-05-21', kind: 'polish',
    title: 'Conjugation cheatsheet + verb runner test-sheet',
    notes: [
      'Long-form verb cheatsheet — twelve chapters of conjugation tables, drop-caps, exception callouts.',
      'Verb translation moved to a worksheet layout (all-at-once submit).'
    ]
  },
  {
    version: '1.02.00', date: '2026-05-21', kind: 'module',
    title: 'Verbs module',
    notes: [
      '378 verbs across A1–B2 with full conjugations in 15 tenses.',
      'Translation drill + conjugation drill + browse table + cheatsheet.'
    ]
  },
  {
    version: '1.01.00', date: '2026-05-18', kind: 'module',
    title: 'Nouns module',
    notes: [
      'First vocabulary module — der/die/das gender drill + English translation drill.',
      '1407 curated nouns across 20 groups.'
    ]
  },
  {
    version: '1.00.00', date: '2026-05-17', kind: 'major',
    title: 'Grammatik-Atelier · initial release',
    notes: [
      'Editorial design system — Fraunces display, Source Serif 4 body, JetBrains Mono accents.',
      'Light + dark themes; sage/clay/ochre/cobalt accent palette.',
      'Vue 3 + TS + Vite scaffolding with IndexedDB-backed nouns/adjectives.'
    ]
  }
]
