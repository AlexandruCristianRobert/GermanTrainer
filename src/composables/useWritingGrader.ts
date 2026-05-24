import {
  BAND_ESTIMATES,
  type BandEstimate,
  type GradeCriterion,
  type RubricDescriptor,
  type RubricSystem,
  type WritingGradeResult
} from '../data/rubrics'

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
