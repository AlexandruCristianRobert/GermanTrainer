import {
  KI_DIFFICULTIES,
  KI_DIFFICULTY_BLURB,
  KI_GENERATOR_SCHEMA,
  KI_TOPICS,
  type KiDifficulty,
  type KiQuestion,
  type KiTopic
} from '../data/konjunktiv'

const KI_MOODS = ['K1', 'K2-fallback'] as const

const GERMAN_QUOTE_PAIRS: Array<[string, string]> = [
  ['„', '"'],
  ['«', '»']
]

/**
 * Validate one raw generator entry. Returns the entry shape (without id)
 * if valid, null otherwise.
 *
 * Checks: structural sanity → quote formatting → reporting clause shape
 * → reference-answer consistency → enum validity.
 */
export function validateKiEntry(raw: unknown): Omit<KiQuestion, 'id'> | null {
  if (!raw || typeof raw !== 'object') return null
  const e = raw as Record<string, unknown>

  // 1. Structural sanity
  if (typeof e.source !== 'string' || e.source.length === 0) return null
  if (typeof e.reportingClause !== 'string' || e.reportingClause.length === 0) return null
  if (typeof e.referenceAnswer !== 'string' || e.referenceAnswer.length === 0) return null
  if (typeof e.expectedMood !== 'string') return null
  if (typeof e.rationale !== 'string' || e.rationale.trim().length === 0) return null
  if (typeof e.difficulty !== 'string') return null

  // 2. Quote formatting — must contain a colon AND a matched German quote pair.
  if (!e.source.includes(':')) return null
  const hasGermanQuotes = GERMAN_QUOTE_PAIRS.some(
    ([open, close]) => (e.source as string).includes(open) && (e.source as string).includes(close)
  )
  if (!hasGermanQuotes) return null

  // 3. Reporting clause shape — ends with ", " so the user's typed continuation
  //    concatenates cleanly into a full sentence.
  if (!(e.reportingClause as string).endsWith(', ')) return null

  // 4. Reference consistency — referenceAnswer must start with the reporting clause.
  if (!(e.referenceAnswer as string).startsWith(e.reportingClause as string)) return null

  // 5. Enum validity
  if (!(KI_MOODS as readonly string[]).includes(e.expectedMood)) return null
  if (!(KI_DIFFICULTIES as readonly string[]).includes(e.difficulty)) return null

  return {
    source: e.source as string,
    reportingClause: e.reportingClause as string,
    referenceAnswer: e.referenceAnswer as string,
    expectedMood: e.expectedMood as 'K1' | 'K2-fallback',
    rationale: e.rationale as string,
    difficulty: e.difficulty as KiDifficulty
  }
}

// ── Gemini client shape (matches useDeclensionAI.GeminiClient) ──

export interface GeminiClient {
  models: {
    generateContent: (opts: {
      model: string
      contents: string
      config?: Record<string, unknown>
    }) => Promise<{ text?: string }>
  }
}

// ── Prompt builder ──────────────────────────────────────────────

export function buildKiGeneratorPrompt(
  count: number,
  difficulty: KiDifficulty,
  topics?: readonly KiTopic[]
): string {
  const topicLine =
    topics && topics.length > 0 && topics.length < KI_TOPICS.length
      ? `Bias topics toward: ${topics.join(', ')}.`
      : 'Mix topics across the batch.'

  return `Generate ${count} German direct-speech quote / indirect-speech rewrite pairs
for a Konjunktiv I drill.

DIFFICULTY: ${difficulty}
${KI_DIFFICULTY_BLURB[difficulty]}

REQUIREMENTS for every entry:
- "source" is a single sentence containing a speaker, a reporting verb in the
  preterite, a colon, and the direct quote in German quote marks („…" or «…»).
  Example: Der Minister sagte: „Wir senken die Steuern."
- "reportingClause" is the speaker + reporting verb + ", " (literally ending with
  a comma and a space). Example: "Der Minister sagte, "
- "referenceAnswer" is the full indirect-speech rewrite, starting EXACTLY with the
  reportingClause string. Use Konjunktiv I where it differs from the indicative;
  fall back to Konjunktiv II ONLY when K-I would coincide with the indicative
  (typically plural and 1st-person forms).
- "expectedMood" is "K1" when the canonical answer is in K-I, or "K2-fallback"
  when the canonical answer must use K-II.
- "rationale" is a short English explanation (one or two sentences) of WHY the
  chosen mood applies — especially the K-I/K-II collision rule when relevant.
- "difficulty" is exactly "${difficulty}".
- ${topicLine}
- Vary reporting verbs and subjects across the batch.
- About 30–40% of entries SHOULD deliberately require the K-II fallback so the
  drill reinforces the collision rule.

Return ONLY valid JSON matching the schema. No prose. No markdown fences.`
}

// ── Generator with retry ────────────────────────────────────────

export interface KiGenerateOptions {
  model: string
  count: number
  difficulty: KiDifficulty
  topics?: readonly KiTopic[]
  maxRetries?: number
}

export interface KiGenerateResult {
  entries: KiQuestion[]
  rejected: number
  attempts: number
}

export async function generateKiQuestions(
  client: GeminiClient,
  opts: KiGenerateOptions
): Promise<KiGenerateResult> {
  const maxRetries = opts.maxRetries ?? 2
  let totalRejected = 0
  let attempts = 0
  const accepted: KiQuestion[] = []

  while (accepted.length < opts.count && attempts <= maxRetries) {
    attempts++
    const remaining = opts.count - accepted.length
    const prompt = buildKiGeneratorPrompt(remaining, opts.difficulty, opts.topics)

    const response = await client.models.generateContent({
      model: opts.model,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: KI_GENERATOR_SCHEMA as unknown as Record<string, unknown>,
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
      const v = validateKiEntry(raw)
      if (v === null) {
        totalRejected++
        continue
      }
      accepted.push({
        id: `ki-${Date.now()}-${accepted.length}`,
        ...v
      })
      if (accepted.length >= opts.count) break
    }
  }

  return { entries: accepted, rejected: totalRejected, attempts }
}
