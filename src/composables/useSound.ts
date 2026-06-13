// A tiny, best-effort "quiz is ready" chime, synthesized with the Web Audio API
// (no audio asset). Module-singleton `enabled` flag persisted to localStorage so
// the Settings toggle and every play site share one source of truth. playReady()
// is fully guarded — a missing or blocked AudioContext must never disrupt a quiz.

import { ref, computed, type ComputedRef, type Ref } from 'vue'

const STORAGE_KEY = 'gt:soundEnabled'

function readEnabled(): boolean {
  if (typeof localStorage === 'undefined') return true
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'false'
  } catch {
    return true
  }
}

// Module singletons — every consumer shares them.
const enabled = ref(readEnabled())
let audioCtx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (audioCtx) return audioCtx
  const Ctor = (window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext) as
    | typeof AudioContext
    | undefined
  if (!Ctor) return null
  audioCtx = new Ctor()
  return audioCtx
}

/** One sine note with a click-free attack/decay envelope. */
function playNote(ctx: AudioContext, freq: number, start: number, dur: number, peak: number): void {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0, start)
  gain.gain.linearRampToValueAtTime(peak, start + 0.02)
  gain.gain.linearRampToValueAtTime(0, start + dur)
  osc.connect(gain).connect(ctx.destination)
  osc.start(start)
  osc.stop(start + dur + 0.03)
}

export interface SoundApi {
  enabled: ComputedRef<boolean>
  setEnabled: (on: boolean) => void
  playReady: () => void
}

export function useSound(): SoundApi {
  return {
    enabled: computed(() => enabled.value),
    setEnabled(on: boolean) {
      enabled.value = on
      if (typeof localStorage === 'undefined') return
      try {
        localStorage.setItem(STORAGE_KEY, on ? 'true' : 'false')
      } catch {
        /* ignore quota / disabled */
      }
    },
    playReady() {
      if (!enabled.value) return
      try {
        const ctx = getCtx()
        if (!ctx) return
        if (ctx.state === 'suspended') void ctx.resume()
        const t = ctx.currentTime
        playNote(ctx, 880, t, 0.11, 0.12)            // A5
        playNote(ctx, 1318.51, t + 0.11, 0.12, 0.12) // E6
      } catch {
        /* best-effort: never disrupt the quiz */
      }
    }
  }
}

// Exposed for tests that assert the raw ref identity if needed.
export const _enabledRef: Ref<boolean> = enabled
