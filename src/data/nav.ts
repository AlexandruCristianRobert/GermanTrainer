//
// The top bar's single source of truth. Both the desktop bar and the mobile
// drawer in NavShell.vue render exclusively from these exports — a module
// missing here is a module missing from navigation, and
// tests/data/nav.test.ts fails CI on exactly that (the pre-2026-08-12 bar
// had five modules silently absent).
// Spec: docs/superpowers/specs/2026-08-12-topbar-grouped-nav-design.md

export interface NavLeaf {
  route: string          // named route; also matches `${route}-*` subroutes
  label: string
  de?: string            // German subtitle, drawer only
  aliases?: string[]     // extra route-name prefixes for odd families
}

export interface NavGroup { id: string; label: string; items: NavLeaf[] }

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'woerter', label: 'Wörter',
    items: [
      { route: 'nouns', label: 'Nouns', de: 'Substantive' },
      { route: 'adjectives', label: 'Adjectives', de: 'Adjektive' },
      { route: 'declension', label: 'Declension', de: 'Deklination' },
      { route: 'ndekl', label: 'N-Deklination', de: 'Schwache Substantive' }
    ]
  },
  {
    id: 'verben', label: 'Verben',
    items: [
      { route: 'verbs', label: 'Verbs', de: 'Verben' },
      { route: 'dative', label: 'Dativ', de: 'Dativverben' },
      { route: 'konjunktiv', label: 'Konjunktiv I', de: 'Indirekte Rede' },
      { route: 'passiv', label: 'Passiv', de: 'Passivformen' }
    ]
  },
  {
    id: 'kleine-woerter', label: 'Kleine Wörter',
    items: [
      { route: 'prepositions', label: 'Prepositions', de: 'Präpositionen' },
      { route: 'dacompounds', label: 'Da-Compounds', de: 'Pronominaladverbien' },
      { route: 'relativ', label: 'Relativsätze', de: 'der, den, dessen' },
      { route: 'directionwords', label: 'Direction Words', de: 'hin & her' }
    ]
  },
  {
    id: 'pruefung', label: 'Prüfung',
    items: [
      { route: 'sprechen', label: 'Sprechen', de: 'B2 · Vortrag & Diskussion' },
      { route: 'schreiben', label: 'Schreiben', de: 'B2 · Schreiben' },
      { route: 'writing', label: 'Writing tutor', de: 'C1 · Aufsatz-Tutor' },
      { route: 'simulator-c1', label: 'Mock C1', de: 'C1 · Schreiben-Simulation', aliases: ['simulator'] }
    ]
  }
]

export const NAV_SINGLES: NavLeaf[] = [
  { route: 'sentence', label: 'Sätze', de: 'Der gepackte Satz' },
  { route: 'history', label: 'History', de: 'Verlauf' }
]

export const NAV_SETTINGS: NavLeaf = { route: 'settings', label: 'Settings', de: 'Einstellungen' }

function prefixMatch(routeName: string, prefix: string): boolean {
  return routeName === prefix || routeName.startsWith(prefix + '-')
}

export function navMatches(routeName: string, leaf: NavLeaf): boolean {
  if (prefixMatch(routeName, leaf.route)) return true
  return (leaf.aliases ?? []).some(a => prefixMatch(routeName, a))
}
