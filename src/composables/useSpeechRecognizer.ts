//
// SpeechRecognition wrapper for the spoken Discussion (see CONTEXT.md → "Modality").
//
// The whole point of this module is that Chrome's endpointer stops the
// recognizer on its own schedule and there is NO setting to prevent it.
// `continuous = true` does not help: `onend` still fires after a silence the
// engine decides is the end of an utterance. So we make `onend` a no-op while
// the learner still holds the floor, and restart underneath them.
//
// Two consequences drive the shape of this file:
//   1. The finals buffer must live OUTSIDE the recognizer. Every restart resets
//      `event.results`, so a caller reading that array wholesale loses the whole
//      turn each time the engine gives up.
//   2. Each restart means the engine heard a silence long enough to end an
//      utterance — which makes the restart count a free long-pause proxy. We
//      count it deliberately rather than treating it as noise.
//
// No audio is recorded, buffered, or uploaded anywhere. This is text plus clocks.

import { ref, type Ref } from 'vue'
import type { SpeechSpan } from '../data/sprechen'

// ── Minimal ambient types ────────────────────────────────────────
// lib.dom ships these only in newer TS releases; declaring the slice we use
// keeps the build independent of the TypeScript version.

interface SRAlternative { transcript: string; confidence: number }
interface SRResult { isFinal: boolean; length: number; 0: SRAlternative }
interface SRResultList { length: number; [i: number]: SRResult }
interface SREvent { resultIndex: number; results: SRResultList }
interface SRErrorEvent { error: string }

interface SRInstance {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((e: SREvent) => void) | null
  onend: (() => void) | null
  onerror: ((e: SRErrorEvent) => void) | null
}

type SRConstructor = new () => SRInstance

interface SpeechWindow {
  SpeechRecognition?: SRConstructor
  webkitSpeechRecognition?: SRConstructor
}

export function speechRecognitionCtor(): SRConstructor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as SpeechWindow
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function isSpeechRecognitionSupported(): boolean {
  return speechRecognitionCtor() !== null
}

// ── Public shapes ────────────────────────────────────────────────

/** What one held-floor stretch produced. `reactionMs` is the caller's to supply. */
export interface SpeechTurnResult {
  text: string
  startedAt: number
  endedAt: number
  restarts: number
  spans: SpeechSpan[]
}

/**
 * `denied` is terminal — the learner refused the microphone, so voice mode is
 * over and the caller should fall back to typing. The others are recoverable.
 */
export type RecognizerErrorKind = 'denied' | 'network' | 'other'

export interface RecognizerError {
  kind: RecognizerErrorKind
  raw: string
}

export interface SpeechRecognizer {
  supported: boolean
  listening: Ref<boolean>
  /** Committed finals plus the current interim guess — what the learner sees. */
  liveText: Ref<string>
  error: Ref<RecognizerError | null>
  start: () => void
  end: () => Promise<SpeechTurnResult>
  abort: () => void
}

/**
 * Snapshot handed to `onFinal` after each committed final — the accumulated
 * state of the CURRENT turn, not just the delta. `text`/`spans` mirror what
 * `end()` would resolve with if the turn ended right now.
 */
export interface CommittedSpeech {
  text: string
  spans: SpeechSpan[]
  restarts: number
}

/** How long to wait for the engine to flush pending finals after stop(). */
const FLUSH_TIMEOUT_MS = 1200

/**
 * `onFinal` is optional and purely additive: existing callers that pass only
 * `lang` are unaffected. It lets a caller (the Teil 1 Runner) persist Rede
 * progress incrementally instead of only at `end()` (F1).
 */
export function useSpeechRecognizer(lang = 'de-DE', onFinal?: (c: CommittedSpeech) => void): SpeechRecognizer {
  const Ctor = speechRecognitionCtor()
  const listening = ref(false)
  const liveText = ref('')
  const error = ref<RecognizerError | null>(null)

  let rec: SRInstance | null = null
  let holding = false
  let buffer = ''
  let spans: SpeechSpan[] = []
  let restarts = 0
  let startedAt = 0
  // Results already committed in the CURRENT recognizer session. Reset on every
  // restart, because `results` starts empty again. Guards against an engine that
  // re-emits an already-final index.
  let finalized = 0
  let flushResolve: (() => void) | null = null

  function settleFlush() {
    const r = flushResolve
    flushResolve = null
    if (r) r()
  }

  function attach(instance: SRInstance) {
    instance.lang = lang
    instance.continuous = true
    instance.interimResults = true
    instance.maxAlternatives = 1

    instance.onresult = (e: SREvent) => {
      let interim = ''
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i]
        const alt = r[0]
        if (!alt) continue
        if (r.isFinal) {
          if (i >= finalized) {
            const text = alt.transcript.trim()
            if (text.length > 0) {
              buffer = buffer.length > 0 ? `${buffer} ${text}` : text
              spans.push({ text, confidence: typeof alt.confidence === 'number' ? alt.confidence : 0 })
              // `onFinal` is host-provided (runner) code we don't control. A
              // throw in there must never kill recognition — the engine must
              // keep listening and later finals must still commit — so this
              // is deliberately swallowed rather than left to propagate.
              try {
                onFinal?.({ text: buffer, spans: [...spans], restarts })
              } catch {
                /* listener's problem, not ours */
              }
            }
            finalized = i + 1
          }
        } else {
          interim += alt.transcript
        }
      }
      liveText.value = `${buffer} ${interim}`.trim()
    }

    instance.onend = () => {
      if (!holding) {
        listening.value = false
        settleFlush()
        return
      }
      // The learner is still talking as far as they're concerned — the engine
      // just gave up on the silence. Count it and pick the floor back up.
      restarts++
      finalized = 0
      try {
        instance.start()
      } catch {
        // Already starting; the pending start will take effect.
      }
    }

    instance.onerror = (e: SRErrorEvent) => {
      const raw = e.error || 'unknown'
      if (raw === 'no-speech' || raw === 'aborted') return   // onend restarts us
      if (raw === 'not-allowed' || raw === 'service-not-allowed') {
        holding = false
        error.value = { kind: 'denied', raw }
        listening.value = false
        settleFlush()
        return
      }
      error.value = { kind: raw === 'network' ? 'network' : 'other', raw }
    }
  }

  function start() {
    if (!Ctor || holding) return
    buffer = ''
    spans = []
    restarts = 0
    finalized = 0
    liveText.value = ''
    error.value = null
    startedAt = Date.now()
    holding = true
    listening.value = true

    if (!rec) {
      rec = new Ctor()
      attach(rec)
    }
    try {
      rec.start()
    } catch {
      // InvalidStateError: a previous session hasn't fully torn down. `onend`
      // will fire for it and, because `holding` is set, restart us.
    }
  }

  /**
   * Ends the turn. Resolves once the engine has flushed its pending finals —
   * `stop()` delivers them before `onend`, and a learner who hits the key the
   * instant they stop talking would otherwise lose their last few words.
   */
  function end(): Promise<SpeechTurnResult> {
    holding = false
    listening.value = false

    const finish = (): SpeechTurnResult => ({
      text: buffer.trim(),
      startedAt,
      endedAt: Date.now(),
      restarts,
      spans: [...spans]
    })

    if (!rec) return Promise.resolve(finish())

    return new Promise<SpeechTurnResult>(resolve => {
      let done = false
      const settle = () => {
        if (done) return
        done = true
        flushResolve = null
        resolve(finish())
      }
      flushResolve = settle
      // Never hang the UI on an engine that won't fire onend.
      setTimeout(settle, FLUSH_TIMEOUT_MS)
      try {
        rec!.stop()
      } catch {
        settle()
      }
    })
  }

  /** Drop the turn entirely — used when voice mode is torn down mid-turn. */
  function abort() {
    holding = false
    listening.value = false
    buffer = ''
    spans = []
    liveText.value = ''
    settleFlush()
    try {
      rec?.abort()
    } catch {
      /* nothing useful to do */
    }
  }

  return {
    supported: Ctor !== null,
    listening,
    liveText,
    error,
    start,
    end,
    abort
  }
}

/** Words in a recognized turn — the numerator for words-per-minute. */
export function countWords(text: string): number {
  const trimmed = text.trim()
  return trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length
}
