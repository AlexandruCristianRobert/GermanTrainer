import { describe, it, expect } from 'vitest'
import {
  buildVortragGraderPrompt, validateVortragGrade, gradeVortrag, AUFWERTUNG_CAP
} from '../../src/composables/useVortragGrader'
import { GLIEDERUNGSPUNKTE, VORTRAG_MIN_WORDS } from '../../src/data/sprechenVortragsmittel'
import type { SprechenVortrag } from '../../src/data/sprechen'

const REDE = 'Ich möchte heute über das Thema Ehrenamt sprechen. Ausserdem lernt man dabei viel. Ich bin für die Wettkämpfe gefahren. Zusammenfassend ist das Ehrenamt unverzichtbar.'

function vortrag(over: Partial<SprechenVortrag> = {}): SprechenVortrag {
  return {
    id: 'v1',
    thema: { id: 'vt-ehrenamt', titleDe: 'Ehrenamtliches Engagement', taskDe: 'Halten Sie einen kurzen Vortrag darüber, welche Rolle freiwillige Arbeit in einer Gesellschaft spielt.', source: 'seed' },
    modality: 'typed',
    helps: { hints: true, checklist: true, kiTipp: false, hardLimit: false },
    plan: [], notes: '',
    rede: { textDe: REDE },
    nachfrage: { questionDe: 'Wer bezahlt die Ausfallzeit?', answerDe: 'Vielen Dank für Ihre Frage. Ich denke, beide.' },
    kiTippCount: 0, helpLog: [], status: 'submitted', startedAt: 0,
    ...over
  }
}

function goodPayload(over: Record<string, unknown> = {}) {
  return {
    criteria: [
      { key: 'erfuellung', score: 20, justificationDe: 'de', justificationEn: 'en' },
      { key: 'kohaerenz', score: 19, justificationDe: 'de', justificationEn: 'en' },
      { key: 'wortschatz', score: 17, justificationDe: 'de', justificationEn: 'en' },
      { key: 'strukturen', score: 16, justificationDe: 'de', justificationEn: 'en' }
    ],
    coverage: GLIEDERUNGSPUNKTE.map(p => ({ key: p.key, covered: true, note: 'ok' })),
    mistakes: [
      { phase: 'rede', quote: 'Ausserdem', suggested: 'Außerdem', kind: 'spelling', reasonDe: 'ß nach langem Vokal.', reasonEn: 'ß after a long vowel.' },
      { phase: 'rede', quote: 'für die Wettkämpfe gefahren', suggested: 'zu den Wettkämpfen gefahren', kind: 'grammar', reasonDe: 'Ziel: zu + Dativ.', reasonEn: 'Destination takes zu + dative.' }
    ],
    aufwertungen: [
      { quote: 'lernt man dabei viel', better: 'erwirbt man dabei Fähigkeiten', whyDe: 'Präziser.', whyEn: 'More precise.' }
    ],
    strengths: [{ de: 'a', en: 'b' }],
    weaknesses: [{ de: 'c', en: 'd' }],
    overallDe: 'Gut gebaut.',
    overallEn: 'Well built.',
    ...over
  }
}

describe('buildVortragGraderPrompt', () => {
  it('embeds the Teil-1 rubric, not the Teil-2 one', () => {
    const { system } = buildVortragGraderPrompt(vortrag())
    expect(system).toContain('Erfüllung / Gliederung')
    expect(system).not.toContain('Erfüllung / Interaktion')
  })

  it('lists all five Gliederungspunkte by key for the coverage field', () => {
    const { system } = buildVortragGraderPrompt(vortrag())
    for (const p of GLIEDERUNGSPUNKTE) expect(system).toContain(p.key)
  })

  it('asks for Aufwertungen and says they are not errors', () => {
    const { system } = buildVortragGraderPrompt(vortrag())
    expect(system).toContain('aufwertungen')
    expect(system).toMatch(/KEINE Fehler|kein Fehler/i)
  })

  it('sends the Rede and the Nachfrage exchange, labelled', () => {
    const { user } = buildVortragGraderPrompt(vortrag())
    expect(user).toContain('VORTRAG:')
    expect(user).toContain('NACHFRAGE:')
    expect(user).toContain('ANTWORT:')
    expect(user).toContain('Ausserdem')
  })

  it('tells the grader when there was no Nachfrage, so Erfüllung is not docked', () => {
    const { user } = buildVortragGraderPrompt(vortrag({ nachfrage: undefined }))
    expect(user).toMatch(/keine Nachfrage/i)
    expect(user).toMatch(/nicht.*abwerten|nicht negativ/i)
  })

  it('forbids the spelling tag and sends Sprechdaten when spoken', () => {
    const { system, user } = buildVortragGraderPrompt(
      vortrag({ modality: 'spoken', rede: { textDe: REDE, seconds: 231, restarts: 4 } })
    )
    expect(system).toContain('spelling')
    expect(system).toMatch(/NIEMALS/)
    expect(user).toContain('SPRECHDATEN')
    expect(user).toContain('3:51')
  })

  it('says nothing about Sprechdaten when typed', () => {
    const { user } = buildVortragGraderPrompt(vortrag())
    expect(user).not.toContain('SPRECHDATEN')
  })

  it('is a fair, realistically calibrated examiner in both modalities', () => {
    const prompts = [
      buildVortragGraderPrompt(vortrag()),
      buildVortragGraderPrompt(vortrag({ modality: 'spoken', rede: { textDe: REDE, seconds: 231 } }))
    ]
    for (const { system } of prompts) {
      expect(system).toContain('faire, realistisch kalibrierte')
      expect(system).not.toContain('strenge, kalibrierte')
      expect(system).toContain('wohlwollend im Zweifel')
    }
  })

  it('states the calibration target so a clean Vortrag lands at 90+', () => {
    const { system } = buildVortragGraderPrompt(vortrag())
    expect(system).toContain('KALIBRIERUNG')
    expect(system).toContain('90–100')
    expect(system).toMatch(/im Zweifel die höhere Punktzahl/)
  })

  it('sends the counted Umfang and the length rule for a typed Vortrag', () => {
    const { user } = buildVortragGraderPrompt(vortrag())
    const words = REDE.trim().split(/\s+/).length
    expect(user).toContain(`UMFANG: Der Vortrag umfasst ${words} Wörter`)
    expect(user).toContain(`Ab ${VORTRAG_MIN_WORDS} Wörtern darf der Umfang keine Punktzahl beeinflussen`)
    expect(user).toContain(`Nur unter ${VORTRAG_MIN_WORDS} Wörtern`)
    expect(user).toContain('bei erfuellung, und NUR dort')
  })

  it('sends no Umfang block for a spoken Vortrag — the clock is the evidence there', () => {
    const { user } = buildVortragGraderPrompt(
      vortrag({ modality: 'spoken', rede: { textDe: REDE, seconds: 231, restarts: 4 } })
    )
    expect(user).not.toContain('UMFANG:')
    expect(user).toContain('SPRECHDATEN')
  })

  it('tells a typed run that typos never lower a score, and never says so when spoken', () => {
    const typed = buildVortragGraderPrompt(vortrag()).system
    expect(typed).toContain('Tippfehler')
    expect(typed).toMatch(/KEINE Kriteriumsnote senken/)
    const spoken = buildVortragGraderPrompt(
      vortrag({ modality: 'spoken', rede: { textDe: REDE, seconds: 231 } })
    ).system
    expect(spoken).not.toContain('Tippfehler')
  })
})

describe('validateVortragGrade', () => {
  it('derives the total and the pass flag from the criteria', () => {
    const r = validateVortragGrade(goodPayload(), vortrag())!
    expect(r.totalScore).toBe(72)
    expect(r.passes).toBe(true)
    expect(r.praedikat).toBe('befriedigend')
  })

  it('ignores the model’s own arithmetic', () => {
    const r = validateVortragGrade(goodPayload({ totalScore: 99, passes: false }), vortrag())!
    expect(r.totalScore).toBe(72)
    expect(r.passes).toBe(true)
  })

  it('rejects a missing criterion and an out-of-range score', () => {
    expect(validateVortragGrade(goodPayload({ criteria: goodPayload().criteria.slice(1) }), vortrag())).toBeNull()
    const bad = goodPayload()
    ;(bad.criteria as any)[0].score = 26
    expect(validateVortragGrade(bad, vortrag())).toBeNull()
  })

  it('requires exactly the five coverage keys', () => {
    expect(validateVortragGrade(goodPayload({ coverage: [] }), vortrag())).toBeNull()
    expect(validateVortragGrade(goodPayload({
      coverage: GLIEDERUNGSPUNKTE.map(p => ({ key: p.key === 'fazit' ? 'schluss' : p.key, covered: true, note: '' }))
    }), vortrag())).toBeNull()
  })

  it('never consumes a words field even when the model volunteers one', () => {
    const r = validateVortragGrade(goodPayload({
      coverage: GLIEDERUNGSPUNKTE.map(p => ({ key: p.key, covered: true, note: 'ok', words: 999 }))
    }), vortrag())!
    expect((r.coverage[0] as any).words).toBeUndefined()
  })

  it('re-anchors mistakes and drops the unanchorable', () => {
    const r = validateVortragGrade(goodPayload({
      mistakes: [
        { phase: 'rede', quote: 'Ausserdem', suggested: 'Außerdem', kind: 'spelling', reasonDe: 'x', reasonEn: 'y' },
        { phase: 'rede', quote: 'niemals gesagt', suggested: 'egal', kind: 'grammar', reasonDe: 'x', reasonEn: 'y' }
      ]
    }), vortrag())!
    expect(r.mistakes).toHaveLength(1)
    expect(r.mistakes[0].spanStart).toBeGreaterThanOrEqual(0)
  })

  it('anchors a Nachfrage mistake against the answer, not the Rede', () => {
    const r = validateVortragGrade(goodPayload({
      mistakes: [{ phase: 'nachfrage', quote: 'Ich denke, beide', suggested: 'Ich denke, beide sollten', kind: 'grammar', reasonDe: 'x', reasonEn: 'y' }]
    }), vortrag())!
    expect(r.mistakes).toHaveLength(1)
    expect(r.mistakes[0].phase).toBe('nachfrage')
  })

  it('suppresses the spelling tag in a spoken Vortrag', () => {
    const r = validateVortragGrade(goodPayload(), vortrag({ modality: 'spoken', rede: { textDe: REDE, seconds: 200 } }))!
    expect(r.mistakes.map(m => m.kind)).not.toContain('spelling')
    expect(r.mistakes).toHaveLength(1)
  })

  it('re-anchors and caps Aufwertungen, and never treats them as errors', () => {
    const many = Array.from({ length: 9 }, () => ({ quote: 'lernt man dabei viel', better: 'x', whyDe: 'y', whyEn: 'z' }))
    const r = validateVortragGrade(goodPayload({ aufwertungen: many }), vortrag())!
    expect(r.aufwertungen.length).toBe(AUFWERTUNG_CAP)
    expect(r.aufwertungen[0].spanStart).toBeGreaterThanOrEqual(0)
    expect(r.mistakes.every(m => (m as any).better === undefined)).toBe(true)
  })

  it('drops an unanchorable Aufwertung', () => {
    const r = validateVortragGrade(goodPayload({
      aufwertungen: [{ quote: 'nie gesagt', better: 'x', whyDe: 'y', whyEn: 'z' }]
    }), vortrag())!
    expect(r.aufwertungen).toEqual([])
  })

  it('tolerates aufwertungen and coverage being absent — a good grade must not fail on extras', () => {
    const p = goodPayload()
    delete (p as any).aufwertungen
    const r = validateVortragGrade(p, vortrag())!
    expect(r.aufwertungen).toEqual([])
  })
})

describe('band anchors and consistency (F9)', () => {
  it('embeds four CONTIGUOUS band anchors per criterion and the per-point deduction rule', () => {
    const { system } = buildVortragGraderPrompt(vortrag())
    expect(system).toContain('23–25')
    expect(system).toContain('18–22')
    expect(system).toContain('12–17')
    expect(system).toContain('5–11')
    // The old set left 20–23 unreachable, which pinned a near-clean Vortrag at ~19 × 4.
    expect(system).not.toMatch(/24–25|18–19|12–13|5–6:/)
    expect(system).toMatch(/mindestens 4 Punkte Abzug/)
  })

  it('lets the top band tolerate isolated small slips, for every criterion', () => {
    const { system } = buildVortragGraderPrompt(vortrag())
    expect(system.match(/vereinzelte kleine Ausrutscher ändern daran nichts/g)).toHaveLength(4)
  })
  it('rejects a grade whose erfuellung contradicts its own coverage', () => {
    const p = goodPayload({
      coverage: GLIEDERUNGSPUNKTE.map((g, i) => ({ key: g.key, covered: i < 3, note: '' }))
    })
    ;(p.criteria as any)[0].score = 21
    expect(validateVortragGrade(p, vortrag())).toBeNull()
  })
  it('accepts low coverage when erfuellung is low too', () => {
    const p = goodPayload({
      coverage: GLIEDERUNGSPUNKTE.map((g, i) => ({ key: g.key, covered: i < 3, note: '' }))
    })
    ;(p.criteria as any)[0].score = 12
    expect(validateVortragGrade(p, vortrag())).not.toBeNull()
  })
})

describe('SPRECHDATEN wall clock (F2)', () => {
  it('reports Gesamtdauer and Pausenzeit when the wall clock exists', () => {
    const { user } = buildVortragGraderPrompt(vortrag({
      modality: 'spoken',
      rede: { textDe: REDE, seconds: 190, wallSeconds: 350, restarts: 2 }
    }))
    expect(user).toContain('Gesamtdauer 5:50')
    expect(user).toContain('Pausenzeit 2:40')
  })
})

describe('Aufwertung dosing (F21)', () => {
  it('drops an Aufwertung overlapping a mistake span', () => {
    const p = goodPayload({
      mistakes: [{ phase: 'rede', quote: 'Ausserdem', suggested: 'Außerdem', kind: 'spelling', reasonDe: 'x', reasonEn: 'y' }],
      aufwertungen: [{ quote: 'Ausserdem lernt man', better: 'Zudem erwirbt man', whyDe: 'a', whyEn: 'b' }]
    })
    const r = validateVortragGrade(p, vortrag())!
    expect(r.aufwertungen).toEqual([])
  })
  it('caps Aufwertungen at 2 when mistakes exceed 6', () => {
    const mistakes = Array.from({ length: 7 }, (_, i) => ({
      phase: 'rede', quote: REDE.split(' ')[i], suggested: 'x', kind: 'grammar', reasonDe: 'r', reasonEn: 'r'
    }))
    const aufw = Array.from({ length: 5 }, () => ({ quote: 'unverzichtbar', better: 'nicht wegzudenken', whyDe: 'a', whyEn: 'b' }))
    const r = validateVortragGrade(goodPayload({ mistakes, aufwertungen: aufw }), vortrag())!
    expect(r.aufwertungen.length).toBeLessThanOrEqual(2)
  })
})

describe('gradeVortrag', () => {
  function fakeClient(responses: string[]) {
    let i = 0
    const calls: any[] = []
    return {
      client: { models: { generateContent: async (o: any) => { calls.push(o); return { text: responses[Math.min(i++, responses.length - 1)] } } } },
      calls
    }
  }

  it('grades at temperature 0 and stamps the model', async () => {
    const { client, calls } = fakeClient([JSON.stringify(goodPayload())])
    const r = await gradeVortrag(client as any, 'gemini-2.5-flash', vortrag())
    expect(r.totalScore).toBe(72)
    expect(r.modelUsed).toBe('gemini-2.5-flash')
    expect(calls[0].config.temperature).toBe(0)
  })

  it('retries past malformed JSON then throws with the attempt count', async () => {
    const { client } = fakeClient(['nope'])
    await expect(gradeVortrag(client as any, 'm', vortrag())).rejects.toThrow(/3 attempts/)
  })
})
