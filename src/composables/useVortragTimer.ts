//
// Sprechen Teil 1 — Redezeit. See CONTEXT.md → "Rede".
//
// Two Modalities, two measurements, and the spec says plainly that they are not
// the same thing: a spoken Rede is measured on the clock because there IS a
// clock; a typed Rede is measured in words because that is all there is. The
// 90 wpm figure that relates them is a display convention.

import { VORTRAG_TARGET_WORDS, vortragClock } from '../data/sprechenVortragsmittel'
import type { Modality } from '../data/sprechen'

export const VORTRAG_TARGET_SECONDS = 240

export type RedezeitBand = 'under' | 'ok' | 'over'

export interface RedezeitState {
  words: number
  seconds: number | null
  pct: number          // 0..n, 1.0 = on target
  band: RedezeitBand
  clock: string        // m:ss — measured when spoken, estimated when typed
}

const BAND_IN = 0.88
const BAND_OUT = 1.10

export function redezeit(input: {
  words: number
  seconds?: number
  modality: Modality
}): RedezeitState {
  const words = Math.max(0, Math.round(input.words))
  const seconds = input.modality === 'spoken' && typeof input.seconds === 'number'
    ? Math.max(0, Math.round(input.seconds))
    : null

  const raw = seconds !== null
    ? seconds / VORTRAG_TARGET_SECONDS
    : words / VORTRAG_TARGET_WORDS
  const pct = Number.isFinite(raw) ? Math.max(0, raw) : 0

  const band: RedezeitBand = pct < BAND_IN ? 'under' : pct <= BAND_OUT ? 'ok' : 'over'

  const clock = seconds !== null
    ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
    : vortragClock(words)

  return { words, seconds, pct, band, clock }
}

/**
 * The hard limit models an examiner's clock, which runs while you think: a
 * real examiner interrupts on wall time, not on however much of it the
 * learner actually spent talking. So this reads `wallSeconds` — time since
 * the Rede began, mic paused or not — never `redezeit()`'s spoken-time
 * content budget.
 *
 * It exists in the spoken Modality ONLY. Not because a typed Rede has no
 * clock — this one would tick perfectly well against a typed run — but
 * because the threshold is calibrated to speech. VORTRAG_TARGET_SECONDS is
 * the four minutes an examiner grants a SPEAKER; applying it to typing would
 * cut learners off for typing speed rather than for German, which is not the
 * skill under test. A typed Rede is therefore bounded by content
 * (VORTRAG_TARGET_WORDS) and nothing else.
 */
export function hardLimitReached(input: {
  wallSeconds: number
  modality: Modality
  hardLimit: boolean
}): boolean {
  if (!input.hardLimit) return false
  if (input.modality !== 'spoken') return false
  return input.wallSeconds >= VORTRAG_TARGET_SECONDS
}
