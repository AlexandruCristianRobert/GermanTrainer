import { describe, it, expect } from 'vitest'
import {
  buildNachfragePrompt, validateNachfrage, generateNachfrage,
  buildVortragKiTippPrompt, generateVortragKiTipp
} from '../../src/composables/useVortragPartner'
import type { SprechenVortrag } from '../../src/data/sprechen'

const v: SprechenVortrag = {
  id: 'v1',
  thema: { id: 'vt-ehrenamt', titleDe: 'Ehrenamtliches Engagement', taskDe: 'Halten Sie einen kurzen Vortrag darüber, welche Rolle freiwillige Arbeit in einer Gesellschaft spielt.', source: 'seed' },
  modality: 'typed',
  helps: { hints: true, checklist: true, kiTipp: true, hardLimit: false },
  plan: [{ key: 'einstieg', keyword: 'Sportvereine' }, { key: 'fazit', keyword: 'Freistellung' }],
  notes: '',
  rede: { textDe: 'Ich möchte heute über das Thema Ehrenamt sprechen. Freiwillige brauchen Freistellung von der Arbeit.' },
  kiTippCount: 0,
  helpLog: [],
  status: 'in_progress',
  startedAt: 0
}

function fakeClient(responses: string[]) {
  let i = 0
  const calls: Array<{ contents: string; config?: any }> = []
  return {
    client: {
      models: {
        generateContent: async (opts: { contents: string; config?: any }) => {
          calls.push(opts)
          return { text: responses[Math.min(i++, responses.length - 1)] }
        }
      }
    },
    calls
  }
}

describe('buildNachfragePrompt', () => {
  it('sends the Rede so the question is about what was actually said', () => {
    const p = buildNachfragePrompt(v)
    expect(p).toContain('Freistellung von der Arbeit')
    expect(p).toContain(v.thema.taskDe)
  })

  it('demands exactly one question, and one that cannot be answered yes or no', () => {
    const p = buildNachfragePrompt(v)
    expect(p).toContain('GENAU EINE')
    expect(p).toContain('questionDe')
    expect(p).toMatch(/nicht mit ja oder nein/i)
  })
})

describe('validateNachfrage', () => {
  it('accepts a plausible question', () => {
    expect(validateNachfrage({ questionDe: 'Wer soll diese Ausfallzeit bezahlen — die Betriebe oder der Staat?' }))
      .toBe('Wer soll diese Ausfallzeit bezahlen — die Betriebe oder der Staat?')
  })

  it('rejects the empty, the tiny and the enormous', () => {
    expect(validateNachfrage({ questionDe: '' })).toBeNull()
    expect(validateNachfrage({ questionDe: 'Was?' })).toBeNull()
    expect(validateNachfrage({ questionDe: 'A'.repeat(400) })).toBeNull()
    expect(validateNachfrage(null)).toBeNull()
  })

  it('rejects a non-question', () => {
    expect(validateNachfrage({ questionDe: 'Das war ein guter Vortrag über das Ehrenamt.' })).toBeNull()
  })
})

describe('generateNachfrage', () => {
  it('returns the question', async () => {
    const { client } = fakeClient([JSON.stringify({ questionDe: 'Und wer bezahlt die Ausfallzeit dann?' })])
    expect(await generateNachfrage(client as any, 'm', v)).toBe('Und wer bezahlt die Ausfallzeit dann?')
  })

  it('accepts bare prose — the local-claude bridge drops responseSchema', async () => {
    const { client } = fakeClient(['Und wer bezahlt die Ausfallzeit dann?'])
    expect(await generateNachfrage(client as any, 'm', v)).toBe('Und wer bezahlt die Ausfallzeit dann?')
  })

  it('retries past junk, then throws', async () => {
    const { client, calls } = fakeClient(['{}'])
    await expect(generateNachfrage(client as any, 'm', v)).rejects.toThrow()
    expect(calls.length).toBe(3)
  })
})

describe('buildVortragKiTippPrompt', () => {
  it('names all five Gliederungspunkte for the model to judge, and forbids a sentence', () => {
    const p = buildVortragKiTippPrompt(v)
    expect(p).toContain('Eigene Erfahrung')     // one of the five labels, always listed
    expect(p).toContain('Vor- und Nachteile')
    expect(p).toMatch(/KEINEN fertigen Satz/i)
    expect(p).toContain('tippDe')
  })

  it('mentions the Vortragsplan keywords only as a hint, never as text to speak', () => {
    const p = buildVortragKiTippPrompt(v)
    expect(p).toMatch(/Stichwort|geplant/i)
  })
})

describe('buildVortragKiTippPrompt (F7)', () => {
  it('asks the model to judge coverage itself and labels the keyword signal unreliable', () => {
    const p = buildVortragKiTippPrompt(v)
    expect(p).toMatch(/beurteile selbst/i)
    expect(p).toMatch(/unzuverlässig/i)
    expect(p).not.toMatch(/Noch nicht angesprochene Gliederungspunkte:/)
  })

  it('carries the Redezeit state so the tip can be pacing advice', () => {
    const p = buildVortragKiTippPrompt({ ...v, rede: { ...v.rede, seconds: 190, wallSeconds: 230 } })
    expect(p).toMatch(/Redezeit|Gesamt/)
    expect(p).toContain('3:10')
  })

  it('still forbids a ready-made sentence', () => {
    expect(buildVortragKiTippPrompt(v)).toMatch(/KEINEN fertigen Satz/i)
  })
})

describe('Nachfrage rotation and validation (F18)', () => {
  it('rotates the question type deterministically per Vortrag', () => {
    const a = buildNachfragePrompt({ ...v, startedAt: 0 })
    const b = buildNachfragePrompt({ ...v, startedAt: 1 })
    const c = buildNachfragePrompt({ ...v, startedAt: 2 })
    const d = buildNachfragePrompt({ ...v, startedAt: 3 })
    expect(new Set([a, b, c, d]).size).toBe(4)
    expect(buildNachfragePrompt({ ...v, startedAt: 4 })).toBe(a)
  })

  it('rejects yes/no-shaped openers', () => {
    expect(validateNachfrage({ questionDe: 'Sind Sie sicher, dass das stimmt?' })).toBeNull()
    expect(validateNachfrage({ questionDe: 'Gibt es dafür Beispiele in Ihrem Land?' })).toBeNull()
    expect(validateNachfrage({ questionDe: 'Wer soll diese Ausfallzeit denn bezahlen?' })).not.toBeNull()
    expect(validateNachfrage({ questionDe: 'Wie würde das in Ihrem Heimatland funktionieren?' })).not.toBeNull()
  })
})

describe('generateVortragKiTipp', () => {
  it('returns the tip', async () => {
    const { client } = fakeClient([JSON.stringify({ tippDe: 'Stell den Vorteilen einen Nachteil gegenüber.' })])
    expect(await generateVortragKiTipp(client as any, 'm', v)).toBe('Stell den Vorteilen einen Nachteil gegenüber.')
  })

  it('accepts bare prose', async () => {
    const { client } = fakeClient(['Nenne jetzt ein eigenes Beispiel.'])
    expect(await generateVortragKiTipp(client as any, 'm', v)).toBe('Nenne jetzt ein eigenes Beispiel.')
  })

  it('throws when nothing usable arrives', async () => {
    const { client } = fakeClient(['{"nope": 1}'])
    await expect(generateVortragKiTipp(client as any, 'm', v)).rejects.toThrow()
  })
})
