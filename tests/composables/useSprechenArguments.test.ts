import { beforeEach, describe, expect, it, vi } from 'vitest'

// Dexie's real db module gains `sprechenArgumentBanks` from a concurrent
// change to src/db/index.ts (out of scope here). Mocking it keeps this
// suite independent of that migration's landing/timing, per the task brief.
vi.mock('../../src/db', () => {
  const store = new Map<string, { topicId: string; bank: unknown; generatedAt: number }>()
  return {
    db: {
      sprechenArgumentBanks: {
        get: async (topicId: string) => store.get(topicId),
        put: async (row: { topicId: string; bank: unknown; generatedAt: number }) => {
          store.set(row.topicId, row)
        },
        toCollection: () => ({
          primaryKeys: async () => Array.from(store.keys())
        })
      }
    }
  }
})

import {
  buildArgumentBankPrompt, cachedBankIds, generateArgumentBank, loadCachedBank, saveCachedBank,
  validateArgumentBank
} from '../../src/composables/useSprechenArguments'
import type { ArgumentBank } from '../../src/data/sprechenArguments'

function fakeClient(responses: string[]) {
  let i = 0
  const calls: Array<Record<string, unknown>> = []
  return {
    client: {
      models: {
        generateContent: async (params: Record<string, unknown>) => {
          calls.push(params)
          return { text: responses[Math.min(i++, responses.length - 1)] }
        }
      }
    },
    calls
  }
}

function validRaw(): Record<string, unknown> {
  return {
    pro: [
      { claim: 'Autofreie Städte sind leiser.', why: 'Ohne Motorenlärm wird das Zentrum deutlich angenehmer zum Verweilen.' },
      { claim: 'Die Luft wird spürbar sauberer.', why: 'Weniger Abgase senken die Feinstaubbelastung in der Innenstadt merklich.' },
      { claim: 'Fußgänger sind sicherer unterwegs.', why: 'Ohne Autoverkehr sinkt die Zahl der Unfälle mit Fußgängern deutlich.' },
      { claim: 'Der Einzelhandel profitiert von mehr Laufkundschaft.', why: 'Menschen bummeln länger, wenn kein Verkehr die Straßen dominiert.' }
    ],
    contra: [
      { claim: 'Nicht jeder erreicht das Zentrum ohne Auto.', why: 'Auf dem Land bleibt der eigene Wagen oft die einzige Option.' },
      { claim: 'Handwerker brauchen ihr Fahrzeug für den Transport.', why: 'Werkzeug und Material lassen sich selten mit dem Rad befördern.' },
      { claim: 'Der Verkehr verlagert sich nur nach außen.', why: 'Anwohner an der neuen Stadtgrenze leiden dann stärker unter Lärm.' },
      { claim: 'Geschäfte fürchten sinkende Kundenzahlen.', why: 'Manche Kunden kaufen nur dort ein, wo sie bequem parken können.' }
    ],
    words: [
      { de: 'die Fußgängerzone', en: 'pedestrian zone' },
      { de: 'die Feinstaubbelastung', en: 'particulate-matter pollution' },
      { de: 'der Individualverkehr', en: 'private motor traffic' },
      { de: 'die Verkehrsberuhigung', en: 'traffic calming' },
      { de: 'der Lieferverkehr', en: 'delivery traffic' },
      { de: 'die Aufenthaltsqualität', en: 'quality of public space' }
    ]
  }
}

describe('buildArgumentBankPrompt', () => {
  it('embeds the topic and spells out the literal JSON envelope', () => {
    const p = buildArgumentBankPrompt({ titleDe: 'Autofreie Innenstädte', statementDe: 'Sollten Autos verbannt werden?' })
    expect(p).toContain('Autofreie Innenstädte')
    expect(p).toContain('Sollten Autos verbannt werden?')
    expect(p).toContain('keine Markdown-Fences')
    expect(p).toContain('{"pro": [{"claim": "…", "why": "…"}]')
    expect(p).toContain('"words": [{"de": "…", "en": "…"}]')
  })
})

describe('validateArgumentBank', () => {
  it('accepts a well-formed bank', () => {
    const v = validateArgumentBank(validRaw())
    expect(v).not.toBeNull()
    expect(v!.pro.length).toBe(4)
    expect(v!.contra.length).toBe(4)
    expect(v!.words.length).toBe(6)
  })

  it('rejects a missing array', () => {
    const raw = validRaw()
    delete (raw as Record<string, unknown>).words
    expect(validateArgumentBank(raw)).toBeNull()
  })

  it('rejects fewer than 3 pro angles', () => {
    const raw = validRaw()
    raw.pro = (raw.pro as unknown[]).slice(0, 2)
    expect(validateArgumentBank(raw)).toBeNull()
  })

  it('rejects fewer than 3 contra angles', () => {
    const raw = validRaw()
    raw.contra = (raw.contra as unknown[]).slice(0, 2)
    expect(validateArgumentBank(raw)).toBeNull()
  })

  it('rejects fewer than 4 words', () => {
    const raw = validRaw()
    raw.words = (raw.words as unknown[]).slice(0, 3)
    expect(validateArgumentBank(raw)).toBeNull()
  })

  it('rejects an empty string field', () => {
    const raw = validRaw()
    ;(raw.pro as Array<Record<string, unknown>>)[0].claim = ''
    expect(validateArgumentBank(raw)).toBeNull()
  })

  it('rejects a claim longer than 120 characters', () => {
    const raw = validRaw()
    ;(raw.pro as Array<Record<string, unknown>>)[0].claim = 'x'.repeat(121)
    expect(validateArgumentBank(raw)).toBeNull()
  })

  it('rejects non-object input', () => {
    expect(validateArgumentBank(null)).toBeNull()
    expect(validateArgumentBank('garbage')).toBeNull()
    expect(validateArgumentBank(42)).toBeNull()
  })
})

describe('generateArgumentBank', () => {
  const topic = { titleDe: 'Autofreie Innenstädte', statementDe: 'Sollten Autos aus den Innenstädten verbannt werden?' }

  it('returns a validated bank on the first successful response', async () => {
    const { client, calls } = fakeClient([JSON.stringify(validRaw())])
    const bank = await generateArgumentBank(client, 'test-model', topic)
    expect(bank.pro.length).toBe(4)
    expect(bank.words[0].de).toBe('die Fußgängerzone')
    expect(calls.length).toBe(1)
  })

  it('retries past malformed JSON and an invalid bank before succeeding', async () => {
    const { client, calls } = fakeClient([
      'not json',
      JSON.stringify({ pro: [], contra: [], words: [] }),
      JSON.stringify(validRaw())
    ])
    const bank = await generateArgumentBank(client, 'test-model', topic, 2)
    expect(bank.pro.length).toBe(4)
    expect(calls.length).toBe(3)
  })

  it('throws once retries are exhausted with nothing usable', async () => {
    const { client } = fakeClient(['garbage', 'still garbage'])
    await expect(generateArgumentBank(client, 'test-model', topic, 1)).rejects.toThrow()
  })
})

describe('cachedBankIds', () => {
  // Runs before the "Dexie cache" describe below populates the shared mock
  // store, so this is the first test in the file to touch it — the store is
  // genuinely empty here, not just unqueried.
  it('returns an empty set when the table is empty', async () => {
    const ids = await cachedBankIds()
    expect(ids.size).toBe(0)
  })

  it('returns the ids of every cached bank', async () => {
    const bank: ArgumentBank = validateArgumentBank(validRaw())!
    await saveCachedBank('st-cached-ids-a', bank)
    await saveCachedBank('st-cached-ids-b', bank)
    const ids = await cachedBankIds()
    expect(ids.has('st-cached-ids-a')).toBe(true)
    expect(ids.has('st-cached-ids-b')).toBe(true)
  })
})

describe('collocations on the argument bank', () => {
  it('accepts a bank without phrases — cached banks predate the field', () => {
    const v = validateArgumentBank({
      pro: [{ claim: 'A', why: 'B' }, { claim: 'C', why: 'D' }, { claim: 'E', why: 'F' }],
      contra: [{ claim: 'A', why: 'B' }, { claim: 'C', why: 'D' }, { claim: 'E', why: 'F' }],
      words: [{ de: 'der Test', en: 'the test' }, { de: 'die Sache', en: 'the thing' }, { de: 'das Ding', en: 'the object' }, { de: 'die Zeit', en: 'the time' }]
    })
    expect(v).not.toBeNull()
    expect(v!.phrases).toBeUndefined()
  })

  it('keeps well-formed phrases when present', () => {
    const v = validateArgumentBank({
      pro: [{ claim: 'A', why: 'B' }, { claim: 'C', why: 'D' }, { claim: 'E', why: 'F' }],
      contra: [{ claim: 'A', why: 'B' }, { claim: 'C', why: 'D' }, { claim: 'E', why: 'F' }],
      words: [{ de: 'der Test', en: 'the test' }, { de: 'die Sache', en: 'the thing' }, { de: 'das Ding', en: 'the object' }, { de: 'die Zeit', en: 'the time' }],
      phrases: [{ de: 'eine Rolle spielen', en: 'to play a role' }]
    })
    expect(v!.phrases).toEqual([{ de: 'eine Rolle spielen', en: 'to play a role' }])
  })

  it('drops a malformed phrases field rather than failing the whole bank', () => {
    const v = validateArgumentBank({
      pro: [{ claim: 'A', why: 'B' }, { claim: 'C', why: 'D' }, { claim: 'E', why: 'F' }],
      contra: [{ claim: 'A', why: 'B' }, { claim: 'C', why: 'D' }, { claim: 'E', why: 'F' }],
      words: [{ de: 'der Test', en: 'the test' }, { de: 'die Sache', en: 'the thing' }, { de: 'das Ding', en: 'the object' }, { de: 'die Zeit', en: 'the time' }],
      phrases: 'nope'
    })
    expect(v).not.toBeNull()
    expect(v!.phrases).toBeUndefined()
  })

  it('asks the generator for collocations', () => {
    const p = buildArgumentBankPrompt({ titleDe: 'X', statementDe: 'Y?' })
    expect(p).toContain('phrases')
    expect(p).toContain('Wortverbindungen')
  })
})

describe('Dexie cache (loadCachedBank / saveCachedBank)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns undefined for an uncached topic', async () => {
    const got = await loadCachedBank('st-never-cached')
    expect(got).toBeUndefined()
  })

  it('round-trips a saved bank', async () => {
    const bank: ArgumentBank = validateArgumentBank(validRaw())!
    await saveCachedBank('st-roundtrip-test', bank)
    const got = await loadCachedBank('st-roundtrip-test')
    expect(got).toEqual(bank)
  })
})
