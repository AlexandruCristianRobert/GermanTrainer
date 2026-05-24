import {
  type Difficulty, type MultiArticleEntry,
  DEFINITE_FORMS, INDEFINITE_FORMS
} from '../data/declension-ai'
import { DECL_CASES, DECL_GENDERS, DECL_DETERMINERS, type DeclCase, type DeclGender } from '../data/declension'

// ── Pure validator ──────────────────────────────────────────────

/**
 * Validate one AI-returned entry. Returns the entry (without id/difficulty)
 * if valid, null otherwise.
 *
 * 5 stages: structural sanity → blanks-count match → reconstruction →
 * enum validity → strict definite/indefinite form lookup.
 */
export function validateEntry(raw: unknown): Omit<MultiArticleEntry, 'id' | 'difficulty'> | null {
  if (!raw || typeof raw !== 'object') return null
  const e = raw as Record<string, unknown>

  // 1. Structural sanity
  if (typeof e.template !== 'string' || e.template.length === 0) return null
  if (typeof e.sentence !== 'string' || e.sentence.length === 0) return null
  if (typeof e.gloss !== 'string') return null
  if (!Array.isArray(e.blanks) || e.blanks.length === 0) return null

  // 2. Blanks count matches template
  const blankCount = (e.template as string).split('___').length - 1
  if (blankCount !== e.blanks.length) return null

  // 3. Reconstruction — substituting answers in order reproduces the sentence
  let reconstructed = e.template as string
  for (const blank of e.blanks as Record<string, unknown>[]) {
    if (typeof blank.answer !== 'string') return null
    reconstructed = reconstructed.replace('___', blank.answer)
  }
  if (reconstructed !== e.sentence) return null

  // 4 + 5. Enum validity + strict article-form check per blank
  const cases = new Set<string>(DECL_CASES)
  const genders = new Set<string>(DECL_GENDERS)
  const determiners = new Set<string>(DECL_DETERMINERS)
  for (const blankRaw of e.blanks as Record<string, unknown>[]) {
    if (
      typeof blankRaw.case !== 'string' ||
      typeof blankRaw.gender !== 'string' ||
      typeof blankRaw.determiner !== 'string' ||
      typeof blankRaw.rationale !== 'string'
    ) return null
    if (!cases.has(blankRaw.case)) return null
    if (!genders.has(blankRaw.gender)) return null
    if (!determiners.has(blankRaw.determiner)) return null
    if (blankRaw.rationale.trim().length === 0) return null

    // Strict form check — definite + indefinite only (possessive skipped — too many lemmas)
    const answer = (blankRaw.answer as string).toLowerCase()
    const c = blankRaw.case as DeclCase
    const g = blankRaw.gender as DeclGender
    if (blankRaw.determiner === 'definite') {
      const expected = DEFINITE_FORMS[c][g]
      if (answer !== expected) return null
    } else if (blankRaw.determiner === 'indefinite') {
      const expected = INDEFINITE_FORMS[c][g]
      if (expected === null || answer !== expected) return null
    }
  }

  return e as unknown as Omit<MultiArticleEntry, 'id' | 'difficulty'>
}

// ── Prompt builder ──────────────────────────────────────────────

const DIFFICULTY_BRIEF: Record<Difficulty, string> = {
  easy: 'CEFR A1–A2 vocabulary. 1–2 blanks per sentence. Definite or indefinite articles ONLY (no possessives). Simple SVO structure. Common nouns like Mann, Frau, Kind, Buch, Hund, Auto, Tisch, Haus, Apfel.',
  medium: 'CEFR B1 vocabulary. 2–3 blanks per sentence. Includes possessive determiners (mein/dein/sein/ihr/unser/euer). Mix of accusative and dative; occasional genitive. Sentences may include adverbial phrases.',
  hard: 'CEFR B2–C1 vocabulary. 3–4 blanks per sentence. Includes genitive constructions (wegen, trotz, während, des … es) and subordinate clauses. Less common nouns and idiomatic verb constructions.'
}

export function buildPrompt(count: number, difficulty: Difficulty, focusedCases?: DeclCase[]): string {
  const caseFocus = focusedCases && focusedCases.length > 0 && focusedCases.length < DECL_CASES.length
    ? `Bias the cases toward: ${focusedCases.join(', ')}.`
    : 'Use a mix of cases across the batch.'

  return `Generate ${count} German sentences for a declension article-fill drill.

DIFFICULTY: ${difficulty}
${DIFFICULTY_BRIEF[difficulty]}

REQUIREMENTS for every sentence:
- Grammatically correct, naturally-sounding German.
- Mark each blank with EXACTLY three underscores: ___
- Each blank corresponds to ONE article or determiner (der/die/das/den/dem/des/ein/eine/einen/einem/eines/einer/mein/meinen/meinem/meines/etc).
- The number of "___" markers in the template MUST equal blanks.length.
- Substituting each blank's "answer" into the template in left-to-right order MUST reproduce the "sentence" field EXACTLY.
- For each blank, declare the correct case (nominative / accusative / dative / genitive), gender (masculine / feminine / neuter / plural), and determiner type (definite / indefinite / possessive).
- For definite and indefinite articles the answer MUST match the German grammar table EXACTLY — never invent forms:
  * Definite: nom = der/die/das/die, acc = den/die/das/die, dat = dem/der/dem/den, gen = des/der/des/der
  * Indefinite: nom = ein/eine/ein (no plural), acc = einen/eine/ein, dat = einem/einer/einem, gen = eines/einer/eines
- ${caseFocus}
- Vary noun gender across the batch.
- "rationale" is a short English explanation of WHY this case applies (e.g. "Dativ: indirect object of geben").
- "gloss" is a natural English translation of the full sentence.

Return ONLY valid JSON matching the schema. No prose. No markdown fences.`
}

// ── Gemini call with retry ──────────────────────────────────────

export interface GeminiClient {
  models: {
    generateContent: (opts: {
      model: string
      contents: string
      config?: Record<string, unknown>
    }) => Promise<{ text?: string }>
  }
}

export interface GenerateOptions {
  count: number
  difficulty: Difficulty
  focusedCases?: DeclCase[]
  model: string
  maxRetries?: number
}

export interface GenerateResult {
  entries: MultiArticleEntry[]
  rejected: number
  attempts: number
}

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    entries: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          template: { type: 'string' },
          sentence: { type: 'string' },
          gloss: { type: 'string' },
          blanks: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                answer: { type: 'string' },
                case: { type: 'string', enum: ['nominative', 'accusative', 'dative', 'genitive'] },
                gender: { type: 'string', enum: ['masculine', 'feminine', 'neuter', 'plural'] },
                determiner: { type: 'string', enum: ['definite', 'indefinite', 'possessive'] },
                rationale: { type: 'string' }
              },
              required: ['answer', 'case', 'gender', 'determiner', 'rationale']
            }
          }
        },
        required: ['template', 'sentence', 'gloss', 'blanks']
      }
    }
  },
  required: ['entries']
}

export async function generateDeclensionArticles(
  client: GeminiClient,
  opts: GenerateOptions
): Promise<GenerateResult> {
  const maxRetries = opts.maxRetries ?? 2
  let totalRejected = 0
  let attempts = 0
  const accepted: MultiArticleEntry[] = []

  while (accepted.length < opts.count && attempts <= maxRetries) {
    attempts++
    const remaining = opts.count - accepted.length
    const prompt = buildPrompt(remaining, opts.difficulty, opts.focusedCases)

    const response = await client.models.generateContent({
      model: opts.model,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.3
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
      const v = validateEntry(raw)
      if (v === null) {
        totalRejected++
        continue
      }
      accepted.push({
        id: `ai-${Date.now()}-${accepted.length}`,
        difficulty: opts.difficulty,
        ...v
      })
      if (accepted.length >= opts.count) break
    }
  }

  return { entries: accepted, rejected: totalRejected, attempts }
}
