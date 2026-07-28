import { describe, test, expect } from 'vitest'
import {
  hinForm, herForm, ADVERB_PAIRS, UNPAIRED_ADVERBS,
  PERSPECTIVE_PAIRS, QUESTION_WORDS, POINTER_WORDS,
  LEXICALIZED_VERBS, IDIOMS,
  SCENE_ARCHETYPES, SCENE_POSITIONS, otherPosition, validSceneSpec,
  type SceneSpec,
} from '../../src/data/directionWords'

describe('adverb pairs', () => {
  test('hin-/her- forms derive from the element', () => {
    expect(hinForm('ein')).toBe('hinein')
    expect(herForm('ein')).toBe('herein')
    expect(hinForm('unter')).toBe('hinunter')
    expect(herForm('über')).toBe('herüber')
  })

  test('no duplicate elements', () => {
    const els = ADVERB_PAIRS.map(p => p.element)
    expect(new Set(els).size).toBe(els.length)
  })

  test('every r-form is r + element', () => {
    for (const p of ADVERB_PAIRS.filter(p => p.rForm !== null))
      expect(p.rForm).toBe('r' + p.element)
  })

  test('only hinab/herab lacks an r-form (no *rab)', () => {
    expect(ADVERB_PAIRS.filter(p => p.rForm === null).map(p => p.element)).toEqual(['ab'])
  })

  test('unpaired adverbs start with hin- or her- and do not duplicate pair forms', () => {
    const pairForms = new Set(ADVERB_PAIRS.flatMap(p => [hinForm(p.element), herForm(p.element)]))
    for (const u of UNPAIRED_ADVERBS) {
      expect(u.form).toMatch(/^(hin|her)/)
      expect(pairForms.has(u.form)).toBe(false)
      expect(u.gloss.trim().length).toBeGreaterThan(0)
    }
  })
})

describe('cheatsheet content', () => {
  test('perspective minimal pairs use her on the her side and hin on the hin side', () => {
    expect(PERSPECTIVE_PAIRS.length).toBeGreaterThanOrEqual(3)
    for (const p of PERSPECTIVE_PAIRS) {
      expect(p.her.toLowerCase()).toContain('her')
      expect(p.hin.toLowerCase()).toContain('hin')
      expect(p.herNote.trim().length).toBeGreaterThan(0)
      expect(p.hinNote.trim().length).toBeGreaterThan(0)
    }
  })

  test('question words cover wo, wohin, woher — with split variants for the moving two', () => {
    expect(QUESTION_WORDS.map(q => q.word)).toEqual(['wo', 'wohin', 'woher'])
    const wohin = QUESTION_WORDS.find(q => q.word === 'wohin')!
    const woher = QUESTION_WORDS.find(q => q.word === 'woher')!
    expect(wohin.split).toMatch(/hin\?$/)
    expect(woher.split).toMatch(/her\?$/)
    expect(QUESTION_WORDS.find(q => q.word === 'wo')!.split).toBeNull()
  })

  test('pointer words include dahin, dorthin, hierher, daher', () => {
    const words = POINTER_WORDS.map(p => p.word)
    for (const w of ['dahin', 'dorthin', 'hierher', 'daher']) expect(words).toContain(w)
  })

  test('lexicalized verbs carry a hin-/her- prefix, a meaning, and an example', () => {
    expect(LEXICALIZED_VERBS.length).toBeGreaterThanOrEqual(6)
    for (const v of LEXICALIZED_VERBS) {
      expect(v.verb.replace(/^sich /, '')).toMatch(/^(hin|her)/)
      expect(v.meaning.trim().length).toBeGreaterThan(0)
      expect(v.example.trim().length).toBeGreaterThan(0)
    }
  })

  test('idiom bank is populated and every entry has an example', () => {
    expect(IDIOMS.length).toBeGreaterThanOrEqual(6)
    const idioms = IDIOMS.map(i => i.idiom)
    expect(idioms).toContain('hin und her')
    expect(idioms).toContain('hin und wieder')
    for (const i of IDIOMS) {
      expect(/hin|her/.test(i.idiom)).toBe(true)
      expect(i.example.trim().length).toBeGreaterThan(0)
    }
  })
})

describe('scene specs', () => {
  test('all six archetypes have exactly two positions', () => {
    expect(SCENE_ARCHETYPES.length).toBe(6)
    for (const a of SCENE_ARCHETYPES) expect(SCENE_POSITIONS[a].length).toBe(2)
  })

  test('otherPosition flips between the two archetype positions', () => {
    expect(otherPosition('stairs', 'bottom')).toBe('top')
    expect(otherPosition('stairs', 'top')).toBe('bottom')
    expect(otherPosition('doorway', 'inside')).toBe('outside')
    expect(otherPosition('street', 'far')).toBe('near')
  })

  test('validSceneSpec accepts matching positions and rejects foreign ones', () => {
    const ok: SceneSpec = {
      archetype: 'stairs', speakerAt: 'top',
      motion: 'toward-speaker', description: 'You stand at the top; someone climbs up toward you.',
    }
    expect(validSceneSpec(ok)).toBe(true)
    expect(validSceneSpec({ ...ok, speakerAt: 'inside' })).toBe(false)
    expect(validSceneSpec({ ...ok, description: '  ' })).toBe(false)
  })
})
