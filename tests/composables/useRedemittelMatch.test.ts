import { describe, it, expect } from 'vitest'
import {
  redemittelNeedle, matchRedemittel, movesUsed, movePerTurn, pickMoveNudge
} from '../../src/composables/useRedemittelMatch'
import { SPRECHEN_REDEMITTEL } from '../../src/data/sprechenRedemittel'
import { SPRECHEN_VORTRAGSMITTEL, VORTRAG_MOVES } from '../../src/data/sprechenVortragsmittel'

describe('redemittelNeedle', () => {
  it('strips every punctuation mark, not just sentence enders', () => {
    // The design prototype stripped only . ? ! … and kept commas, which made
    // 10 of 42 phrases unmatchable against speech-recognizer output.
    expect(redemittelNeedle('Ich bin der Ansicht, dass …')).toBe('ich bin der ansicht dass')
    expect(redemittelNeedle('Das mag sein, trotzdem …')).toBe('das mag sein trotzdem')
  })

  it('collapses inner whitespace', () => {
    expect(redemittelNeedle('Aus   meiner  Sicht …')).toBe('aus meiner sicht')
  })

  it('caps the needle at 24 characters', () => {
    expect(redemittelNeedle('Bis zu einem gewissen Grad stimme ich zu, jedoch …').length).toBe(24)
  })

  it('never produces a needle shorter than 12 chars for any shipped phrase', () => {
    for (const r of SPRECHEN_REDEMITTEL) {
      expect(redemittelNeedle(r.phraseDe).length).toBeGreaterThanOrEqual(12)
    }
  })

  it('produces 42 distinct needles — no phrase can shadow another', () => {
    const needles = SPRECHEN_REDEMITTEL.map(r => redemittelNeedle(r.phraseDe))
    expect(needles.length).toBe(42)
    expect(new Set(needles).size).toBe(42)
  })

  it('no needle is a substring of another needle', () => {
    const needles = SPRECHEN_REDEMITTEL.map(r => redemittelNeedle(r.phraseDe))
    const overlaps: string[] = []
    for (const a of needles) {
      for (const b of needles) {
        if (a !== b && b.includes(a)) overlaps.push(`${a} ⊂ ${b}`)
      }
    }
    expect(overlaps).toEqual([])
  })
})

describe('matchRedemittel', () => {
  it('matches a phrase written with its comma', () => {
    const hits = matchRedemittel(['Ich bin der Ansicht, dass wir handeln müssen.'])
    expect(hits.map(h => h.id)).toContain('rm-opinion-2')
  })

  it('matches the same phrase with no comma at all — the spoken case', () => {
    const hits = matchRedemittel(['ich bin der ansicht dass wir handeln müssen'])
    expect(hits.map(h => h.id)).toContain('rm-opinion-2')
  })

  it('matches all ten comma-carrying phrases from comma-free speech text', () => {
    const commaPhrases = [
      'rm-opinion-2', 'rm-opinion-3', 'rm-opinion-5', 'rm-opinion-6',
      'rm-partial-2', 'rm-partial-3', 'rm-partial-4', 'rm-ask-4',
      'rm-summarize-2', 'rm-summarize-3'
    ]
    for (const id of commaPhrases) {
      const phrase = SPRECHEN_REDEMITTEL.find(r => r.id === id)!
      const spoken = phrase.phraseDe.replace(/[.,;:!?…]/g, '').toLowerCase()
      expect(matchRedemittel([spoken]).map(h => h.id), id).toContain(id)
    }
  })

  it('does not bleed across turn boundaries', () => {
    // A needle must not be assembled from the tail of one turn and the head of
    // the next, so turns are joined with a separator that cannot occur in one.
    const hits = matchRedemittel(['Aus meiner', 'Sicht ist das falsch.'])
    expect(hits.map(h => h.id)).not.toContain('rm-opinion-4')
  })

  it('returns an empty array for text containing no Redemittel', () => {
    expect(matchRedemittel(['Das Wetter ist heute schön.'])).toEqual([])
  })
})

describe('movesUsed', () => {
  it('counts hits per Move', () => {
    const used = matchRedemittel([
      'Aus meiner Sicht ist das falsch.',
      'Meiner Meinung nach stimmt das nicht.',
      'Wie sehen Sie das?'
    ])
    const counts = movesUsed(used)
    expect(counts.opinion).toBe(2)
    expect(counts.ask).toBe(1)
    expect(counts.agree).toBeUndefined()
  })
})

describe('movePerTurn', () => {
  it('labels each turn with the Move it used', () => {
    expect(movePerTurn([
      'Aus meiner Sicht ist das falsch.',
      'Wie sehen Sie das?'
    ])).toEqual(['opinion', 'ask'])
  })

  it('returns null for a turn that used no Redemittel', () => {
    expect(movePerTurn(['Das Wetter ist heute schön.'])).toEqual([null])
  })

  it('breaks a tie by HINT_MOVES order, not array order of the data', () => {
    // One agree hit and one ask hit in the same turn: 'agree' precedes 'ask'
    // in HINT_MOVES, so it wins.
    expect(movePerTurn(['Das sehe ich genauso. Wie sehen Sie das?'])).toEqual(['agree'])
  })

  it('prefers the Move with more hits over HINT_MOVES order', () => {
    // Two ask hits beat one agree hit even though agree sorts first.
    expect(movePerTurn([
      'Das sehe ich genauso. Wie sehen Sie das? Was halten Sie davon?'
    ])).toEqual(['ask'])
  })
})

describe('pickMoveNudge', () => {
  it('never nudges toward a Move already used this run', () => {
    const nudge = pickMoveNudge(['Das sehe ich genauso.'], {})
    expect(nudge).not.toBe('agree')
  })

  it('prefers the least-used Move by lifetime count', () => {
    // Everything unused this run; 'ask' has the lowest lifetime total.
    const lifetime = {
      'rm-agree-1': 9, 'rm-disagree-1': 7, 'rm-partial-1': 5,
      'rm-ask-1': 1, 'rm-example-1': 4, 'rm-summarize-1': 3
    }
    expect(pickMoveNudge([], lifetime)).toBe('ask')
  })

  it('falls back to HINT_MOVES order when lifetime counts tie', () => {
    expect(pickMoveNudge([], {})).toBe('agree')
  })

  it('returns null when every hint Move has been used this run', () => {
    const allSix = [
      'Das sehe ich genauso.',
      'Da bin ich anderer Meinung.',
      'Das mag sein, trotzdem …',
      'Wie sehen Sie das?',
      'Ein gutes Beispiel dafür ist …',
      'Insgesamt denke ich, dass …'
    ]
    expect(pickMoveNudge(allSix, {})).toBeNull()
  })

  it('ignores the opinion Move — it is not offered by the hint panel', () => {
    const lifetime = { 'rm-opinion-1': 0, 'rm-agree-1': 99 }
    expect(pickMoveNudge([], lifetime)).not.toBe('opinion')
  })
})

describe('bank parameterisation', () => {
  it('defaults to the Teil 2 bank, unchanged', () => {
    const hits = matchRedemittel(['Da stimme ich Ihnen völlig zu, das sehe ich auch so.'])
    expect(hits.length).toBeGreaterThan(0)
    expect(hits.every(r => r.id.startsWith('rm-'))).toBe(true)
  })

  it('matches the Vortragsmittel bank when given it', () => {
    const hits = matchRedemittel(
      ['Ich möchte heute über das Thema Ehrenamt sprechen. Vielen Dank für Ihre Aufmerksamkeit.'],
      SPRECHEN_VORTRAGSMITTEL
    )
    const ids = hits.map(h => h.id)
    expect(ids).toContain('vm-einstieg-1')
    expect(ids).toContain('vm-abschluss-5')
  })

  it('never returns a phrase from the other bank', () => {
    const hits = matchRedemittel(
      ['Da stimme ich Ihnen völlig zu. Ich möchte heute über das Thema Sport sprechen.'],
      SPRECHEN_VORTRAGSMITTEL
    )
    expect(hits.every(r => r.id.startsWith('vm-'))).toBe(true)
  })

  it('nudges a Vortrag Move the learner has not used', () => {
    const nudge = pickMoveNudge(
      ['Ich möchte heute über das Thema Sport sprechen.'],
      {},
      SPRECHEN_VORTRAGSMITTEL,
      VORTRAG_MOVES
    )
    expect(nudge).not.toBe('einstieg')
    expect(VORTRAG_MOVES).toContain(nudge as any)
  })

  it('prefers the Vortrag Move with the coldest lifetime count', () => {
    const lifetime: Record<string, number> = {}
    // Make every group warm except 'kontrast'.
    for (const r of SPRECHEN_VORTRAGSMITTEL) if (r.move !== 'kontrast') lifetime[r.id] = 5
    const nudge = pickMoveNudge([''], lifetime, SPRECHEN_VORTRAGSMITTEL, VORTRAG_MOVES)
    expect(nudge).toBe('kontrast')
  })

  it('returns null when every Move of the given bank was used', () => {
    const all = SPRECHEN_VORTRAGSMITTEL.map(r => r.phraseDe).join(' ')
    expect(pickMoveNudge([all], {}, SPRECHEN_VORTRAGSMITTEL, VORTRAG_MOVES)).toBeNull()
  })
})
