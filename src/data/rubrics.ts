// Goethe-Zertifikat C1 (modular, effective 1 Jan 2024) and telc Deutsch C1
// writing-task rubric descriptors.
//
// The `descriptorDe` text on each criterion is what the grader injects into
// the Gemini system instruction. The strings below are working summaries
// adequate for grading; replace with verbatim text from the official
// Bewertungsbogen PDFs when those are obtained.
//
// References:
//   - Goethe C1 Modellsatz Erwachsene (Feb 2023 modular edition)
//   - telc Deutsch C1 Übungstest 1 — Bewertungsbogen Schreiben

import type { WritingTaskType } from './writingPrompts'
import type { Modality } from './sprechen'

export type RubricSystem = 'goethe-c1' | 'telc-c1'

export type BandEstimate = 'B2' | 'C1-' | 'C1' | 'C1+'

export const BAND_ESTIMATES: BandEstimate[] = ['B2', 'C1-', 'C1', 'C1+']

export interface RubricCriterion {
  key: string                        // 'erfuellung'
  labelDe: string                    // 'Erfüllung'
  labelEn: string                    // 'Task fulfilment'
  maxPoints: number
  descriptorDe: string               // injected into the grader prompt
}

export interface RubricDescriptor {
  system: RubricSystem
  labelDe: string                    // 'Goethe-Zertifikat C1'
  totalMax: number                   // 100
  passingScore: number               // 60
  criteria: RubricCriterion[]
  notes: string                      // grader instruction footer
}

// ── Goethe C1 ────────────────────────────────────────────────────

export const GOETHE_C1: RubricDescriptor = {
  system: 'goethe-c1',
  labelDe: 'Goethe-Zertifikat C1',
  totalMax: 100,
  passingScore: 60,
  criteria: [
    {
      key: 'erfuellung',
      labelDe: 'Erfüllung',
      labelEn: 'Task fulfilment',
      maxPoints: 20,
      descriptorDe:
        'Werden alle Aufgabenpunkte (Sprachfunktionen) inhaltlich angemessen, ' +
        'ausführlich und klar bearbeitet? Wird die geforderte Textsorte mit ihren ' +
        'typischen Merkmalen umgesetzt? Wird der Wortumfang eingehalten?'
    },
    {
      key: 'kohaerenz',
      labelDe: 'Kohärenz',
      labelEn: 'Coherence',
      maxPoints: 20,
      descriptorDe:
        'Ist der Text gut strukturiert und logisch aufgebaut? Werden ' +
        'Konnektoren, Bezüge und Gliederungssignale wirkungsvoll eingesetzt? ' +
        'Folgen die Gedanken einander nachvollziehbar und ohne Brüche?'
    },
    {
      key: 'wortschatz',
      labelDe: 'Wortschatz',
      labelEn: 'Vocabulary',
      maxPoints: 20,
      descriptorDe:
        'Ist der Wortschatz breit, differenziert und situationsgerecht? Werden ' +
        'idiomatische Wendungen und Kollokationen angemessen eingesetzt? Gibt ' +
        'es störende Wiederholungen oder unpassende Registerwahl?'
    },
    {
      key: 'strukturen',
      labelDe: 'Strukturen',
      labelEn: 'Structures',
      maxPoints: 20,
      descriptorDe:
        'Wird ein abwechslungsreiches Spektrum komplexer Strukturen ' +
        '(Nebensätze, Partizipialkonstruktionen, Passiv, Konjunktiv, ' +
        'Nominalisierung) sicher verwendet? Ist die Satzgliedstellung korrekt?'
    },
    {
      key: 'korrektheit',
      labelDe: 'Korrektheit',
      labelEn: 'Correctness',
      maxPoints: 20,
      descriptorDe:
        'Wie häufig und wie schwerwiegend sind Fehler in Grammatik, ' +
        'Rechtschreibung, Zeichensetzung und Wortstellung? Beeinträchtigen ' +
        'sie das Verständnis?'
    }
  ],
  notes:
    'Modular Goethe-Zertifikat C1, gültig seit 1. Januar 2024. Maximale ' +
    'Punktzahl 100; Bestehensgrenze 60.'
}

// ── telc C1 ──────────────────────────────────────────────────────

export const TELC_C1: RubricDescriptor = {
  system: 'telc-c1',
  labelDe: 'telc Deutsch C1',
  totalMax: 100,
  passingScore: 60,
  criteria: [
    {
      key: 'aufgabengerechtigkeit',
      labelDe: 'Aufgabengerechtigkeit',
      labelEn: 'Task appropriateness',
      maxPoints: 25,
      descriptorDe:
        'Werden alle in der Aufgabenstellung geforderten Inhalte vollständig ' +
        'und im richtigen Register behandelt? Ist die Textsorte korrekt ' +
        'gewählt und der Adressatenbezug klar?'
    },
    {
      key: 'aufbau-form',
      labelDe: 'Aufbau und Form',
      labelEn: 'Structure and form',
      maxPoints: 25,
      descriptorDe:
        'Hat der Text einen erkennbaren Aufbau (Einleitung, Hauptteil, ' +
        'Schluss bzw. textsortenspezifische Form)? Werden Absätze sinnvoll ' +
        'gesetzt und Übergänge sprachlich markiert?'
    },
    {
      key: 'kommunikative-gestaltung',
      labelDe: 'Kommunikative Gestaltung',
      labelEn: 'Communicative quality',
      maxPoints: 25,
      descriptorDe:
        'Wirkt der Text auf den Adressaten zielgerichtet und überzeugend? ' +
        'Werden Argumente, Erläuterungen und Beispiele wirkungsvoll verknüpft? ' +
        'Ist der Wortschatz differenziert und idiomatisch?'
    },
    {
      key: 'sprachliche-richtigkeit',
      labelDe: 'Sprachliche Richtigkeit',
      labelEn: 'Linguistic accuracy',
      maxPoints: 25,
      descriptorDe:
        'Wie korrekt sind Grammatik, Syntax, Rechtschreibung und Zeichensetzung? ' +
        'Wie häufig sind kommunikationsstörende Fehler im Vergleich zu ' +
        'akzeptablen Performanzfehlern?'
    }
  ],
  notes:
    'telc Deutsch C1, produktive Schreibaufgabe. Vier Kriterien zu je 25 ' +
    'Punkten, Gesamtsumme 100, Bestehensgrenze 60.'
}

export const RUBRICS: Record<RubricSystem, RubricDescriptor> = {
  'goethe-c1': GOETHE_C1,
  'telc-c1':   TELC_C1
}

// ── Grade-result types ────────────────────────────────────────────
//
// Returned by `useWritingGrader.gradeDraft()` and persisted on
// `WritingDraft.result`. The grader's JSON response is validated against
// these shapes (with retries) before persistence.

export interface EvidenceQuote {
  quote: string                      // verbatim substring of draft.text
  spanStart: number                  // char index into draft.text (-1 if not located)
  spanEnd: number                    // exclusive
  commentDe: string                  // why this quote supports the score
}

export interface GradeCriterion {
  key: string                        // matches RubricCriterion.key
  labelDe: string
  maxPoints: number
  score: number
  strengthsDe: string                // one or two sentences
  weaknessesDe: string               // one or two sentences
  evidence: EvidenceQuote[]
}

export interface InlineNote {
  spanStart: number                  // char index into draft.text
  spanEnd: number                    // exclusive
  kind: 'fix' | 'upgrade' | 'comment'
  before: string                     // text of the span (echoed for sanity check)
  suggested?: string                 // proposed rewrite (always present for 'fix'/'upgrade')
  reasonDe: string                   // 1–2 sentences in German
}

export interface ParagraphFeedback {
  paragraphIndex: number             // 0-based
  summaryDe: string                  // 1–2 sentence note
  upgradedText?: string              // populated lazily by upgradeParagraph()
  upgradedAt?: number
}

export interface WritingGradeResult {
  rubric: RubricSystem
  totalScore: number                 // 0–100
  bandEstimate: BandEstimate
  passes: boolean                    // totalScore >= rubric.passingScore
  criteria: GradeCriterion[]
  inlineNotes: InlineNote[]
  paragraphFeedback: ParagraphFeedback[]
  overallDe: string                  // 3–5 sentences, German, holistic
  overallEn: string                  // 2–3 sentences, English, holistic
  generatedAt: number
  modelUsed: string
}

// ── Task-type guidance injected into the grader prompt ────────────

export const TASK_TYPE_HINT: Record<WritingTaskType, string> = {
  'forumsbeitrag':           'Erwartete Textsorte: Diskussionsbeitrag in einem Online-Forum. Adressatenbezug zu den anderen Forumsbeiträgen. Sprachfunktionen typischerweise: Position vertreten, Vor-/Nachteile abwägen, Beispiele anführen, Schlussfolgerung.',
  'formelle-email':          'Erwartete Textsorte: halbformelle E-Mail. Anrede und Schlussformel angemessen. Klare Bitte/Forderung. Höflichkeit und Sachlichkeit überwiegen vor persönlichem Ton.',
  'argumentativer-aufsatz':  'Erwartete Textsorte: argumentativer Aufsatz. Klare These, Pro- und Contra-Argumentation mit Gewichtung, Schlussfolgerung. Gliederungssignale erwartet.',
  'grafik-beschreibung':     'Erwartete Textsorte: Statistik-Beschreibung und -Interpretation. Datenbasierte Aussagen, Vergleiche zwischen Kategorien, plausible Erklärungsversuche. Konjunktiv I bei Quellenangabe wo passend.',
  'zusammenfassung':         'Erwartete Textsorte: sachliche Zusammenfassung. Indirekte Rede (Konjunktiv I), nominaler Stil. Keine eigene Meinung. Wichtigste Aussagen knapp und neutral wiedergegeben.',
  'stellungnahme':           'Erwartete Textsorte: persönliche Stellungnahme. Klare Positionierung, mindestens zwei begründete Argumente, Eingehen auf einen Gegeneinwand, abschließende Empfehlung.'
}

// ── JSON schema for Gemini responseSchema ─────────────────────────

export const GRADE_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    rubric: { type: 'string', enum: ['goethe-c1', 'telc-c1'] },
    totalScore: { type: 'number' },
    bandEstimate: { type: 'string', enum: BAND_ESTIMATES },
    passes: { type: 'boolean' },
    criteria: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          key: { type: 'string' },
          labelDe: { type: 'string' },
          maxPoints: { type: 'number' },
          score: { type: 'number' },
          strengthsDe: { type: 'string' },
          weaknessesDe: { type: 'string' },
          evidence: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                quote: { type: 'string' },
                spanStart: { type: 'number' },
                spanEnd: { type: 'number' },
                commentDe: { type: 'string' }
              },
              required: ['quote', 'spanStart', 'spanEnd', 'commentDe']
            }
          }
        },
        required: ['key', 'labelDe', 'maxPoints', 'score', 'strengthsDe', 'weaknessesDe', 'evidence']
      }
    },
    inlineNotes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          spanStart: { type: 'number' },
          spanEnd: { type: 'number' },
          kind: { type: 'string', enum: ['fix', 'upgrade', 'comment'] },
          before: { type: 'string' },
          suggested: { type: 'string' },
          reasonDe: { type: 'string' }
        },
        required: ['spanStart', 'spanEnd', 'kind', 'before', 'reasonDe']
      }
    },
    paragraphFeedback: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          paragraphIndex: { type: 'number' },
          summaryDe: { type: 'string' }
        },
        required: ['paragraphIndex', 'summaryDe']
      }
    },
    overallDe: { type: 'string' },
    overallEn: { type: 'string' }
  },
  required: ['rubric', 'totalScore', 'bandEstimate', 'passes', 'criteria', 'inlineNotes', 'paragraphFeedback', 'overallDe', 'overallEn']
} as const

export const PARAGRAPH_UPGRADE_SCHEMA = {
  type: 'object',
  properties: {
    upgradedText: { type: 'string' },
    rationaleDe: { type: 'string' }
  },
  required: ['upgradedText', 'rationaleDe']
} as const

// ── Sprechen B2 · Teil 2 (Diskussion) — adapted ──────────────────
//
// Adapted from the official Goethe B2 Sprechen assessment grid: the official
// grid spans both Teile and includes Aussprache, which a typed Discussion
// cannot assess. Aussprache is EXCLUDED (the result page says so) and the
// remaining four criteria are weighted equally at 25 points each — a
// deliberate, documented adaptation (see the module spec).
// Deliberately NOT part of RubricSystem: the writing grader's validator
// enumerates that union, and this rubric never flows through it.

export interface SprechenCriterion {
  key: 'erfuellung' | 'kohaerenz' | 'wortschatz' | 'strukturen'
  labelDe: string
  labelEn: string
  maxPoints: number
  descriptorDe: string
  // Spoken-modality variant of descriptorDe (Requirement: real speaking-rate
  // evidence). Only `kohaerenz` differs: the typed descriptor hedges fluency
  // as "nicht Sprechtempo" because typed turns have no tempo; spoken runs
  // capture real timing data, so the hedge is dropped and tempo, hesitation
  // and pausing become explicitly in scope. Absent on the other criteria —
  // `sprechenDescriptor()` falls back to descriptorDe for those.
  descriptorSpokenDe?: string
}

export interface SprechenRubric {
  labelDe: string
  totalMax: number
  passingScore: number
  criteria: SprechenCriterion[]
  notes: string
}

export const SPRECHEN_B2_TEIL2: SprechenRubric = {
  labelDe: 'Goethe-Zertifikat B2 · Sprechen Teil 2 (adaptiert, ohne Aussprache)',
  totalMax: 100,
  passingScore: 60,
  criteria: [
    {
      key: 'erfuellung',
      labelDe: 'Erfüllung / Interaktion',
      labelEn: 'Task fulfilment / interaction',
      maxPoints: 25,
      descriptorDe:
        'Vertritt die Person eine eigene Position zum Thema und begründet sie? ' +
        'Reagiert sie auf die Argumente des Gesprächspartners (zustimmen, ' +
        'widersprechen, abwägen) statt Monologe zu halten? Hält sie die ' +
        'Diskussion aktiv am Laufen, z. B. durch Nachfragen? Sehr kurze, ' +
        'einsilbige Beiträge mindern die Punktzahl in diesem Kriterium.'
    },
    {
      key: 'kohaerenz',
      labelDe: 'Kohärenz & Flüssigkeit',
      labelEn: 'Coherence & flow',
      maxPoints: 25,
      descriptorDe:
        'Sind die Beiträge in sich logisch aufgebaut und an den Gesprächsverlauf ' +
        'angeschlossen? Werden Konnektoren und Verweismittel (deshalb, trotzdem, ' +
        'einerseits/andererseits, dabei, darauf) passend eingesetzt? Für die ' +
        'schriftliche Form angepasst: Flüssigkeit heißt hier natürlicher ' +
        'Gesprächsfluss, nicht Sprechtempo.',
      descriptorSpokenDe:
        'Sind die Beiträge in sich logisch aufgebaut und an den Gesprächsverlauf ' +
        'angeschlossen? Werden Konnektoren und Verweismittel (deshalb, trotzdem, ' +
        'einerseits/andererseits, dabei, darauf) passend eingesetzt? Da dies eine ' +
        'gesprochene Übung ist, gehört hier auch das tatsächliche Sprechtempo zur ' +
        'Bewertung: Spricht die Person in einem natürlichen Tempo, ohne lähmendes ' +
        'Zögern oder auffällig häufige Pausen? Nutze dafür die mitgelieferten ' +
        'SPRECHDATEN (Wörter pro Minute, Reaktionszeit, Anzahl langer Pausen).'
    },
    {
      key: 'wortschatz',
      labelDe: 'Wortschatz',
      labelEn: 'Vocabulary',
      maxPoints: 25,
      descriptorDe:
        'Ist der Wortschatz für B2 angemessen breit und präzise? Werden ' +
        'Redemittel der Diskussion (Zustimmung, Widerspruch, Abwägung) ' +
        'variantenreich verwendet? Führen Wortschatzlücken zu Umschreibungen ' +
        'oder Brüchen?'
    },
    {
      key: 'strukturen',
      labelDe: 'Strukturen',
      labelEn: 'Structures',
      maxPoints: 25,
      descriptorDe:
        'Wie korrekt und variantenreich sind die grammatischen Strukturen ' +
        '(Nebensätze, Konjunktiv II für Vorschläge, Passiv, Verbstellung)? ' +
        'Wie häufig und wie schwerwiegend sind Fehler, und beeinträchtigen ' +
        'sie das Verständnis?'
    }
  ],
  notes:
    'Adaptierte Bewertung für getippte Diskussionsübungen: Aussprache wird ' +
    'nicht bewertet; vier Kriterien zu je 25 Punkten, Bestehensgrenze 60. ' +
    'Prädikate wie im Goethe-Zeugnis: 90+ sehr gut, 80+ gut, 70+ befriedigend, ' +
    '60+ ausreichend, darunter nicht bestanden.'
}

/**
 * Resolves the modality-appropriate descriptor for a Sprechen criterion.
 * Typed runs (and any criterion without a spoken variant) get descriptorDe
 * unchanged; spoken runs get descriptorSpokenDe where one is defined. The
 * rubric's shape (keys, order, points) never changes between modalities —
 * only this one criterion's wording does, so typed and spoken scores stay
 * directly comparable on one 100-point scale.
 */
export function sprechenDescriptor(c: SprechenCriterion, modality: Modality): string {
  return modality === 'spoken' && c.descriptorSpokenDe ? c.descriptorSpokenDe : c.descriptorDe
}

export type Praedikat = 'sehr gut' | 'gut' | 'befriedigend' | 'ausreichend' | 'nicht bestanden'

export function praedikat(score: number): Praedikat {
  if (score >= 90) return 'sehr gut'
  if (score >= 80) return 'gut'
  if (score >= 70) return 'befriedigend'
  if (score >= 60) return 'ausreichend'
  return 'nicht bestanden'
}
