// Per-quiz prompt-size preferences. Persisted to localStorage and applied
// as CSS custom properties on :root so any component that reads
//   font-size: var(--noun-prompt-size, 92px)
// picks up the live value.
//
// Keys + defaults match the Update 4 design spec.

import { computed, ref, watch, type ComputedRef } from 'vue'

export interface PromptSizeSpec {
  cssVar: string
  storageKey: string
  default: number
  min: number
  max: number
  presets: { label: string; value: number }[]
}

export const PROMPT_SIZE_SPECS = {
  verb: {
    cssVar: '--test-verb-size',
    storageKey: 'gt:testVerbSize',
    default: 18,
    min: 18,
    max: 44,
    presets: [
      { label: 'Compact', value: 18 },
      { label: 'Medium', value: 26 },
      { label: 'Large', value: 36 }
    ]
  },
  noun: {
    cssVar: '--noun-prompt-size',
    storageKey: 'gt:nounPromptSize',
    default: 48,
    min: 48,
    max: 140,
    presets: [
      { label: 'Compact', value: 48 },
      { label: 'Medium', value: 92 },
      { label: 'Large', value: 120 }
    ]
  },
  adjective: {
    cssVar: '--adjective-prompt-size',
    storageKey: 'gt:adjectivePromptSize',
    default: 22,
    min: 22,
    max: 64,
    presets: [
      { label: 'Compact', value: 22 },
      { label: 'Medium', value: 36 },
      { label: 'Large', value: 52 }
    ]
  },
  declension: {
    cssVar: '--decl-prompt-size',
    storageKey: 'gt:declPromptSize',
    default: 32,
    min: 32,
    max: 96,
    presets: [
      { label: 'Compact', value: 32 },
      { label: 'Medium', value: 56 },
      { label: 'Large', value: 80 }
    ]
  }
} as const satisfies Record<string, PromptSizeSpec>

export type PromptSizeKind = keyof typeof PROMPT_SIZE_SPECS

function readStored(spec: PromptSizeSpec): number {
  if (typeof localStorage === 'undefined') return spec.default
  try {
    const raw = localStorage.getItem(spec.storageKey)
    if (!raw) return spec.default
    const n = parseInt(raw, 10)
    if (!Number.isFinite(n)) return spec.default
    return Math.min(spec.max, Math.max(spec.min, n))
  } catch {
    return spec.default
  }
}

function applyToRoot(cssVar: string, px: number): void {
  if (typeof document === 'undefined') return
  document.documentElement.style.setProperty(cssVar, px + 'px')
}

function persist(spec: PromptSizeSpec, px: number): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(spec.storageKey, String(px))
  } catch {
    /* ignore quota */
  }
}

// Module-level singletons so every consumer of useSize() shares state.
const verbSize = ref<number>(readStored(PROMPT_SIZE_SPECS.verb))
const nounSize = ref<number>(readStored(PROMPT_SIZE_SPECS.noun))
const adjectiveSize = ref<number>(readStored(PROMPT_SIZE_SPECS.adjective))
const declensionSize = ref<number>(readStored(PROMPT_SIZE_SPECS.declension))

const refsByKind = {
  verb: verbSize,
  noun: nounSize,
  adjective: adjectiveSize,
  declension: declensionSize
} as const

// Side-effect bindings: any write to a size ref → CSS var + localStorage.
watch(verbSize, v => {
  applyToRoot(PROMPT_SIZE_SPECS.verb.cssVar, v)
  persist(PROMPT_SIZE_SPECS.verb, v)
})
watch(nounSize, v => {
  applyToRoot(PROMPT_SIZE_SPECS.noun.cssVar, v)
  persist(PROMPT_SIZE_SPECS.noun, v)
})
watch(adjectiveSize, v => {
  applyToRoot(PROMPT_SIZE_SPECS.adjective.cssVar, v)
  persist(PROMPT_SIZE_SPECS.adjective, v)
})
watch(declensionSize, v => {
  applyToRoot(PROMPT_SIZE_SPECS.declension.cssVar, v)
  persist(PROMPT_SIZE_SPECS.declension, v)
})

/**
 * Called once at app boot — applies persisted values to :root so the
 * first paint already has the right sizes.
 */
export function initPromptSizes(): void {
  applyToRoot(PROMPT_SIZE_SPECS.verb.cssVar, verbSize.value)
  applyToRoot(PROMPT_SIZE_SPECS.noun.cssVar, nounSize.value)
  applyToRoot(PROMPT_SIZE_SPECS.adjective.cssVar, adjectiveSize.value)
  applyToRoot(PROMPT_SIZE_SPECS.declension.cssVar, declensionSize.value)
}

export interface PromptSizeApi {
  spec: PromptSizeSpec
  value: ComputedRef<number>
  setValue: (n: number) => void
}

export function usePromptSize(kind: PromptSizeKind): PromptSizeApi {
  const spec = PROMPT_SIZE_SPECS[kind]
  const r = refsByKind[kind]
  return {
    spec,
    value: computed(() => r.value),
    setValue(n: number) {
      const clamped = Math.min(spec.max, Math.max(spec.min, Math.round(n)))
      r.value = clamped
    }
  }
}
