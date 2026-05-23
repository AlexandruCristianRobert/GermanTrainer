// Per-theme palette overrides. Persisted to localStorage under 'gt:palette'
// and applied as a single <style id="palette-overrides"> block in <head>
// containing one rule per non-empty mode:
//
//   [data-theme="light"] { --paper: …; --ink: …; … }
//   [data-theme="dark"]  { … }
//
// Because the rules sit AFTER the base stylesheet in the cascade but use
// the same selector specificity, overrides win on equal specificity.

import { ref, watch } from 'vue'

export type ThemeMode = 'light' | 'dark'

export const PALETTE_KEYS = [
  'paper',
  'paper-deep',
  'paper-card',
  'ink',
  'ink-soft',
  'mute',
  'rule',
  'hairline',
  'sage',
  'clay',
  'ochre',
  'cobalt'
] as const

export type PaletteKey = (typeof PALETTE_KEYS)[number]

export const PALETTE_DEFAULTS: Record<ThemeMode, Record<PaletteKey, string>> = {
  light: {
    paper: '#FAF7F0',
    'paper-deep': '#F1ECDE',
    'paper-card': '#FCFAF3',
    ink: '#15130E',
    'ink-soft': '#3A372F',
    mute: '#948C7C',
    rule: '#1E1B14',
    hairline: 'rgba(30, 27, 20, 0.14)',
    sage: '#5C7A52',
    clay: '#A03B2B',
    ochre: '#B8852F',
    cobalt: '#2C5282'
  },
  dark: {
    paper: '#15130E',
    'paper-deep': '#1E1B14',
    'paper-card': '#1B1812',
    ink: '#EDE7D6',
    'ink-soft': '#B8B0A0',
    mute: '#6A6557',
    rule: '#3A372F',
    hairline: 'rgba(237, 231, 214, 0.14)',
    sage: '#8FAE82',
    clay: '#D4604E',
    ochre: '#E2B158',
    cobalt: '#6090C2'
  }
}

export type PaletteOverrides = Partial<Record<PaletteKey, string>>
export interface PaletteState {
  light: PaletteOverrides
  dark: PaletteOverrides
}

const STORAGE_KEY = 'gt:palette'
const STYLE_ELEMENT_ID = 'palette-overrides'

export function emptyPalette(): PaletteState {
  return { light: {}, dark: {} }
}

export function loadPalette(): PaletteState {
  if (typeof localStorage === 'undefined') return emptyPalette()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyPalette()
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return emptyPalette()
    return {
      light: filterKnownKeys(parsed.light),
      dark: filterKnownKeys(parsed.dark)
    }
  } catch {
    return emptyPalette()
  }
}

function filterKnownKeys(input: unknown): PaletteOverrides {
  if (!input || typeof input !== 'object') return {}
  const known = new Set<string>(PALETTE_KEYS)
  const out: PaletteOverrides = {}
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (known.has(k) && typeof v === 'string' && v.length > 0) {
      out[k as PaletteKey] = v
    }
  }
  return out
}

export function savePalette(p: PaletteState): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
  } catch {
    /* ignore quota */
  }
}

/**
 * Build the CSS text for the style block. Returns '' when no overrides
 * exist in either mode — caller can use it to clear the block.
 */
export function paletteToCss(p: PaletteState): string {
  const parts: string[] = []
  for (const mode of ['light', 'dark'] as const) {
    const overrides = p[mode] ?? {}
    const decls = (Object.entries(overrides) as Array<[PaletteKey, string]>)
      .filter(([k, v]) => v && (PALETTE_KEYS as readonly string[]).includes(k))
      .map(([k, v]) => `  --${k}: ${v};`)
    if (decls.length > 0) {
      parts.push(`[data-theme="${mode}"] {\n${decls.join('\n')}\n}`)
    }
  }
  return parts.join('\n')
}

export function applyPalette(p: PaletteState): void {
  if (typeof document === 'undefined') return
  let el = document.getElementById(STYLE_ELEMENT_ID) as HTMLStyleElement | null
  if (!el) {
    el = document.createElement('style')
    el.id = STYLE_ELEMENT_ID
    document.head.appendChild(el)
  }
  el.textContent = paletteToCss(p)
}

// Module-level singleton so all consumers share state.
const palette = ref<PaletteState>(loadPalette())

watch(
  palette,
  next => {
    savePalette(next)
    applyPalette(next)
  },
  { deep: true }
)

/**
 * Called once at boot to apply persisted overrides before mount so the
 * first paint already has the right colors.
 */
export function initPalette(): void {
  applyPalette(palette.value)
}

export interface PaletteApi {
  palette: typeof palette
  /** Effective value for a key in the given mode (override → default). */
  effective(mode: ThemeMode, key: PaletteKey): string
  isOverridden(mode: ThemeMode, key: PaletteKey): boolean
  setValue(mode: ThemeMode, key: PaletteKey, value: string): void
  reset(mode: ThemeMode, key: PaletteKey): void
  resetMode(mode: ThemeMode): void
  resetAll(): void
  /** Replace state. Used by the JSON import path. */
  replace(next: PaletteState): void
}

export function usePalette(): PaletteApi {
  function effective(mode: ThemeMode, key: PaletteKey): string {
    return palette.value[mode]?.[key] ?? PALETTE_DEFAULTS[mode][key]
  }
  function isOverridden(mode: ThemeMode, key: PaletteKey): boolean {
    return Boolean(palette.value[mode]?.[key])
  }
  function setValue(mode: ThemeMode, key: PaletteKey, value: string): void {
    const next = clonePalette(palette.value)
    next[mode] = { ...next[mode], [key]: value }
    palette.value = next
  }
  function reset(mode: ThemeMode, key: PaletteKey): void {
    const next = clonePalette(palette.value)
    const m = { ...next[mode] }
    delete m[key]
    next[mode] = m
    palette.value = next
  }
  function resetMode(mode: ThemeMode): void {
    const next = clonePalette(palette.value)
    next[mode] = {}
    palette.value = next
  }
  function resetAll(): void {
    palette.value = emptyPalette()
  }
  function replace(next: PaletteState): void {
    palette.value = {
      light: filterKnownKeys(next.light),
      dark: filterKnownKeys(next.dark)
    }
  }
  return {
    palette,
    effective,
    isOverridden,
    setValue,
    reset,
    resetMode,
    resetAll,
    replace
  }
}

function clonePalette(p: PaletteState): PaletteState {
  return {
    light: { ...p.light },
    dark: { ...p.dark }
  }
}
