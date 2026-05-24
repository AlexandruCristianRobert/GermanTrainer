import {
  BAND_ESTIMATES,
  GRADE_RESPONSE_SCHEMA,
  TASK_TYPE_HINT,
  type BandEstimate,
  type GradeCriterion,
  type RubricDescriptor,
  type RubricSystem,
  type WritingGradeResult
} from '../data/rubrics'
import type { WritingPrompt, WritingDraft } from '../data/writingPrompts'

// ── Pure validator ────────────────────────────────────────────────

const VERDICTS: readonly RubricSystem[] = ['goethe-c1', 'telc-c1']
const KINDS = ['fix', 'upgrade', 'comment'] as const

function countParagraphs(text: string): number {
  // Paragraphs are separated by a blank line (one or more empty lines between
  // non-empty lines). A draft with no blank lines is still one paragraph.
  const blocks = text.split(/\n\s*\n+/).map(s => s.trim()).filter(s => s.length > 0)
  return Math.max(1, blocks.length)
}

function reAnchor(quote: string, draft: string): { spanStart: number; spanEnd: number } {
  if (quote.length === 0) return { spanStart: -1, spanEnd: -1 }
  const exact = draft.indexOf(quote)
  if (exact >= 0) return { spanStart: exact, spanEnd: exact + quote.length }
  const lower = draft.toLowerCase().indexOf(quote.toLowerCase())
  if (lower >= 0) return { spanStart: lower, spanEnd: lower + quote.length }
  return { spanStart: -1, spanEnd: -1 }
}

export function validateGradeResult(
  raw: unknown,
  rubric: RubricDescriptor,
  draftText: string
): WritingGradeResult | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>

  // System + enum checks
  if (typeof r.rubric !== 'string' || !VERDICTS.includes(r.rubric as RubricSystem)) return null
  if (r.rubric !== rubric.system) return null
  if (typeof r.bandEstimate !== 'string' || !BAND_ESTIMATES.includes(r.bandEstimate as BandEstimate)) return null
  if (typeof r.totalScore !== 'number') return null
  if (typeof r.passes !== 'boolean') return null
  if (typeof r.overallDe !== 'string' || typeof r.overallEn !== 'string') return null
  if (!Array.isArray(r.criteria)) return null
  if (!Array.isArray(r.inlineNotes)) return null
  if (!Array.isArray(r.paragraphFeedback)) return null

  // Criteria — must match rubric order and each score in range
  if (r.criteria.length !== rubric.criteria.length) return null
  const validatedCriteria: GradeCriterion[] = []
  let sum = 0
  for (let i = 0; i < r.criteria.length; i++) {
    const expected = rubric.criteria[i]
    const c = r.criteria[i] as Record<string, unknown>
    if (typeof c.key !== 'string' || c.key !== expected.key) return null
    if (typeof c.labelDe !== 'string') return null
    if (typeof c.maxPoints !== 'number' || c.maxPoints !== expected.maxPoints) return null
    if (typeof c.score !== 'number') return null
    if (c.score < 0 || c.score > expected.maxPoints) return null
    if (typeof c.strengthsDe !== 'string') return null
    if (typeof c.weaknessesDe !== 'string') return null
    if (!Array.isArray(c.evidence)) return null

    const reanchoredEvidence = (c.evidence as Array<Record<string, unknown>>).map(ev => {
      if (typeof ev.quote !== 'string') return null
      if (typeof ev.commentDe !== 'string') return null
      const anchored = reAnchor(ev.quote, draftText)
      return {
        quote: ev.quote,
        spanStart: anchored.spanStart,
        spanEnd: anchored.spanEnd,
        commentDe: ev.commentDe
      }
    }).filter((x): x is NonNullable<typeof x> => x !== null)

    sum += c.score
    validatedCriteria.push({
      key: c.key as string,
      labelDe: c.labelDe as string,
      maxPoints: c.maxPoints as number,
      score: c.score as number,
      strengthsDe: c.strengthsDe as string,
      weaknessesDe: c.weaknessesDe as string,
      evidence: reanchoredEvidence
    })
  }

  // totalScore must equal the sum of criterion scores (strict, no tolerance).
  if (sum !== r.totalScore) return null

  // passes must agree with totalScore vs rubric.passingScore.
  if ((r.totalScore as number) >= rubric.passingScore !== r.passes) return null

  // Inline notes — drop any whose `before` doesn't match the span in the draft.
  const validatedInlineNotes = (r.inlineNotes as Array<Record<string, unknown>>).flatMap(n => {
    if (typeof n.spanStart !== 'number' || typeof n.spanEnd !== 'number') return []
    if (typeof n.kind !== 'string' || !(KINDS as readonly string[]).includes(n.kind)) return []
    if (typeof n.before !== 'string') return []
    if (typeof n.reasonDe !== 'string') return []
    if (n.suggested !== undefined && typeof n.suggested !== 'string') return []
    const start = n.spanStart as number
    const end = n.spanEnd as number
    if (start < 0 || end > draftText.length || start >= end) return []
    if (draftText.slice(start, end) !== n.before) return []
    return [{
      spanStart: start,
      spanEnd: end,
      kind: n.kind as 'fix' | 'upgrade' | 'comment',
      before: n.before as string,
      suggested: n.suggested as string | undefined,
      reasonDe: n.reasonDe as string
    }]
  })

  // Paragraph feedback — length cap.
  const draftParagraphs = countParagraphs(draftText)
  if (r.paragraphFeedback.length > draftParagraphs) return null
  const validatedParagraphFeedback = (r.paragraphFeedback as Array<Record<string, unknown>>).map(p => {
    if (typeof p.paragraphIndex !== 'number') return null
    if (typeof p.summaryDe !== 'string') return null
    return {
      paragraphIndex: p.paragraphIndex as number,
      summaryDe: p.summaryDe as string,
      upgradedText: typeof p.upgradedText === 'string' ? (p.upgradedText as string) : undefined,
      upgradedAt: typeof p.upgradedAt === 'number' ? (p.upgradedAt as number) : undefined
    }
  }).filter((x): x is NonNullable<typeof x> => x !== null)

  return {
    rubric: r.rubric as RubricSystem,
    totalScore: r.totalScore as number,
    bandEstimate: r.bandEstimate as BandEstimate,
    passes: r.passes as boolean,
    criteria: validatedCriteria,
    inlineNotes: validatedInlineNotes,
    paragraphFeedback: validatedParagraphFeedback,
    overallDe: r.overallDe as string,
    overallEn: r.overallEn as string,
    generatedAt: typeof r.generatedAt === 'number' ? (r.generatedAt as number) : Date.now(),
    modelUsed: typeof r.modelUsed === 'string' ? (r.modelUsed as string) : 'unknown'
  }
}

// ── Gemini client shape (matches useKonjunktivQuiz.GeminiClient) ──

export interface GeminiClient {
  models: {
    generateContent: (opts: {
      model: string
      contents: string
      config?: Record<string, unknown>
    }) => Promise<{ text?: string }>
  }
}

export class GraderError extends Error {
  constructor(message: string, public readonly attempts: number) {
    super(message)
    this.name = 'GraderError'
  }
}

// ── Prompt builder ────────────────────────────────────────────────

function rubricBlock(rubric: RubricDescriptor): string {
  const lines: string[] = []
  lines.push(`RUBRIC: ${rubric.labelDe} (System: ${rubric.system})`)
  lines.push(`Maximalpunktzahl: ${rubric.totalMax} · Bestehensgrenze: ${rubric.passingScore}`)
  lines.push('')
  lines.push('Kriterien (in dieser Reihenfolge, jedes mit max. Punktzahl):')
  for (const c of rubric.criteria) {
    lines.push(`- key="${c.key}" — ${c.labelDe} (max ${c.maxPoints} Punkte):`)
    lines.push(`    ${c.descriptorDe}`)
  }
  lines.push('')
  lines.push(`Hinweis: ${rubric.notes}`)
  return lines.join('\n')
}

export function buildGraderPrompt(
  prompt: WritingPrompt,
  draft: WritingDraft,
  rubric: RubricDescriptor
): { system: string; user: string } {
  const system =
    'Du bist eine strenge, kalibrierte Prüferin für deutsche schriftliche ' +
    'Abschlussprüfungen auf Niveau C1. Du benotest den Text der Studentin/des ' +
    'Studenten ausschließlich nach der unten angegebenen Rubrik. Deine Antwort ' +
    'ist ausschließlich JSON gemäß dem responseSchema — kein Prosa-Vorspann, ' +
    'keine Markdown-Fences. Für jedes Kriterium gibst du eine ganzzahlige ' +
    'Punktzahl im erlaubten Bereich, sowie kurze Stärken- und Schwächen-' +
    'Begründungen auf Deutsch. Belege (EvidenceQuote) zitierst du WÖRTLICH aus ' +
    'dem eingereichten Text und gibst die korrekten Zeichenpositionen (0-' +
    'indiziert, Halb-Offen) an. Anschließend formulierst du ein holistisches ' +
    'Gesamturteil auf Deutsch (3–5 Sätze) und auf Englisch (2–3 Sätze).\n\n' +
    rubricBlock(rubric)

  const overWords = draft.wordCount > prompt.targetWords.max
    ? `\n\nACHTUNG: Der Text überschreitet die obere Zielmarke (${prompt.targetWords.max} Wörter). Das soll bei "erfuellung" / "aufgabengerechtigkeit" zu Punktabzug führen.`
    : draft.wordCount < prompt.targetWords.min
    ? `\n\nACHTUNG: Der Text unterschreitet die untere Zielmarke (${prompt.targetWords.min} Wörter). Das soll bei "erfuellung" / "aufgabengerechtigkeit" zu Punktabzug führen.`
    : ''

  const user =
    `AUFGABENTYP: ${prompt.type}\n${TASK_TYPE_HINT[prompt.type]}\n\n` +
    `AUFGABENSTELLUNG:\n${prompt.promptText}\n\n` +
    (prompt.promptContext ? `KONTEXT:\n${prompt.promptContext}\n\n` : '') +
    `ZIELUMFANG: ${prompt.targetWords.min}–${prompt.targetWords.max} Wörter (Ziel: ${prompt.targetWords.target}).\n` +
    `EINGEREICHTER TEXT (Wortzahl ${draft.wordCount}):\n${draft.text}` +
    overWords

  return { system, user }
}

// ── Grader call with one retry ────────────────────────────────────

export async function gradeDraft(
  client: GeminiClient,
  model: string,
  prompt: WritingPrompt,
  draft: WritingDraft,
  rubric: RubricDescriptor
): Promise<WritingGradeResult> {
  const { system, user } = buildGraderPrompt(prompt, draft, rubric)
  const maxRetries = 1
  let attempts = 0
  let lastError: string = 'no attempts'

  while (attempts <= maxRetries) {
    attempts++
    try {
      const response = await client.models.generateContent({
        model,
        contents: user,
        config: {
          systemInstruction: system,
          responseMimeType: 'application/json',
          responseSchema: GRADE_RESPONSE_SCHEMA as unknown as Record<string, unknown>,
          temperature: 0
        }
      })
      const text = response.text ?? ''
      let parsed: unknown
      try {
        parsed = JSON.parse(text)
      } catch {
        lastError = 'malformed JSON'
        continue
      }
      const validated = validateGradeResult(parsed, rubric, draft.text)
      if (validated === null) {
        lastError = 'validation failed'
        continue
      }
      validated.generatedAt = Date.now()
      validated.modelUsed = model
      return validated
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err)
      continue
    }
  }

  throw new GraderError(`Grader exhausted ${attempts} attempts. Last error: ${lastError}`, attempts)
}
