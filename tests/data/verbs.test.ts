import { describe, expect, test } from 'vitest'
import { migrateVerbLevels, verbLevelToCefr } from '../../src/data/verbs'

describe('migrateVerbLevels', () => {
  test('legacy "B2" becomes "B2.1" only — never B2.2', () => {
    expect(migrateVerbLevels(['B1', 'B2'])).toEqual(['B1', 'B2.1'])
  })
  test('current labels pass through', () => {
    expect(migrateVerbLevels(['A1', 'B2.1', 'B2.2'])).toEqual(['A1', 'B2.1', 'B2.2'])
  })
  test('unknown labels are dropped', () => {
    expect(migrateVerbLevels(['A1', 'C1', 'garbage'])).toEqual(['A1'])
  })
})

describe('verbLevelToCefr', () => {
  test('batch labels collapse to their CEFR band', () => {
    expect(verbLevelToCefr('B2.1')).toBe('B2')
    expect(verbLevelToCefr('B2.2')).toBe('B2')
  })
  test('plain CEFR levels are unchanged', () => {
    expect(verbLevelToCefr('A1')).toBe('A1')
    expect(verbLevelToCefr('B1')).toBe('B1')
  })
})

import { VERBS, type Verb } from '../../src/data/verbs'
import { VERB_TIPS } from '../../src/data/verb-tips'

function bareInfinitive(v: Verb): string {
  return v.german.replace(/^sich /, '')
}

/** What the wir/sie Präsens cell must literally contain. */
function expectedPlural(v: Verb): string {
  const inf = bareInfinitive(v)
  if (!v.separablePrefix) return inf
  return `${inf.slice(v.separablePrefix.length)} ${v.separablePrefix}`
}

describe('VERBS invariants', () => {
  test('infinitives are unique', () => {
    const seen = new Map<string, number>()
    for (const v of VERBS) seen.set(v.german, (seen.get(v.german) ?? 0) + 1)
    const dupes = [...seen].filter(([, n]) => n > 1).map(([g]) => g)
    expect(dupes).toEqual([])
  })

  test('tips are strictly 1:1 with verbs', () => {
    const verbs = new Set(VERBS.map(v => v.german))
    const tips = new Set(Object.keys(VERB_TIPS))
    expect([...verbs].filter(g => !tips.has(g))).toEqual([]) // verbs missing a tip
    expect([...tips].filter(g => !verbs.has(g))).toEqual([]) // orphan tips
  })

  test('wir/sie Präsens forms equal the infinitive (except sein)', () => {
    for (const v of VERBS) {
      if (v.german === 'sein') continue
      expect(v.praesens[3], v.german).toBe(expectedPlural(v))
      expect(v.praesens[5], v.german).toBe(v.praesens[3])
    }
  })

  test('separable prefix is consistent with type and forms', () => {
    for (const v of VERBS) {
      if (v.type === 'separable' || v.separablePrefix) {
        expect(v.type, v.german).toBe('separable')
        expect(v.separablePrefix, v.german).toBeTruthy()
        expect(bareInfinitive(v).startsWith(v.separablePrefix!), v.german).toBe(true)
        for (const form of v.praesens) {
          expect(form.endsWith(` ${v.separablePrefix}`), `${v.german}: ${form}`).toBe(true)
        }
        // imperativDu stores the BARE core only — the engine appends the prefix
        // (conjugate.ts). A spaced value like "gib bekannt" would double it.
        if (v.imperativDu) {
          expect(v.imperativDu.includes(' '), `${v.german}: imperativDu "${v.imperativDu}"`).toBe(false)
        }
      }
    }
  })

  test('regular verbs have weak Präteritum stems and -t participles', () => {
    for (const v of VERBS) {
      if (v.type !== 'regular') continue
      expect(/te$/.test(v.praeteritumStem), `${v.german}: ${v.praeteritumStem}`).toBe(true)
      expect(/t$/.test(v.partizip2), `${v.german}: ${v.partizip2}`).toBe(true)
    }
  })

  test('verbs gaining an umlaut in er-form supply imperativDu explicitly', () => {
    // The engine derives du-imperatives from the er-form; a→ä / o→ö / au→äu
    // verbs would keep the umlaut ("*fähr!"/"*stöß!") unless imperativDu is
    // given (conjugate.ts). Stems already carrying ä/ö (lösen, gehören) are
    // exempt because the stem check below excludes them.
    for (const v of VERBS) {
      const inf = bareInfinitive(v)
      const stem = v.separablePrefix ? inf.slice(v.separablePrefix.length) : inf
      let er = v.praesens[2]
      if (v.separablePrefix && er.endsWith(` ${v.separablePrefix}`)) {
        er = er.slice(0, -(v.separablePrefix.length + 1))
      }
      const gainsUmlaut = /[äö]/.test(er) && !/[äö]/.test(stem)
      if (gainsUmlaut) expect(v.imperativDu, v.german).toBeTruthy()
    }
  })
})
