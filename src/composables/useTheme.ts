import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'

export type ThemeMode = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

export interface ThemeApi {
  mode: Ref<ThemeMode>
  resolved: ComputedRef<ResolvedTheme>
  toggle(): void
  setMode(m: ThemeMode): void
}

const STORAGE_KEY = 'theme'
const DARK_QUERY = '(prefers-color-scheme: dark)'

// Module-level singletons — every useTheme() call shares this state.
const mode = ref<ThemeMode>(readStoredMode())
const systemPrefersDark = ref<boolean>(readSystemDark())

const resolved = computed<ResolvedTheme>(() => {
  if (mode.value === 'system') return systemPrefersDark.value ? 'dark' : 'light'
  return mode.value
})

function readStoredMode(): ThemeMode {
  if (typeof localStorage === 'undefined') return 'system'
  const v = localStorage.getItem(STORAGE_KEY)
  if (v === 'light' || v === 'dark') return v
  return 'system'
}

function readSystemDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia(DARK_QUERY).matches
}

function applyToDom(value: ResolvedTheme) {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-theme', value)
}

// Set initial DOM attribute (in case main.ts didn't, e.g. in tests).
applyToDom(resolved.value)

// Keep DOM in sync (flush: 'sync' ensures the DOM attribute is updated
// immediately when resolved changes — required for tests and for preventing
// flash of unstyled content in production).
watch(resolved, applyToDom, { flush: 'sync' })

// Listen for system theme changes — affects resolved only when mode === 'system'.
if (typeof window !== 'undefined' && window.matchMedia) {
  const mql = window.matchMedia(DARK_QUERY)
  mql.addEventListener('change', e => {
    systemPrefersDark.value = e.matches
  })
}

function persist(m: ThemeMode) {
  if (typeof localStorage === 'undefined') return
  if (m === 'system') localStorage.removeItem(STORAGE_KEY)
  else localStorage.setItem(STORAGE_KEY, m)
}

function setMode(m: ThemeMode): void {
  mode.value = m
  if (m === 'system') systemPrefersDark.value = readSystemDark()
  persist(m)
}

function toggle(): void {
  // Always set an explicit mode opposite of current resolved.
  setMode(resolved.value === 'dark' ? 'light' : 'dark')
}

export function useTheme(): ThemeApi {
  return { mode, resolved, toggle, setMode }
}
