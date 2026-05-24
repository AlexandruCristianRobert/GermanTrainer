// Global loading-overlay state. Anywhere in the app can call
//   const loading = useLoading()
//   loading.show('Generating sentences', 'This usually takes 1–3 minutes')
//   try { await someSlowCall() } finally { loading.hide() }
//
// Or wrap an async function:
//   await loading.wrap(
//     () => generateDeclensionArticles(client, opts),
//     { title: 'Generating sentences', subtitle: 'This usually takes 1–3 minutes' }
//   )
//
// The overlay is rendered globally by <LoadingOverlay /> in App.vue and
// teleported into <body> so it floats above everything.

import { ref, computed, type Ref, type ComputedRef } from 'vue'

export interface LoadingState {
  title: string
  subtitle?: string
}

// Module-level singleton — every consumer sees the same overlay state.
const state = ref<LoadingState | null>(null)

export interface LoadingApi {
  active: ComputedRef<boolean>
  state: Ref<LoadingState | null>
  show: (title: string, subtitle?: string) => void
  hide: () => void
  /**
   * Run an async function with the loading overlay shown. Hides even
   * when the function throws — the rejection still propagates so the
   * caller can toast the error.
   */
  wrap: <T>(fn: () => Promise<T>, msg: LoadingState) => Promise<T>
}

const active = computed(() => state.value !== null)

export function useLoading(): LoadingApi {
  return {
    active,
    state,
    show(title: string, subtitle?: string) {
      state.value = { title, subtitle }
    },
    hide() {
      state.value = null
    },
    async wrap<T>(fn: () => Promise<T>, msg: LoadingState): Promise<T> {
      state.value = { ...msg }
      try {
        return await fn()
      } finally {
        state.value = null
      }
    }
  }
}
