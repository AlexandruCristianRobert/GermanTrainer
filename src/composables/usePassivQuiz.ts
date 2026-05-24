import {
  PASSIV_DIFFICULTIES,
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
