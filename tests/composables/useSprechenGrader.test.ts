import { describe, expect, it } from 'vitest'
import type { SprechenDiscussion } from '../../src/data/sprechen'
import { summarizeFluency } from '../../src/data/sprechen'
import {
  buildSprechenGraderPrompt, gradeDiscussion, validateSprechenGrade
} from '../../src/composables/useSprechenGrader'

function disc(): SprechenDiscussion {
  return {
    id: 'd1',
    topic: { id: 'st-umwelt-tempolimit', titleDe: 'Tempolimit', statementDe: 'Brauchen wir ein generelles Tempolimit auf Autobahnen?', source: 'seed' },
    turnTarget: 6,
    stance: 'contra',
    modality: 'typed',
    status: 'submitted',
    turns: [
      { role: 'partner', textDe: 'Ich bin gegen ein Tempolimit.', at: 1 },
      { role: 'learner', textDe: 'Ich denke das ein Tempolimit gut ist.', at: 2 },
      { role: 'partner', textDe: 'Warum denn?', at: 3 },
      { role: 'learner', textDe: 'Weil es macht die Straßen sicherer.', at: 4 }
    ],
    kiTippCount: 0,
    startedAt: 0
  }
}

// Same conversation, spoken modality, with hand-verifiable fluency numbers:
// L0 speaks 40 words in 30000ms (0.5 min) → exactly 80 WPM, reacts in 1.2s,
// no long pauses. L1 speaks 24 words in 20000ms (1/3 min) → exactly 72 WPM,
// reacts in 0.8s, one long pause (restarts: 1).
function spokenDisc(): SprechenDiscussion {
  const d = disc()
  return {
    ...d,
    modality: 'spoken',
    turns: [
      d.turns[0],
      { ...d.turns[1], speech: { spokenMs: 30_000, reactionMs: 1200, restarts: 0, words: 40 } },
      d.turns[2],
      { ...d.turns[3], speech: { spokenMs: 20_000, reactionMs: 800, restarts: 1, words: 24 } }
    ]
  }
}

// Spoken modality but the recognizer never attached `speech` to any learner
// turn (e.g. mic permission denied mid-session) — must degrade gracefully.
function spokenDiscNoSpeechData(): SprechenDiscussion {
  return { ...disc(), modality: 'spoken' }
}

// Captured verbatim from buildSprechenGraderPrompt(disc()) BEFORE the spoken
// modality feature was added (via a throwaway baseline-capture test run
// against the untouched source). Used to prove the typed prompt is still
// byte-for-byte identical after adding spoken-modality support.
const BASELINE_TYPED_SYSTEM = "Du bist eine strenge, kalibrierte Prüferin für die mündliche Goethe-B2-Prüfung, die hier in getippter Form geübt wird. Du bewertest AUSSCHLIESSLICH die Beiträge des Lernenden (mit L0, L1, … markiert) nach der Rubrik unten — die PARTNER-Beiträge stammen von einer KI und werden nicht bewertet.\n\nZusätzlich markierst du JEDEN sprachlichen Fehler in den Lernerbeiträgen:\n- \"turnIndex\": die Zahl hinter dem L des betroffenen Beitrags.\n- \"quote\": die fehlerhafte Stelle WÖRTLICH aus dem Beitrag zitiert (exakte Zeichenfolge, keine Umformulierung).\n- \"suggested\": die korrigierte Fassung der Stelle.\n- \"kind\": GENAU EINE Kategorie aus: grammar (Kasus, Konjugation, Endungen), word-order (Verbstellung, Satzklammer), vocabulary (falsches Wort, Kollokation), spelling (Rechtschreibung), register (Du/Sie, Stilebene).\n- \"reasonDe\" UND \"reasonEn\": kurze Erklärung, WARUM es falsch ist (Deutsch einfach halten — B2-Lernende lesen sie).\n\nFür jedes Kriterium: ganzzahlige Punktzahl im erlaubten Bereich plus kurze Begründung auf Deutsch UND Englisch. totalScore ist die exakte Summe der vier Kriterien; passes ist totalScore >= 60. Danach Stärken, Schwächen und ein Gesamturteil, jeweils Deutsch und Englisch.\nAntworte ausschließlich als EIN JSON-Objekt exakt dieser Form — kein Prosa-Vorspann, keine Markdown-Fences:\n{\"totalScore\": <ganze Zahl>, \"passes\": <true|false>, \"criteria\": [{\"key\": \"<erfuellung|kohaerenz|wortschatz|strukturen>\", \"score\": <ganze Zahl 0-25>, \"justificationDe\": \"…\", \"justificationEn\": \"…\"}, … genau 4, in genau dieser Reihenfolge], \"mistakes\": [{\"turnIndex\": <Zahl>, \"quote\": \"…\", \"suggested\": \"…\", \"kind\": \"<grammar|word-order|vocabulary|spelling|register>\", \"reasonDe\": \"…\", \"reasonEn\": \"…\"}], \"strengths\": [{\"de\": \"…\", \"en\": \"…\"}], \"weaknesses\": [{\"de\": \"…\", \"en\": \"…\"}], \"overallDe\": \"…\", \"overallEn\": \"…\"}\n\nRUBRIK: Goethe-Zertifikat B2 · Sprechen Teil 2 (adaptiert, ohne Aussprache)\nMaximalpunktzahl: 100 · Bestehensgrenze: 60\n\nKriterien (in dieser Reihenfolge, jedes mit max. Punktzahl):\n- key=\"erfuellung\" — Erfüllung / Interaktion (max 25 Punkte):\n    Vertritt die Person eine eigene Position zum Thema und begründet sie? Reagiert sie auf die Argumente des Gesprächspartners (zustimmen, widersprechen, abwägen) statt Monologe zu halten? Hält sie die Diskussion aktiv am Laufen, z. B. durch Nachfragen? Sehr kurze, einsilbige Beiträge mindern die Punktzahl in diesem Kriterium.\n- key=\"kohaerenz\" — Kohärenz & Flüssigkeit (max 25 Punkte):\n    Sind die Beiträge in sich logisch aufgebaut und an den Gesprächsverlauf angeschlossen? Werden Konnektoren und Verweismittel (deshalb, trotzdem, einerseits/andererseits, dabei, darauf) passend eingesetzt? Für die schriftliche Form angepasst: Flüssigkeit heißt hier natürlicher Gesprächsfluss, nicht Sprechtempo.\n- key=\"wortschatz\" — Wortschatz (max 25 Punkte):\n    Ist der Wortschatz für B2 angemessen breit und präzise? Werden Redemittel der Diskussion (Zustimmung, Widerspruch, Abwägung) variantenreich verwendet? Führen Wortschatzlücken zu Umschreibungen oder Brüchen?\n- key=\"strukturen\" — Strukturen (max 25 Punkte):\n    Wie korrekt und variantenreich sind die grammatischen Strukturen (Nebensätze, Konjunktiv II für Vorschläge, Passiv, Verbstellung)? Wie häufig und wie schwerwiegend sind Fehler, und beeinträchtigen sie das Verständnis?\n\nHinweis: Adaptierte Bewertung für getippte Diskussionsübungen: Aussprache wird nicht bewertet; vier Kriterien zu je 25 Punkten, Bestehensgrenze 60. Prädikate wie im Goethe-Zeugnis: 90+ sehr gut, 80+ gut, 70+ befriedigend, 60+ ausreichend, darunter nicht bestanden."
const BASELINE_TYPED_USER = "THEMA: „Tempolimit\" — Brauchen wir ein generelles Tempolimit auf Autobahnen?\nPosition des PARTNERS: dagegen.\n\nGESPRÄCH:\nPARTNER: Ich bin gegen ein Tempolimit.\nL0: Ich denke das ein Tempolimit gut ist.\nPARTNER: Warum denn?\nL1: Weil es macht die Straßen sicherer.\n\nACHTUNG: Die Diskussion wurde früh beendet — es gibt wenig Material. Bewerte trotzdem nach der Rubrik, aber sei bei \"erfuellung\" entsprechend streng."

function validRaw() {
  return {
    totalScore: 74,
    passes: true,
    criteria: [
      { key: 'erfuellung', score: 20, justificationDe: 'Position klar vertreten.', justificationEn: 'Clear position.' },
      { key: 'kohaerenz', score: 18, justificationDe: 'Meist verbunden.', justificationEn: 'Mostly connected.' },
      { key: 'wortschatz', score: 19, justificationDe: 'Angemessen.', justificationEn: 'Adequate.' },
      { key: 'strukturen', score: 17, justificationDe: 'Verbstellung fehlerhaft.', justificationEn: 'Word-order errors.' }
    ],
    mistakes: [
      {
        turnIndex: 0, quote: 'das ein Tempolimit gut ist', suggested: 'dass ein Tempolimit gut ist',
        kind: 'spelling', reasonDe: '„dass" als Konjunktion.', reasonEn: '"dass" is the conjunction.'
      },
      {
        turnIndex: 1, quote: 'Weil es macht die Straßen sicherer', suggested: 'Weil es die Straßen sicherer macht',
        kind: 'word-order', reasonDe: 'Nebensatz: Verb ans Ende.', reasonEn: 'Subordinate clause: verb final.'
      }
    ],
    strengths: [{ de: 'Reagiert auf den Partner.', en: 'Responds to the partner.' }],
    weaknesses: [{ de: 'Nebensatz-Wortstellung.', en: 'Subordinate word order.' }],
    overallDe: 'Solide, aber Strukturen üben.', overallEn: 'Solid; practice structures.'
  }
}

describe('validateSprechenGrade', () => {
  it('accepts a valid result, re-anchors quotes, computes the Prädikat locally', () => {
    const r = validateSprechenGrade(validRaw(), disc())
    expect(r).not.toBeNull()
    expect(r!.totalScore).toBe(74)
    expect(r!.praedikat).toBe('befriedigend')
    expect(r!.mistakes.length).toBe(2)
    expect(r!.mistakes[0].spanStart).toBeGreaterThanOrEqual(0)
    // span indexes into the LEARNER turn text
    const learnerText = 'Ich denke das ein Tempolimit gut ist.'
    expect(learnerText.slice(r!.mistakes[0].spanStart, r!.mistakes[0].spanEnd)).toBe('das ein Tempolimit gut ist')
  })

  it('derives totalScore from the criteria when the model total disagrees', () => {
    const raw = validRaw()
    raw.totalScore = 99                       // model arithmetic slip — ignored
    const r = validateSprechenGrade(raw, disc())
    expect(r).not.toBeNull()
    expect(r!.totalScore).toBe(74)            // 20+18+19+17
  })

  it('derives passes from the threshold, ignoring the model flag', () => {
    const raw = validRaw()
    raw.passes = false
    const r = validateSprechenGrade(raw, disc())
    expect(r).not.toBeNull()
    expect(r!.passes).toBe(true)
  })

  it('accepts criteria in any order (matched by key)', () => {
    const raw = validRaw()
    raw.criteria.reverse()
    const r = validateSprechenGrade(raw, disc())
    expect(r).not.toBeNull()
    expect(r!.criteria.map(c => c.key)).toEqual(['erfuellung', 'kohaerenz', 'wortschatz', 'strukturen'])
    expect(r!.totalScore).toBe(74)
  })

  it('rounds fractional criterion scores to the nearest integer', () => {
    const raw = validRaw()
    raw.criteria[0].score = 19.6
    const r = validateSprechenGrade(raw, disc())
    expect(r).not.toBeNull()
    expect(r!.criteria[0].score).toBe(20)
    expect(r!.totalScore).toBe(74)            // 20+18+19+17
  })

  it('rejects when a rubric key is missing', () => {
    const raw = validRaw()
    raw.criteria[0].key = 'aussprache'
    expect(validateSprechenGrade(raw, disc())).toBeNull()
  })

  it('rejects out-of-range criterion scores', () => {
    const raw = validRaw()
    raw.criteria[0].score = 26
    expect(validateSprechenGrade(raw, disc())).toBeNull()
  })

  it('silently drops mistakes whose quote does not re-anchor', () => {
    const raw = validRaw()
    raw.mistakes[0].quote = 'text der nie geschrieben wurde'
    const r = validateSprechenGrade(raw, disc())
    expect(r).not.toBeNull()
    expect(r!.mistakes.length).toBe(1)
  })

  it('silently drops mistakes with bad kind or out-of-range turnIndex', () => {
    const raw = validRaw()
    ;(raw.mistakes[0] as { kind: string }).kind = 'pronunciation'
    raw.mistakes[1].turnIndex = 7
    const r = validateSprechenGrade(raw, disc())
    expect(r).not.toBeNull()
    expect(r!.mistakes.length).toBe(0)
  })
})

describe('buildSprechenGraderPrompt', () => {
  it('labels learner turns L0/L1 and embeds the rubric', () => {
    const { system, user } = buildSprechenGraderPrompt(disc())
    expect(user).toContain('L0: Ich denke das ein Tempolimit gut ist.')
    expect(user).toContain('L1: Weil es macht die Straßen sicherer.')
    expect(user).toContain('PARTNER: Warum denn?')
    expect(system).toContain('Erfüllung / Interaktion')
    expect(system).toContain('25')
  })

  it('adds the limited-material caveat below 3 learner turns', () => {
    const { user } = buildSprechenGraderPrompt(disc())
    expect(user).toContain('wenig Material')
  })

  it('produces a byte-identical prompt for typed discussions (regression against the pre-spoken-feature output)', () => {
    const { system, user } = buildSprechenGraderPrompt(disc())
    expect(system).toBe(BASELINE_TYPED_SYSTEM)
    expect(user).toBe(BASELINE_TYPED_USER)
  })

  it('typed prompt contains neither SPRECHDATEN nor the spoken kohaerenz descriptor', () => {
    const { system, user } = buildSprechenGraderPrompt(disc())
    expect(user).not.toContain('SPRECHDATEN')
    expect(system).not.toContain('SPRECHDATEN')
    expect(system).not.toContain('lähmendes Zögern')   // spoken-only descriptor marker
    expect(system).toContain('nicht Sprechtempo')      // typed hedge preserved verbatim
  })

  it('spoken prompt contains SPRECHDATEN and the spoken kohaerenz descriptor, and drops the typed hedge', () => {
    const { system, user } = buildSprechenGraderPrompt(spokenDisc())
    expect(user).toContain('SPRECHDATEN')
    expect(system).toContain('lähmendes Zögern')       // spoken descriptor marker
    expect(system).not.toContain('nicht Sprechtempo')  // typed hedge dropped for spoken runs
    expect(user).toContain('AUSSCHLIESSLICH die Vortragsweise (Delivery)')
    expect(user).toContain('NICHT beeinflussen')
  })

  // FINDING 4 — the grader must not be told a spoken run is typed, and must
  // never be invited to tag a speech-recognizer's spelling as the learner's
  // mistake (the recognizer chose the spelling, not the learner).
  it('spoken system prompt says the discussion was spoken/transcribed, instructs never assigning "spelling", and never claims a typed exercise', () => {
    const { system } = buildSprechenGraderPrompt(spokenDisc())
    expect(system).not.toContain('getippter Form')
    expect(system).toContain('gesprochen')
    expect(system).toContain('transkribiert')
    expect(system).toContain('NIEMALS die Kategorie "spelling"')
  })

  it('typed system prompt keeps the original persona sentence and carries no spoken-only spelling caveat', () => {
    const { system } = buildSprechenGraderPrompt(disc())
    expect(system).toContain('getippter Form')
    expect(system).not.toContain('NIEMALS die Kategorie "spelling"')
  })

  it('computes per-turn WPM correctly for a hand-built spoken discussion', () => {
    const { user } = buildSprechenGraderPrompt(spokenDisc())
    // L0: 40 words / 30000ms (0.5 min) = 80 WPM exactly; reaction 1200ms = 1.2s; 0 pauses
    expect(user).toContain('L0: 80 Wörter/Min · Reaktionszeit 1.2 s · 0 lange(n) Pause(n)')
    // L1: 24 words / 20000ms (1/3 min) = 72 WPM exactly; reaction 800ms = 0.8s; 1 pause
    expect(user).toContain('L1: 72 Wörter/Min · Reaktionszeit 0.8 s · 1 lange(n) Pause(n)')
  })

  it('the SPRECHDATEN aggregate line matches summarizeFluency(d.turns)', () => {
    const d = spokenDisc()
    const summary = summarizeFluency(d.turns)
    expect(summary).not.toBeNull()
    const { user } = buildSprechenGraderPrompt(d)
    const expectedLine =
      `Aggregiert über ${summary!.turns} Redebeitrag/-träge: ${summary!.wordsPerMinute} Wörter/Min · ` +
      `durchschnittliche Reaktionszeit ${(summary!.avgReactionMs / 1000).toFixed(1)} s · ` +
      `${summary!.pauses} lange(n) Pause(n) insgesamt.`
    expect(user).toContain(expectedLine)
    // Hand-verifiable numbers behind the aggregate: 64 words over 50000ms of
    // speech (0.8333… min) → 76.8 → rounds to 77; reaction avg (1200+800)/2.
    expect(summary!.wordsPerMinute).toBe(77)
    expect(summary!.avgReactionMs).toBe(1000)
    expect(summary!.pauses).toBe(1)
    expect(summary!.turns).toBe(2)
  })

  it('degrades gracefully when spoken learner turns carry no speech data (no throw, no NaN)', () => {
    const d = spokenDiscNoSpeechData()
    let result: { system: string; user: string } | undefined
    expect(() => { result = buildSprechenGraderPrompt(d) }).not.toThrow()
    const { user } = result!
    expect(user).toContain('SPRECHDATEN')
    expect(user).toContain('L0: keine Sprechdaten erfasst.')
    expect(user).toContain('L1: keine Sprechdaten erfasst.')
    expect(user).toContain('Aggregiert: keine Sprechdaten für diese Sitzung verfügbar.')
    expect(user).not.toContain('NaN')
  })
})

describe('gradeDiscussion', () => {
  it('retries on invalid payload then succeeds', async () => {
    let call = 0
    const client = {
      models: {
        generateContent: async () => ({
          text: call++ === 0 ? 'garbage' : JSON.stringify(validRaw())
        })
      }
    }
    const r = await gradeDiscussion(client, 'test-model', disc())
    expect(r.totalScore).toBe(74)
    expect(r.modelUsed).toBe('test-model')
  })

  it('throws SprechenGraderError after exhausting retries', async () => {
    const client = { models: { generateContent: async () => ({ text: 'garbage' }) } }
    await expect(gradeDiscussion(client, 'test-model', disc())).rejects.toThrow(/attempts/)
  })
})
