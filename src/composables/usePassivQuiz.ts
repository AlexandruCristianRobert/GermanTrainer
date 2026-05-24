import {
  PASSIV_DIFFICULTIES,
  PASSIV_DIFFICULTY_BLURB,
  PASSIV_GENERATOR_SCHEMA,
  TRANSFORMATION_TYPES,
  type PassivDifficulty,
  type PassivQuestion,
  type TransformationType
} from '../data/passiv'

const TYPE_SET = new Set<string>(TRANSFORMATION_TYPES)

// Weak heuristic per target type. The LLM judge is source of truth for user
// submissions; these checks only reject obvious generator hallucinations.
function looksLike(target: TransformationType, ref: string): boolean {
  const r = ref.toLowerCase()
  switch (target) {
    case 'vorgangspassiv':
      // Some form of werden + a Partizip II
      return /\b(wird|wurde|werde|wurden|worden|werden)\b/.test(r) && /(ge\w+t|ge\w+en)\b/.test(r)
    case 'zustandspassiv':
      // Some form of sein + a Partizip II
      return /\b(ist|sind|war|waren)\b/.test(r) && /(ge\w+t|ge\w+en)\b/.test(r)
    case 'sich-lassen':
      return /l(a|ä)ss/.test(r) && /sich/.test(r)
    case 'sein-zu':
      return /\b(ist|sind|war|waren)\b/.test(r) && /\bzu\s+\w+en\b/.test(r)
    case 'bar-adjektiv':
      // -bar or -lich adjective; ist/sind copula optional
      return /\w+(bar|lich)\b/.test(r)
    case 'man-konstruktion':
      return /\bman\b/.test(r)
  }
}

/**
 * Validate one raw generator entry. Returns the entry shape (without id),
 * null on rejection.
 */
export function validatePassivEntry(raw: unknown): Omit<PassivQuestion, 'id'> | null {
  if (!raw || typeof raw !== 'object') return null
  const e = raw as Record<string, unknown>

  // Structural sanity
  if (typeof e.active !== 'string' || e.active.trim().length === 0) return null
  if (typeof e.target !== 'string') return null
  if (!Array.isArray(e.legalTypes) || e.legalTypes.length === 0) return null
  if (typeof e.referenceAnswer !== 'string' || e.referenceAnswer.trim().length === 0) return null
  if (typeof e.rationale !== 'string' || e.rationale.trim().length === 0) return null
  if (typeof e.difficulty !== 'string') return null

  // Enum validity
  if (!TYPE_SET.has(e.target)) return null
  if (!(PASSIV_DIFFICULTIES as readonly string[]).includes(e.difficulty)) return null
  for (const t of e.legalTypes) {
    if (typeof t !== 'string' || !TYPE_SET.has(t)) return null
  }

  // Target must be in legalTypes
  if (!(e.legalTypes as string[]).includes(e.target as string)) return null

  // Heuristic reference shape check
  if (!looksLike(e.target as TransformationType, e.referenceAnswer as string)) return null

  return {
    active: (e.active as string).trim(),
    target: e.target as TransformationType,
    legalTypes: e.legalTypes as TransformationType[],
    referenceAnswer: (e.referenceAnswer as string).trim(),
    rationale: (e.rationale as string).trim(),
    difficulty: e.difficulty as PassivDifficulty
  }
}

export interface GeminiClient {
  models: {
    generateContent: (opts: {
      model: string
      contents: string
      config?: Record<string, unknown>
    }) => Promise<{ text?: string }>
  }
}

export function buildPassivGeneratorPrompt(
  count: number,
  difficulty: PassivDifficulty,
  focusedTypes?: readonly TransformationType[]
): string {
  const focus = focusedTypes && focusedTypes.length > 0 && focusedTypes.length < TRANSFORMATION_TYPES.length
    ? `Bias the chosen "target" toward: ${focusedTypes.join(', ')}.`
    : 'Distribute "target" choices across the six transformation types.'

  return `Generate ${count} active German sentences for a Passiv transformation drill.

DIFFICULTY: ${difficulty}
${PASSIV_DIFFICULTY_BLURB[difficulty]}

REQUIREMENTS for every entry:
- "active" is a single active sentence in German.
- "legalTypes" enumerates every transformation that is grammatically legal
  for this verb. Exclude:
  * "zustandspassiv" for verbs without a resultant state.
  * "bar-adjektiv" for verbs that don't form a -bar/-lich adjective.
  * "sein-zu" when the modal nuance is unnatural.
  * All passive forms except "man-konstruktion" for intransitive verbs.
- "target" MUST be one of the entries in "legalTypes".
- "referenceAnswer" is the canonical rewrite of "active" into the "target"
  transformation. Examples:
  * vorgangspassiv:  "Das Gerät wird repariert."
  * zustandspassiv:  "Das Gerät ist repariert."
  * sich-lassen:     "Das Gerät lässt sich reparieren."
  * sein-zu:         "Das Gerät ist zu reparieren."
  * bar-adjektiv:    "Das Gerät ist reparierbar."
  * man-konstruktion: "Man repariert das Gerät."
- "rationale" is a short English explanation (one sentence) of WHY this
  transformation is appropriate and how the form is built.
- "difficulty" is exactly "${difficulty}".
- ${focus}
- Vary verbs across the batch.

Return ONLY valid JSON matching the schema. No prose. No markdown fences.`
}

export interface PassivGenerateOptions {
  model: string
  count: number
  difficulty: PassivDifficulty
  focusedTypes?: readonly TransformationType[]
  maxRetries?: number
}

export interface PassivGenerateResult {
  entries: PassivQuestion[]
  rejected: number
  attempts: number
}

export async function generatePassivQuestions(
  client: GeminiClient,
  opts: PassivGenerateOptions
): Promise<PassivGenerateResult> {
  const maxRetries = opts.maxRetries ?? 2
  let totalRejected = 0
  let attempts = 0
  const accepted: PassivQuestion[] = []

  while (accepted.length < opts.count && attempts <= maxRetries) {
    attempts++
    const remaining = opts.count - accepted.length
    const prompt = buildPassivGeneratorPrompt(remaining, opts.difficulty, opts.focusedTypes)

    const response = await client.models.generateContent({
      model: opts.model,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: PASSIV_GENERATOR_SCHEMA as unknown as Record<string, unknown>,
        temperature: 0.4
      }
    })

    const text = response.text ?? ''
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      continue
    }
    if (!parsed || typeof parsed !== 'object') continue
    const entries = (parsed as { entries?: unknown[] }).entries
    if (!Array.isArray(entries)) continue

    for (const raw of entries) {
      const v = validatePassivEntry(raw)
      if (v === null) {
        totalRejected++
        continue
      }
      accepted.push({
        id: `passiv-${Date.now()}-${accepted.length}`,
        ...v
      })
      if (accepted.length >= opts.count) break
    }
  }

  return { entries: accepted, rejected: totalRejected, attempts }
}
