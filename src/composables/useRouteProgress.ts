// A slim top progress bar for lazy route loads. Module singleton so the router
// guards and the component share one state. The bar only appears if navigation
// takes longer than SHOW_DELAY_MS, so fast/cached navigations never flash it.

import { ref, computed, type ComputedRef } from 'vue'
import type { Router } from 'vue-router'

const SHOW_DELAY_MS = 120

const _visible = ref(false)
let armTimer: ReturnType<typeof setTimeout> | null = null

function start(): void {
  if (armTimer !== null || _visible.value) return
  armTimer = setTimeout(() => {
    _visible.value = true
    armTimer = null
  }, SHOW_DELAY_MS)
}

function done(): void {
  if (armTimer !== null) {
    clearTimeout(armTimer)
    armTimer = null
  }
  _visible.value = false
}

export interface RouteProgressApi {
  visible: ComputedRef<boolean>
  start: () => void
  done: () => void
}

export function useRouteProgress(): RouteProgressApi {
  return { visible: computed(() => _visible.value), start, done }
}

/** Wire the bar to a router's navigation lifecycle. Call once at bootstrap. */
export function installRouteProgress(router: Router): void {
  router.beforeEach(() => { start() })
  router.afterEach(() => { done() })
  router.onError(() => { done() })
}
