import { describe, test, expect } from 'vitest'
import {
  buildDativeSentenceSpecs, validateDatSentencePair, buildDatGeneratePrompt,
  buildDatGradePrompt, parseDatGrade, buildDatDrillItem,
  type DativeSentenceSpec, type GeneratedDatSentence,
} from '../../src/composables/useDativeSentenceQuiz'

const SPEC: DativeSentenceSpec = { index: 0, verb: 'helfen', family: 'co-agent' }
const GEN: GeneratedDatSentence = {
  ...SPEC,
  english: 'I help my mother in the kitchen.',
  german: 'Ich helfe meiner Mutter in der Küche.',
  usedForm: 'helfe',
  dativeObject: 'meiner Mutter',
}

describe('buildDativeSentenceSpecs', () => {
  test('a count equal to the pool size uses every verb once, indices sequential', () => {
    const specs = buildDativeSentenceSpecs(['helfen', 'danken', 'gefallen'], 3, () => 0)
    expect(specs).toHaveLength(3)
    expect(new Set(specs.map(s => s.verb)).size).toBe(3)
    expect(specs.map(s => s.index)).toEqual([0, 1, 2])
  })

  test('the bag refills: 2× the pool drills each verb exactly twice; family read from DATIVE_VERBS', () => {
    const specs = buildDativeSentenceSpecs(['helfen', 'gefallen'], 4, () => 0)
    const counts = new Map<string, number>()
    for (const s of specs) counts.set(s.verb, (counts.get(s.verb) ?? 0) + 1)
    expect([...counts.values()]).toEqual([2, 2])
    expect(specs.find(s => s.verb === 'gefallen')!.family).toBe('experiencer')
    expect(specs.find(s => s.verb === 'helfen')!.family).toBe('co-agent')
  })

  test('an empty pool yields no specs', () => {
    expect(buildDativeSentenceSpecs([], 5)).toEqual([])
  })
})

describe('validateDatSentencePair', () => {
  const raw = { index: 0, english: GEN.english, german: GEN.german, usedForm: 'helfe', dativeObject: 'meiner Mutter' }

  test('accepts a valid pair', () => {
    const v = validateDatSentencePair(raw, SPEC)
    expect(v).not.toBeNull()
    expect(v!.usedForm).toBe('helfe')
    expect(v!.dativeObject).toBe('meiner Mutter')
  })

  test('rejects a German missing the used form or the dative object', () => {
    expect(validateDatSentencePair({ ...raw, german: 'Ich unterstütze meine Mutter in der Küche.' }, SPEC)).toBeNull()
    expect(validateDatSentencePair({ ...raw, dativeObject: 'dem Vater' }, SPEC)).toBeNull()
  })

  test('LEAK GATE: rejects an English sentence containing the target infinitive', () => {
    expect(validateDatSentencePair({ ...raw, english: 'Use helfen when you help someone.' }, SPEC)).toBeNull()
  })

  test('rejects a mismatched index', () => {
    expect(validateDatSentencePair({ ...raw, index: 3 }, SPEC)).toBeNull()
  })
})

describe('validateDatSentencePair — idiom (Task 2: idiom highlighting)', () => {
  const raw = { index: 0, english: GEN.english, german: GEN.german, usedForm: 'helfe', dativeObject: 'meiner Mutter' }

  test('a valid idiom whose spans anchor in the German survives onto the sentence', () => {
    const v = validateDatSentencePair(
      { ...raw, idiom: { spans: ['helfe', 'meiner Mutter'], form: 'jemandem helfen', gloss: 'to help someone' } },
      SPEC
    )
    expect(v!.idiom).toEqual({ spans: ['helfe', 'meiner Mutter'], form: 'jemandem helfen', gloss: 'to help someone' })
  })
  test('a garbage/malformed idiom is dropped — never a rejection reason for the pair', () => {
    const v = validateDatSentencePair(
      { ...raw, idiom: { spans: ['nicht im satz'], form: '', gloss: 'x' } },
      SPEC
    )
    expect(v).not.toBeNull()
    expect(v!.idiom).toBeUndefined()
    expect(v!.german).toBe(GEN.german)
  })
  test('an absent idiom field leaves idiom unset', () => {
    const v = validateDatSentencePair(raw, SPEC)
    expect(v!.idiom).toBeUndefined()
  })
})

describe('prompts', () => {
  test('generation prompt: target line per spec, twin ban for helfen, experiencer note for gefallen, JSON envelope in prose', () => {
    const specs: DativeSentenceSpec[] = [SPEC, { index: 1, verb: 'gefallen', family: 'experiencer' }]
    const p = buildDatGeneratePrompt(specs, { angles: ['set it at work'], seed: 'abc' })
    expect(p).toContain('TARGET verb: "helfen"')
    expect(p).toContain('unterstützen')
    expect(p).toContain('TARGET verb: "gefallen"')
    expect(p).toContain('experiencer')
    expect(p).toContain('seed: abc')
  })

  test('grade prompt names the twin and carries the literal learner-answer marker line', () => {
    const { user } = buildDatGradePrompt({ spec: GEN, answer: 'Ich helfe ihm' })
    expect(user).toContain('ACCUSATIVE TWIN to reject: "unterstützen"')
    expect(user).toContain("LEARNER'S GERMAN ANSWER: Ich helfe ihm")
  })
})

describe('parseDatGrade / buildDatDrillItem', () => {
  test('filters unknown tags; missing correct is a parse failure', () => {
    expect(parseDatGrade({ correct: false, errorTags: ['case', 'nonsense'] }))
      .toEqual({ correct: false, tip: '', tags: ['case'] })
    expect(parseDatGrade({ tip: 'x' })).toBeNull()
  })

  test('drill item carries verb + family and omits empty tags', () => {
    expect(buildDatDrillItem(GEN, true)).toEqual({ verb: 'helfen', family: 'co-agent', correct: true })
    expect(buildDatDrillItem(GEN, false, ['case'])).toEqual({ verb: 'helfen', family: 'co-agent', correct: false, tags: ['case'] })
  })
})
