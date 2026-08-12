import { describe, test, expect } from 'vitest'
import { NAV_GROUPS, NAV_SINGLES, NAV_SETTINGS, navMatches } from '../../src/data/nav'
import { router } from '../../src/router'

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
