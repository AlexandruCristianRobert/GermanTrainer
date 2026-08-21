import { describe, it, expect } from 'vitest'
import {
  buildVokabelnPrompt, generateVokabeln, buildRescuePrompt, judgeRescue,
  buildAnwendungPrompt, gradeAnwendung, generateExtraSaetze
} from '../../src/composables/useWortschatzAi'
import { WORTSCHATZ_VOKABELN } from '../../src/data/wortschatz'

function fakeClient(responses: string[]) {
  let i = 0
  return { models: { generateContent: async () => ({ text: responses[Math.min(i++, responses.length - 1)] }) } }
}
const V = WORTSCHATZ_VOKABELN[0]

const GOOD_ITEM = {
  kind: 'einzelwort', de: 'die Mülltrennung', en: 'waste separation', plural: '',
  variants: [], saetze: [
    { de: 'Konsequente {{Mülltrennung}} spart Rohstoffe.', en: 'Consistent waste separation saves resources.' },
    { de: 'Ohne {{Mülltrennung}} landet alles in einer Tonne.', en: 'Without waste separation everything ends up in one bin.' }
  ]
}

describe('useWortschatzAi', () => {
  it('prompts spell out the JSON envelope in prose and forbid fences', () => {
    const p = buildVokabelnPrompt('Umwelt', ['die Verpackung'], 8)
    expect(p).toContain('{"vokabeln"')
    expect(p.toLowerCase()).toContain('keine markdown')
    expect(p).toContain('die Verpackung')          // exclusion list is in the prompt
    expect(buildRescuePrompt(V, V.de, 'x')).toContain('"acceptable"')
    expect(buildAnwendungPrompt(V, 'Satz.')).toContain('"correct"')
  })

  it('generateVokabeln validates and returns items; retries on garbage', async () => {
    const good = JSON.stringify({ vokabeln: [GOOD_ITEM] })
    const items = await generateVokabeln(fakeClient(['not json', good]), 'm', 'Umwelt', [], 8)
    expect(items).toHaveLength(1)
    expect(items[0].de).toBe('die Mülltrennung')
  })

  it('generateVokabeln rejects items whose Satz lacks a blank', async () => {
    const bad = JSON.stringify({ vokabeln: [{ ...GOOD_ITEM, saetze: [
      { de: 'Kein Blank.', en: 'x' }, GOOD_ITEM.saetze[1]
    ] }] })
    await expect(generateVokabeln(fakeClient([bad, bad, bad]), 'm', 'Umwelt', [], 8))
      .rejects.toThrow()
  })

  it('generateVokabeln accepts a mixed batch (one invalid + one valid) without retrying', async () => {
    let calls = 0
    const invalidItem = { ...GOOD_ITEM, saetze: [
      { de: 'Kein Blank.', en: 'x' }, GOOD_ITEM.saetze[1]
    ] }
    const mixed = JSON.stringify({ vokabeln: [invalidItem, GOOD_ITEM] })
    const client = { models: { generateContent: async () => { calls++; return { text: mixed } } } }
    const items = await generateVokabeln(client, 'm', 'Umwelt', [], 8)
    expect(items).toHaveLength(1)
    expect(items[0].de).toBe('die Mülltrennung')
    expect(calls).toBe(1)
  })

  it('judgeRescue parses the verdict', async () => {
    const res = await judgeRescue(
      fakeClient([JSON.stringify({ acceptable: true, begruendung: 'Gleiche Wendung, andere Zahl.' })]),
      'm', V, V.de, 'Maßnahmen ergreifen')
    expect(res.acceptable).toBe(true)
  })

  it('judgeRescue throws on garbage text (single attempt, no silent success)', async () => {
    await expect(judgeRescue(fakeClient(['not json']), 'm', V, V.de, 'x')).rejects.toThrow()
  })

  it('gradeAnwendung parses verdict + feedback', async () => {
    const res = await gradeAnwendung(
      fakeClient([JSON.stringify({ correct: false, feedback: 'Kasus falsch.', korrektur: '…' })]),
      'm', V, 'Wir ergreifen einer Maßnahme.')
    expect(res.correct).toBe(false)
    expect(res.feedback).toContain('Kasus')
  })

  it('generateExtraSaetze returns exactly 3 blanked sentences', async () => {
    const good = JSON.stringify({ saetze: [
      { de: 'A {{Maßnahme}} eins.', en: 'one' }, { de: 'B {{Maßnahme}} zwei.', en: 'two' },
      { de: 'C {{Maßnahme}} drei.', en: 'three' }
    ] })
    expect(await generateExtraSaetze(fakeClient([good]), 'm', V)).toHaveLength(3)
  })
})
