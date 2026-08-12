# Grouped Top Bar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the overflowing flat top bar with four dropdown category groups + two top-level links, driven by one nav data source with a router-coverage test guard.

**Architecture:** New `src/data/nav.ts` holds the taxonomy (spec: `docs/superpowers/specs/2026-08-12-topbar-grouped-nav-design.md` — it is the binding design). `NavShell.vue` re-renders both the desktop bar (click-open dropdown panels, bespoke CSS on existing tokens) and the mobile drawer (grouped sections) from that data. A data test cross-checks every nav route against the real router and asserts every named route family is reachable from the nav.

**Tech Stack:** Vue 3 `<script setup>` + TypeScript, Vitest 4 + @vue/test-utils, vue-tsc.

## Global Constraints

- The spec file is binding: taxonomy, labels, `navMatches` rules, interaction semantics, a11y attributes, out-of-scope list. Re-read it before each task.
- Route names and aliases are pre-researched: every route family shares its leaf's prefix except the C1 mock (`simulator-c1` leaf needs `aliases: ['simulator']` to cover `simulator-run`/`simulator-result`) — verify with `grep "name: '" src/router.ts` before trusting this, and the coverage-guard exceptions are exactly `['home', 'version']`.
- No new dependencies; no naive-ui components in the bar; bespoke CSS on the existing tokens (`--paper`, `--hairline`, `--accent`, `--ink*`, `--font-*`). Keep the 720px burger breakpoint and the existing drawer/backdrop CSS patterns.
- German category labels (`Wörter`, `Verben`, `Kleine Wörter`, `Prüfung`, `Sätze`), English module labels with existing `de` subtitles — exactly the spec's table.
- Verification: `npx vitest run <file>` per task, then `npm test` + `npm run typecheck` (vue-tsc; plain `tsc` is meaningless here).
- Never run `git` from a subagent; the controller commits.

---

### Task 1: Nav data source + router-coverage guard

**Files:**
- Create: `src/data/nav.ts`
- Test: `tests/data/nav.test.ts` (create)

**Interfaces:**
- Consumes: nothing at runtime; the test imports the router (`src/router.ts` default export or named — check how other tests import it; if the file only exports the router instance, use `router.getRoutes()`).
- Produces (Task 2 renders exclusively from these):

```ts
export interface NavLeaf { route: string; label: string; de?: string; aliases?: string[] }
export interface NavGroup { id: string; label: string; items: NavLeaf[] }
export const NAV_GROUPS: NavGroup[]
export const NAV_SINGLES: NavLeaf[]
export const NAV_SETTINGS: NavLeaf
export function navMatches(routeName: string, leaf: NavLeaf): boolean
```

- [ ] **Step 1: Write the failing test**

Create `tests/data/nav.test.ts`:

```ts
import { describe, test, expect } from 'vitest'
import { NAV_GROUPS, NAV_SINGLES, NAV_SETTINGS, navMatches } from '../../src/data/nav'
import router from '../../src/router'

const allLeaves = [...NAV_GROUPS.flatMap(g => g.items), ...NAV_SINGLES, NAV_SETTINGS]
const routeNames = router.getRoutes().map(r => String(r.name)).filter(n => n && n !== 'undefined')

// Routes deliberately reachable outside the bar: the logo (home) and the
// VersionBadge (version).
const NAV_EXEMPT = new Set(['home', 'version'])

describe('nav data', () => {
  test('four groups in spec order, non-empty, unique ids/labels', () => {
    expect(NAV_GROUPS.map(g => g.label)).toEqual(['Wörter', 'Verben', 'Kleine Wörter', 'Prüfung'])
    for (const g of NAV_GROUPS) expect(g.items.length).toBeGreaterThan(0)
    expect(new Set(NAV_GROUPS.map(g => g.id)).size).toBe(NAV_GROUPS.length)
  })
  test('no route appears twice across groups/singles/settings', () => {
    const routes = allLeaves.map(l => l.route)
    expect(new Set(routes).size).toBe(routes.length)
  })
  test('every nav route and alias resolves against the real router', () => {
    for (const leaf of allLeaves) {
      expect(routeNames, `route ${leaf.route}`).toContain(leaf.route)
      for (const a of leaf.aliases ?? []) {
        expect(routeNames.some(n => n === a || n.startsWith(a + '-')), `alias ${a}`).toBe(true)
      }
    }
  })
  test('coverage guard: every named route maps into the nav', () => {
    for (const name of routeNames) {
      if (NAV_EXEMPT.has(name)) continue
      const hit = allLeaves.some(l => navMatches(name, l))
      expect(hit, `route '${name}' unreachable from the nav`).toBe(true)
    }
  })
  test('navMatches: exact, prefix, alias — and no false prefix hits', () => {
    const leaf = { route: 'simulator-c1', label: 'Mock C1', aliases: ['simulator'] }
    expect(navMatches('simulator-c1', leaf)).toBe(true)
    expect(navMatches('simulator-run', leaf)).toBe(true)
    expect(navMatches('simulator', leaf)).toBe(true)
    expect(navMatches('sim', leaf)).toBe(false)
    expect(navMatches('sentence', { route: 'sentenc', label: 'x' })).toBe(false)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/data/nav.test.ts`
Expected: FAIL — `src/data/nav.ts` missing. (If importing the router in a node test environment throws on component imports, mirror how existing tests import the router — grep `router` under `tests/`; if none exists, use `import { routes } ...` only if exported, else lazy `router.getRoutes()` inside the test with the repo's jsdom environment, which the module mount tests already rely on.)

- [ ] **Step 3: Implement `src/data/nav.ts`**

```ts
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
      { route: 'declension', label: 'Declension', de: 'Deklination' }
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
      { route: 'directionwords', label: 'Direction Words', de: 'hin & her' }
    ]
  },
  {
    id: 'pruefung', label: 'Prüfung',
    items: [
      { route: 'sprechen', label: 'Sprechen', de: 'B2 · Vortrag & Diskussion' },
      { route: 'schreiben', label: 'Schreiben', de: 'B2 · Forumsbeitrag' },
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/data/nav.test.ts`
Expected: PASS. If the coverage guard names an unreachable route, that route genuinely needs a nav home or an explicit exemption — resolve it in `nav.ts` (or report DONE_WITH_CONCERNS if the right group is unclear), never by weakening the guard.

- [ ] **Step 5: Full suite + typecheck**

Run: `npm test` and `npm run typecheck` — green/clean.

---

### Task 2: NavShell rewrite + mount test

**Files:**
- Modify: `src/components/NavShell.vue` (rewrite script/template; extend scoped CSS)
- Test: `tests/modules/NavShell.test.ts` (create)

**Interfaces:**
- Consumes: everything Task 1 produces, verbatim; `useTheme`, `VersionBadge` as today.
- Produces: no new exports — the component contract is behavioral (see mount test).

- [ ] **Step 1: Write the failing mount test**

First mirror the repo's mount-test harness: read one of `tests/modules/SprechenArchive.test.ts` / `Teil1Prep.test.ts` for the mounting pattern (router mock or real router, stubs). Then create `tests/modules/NavShell.test.ts` covering, with real assertions:
- renders four category triggers labeled Wörter/Verben/Kleine Wörter/Prüfung plus Sätze and History links, and no flat module links at top level;
- clicking `Verben` opens its panel (`aria-expanded="true"`, panel contains Dativ/Konjunktiv I/Passiv/Verbs); clicking a second trigger closes the first (only one panel open);
- clicking `Dativ` navigates to route name `dative` and closes the panel;
- with the current route mocked to `schreiben-teil1-run`, the `Prüfung` trigger carries the active class;
- Escape closes an open panel;
- the drawer markup contains the four group headers and the `de` subtitles.

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/modules/NavShell.test.ts` — FAIL (current component has no triggers).

- [ ] **Step 3: Rewrite `NavShell.vue`**

Script setup (replace the `items` array and `activeRoute` heuristic):

```ts
import { NAV_GROUPS, NAV_SINGLES, NAV_SETTINGS, navMatches, type NavGroup, type NavLeaf } from '../data/nav'

const openGroup = ref<string | null>(null)
const routeName = computed(() => String(route.name ?? 'home'))

function leafActive(leaf: NavLeaf): boolean { return navMatches(routeName.value, leaf) }
function groupActive(g: NavGroup): boolean { return g.items.some(leafActive) }
function toggleGroup(id: string) { openGroup.value = openGroup.value === id ? null : id }
function onSelect(target: string) { openGroup.value = null; drawerOpen.value = false; router.push({ name: target }) }
```

Close behaviors: a `watch(() => route.fullPath, () => { openGroup.value = null })`; a document-level `pointerdown` listener (added/removed in `onMounted`/`onUnmounted`) that closes when the event target is outside the nav element (template ref); `@keydown.escape` on the nav closing the panel and returning focus to the open trigger (`ref` per trigger or query by data attribute).

Template (desktop `nav.nav-links`): for each group a wrapper `<div class="nav-group">` holding the trigger button (`aria-haspopup="menu"`, `:aria-expanded`, active class from `groupActive`, label + a small `▾` chevron span) and, when open, `<div class="nav-panel" role="menu">` with one `role="menuitem"` button per leaf (active class from `leafActive`). After the groups, the two `NAV_SINGLES` render as today's flat `nav-link` buttons. In `nav-actions`, add a Settings gear icon-button (`icon-btn`, `aria-label="Settings"`, simple gear SVG in the existing 1.6-stroke style, active ring when `leafActive(NAV_SETTINGS)`) before the theme toggle. Remove Home from the list (logo already navigates home).

Drawer: replace the flat loop with: for each group, `<div class="drawer-group-label">{{ g.label }}</div>` (reuse `mark-sub` typography via a new class) then its items as today's drawer `nav-link` buttons with `drawer-de` subtitles; then the singles; then Settings as a normal drawer item.

CSS additions (scoped, existing tokens): `.nav-group { position: relative }`; `.nav-panel { position: absolute; top: calc(100% + 6px); left: 0; min-width: 200px; background: var(--paper); border: 1px solid var(--hairline); border-radius: 2px; box-shadow: 0 8px 28px rgba(0,0,0,.10); padding: 6px; z-index: 60; display: flex; flex-direction: column }`; panel items reuse `.nav-link` with `text-align: left; width: 100%` and the active item keeps the accent treatment (side bar or underline — match the drawer's `.active { color: var(--accent) }` idiom); `.nav-chevron { font-size: 10px; margin-left: 4px; color: var(--mute) }`; `.drawer-group-label { font-family: var(--font-mono); font-size: 9.5px; letter-spacing: .28em; text-transform: uppercase; color: var(--mute); margin: 14px 0 2px }`.

- [ ] **Step 4: Run the mount test to verify it passes**

Run: `npx vitest run tests/modules/NavShell.test.ts` — PASS.

- [ ] **Step 5: Full verification**

Run: `npm test`, `npm run typecheck`, and `npm run build` — all green/clean. Then a quick manual pass in `npm run dev` (desktop dropdowns at ~1000px width, active states on a Schreiben page, mobile drawer at <720px).
