import { describe, expect, it } from 'vitest'
import type { SprechenDiscussion } from '../../src/data/sprechen'
import {
  buildKiTippPrompt, buildPartnerSystem, buildPartnerTurnPrompt, computePhase,
  generateKiTipp, generatePartnerTurn, serializeTranscript, validatePartnerReply
} from '../../src/composables/useSprechenPartner'

function disc(overrides: Partial<SprechenDiscussion> = {}): SprechenDiscussion {
  return {
    id: 'd1',
    topic: { id: 'st-umwelt-tempolimit', titleDe: 'Tempolimit', statementDe: 'Brauchen wir ein generelles Tempolimit auf Autobahnen?', source: 'seed' },
    turnTarget: 6,
    stance: 'contra',
    status: 'in_progress',
    turns: [],
    kiTippCount: 0,
    startedAt: 0,
    ...overrides
  }
}

function fakeClient(responses: string[]) {
  let i = 0
  const calls: Array<Record<string, unknown>> = []
  return {
    calls,
    client: {
      models: {
        generateContent: async (params: Record<string, unknown>) => {
          calls.push(params)
          return { text: responses[Math.min(i++, responses.length - 1)] }
        }
      }
    }
  }
}

describe('computePhase', () => {
  it('opening when no turns, closing when learner target reached, reply otherwise', () => {
    expect(computePhase(disc())).toBe('opening')
    const mid = disc({ turns: [
      { role: 'partner', textDe: 'A', at: 1 }, { role: 'learner', textDe: 'B', at: 2 }
    ] })
    expect(computePhase(mid)).toBe('reply')
    const turns = [] as SprechenDiscussion['turns']
    for (let k = 0; k < 6; k++) {
      turns.push({ role: 'partner', textDe: 'p', at: k * 2 })
      turns.push({ role: 'learner', textDe: 'l', at: k * 2 + 1 })
    }
    expect(computePhase(disc({ turns }))).toBe('closing')
  })
})

describe('prompt builders', () => {
  it('system prompt carries topic, stance, and the four behavior rules', () => {
    const sys = buildPartnerSystem(disc())
    expect(sys).toContain('Tempolimit')
    expect(sys).toContain('DAGEGEN')
    expect(sys).toContain('Korrigiere')             // never-correct rule
    expect(sys).toContain('Teilaspekt')             // devil's-advocate rule
    expect(sys).toContain('Nachfrage')              // short-turn rule
  })

  it('transcript serializes roles as PARTNER/LERNER lines', () => {
    const d = disc({ turns: [
      { role: 'partner', textDe: 'Ich bin dagegen.', at: 1 },
      { role: 'learner', textDe: 'Warum denn?', at: 2 }
    ] })
    const t = serializeTranscript(d.turns)
    expect(t).toBe('PARTNER: Ich bin dagegen.\nLERNER: Warum denn?')
  })

  it('user prompt names the phase instruction and embeds the transcript', () => {
    const d = disc({ turns: [{ role: 'partner', textDe: 'X', at: 1 }, { role: 'learner', textDe: 'Y', at: 2 }] })
    expect(buildPartnerTurnPrompt(d, 'reply')).toContain('PARTNER: X')
    expect(buildPartnerTurnPrompt(d, 'closing')).toContain('abschließenden')
    expect(buildPartnerTurnPrompt(disc(), 'opening')).toContain('Eröffne')
  })

  it('KI-Tipp prompt forbids ready-made sentences', () => {
    expect(buildKiTippPrompt(disc())).toContain('KEINEN fertigen Satz')
  })
})

describe('validatePartnerReply', () => {
  it('accepts a normal reply and trims it', () => {
    expect(validatePartnerReply({ replyDe: '  Das sehe ich anders. Warum?  ' }))
      .toBe('Das sehe ich anders. Warum?')
  })
  it('rejects non-objects, missing/short/overlong replies', () => {
    expect(validatePartnerReply(null)).toBeNull()
    expect(validatePartnerReply({})).toBeNull()
    expect(validatePartnerReply({ replyDe: 'Ja.' })).toBeNull()
    expect(validatePartnerReply({ replyDe: 'x'.repeat(901) })).toBeNull()
  })
})

describe('generatePartnerTurn', () => {
  it('returns the validated reply', async () => {
    const { client } = fakeClient([JSON.stringify({ replyDe: 'Da widerspreche ich Ihnen deutlich.' })])
    const reply = await generatePartnerTurn(client, 'test-model', disc(), 'opening')
    expect(reply).toBe('Da widerspreche ich Ihnen deutlich.')
  })

  it('retries on malformed JSON then succeeds', async () => {
    const { client, calls } = fakeClient(['not json', JSON.stringify({ replyDe: 'Zweiter Versuch, gutes Argument.' })])
    const reply = await generatePartnerTurn(client, 'test-model', disc(), 'reply')
    expect(reply).toBe('Zweiter Versuch, gutes Argument.')
    expect(calls.length).toBe(2)
  })

  it('throws after exhausting retries', async () => {
    const { client } = fakeClient(['nope'])
    await expect(generatePartnerTurn(client, 'test-model', disc(), 'reply')).rejects.toThrow()
  })
})

describe('generateKiTipp', () => {
  it('returns the tip text', async () => {
    const { client } = fakeClient([JSON.stringify({ tippDe: 'Du könntest widersprechen und ein Alltagsbeispiel bringen.' })])
    const tipp = await generateKiTipp(client, 'test-model', disc())
    expect(tipp).toContain('widersprechen')
  })
})
