//
// Text-to-speech for the spoken Discussion partner (Sprechen Teil 2). Wraps
// window.speechSynthesis with the browser workarounds it actually needs:
//
//   1. getVoices() is frequently [] on first call and fills in asynchronously
//      once the engine has loaded its voice list — we must re-read it on
//      'voiceschanged', not just once at startup.
//   2. `speaking` has to stay true a beat past onend: several browsers leave
//      speechSynthesis.speaking === true for a short tail after onend fires.
//      The caller uses `speaking` to decide when it's safe to open the mic —
//      too early and it transcribes the partner's own trailing voice into
//      the learner's answer.
//   3. onend is not guaranteed to fire at all (wrong voice, engine hiccup,
//      tab backgrounded), so speak() carries its own safety timeout and
//      always resolves.
//
// No new dependency: everything here is the standard Web Speech API.

import { ref, watch, type Ref } from 'vue'

const STORAGE_KEY = 'sprechenTeil2Setup'

/**
 * How long `speaking` stays true after onend/onerror fires — see workaround
 * (2) above. Exported so tests can assert against it instead of a magic number.
 */
export const SPEAKING_TAIL_MS = 250

const MIN_RATE = 0.6
const MAX_RATE = 1.4
const DEFAULT_RATE = 1.0

/**
 * speak() never hangs: at least this long, or longer for long replies.
 *
 * 80ms/char is ~750 chars/min — genuinely slower than real German TTS at
 * rate 1.0 (closer to 900-1100 chars/min), so this only ever fires as a
 * fallback for a stuck engine, not a false-positive on real speech. Partner
 * turns are capped at 900 chars by validatePartnerReply() in
 * useSprechenPartner.ts, so the worst-case ceiling here is 72s.
 */
const MIN_SAFETY_TIMEOUT_MS = 5000
const SAFETY_MS_PER_CHAR = 80

// ── Ambient window shape ─────────────────────────────────────────
// Both properties are optional here (unlike lib.dom's Window, which declares
// them as always-present) because jsdom and older browsers genuinely lack them.

interface SpeechWindow {
  speechSynthesis?: SpeechSynthesis
  SpeechSynthesisUtterance?: typeof SpeechSynthesisUtterance
}

function getSynth(): SpeechSynthesis | null {
  if (typeof window === 'undefined') return null
  return (window as unknown as SpeechWindow).speechSynthesis ?? null
}

function getUtteranceCtor(): typeof SpeechSynthesisUtterance | null {
  if (typeof window === 'undefined') return null
  return (window as unknown as SpeechWindow).SpeechSynthesisUtterance ?? null
}

// ── Module-level singleton: voice list + its one 'voiceschanged' listener ──
// The voice list is global browser state (one speechSynthesis per page), not
// per-component state. Two components (VoiceSetup.vue, VoiceRunner.vue) each
// call useSpeechVoice() on their own mount; if the listener were registered
// inside useSpeechVoice() itself, every mount would stack another
// 'voiceschanged' listener on the same global synth, none of which are ever
// removed. Registering it once here, at module scope, means repeated calls
// to useSpeechVoice() share one listener and one list.

const synth = getSynth()
const supported = synth !== null
const voices = ref<SpeechSynthesisVoice[]>([])

function refreshVoices(): void {
  if (!synth) return
  voices.value = synth.getVoices().filter(v => v.lang.startsWith('de'))
}

if (synth) {
  refreshVoices()
  // First call is frequently [] — the engine populates it asynchronously
  // and signals readiness with this event. Re-read rather than assume.
  synth.addEventListener('voiceschanged', refreshVoices)
}

// ── Persistence ───────────────────────────────────────────────────
// sprechenTeil2Setup is an existing JSON blob (see Teil2Setup.vue) that also
// carries mode/topicId/turnTarget/stance/hintsOn. We only ever read-spread-
// write so those keys survive untouched.

interface StoredVoiceSetup {
  voiceName?: string
  rate?: number
}

function readStored(): Record<string, unknown> {
  if (typeof localStorage === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

function persist(patch: StoredVoiceSetup): void {
  if (typeof localStorage === 'undefined') return
  try {
    const prev = readStored()
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...prev, ...patch }))
  } catch {
    /* ignore quota / disabled storage */
  }
}

function clampRate(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_RATE
  return Math.min(MAX_RATE, Math.max(MIN_RATE, n))
}

// ── Public shape ────────────────────────────────────────────────

export interface SpeechVoiceApi {
  supported: boolean
  /** German voices only (v.lang.startsWith('de')) — refreshed on 'voiceschanged'. */
  voices: Ref<SpeechSynthesisVoice[]>
  voiceName: Ref<string>
  rate: Ref<number>
  speaking: Ref<boolean>
  speak: (text: string) => Promise<void>
  cancel: () => void
}

export function useSpeechVoice(): SpeechVoiceApi {
  const stored = readStored()
  const voiceName = ref<string>(typeof stored.voiceName === 'string' ? stored.voiceName : '')
  const rate = ref<number>(typeof stored.rate === 'number' ? clampRate(stored.rate) : DEFAULT_RATE)
  const speaking = ref(false)

  let tailTimer: ReturnType<typeof setTimeout> | null = null

  // `flush: 'sync'` so a plain `voiceName.value = x` / `rate.value = x`
  // assignment (e.g. from a template v-model) persists immediately — no
  // nextTick to await, and no risk of losing the setting to a page reload
  // that happens before the default 'pre' flush would have run.
  watch(voiceName, name => persist({ voiceName: name }), { flush: 'sync' })
  watch(rate, r => {
    const clamped = clampRate(r)
    if (clamped !== r) {
      rate.value = clamped // re-triggers this watcher; second pass persists below
      return
    }
    persist({ rate: clamped })
  }, { flush: 'sync' })

  function speak(text: string): Promise<void> {
    const Utterance = getUtteranceCtor()
    if (!synth || !Utterance) return Promise.resolve()

    return new Promise<void>(resolve => {
      let settled = false

      const finish = () => {
        if (settled) return
        settled = true
        if (tailTimer) clearTimeout(tailTimer)
        // Keep `speaking` true a beat past onend — see workaround (2) above.
        tailTimer = setTimeout(() => { speaking.value = false }, SPEAKING_TAIL_MS)
        resolve()
      }

      const utterance = new Utterance(text)
      utterance.lang = 'de-DE'
      utterance.rate = clampRate(rate.value)
      const chosen = voices.value.find(v => v.name === voiceName.value)
      if (chosen) utterance.voice = chosen

      utterance.onend = finish
      utterance.onerror = finish

      speaking.value = true

      // Safety net: onend is not guaranteed (bad voice, engine hiccup, a
      // backgrounded tab) — never leave the caller (and the mic gate) hanging.
      const safetyMs = Math.max(MIN_SAFETY_TIMEOUT_MS, text.length * SAFETY_MS_PER_CHAR)
      setTimeout(finish, safetyMs)

      synth.speak(utterance)
    })
  }

  function cancel(): void {
    if (tailTimer) {
      clearTimeout(tailTimer)
      tailTimer = null
    }
    speaking.value = false
    synth?.cancel()
  }

  return {
    supported,
    voices,
    voiceName,
    rate,
    speaking,
    speak,
    cancel
  }
}
