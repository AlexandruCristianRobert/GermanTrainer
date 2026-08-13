import { describe, test, expect } from 'vitest'
import {
  buildPackedSpecs, buildPackedGeneratePrompt, buildPackedGradePrompt, buildPackedMetaItems,
  generatePackedBatch,
  PACKED_ANGLE_POOL, PACKED_SCENE_ANGLES, PACKED_STRUCTURAL_ANGLES, PACKED_DOMAIN_ANGLES,
  PACKED_STORY_ANGLES, PACKED_PERSONAL_ANGLES,
  type PackedPools, type PackedCounts, type PackedDomainPool, type PackedCardSpec,
  type GeneratedPackedCard, type PackedItemResult
} from '../../src/composables/usePackedSentenceQuiz'
import type { NounRef } from '../../src/composables/useSentenceQuiz'
import type { AiClient } from '../../src/composables/useClaude'
import type { Connector } from '../../src/data/connectors'

const BASE: PackedPools = {
  verbs: [
    { german: 'bereitstellen', english: 'provide', level: 'B2.1', case: 'accusative' },
    { german: 'tanzen', english: 'dance', level: 'A1', case: 'none' },
    { german: 'kochen', english: 'cook', level: 'A1', case: 'accusative' },
    { german: 'speichern', english: 'save', level: 'B2.1', case: 'accusative' }
  ],
  nouns: [{ german: 'Zwiebel', article: 'die', english: 'onion' }] as NounRef[],
  preps: [],
  collocs: [],
  conns: []
}

const DOCKER: PackedDomainPool = {
  id: 'docker', label: 'Docker', form: 'erklaerend',
  scenes: ['set it during a failed deployment', 'set it while a container restarts'],
  nouns: [
    { german: 'Container', article: 'der', english: 'container' },
    { german: 'Bereitstellung', article: 'die', english: 'deployment' },
    { german: 'Abbild', article: 'das', english: 'image' }
  ] as NounRef[],
  verbs: ['bereitstellen']
}
const SQL: PackedDomainPool = {
  id: 'sql-server', label: 'SQL Server', form: 'erklaerend',
  scenes: ['set it while a query is slow'],
  nouns: [
    { german: 'Abfrage', article: 'die', english: 'query' },
    { german: 'Spalte', article: 'die', english: 'column' }
  ] as NounRef[],
  verbs: ['speichern']
}

const COUNTS: PackedCounts = { verb: 2, noun: 2, prep: 0, dac: 0, conn: 0 }

describe('buildPackedSpecs — Fachgebiete', () => {
  test('with no domains the specs are unchanged (no domain field)', () => {
    const specs = buildPackedSpecs(BASE, COUNTS, 3)
    for (const s of specs) expect(s.domain).toBeUndefined()
  })

  test('with no domains the nouns come from the generic pool', () => {
    const specs = buildPackedSpecs(BASE, { ...COUNTS, noun: 1 }, 3)
    for (const s of specs) {
      const noun = s.items.find(i => i.cat === 'noun')!.noun!
      expect(noun.german).toBe('Zwiebel')
    }
  })

  // SentenceSetup.vue always passes `domains: domainPools`, which is `[]` when
  // untargeted — every other "no domains" test above omits the key entirely,
  // but production never does. Pin that the explicit-empty shape behaves
  // identically to the omitted one.
  test('an explicit empty domains array behaves exactly like an omitted domains key', () => {
    const specs = buildPackedSpecs({ ...BASE, domains: [] }, { ...COUNTS, noun: 1 }, 3)
    for (const s of specs) {
      expect(s.domain).toBeUndefined()
      const noun = s.items.find(i => i.cat === 'noun')!.noun!
      expect(noun.german).toBe('Zwiebel')
    }
  })

  test('every card gets exactly one Domain, with one of that Domain\'s scenes', () => {
    const specs = buildPackedSpecs({ ...BASE, domains: [DOCKER, SQL] }, COUNTS, 6)
    for (const s of specs) {
      expect(s.domain).toBeDefined()
      const pool = [DOCKER, SQL].find(d => d.id === s.domain!.id)!
      expect(pool.scenes).toContain(s.domain!.scene)
      expect(s.domain!.label).toBe(pool.label)
    }
  })

  test('a card\'s nouns come only from its own Domain, never the generic pool', () => {
    const specs = buildPackedSpecs({ ...BASE, domains: [DOCKER, SQL] }, COUNTS, 6)
    for (const s of specs) {
      const pool = [DOCKER, SQL].find(d => d.id === s.domain!.id)!
      const allowed = new Set(pool.nouns.map(n => n.german))
      for (const it of s.items.filter(i => i.cat === 'noun')) {
        expect(allowed.has(it.noun!.german), `${s.domain!.id} got ${it.noun!.german}`).toBe(true)
      }
    }
  })

  test('both Domains are used across a run', () => {
    const specs = buildPackedSpecs({ ...BASE, domains: [DOCKER, SQL] }, COUNTS, 8)
    expect(new Set(specs.map(s => s.domain!.id)).size).toBe(2)
  })

  test('the first verb of each card is a Domain verb; the rest are free', () => {
    const specs = buildPackedSpecs({ ...BASE, domains: [DOCKER, SQL] }, COUNTS, 8)
    for (const s of specs) {
      const verbs = s.items.filter(i => i.cat === 'verb').map(i => i.verb!.german)
      expect(verbs).toHaveLength(2)
      const pool = [DOCKER, SQL].find(d => d.id === s.domain!.id)!
      expect(pool.verbs).toContain(verbs[0])
      expect(new Set(verbs).size).toBe(2)
    }
  })

  test('a Domain whose verbs are absent from the verb pool falls back cleanly', () => {
    const orphan: PackedDomainPool = { ...DOCKER, verbs: ['kompilieren'] }
    const specs = buildPackedSpecs({ ...BASE, domains: [orphan] }, COUNTS, 3)
    for (const s of specs) {
      const verbs = s.items.filter(i => i.cat === 'verb')
      expect(verbs).toHaveLength(2)
    }
  })

  test('a Domain with no nouns yields cards with no noun items rather than throwing', () => {
    const empty: PackedDomainPool = { ...DOCKER, nouns: [] }
    const specs = buildPackedSpecs({ ...BASE, domains: [empty] }, COUNTS, 2)
    for (const s of specs) {
      expect(s.items.filter(i => i.cat === 'noun')).toHaveLength(0)
      expect(s.domain!.id).toBe('docker')
    }
  })
})

describe('buildPackedGeneratePrompt — Fachgebiete', () => {
  const plain: PackedCardSpec = {
    index: 0,
    items: [{ key: 'v1', cat: 'verb', verb: { german: 'tanzen', english: 'dance', level: 'A1', case: 'none' } }]
  }
  const themed: PackedCardSpec = {
    index: 1,
    items: [{ key: 'v1', cat: 'verb', verb: { german: 'bereitstellen', english: 'provide', level: 'B2.1', case: 'accusative' } }],
    domain: { id: 'docker', label: 'Docker', scene: 'set it during a failed deployment', form: 'erklaerend' }
  }
  const variation = { angles: ['use wir'], seed: 'abc' }

  test('the angle pool splits into scenes and structure without losing anything', () => {
    // Pins the actual wording of the twelve original angles (pre-split) rather than
    // just re-checking PACKED_ANGLE_POOL against its own definition.
    const ORIGINAL_TWELVE = [
      'set the scene at the office', 'set it during a move to a new apartment',
      'use a first-person plural subject (wir)', 'frame part of it as a question',
      'set it on a weekend trip', 'put one clause in the Perfekt (past)',
      'set it in a kitchen', 'use a polite request (Sie)', 'open with an adverb of time',
      'set it at a train station', 'frame it as something overheard', 'set it during bad weather'
    ]
    expect([...PACKED_ANGLE_POOL].sort()).toEqual([...ORIGINAL_TWELVE].sort())
    expect(PACKED_SCENE_ANGLES.length).toBe(6)
    expect(PACKED_STRUCTURAL_ANGLES.length).toBe(6)
  })

  test('a themed card names its Fachgebiet and its scene in its own block', () => {
    const p = buildPackedGeneratePrompt([themed], 'B1', variation)
    expect(p).toContain('#1 — Fachgebiet: Docker')
    expect(p).toContain('set it during a failed deployment')
  })

  test('a themed batch carries the register instruction exactly once', () => {
    const p = buildPackedGeneratePrompt([themed, { ...themed, index: 2 }], 'B1', variation)
    expect(p.split('der Container').length - 1).toBe(1)
  })

  // The point of a Fachgebiet is the definition, not the anecdote: a themed card
  // must be asked for the explanation a practitioner would give, and told in as
  // many words that the everyday-scene mode does not apply to it.
  test('a themed card is asked for an explanation, not a scene', () => {
    const p = buildPackedGeneratePrompt([themed], 'B1', variation)
    expect(p).toContain('technical interview')
    expect(p).toContain('not a scene')
    expect(p).toContain('no anecdote')
  })

  test('a plain card is untouched and carries no Fachgebiet wording', () => {
    const p = buildPackedGeneratePrompt([plain], 'B1', variation)
    expect(p).toContain('#0 — required ingredients:')
    expect(p).not.toContain('Fachgebiet')
  })
})

describe('generatePackedBatch — angle pool selection', () => {
  const themedDocker: PackedCardSpec = {
    index: 0,
    items: [{ key: 'v1', cat: 'verb', verb: { german: 'bereitstellen', english: 'provide', level: 'B2.1', case: 'accusative' } }],
    domain: { id: 'docker', label: 'Docker', scene: 'set it during a failed deployment', form: 'erklaerend' }
  }
  const themedSql: PackedCardSpec = {
    index: 1,
    items: [{ key: 'v1', cat: 'verb', verb: { german: 'speichern', english: 'save', level: 'B2.1', case: 'accusative' } }],
    domain: { id: 'sql-server', label: 'SQL Server', scene: 'set it while a query is slow', form: 'erklaerend' }
  }
  const plainCard: PackedCardSpec = {
    index: 2,
    items: [{ key: 'v1', cat: 'verb', verb: { german: 'tanzen', english: 'dance', level: 'A1', case: 'none' } }]
  }

  // Records the prompt (`contents`) the batch handed to the model, without needing
  // a fully realistic response — one non-matching call is enough to observe the angles.
  function fakeClient(capture: { prompt: string }): AiClient {
    return {
      models: {
        generateContent: async (p) => {
          capture.prompt = String(p.contents ?? '')
          return { text: JSON.stringify({ items: [] }) }
        }
      }
    }
  }

  // Pulls the angle strings the prompt actually asked for out of its one "Vary the
  // framing…" line, so assertions target the real selection rather than substrings.
  function drawnAngles(prompt: string): string[] {
    const line = prompt.split('\n').find(l => l.includes('draw inspiration from these angles'))
    if (!line) return []
    const joined = line.slice(line.indexOf('): ') + 3).replace(/\.$/, '')
    return joined.split(' · ')
  }

  test('a fully themed batch draws its angles only from the Fachgebiet pool, never a scene', async () => {
    const capture = { prompt: '' }
    await generatePackedBatch(fakeClient(capture), {
      model: 'm', specs: [themedDocker, themedSql], maxRetries: 0, rng: () => 0
    })
    const angles = drawnAngles(capture.prompt)
    expect(angles.length).toBeGreaterThan(0)
    expect(angles.every(a => (PACKED_DOMAIN_ANGLES as readonly string[]).includes(a))).toBe(true)
    expect(angles.some(a => (PACKED_SCENE_ANGLES as readonly string[]).includes(a))).toBe(false)
  })

  test('the Fachgebiet angle pool frames explanations and keeps the compatible grammar variety', () => {
    expect(PACKED_DOMAIN_ANGLES.length).toBeGreaterThanOrEqual(6)
    expect(new Set(PACKED_DOMAIN_ANGLES).size).toBe(PACKED_DOMAIN_ANGLES.length)
    // No scene-setter leaks in, and the two structural angles that fight a
    // definition — the polite request and the overheard remark — stay out.
    for (const a of PACKED_DOMAIN_ANGLES) {
      expect((PACKED_SCENE_ANGLES as readonly string[]).includes(a), a).toBe(false)
      expect(a).not.toContain('overheard')
      expect(a).not.toContain('polite request')
    }
    // …while the person/tense variety the drill depends on survives.
    expect(PACKED_DOMAIN_ANGLES.some(a => (PACKED_STRUCTURAL_ANGLES as readonly string[]).includes(a))).toBe(true)
  })

  test('a batch with at least one domainless card draws from the full pool, scenes included', async () => {
    const capture = { prompt: '' }
    await generatePackedBatch(fakeClient(capture), {
      model: 'm', specs: [themedDocker, plainCard], maxRetries: 0, rng: () => 0
    })
    const angles = drawnAngles(capture.prompt)
    expect(angles.length).toBeGreaterThan(0)
    expect(angles.every(a => (PACKED_ANGLE_POOL as readonly string[]).includes(a))).toBe(true)
    expect(angles.some(a => (PACKED_SCENE_ANGLES as readonly string[]).includes(a))).toBe(true)
  })
})

// ADR-0018 rule 3: a Domain is descriptive metadata only and must never reach
// grading, error tags, weak points or mastery. Nothing in buildPackedGradePrompt
// or buildPackedMetaItems reads card.domain today — these tests pin that down
// so a later "pass the Fachgebiet to the grader for context" change fails CI
// instead of silently letting AI judgement drift by subject matter.
describe('buildPackedGradePrompt — ADR-0018 rule 3 (metadata only)', () => {
  const themedGradeCard: GeneratedPackedCard = {
    index: 0,
    items: [{ key: 'v1', cat: 'verb', verb: { german: 'bereitstellen', english: 'provide', level: 'B2.1', case: 'accusative' } }],
    domain: { id: 'docker', label: 'Docker', scene: 'set it during a failed deployment', form: 'erklaerend' },
    english: 'We provide the container during the deployment.',
    german: 'Wir stellen den Container während der Bereitstellung bereit.',
    sents: 1,
    spans: [{ key: 'v1', en: 'provide' }]
  }

  test('a themed card\'s grade prompt names neither its Domain label nor "Fachgebiet"', () => {
    const { system, user } = buildPackedGradePrompt(themedGradeCard, 'Wir stellen den Container bereit.', false)
    expect(system).not.toContain('Docker')
    expect(system).not.toContain('Fachgebiet')
    expect(user).not.toContain('Docker')
    expect(user).not.toContain('Fachgebiet')
  })
})

describe('buildPackedMetaItems — ADR-0018 rule 3 (metadata only)', () => {
  const conn: Connector = { id: 'aber', display: 'aber', english: 'but', family: 'adversativ', parts: [{ text: 'aber', behavior: '0' }] }
  const baseItems: PackedCardSpec['items'] = [
    { key: 'v1', cat: 'verb', verb: { german: 'bereitstellen', english: 'provide', level: 'B2.1', case: 'accusative' } },
    { key: 'n1', cat: 'noun', noun: { german: 'Container', article: 'der', english: 'container' } },
    { key: 'p1', cat: 'prep', prep: { id: 'mit', german: 'mit', english: 'with', case: 'dative' } },
    { key: 'd1', cat: 'dac', colloc: { id: 'denken-an', word: 'denken', english: 'think', preposition: 'an', case: 'accusative' } },
    { key: 'k1', cat: 'conn', conn }
  ]
  const results: readonly PackedItemResult[] = [
    { key: 'v1', correct: true },
    { key: 'n1', correct: false, tags: ['noun'] },
    { key: 'p1', correct: true },
    { key: 'd1', correct: false, tags: ['compound'] },
    { key: 'k1', correct: true }
  ]

  // Same fixture, only `domain` differs — a themed card and its otherwise-
  // identical unthemed copy.
  const themedCard: GeneratedPackedCard = {
    index: 0, items: baseItems,
    domain: { id: 'docker', label: 'Docker', scene: 'set it during a failed deployment', form: 'erklaerend' },
    english: 'ignored', german: 'ignored', sents: 1, spans: []
  }
  const unthemedCard: GeneratedPackedCard = {
    index: 0, items: baseItems,
    english: 'ignored', german: 'ignored', sents: 1, spans: []
  }

  test('output is identical for a themed card and an otherwise-identical unthemed copy — same items, same tags, everything', () => {
    const themedMeta = buildPackedMetaItems([themedCard], new Map([[0, results]]))
    const unthemedMeta = buildPackedMetaItems([unthemedCard], new Map([[0, results]]))
    expect(themedMeta).toEqual(unthemedMeta)
  })
})

describe('Darstellungsform', () => {
  const verbs = [{ german: 'prüfen', english: 'to check', level: 'B2.1' as const, case: 'accusative' as const }]
  const nounRef = { german: 'Validierung', english: 'validation', article: 'die' as const }
  function poolsWith(form: 'erklaerend' | 'erzaehlend' | 'persoenlich'): PackedPools {
    return {
      verbs, nouns: [], preps: [], collocs: [], conns: [],
      domains: [{ id: 'x', label: 'X', form, scenes: ['state your salary expectation'], nouns: [nounRef], verbs: ['prüfen'] }]
    }
  }
  const counts: PackedCounts = { verb: 1, noun: 1, prep: 0, dac: 0, conn: 0 }

  test('spec.domain carries the form', () => {
    const specs = buildPackedSpecs(poolsWith('persoenlich'), counts, 1, () => 0.5)
    expect(specs[0].domain?.form).toBe('persoenlich')
  })

  test('prompt head marks the form in German and appends only the matching note', () => {
    const specs = buildPackedSpecs(poolsWith('erzaehlend'), counts, 1, () => 0.5)
    const prompt = buildPackedGeneratePrompt(specs, 'B2', { angles: ['a'], seed: 's' })
    expect(prompt).toContain('(erzählend)')
    expect(prompt).toContain('STAR')
    expect(prompt).not.toContain('(persönlich)')
  })

  test('angle pools exist and are distinct', () => {
    expect(PACKED_STORY_ANGLES.length).toBeGreaterThanOrEqual(5)
    expect(PACKED_PERSONAL_ANGLES.length).toBeGreaterThanOrEqual(5)
    expect(new Set([...PACKED_STORY_ANGLES, ...PACKED_PERSONAL_ANGLES]).size)
      .toBe(PACKED_STORY_ANGLES.length + PACKED_PERSONAL_ANGLES.length)
  })
})
