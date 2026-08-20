// Idiom highlighting in EN→DE sentence-translation solutions (ADR-0001
// applies: no inline markup in sentence strings — the AI returns verbatim
// German substrings, spans are located by first-match, case-insensitive,
// word-bounded, non-overlapping matching, and an unmatchable span is
// silently dropped rather than rejecting the whole idiom).
//
// This module owns only the shared type and its validation; rendering lives
// in GermanSolutionText.vue, which reuses buildHintSegments (below) to split
// the German solution text for display.

import { buildHintSegments, type HintInput, type HintKind } from './useSentenceQuiz'

/** An idiom or fixed expression found in a generated German solution: the
 *  verbatim German substrings it's made of (often discontinuous — "wechselte
 *  … den Besitzer"), its dictionary form, and its English equivalent. */
export interface IdiomInfo {
  /** Verbatim substrings of the German sentence, 1–3 parts (idioms are often discontinuous). */
  spans: string[]
  /** Dictionary form, e.g. "den Besitzer wechseln". */
  form: string
  /** English equivalent, e.g. "to change hands". */
  gloss: string
}

// buildHintSegments only needs a HintKind to satisfy its type — idiom spans
// never render by that kind (GermanSolutionText always uses data-cat="idiom"
// regardless), so any member of the union works as a placeholder.
const PLACEHOLDER_KIND: HintKind = 'verb'

/**
 * Validate a raw AI-returned idiom value against the German sentence it
 * claims to annotate. `form` and `gloss` must be non-empty after trim;
 * `spans` must be an array of strings — trimmed, emptied entries dropped,
 * capped at 3 — of which only those that actually anchor in `german` survive.
 * A span "anchors" under exactly the semantics `buildHintSegments` already
 * implements (first occurrence, case-insensitive, word-bounded,
 * non-overlapping with previously matched spans); this function calls that
 * same function rather than re-implementing the matching rules, so the two
 * can never drift apart. Returns `undefined` — never throws — for malformed
 * input or when no span survives, so a missing/bad idiom never breaks
 * generation or rendering (fail-safe): the sentence then displays plainly.
 */
export function validateIdiom(german: string, raw: unknown): IdiomInfo | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const r = raw as Record<string, unknown>

  const form = typeof r.form === 'string' ? r.form.trim() : ''
  const gloss = typeof r.gloss === 'string' ? r.gloss.trim() : ''
  if (!form || !gloss) return undefined

  if (!Array.isArray(r.spans)) return undefined
  const candidates = r.spans
    .filter((s): s is string => typeof s === 'string')
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .slice(0, 3)
  if (candidates.length === 0) return undefined

  // Smuggle each candidate's index through `reveal` (unused otherwise) so we
  // can tell, after the shared matcher runs, which of the original spans
  // anchored — buildHintSegments itself has no other way to report that back.
  const hints: HintInput[] = candidates.map((surface, i) => ({ surface, kind: PLACEHOLDER_KIND, reveal: String(i) }))
  const matched = new Set(
    buildHintSegments(german, hints)
      .map(seg => seg.hint?.reveal)
      .filter((rv): rv is string => rv !== undefined)
  )
  const spans = candidates.filter((_, i) => matched.has(String(i)))
  if (spans.length === 0) return undefined

  return { spans, form, gloss }
}
