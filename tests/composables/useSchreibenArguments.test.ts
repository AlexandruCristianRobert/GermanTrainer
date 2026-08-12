import { beforeEach, describe, expect, it, test, vi } from 'vitest'

// Dexie's real db module gains `schreibenArgumentBanks` from a concurrent
// change to src/db/index.ts (Wave A, out of scope here). Mocking it keeps
// this suite independent of that migration's landing/timing, mirroring
// tests/composables/useSprechenArguments.test.ts's own db mock.
vi.mock('../../src/db', () => {
  const store = new Map<string, { themaId: string; bank: unknown; generatedAt: number }>()
  return {
    db: {
      schreibenArgumentBanks: {
        get: async (themaId: string) => store.get(themaId),
        put: async (row: { themaId: string; bank: unknown; generatedAt: number }) => {
          store.set(row.themaId, row)
        },
        toCollection: () => ({
          primaryKeys: async () => Array.from(store.keys())
        })
      }
    }
  }
})

import {
  buildSchreibArgumentBankPrompt, cachedSchreibBankIds, generateSchreibArgumentBank,
  loadCachedSchreibBank, saveCachedSchreibBank
} from '../../src/composables/useSchreibenArguments'
import { validateArgumentBank } from '../../src/composables/useSprechenArguments'
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
      { claim: 'Fast Fashion schadet der Umwelt stark.', why: 'Billige Kleidung wird oft nach kurzer Zeit weggeworfen und verschwendet Ressourcen.' },
      { claim: 'Strengere Regeln schützen Textilarbeiter.', why: 'Niedrige Preise entstehen häufig durch schlechte Arbeitsbedingungen in Produktionsländern.' },
      { claim: 'Weniger Konsum spart langfristig Geld.', why: 'Wer seltener, aber hochwertiger kauft, gibt über die Zeit insgesamt weniger aus.' },
      { claim: 'Nachhaltige Mode fördert bewussteres Einkaufen.', why: 'Wer über Herkunft und Produktion nachdenkt, trifft überlegtere Kaufentscheidungen.' }
    ],
    contra: [
      { claim: 'Jeder sollte selbst über seinen Kleiderkauf entscheiden.', why: 'Konsum bleibt eine private Entscheidung, die niemand von außen vorschreiben sollte.' },
      { claim: 'Strengere Vorschriften treiben die Preise für alle nach oben.', why: 'Zusätzliche Auflagen für Hersteller landen am Ende meist bei den Kunden.' },
      { claim: 'Nicht jeder kann sich teure Alternativen leisten.', why: 'Fair produzierte Kleidung kostet oft ein Vielfaches der günstigen Massenware.' },
      { claim: 'Fast Fashion ermöglicht vielen Menschen Zugang zu Mode.', why: 'Günstige Preise erlauben es auch einkommensschwachen Haushalten, sich neu einzukleiden.' }
    ],
    words: [
      { de: 'die Wegwerfmentalität', en: 'throwaway mentality' },
      { de: 'die Lieferkette', en: 'supply chain' },
      { de: 'der Konsumzwang', en: 'compulsion to consume' },
      { de: 'die Textilindustrie', en: 'textile industry' },
      { de: 'die Kaufkraft', en: 'purchasing power' },
      { de: 'das Sonderangebot', en: 'special offer' }
    ]
  }
}

describe('buildSchreibArgumentBankPrompt', () => {
  test('asks for written-register material and spells out the JSON envelope', () => {
    const p = buildSchreibArgumentBankPrompt({ titleDe: 'Fast Fashion', taskDe: 'Schreiben Sie einen Forumsbeitrag (mindestens 150 Wörter) zum Thema Fast Fashion.' })
    expect(p).toContain('Fast Fashion')
    expect(p).toContain('"pro"')
    expect(p).toContain('"contra"')
    expect(p).toContain('"words"')
    expect(p).toContain('"phrases"')
    expect(p).toMatch(/schriftlich|Forumsbeitrag/)
    expect(p).not.toMatch(/```/)
  })

  it('embeds the taskDe instruction and spells out the literal JSON envelope', () => {
    const p = buildSchreibArgumentBankPrompt({ titleDe: 'Vier-Tage-Woche', taskDe: 'Schreiben Sie einen Forumsbeitrag zur Vier-Tage-Woche.' })
    expect(p).toContain('Vier-Tage-Woche')
    expect(p).toContain('keine Markdown-Fences')
    expect(p).toContain('{"pro": [{"claim": "…", "why": "…"}]')
    expect(p).toContain('"words": [{"de": "…", "en": "…"}]')
  })
})

describe('generateSchreibArgumentBank', () => {
  const thema = { titleDe: 'Fast Fashion', taskDe: 'Schreiben Sie einen Forumsbeitrag (mindestens 150 Wörter) zum Thema Fast Fashion.' }

  it('returns a validated bank on the first successful response', async () => {
    const { client, calls } = fakeClient([JSON.stringify(validRaw())])
    const bank = await generateSchreibArgumentBank(client, 'test-model', thema)
    expect(bank.pro.length).toBe(4)
    expect(bank.words[0].de).toBe('die Wegwerfmentalität')
    expect(calls.length).toBe(1)
    expect(calls[0].config).toMatchObject({ responseMimeType: 'application/json', temperature: 0.7, topP: 0.95 })
    expect(calls[0].config).not.toHaveProperty('responseSchema')
  })

  it('retries past malformed JSON and an invalid bank before succeeding', async () => {
    const { client, calls } = fakeClient([
      'not json',
      JSON.stringify({ pro: [], contra: [], words: [] }),
      JSON.stringify(validRaw())
    ])
    const bank = await generateSchreibArgumentBank(client, 'test-model', thema, 2)
    expect(bank.pro.length).toBe(4)
    expect(calls.length).toBe(3)
  })

  it('throws once retries are exhausted with nothing usable', async () => {
    const { client } = fakeClient(['garbage', 'still garbage'])
    await expect(generateSchreibArgumentBank(client, 'test-model', thema, 1)).rejects.toThrow()
  })
})

describe('cachedSchreibBankIds', () => {
  // Runs before the "Dexie cache" describe below populates the shared mock
  // store, so this is the first test in the file to touch it — the store is
  // genuinely empty here, not just unqueried.
  it('returns an empty set when the table is empty', async () => {
    const ids = await cachedSchreibBankIds()
    expect(ids.size).toBe(0)
  })

  it('returns the ids of every cached bank', async () => {
    const bank: ArgumentBank = validateArgumentBank(validRaw())!
    await saveCachedSchreibBank('wt-cached-ids-a', bank)
    await saveCachedSchreibBank('wt-cached-ids-b', bank)
    const ids = await cachedSchreibBankIds()
    expect(ids.has('wt-cached-ids-a')).toBe(true)
    expect(ids.has('wt-cached-ids-b')).toBe(true)
  })
})

describe('Dexie cache (loadCachedSchreibBank / saveCachedSchreibBank)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns undefined for an uncached thema', async () => {
    const got = await loadCachedSchreibBank('wt-never-cached')
    expect(got).toBeUndefined()
  })

  it('round-trips a saved bank', async () => {
    const bank: ArgumentBank = validateArgumentBank(validRaw())!
    await saveCachedSchreibBank('wt-roundtrip-test', bank)
    const got = await loadCachedSchreibBank('wt-roundtrip-test')
    expect(got).toEqual(bank)
  })
})
