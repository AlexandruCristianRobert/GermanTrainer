import { describe, test, expect } from 'vitest'
import {
  paletteToCss,
  PALETTE_KEYS,
  PALETTE_DEFAULTS,
  emptyPalette,
  type PaletteState
} from '../../src/composables/usePalette'

describe('paletteToCss', () => {
  test('empty palette produces empty string', () => {
    expect(paletteToCss(emptyPalette())).toBe('')
  })

  test('single-mode override produces one rule', () => {
    const state: PaletteState = {
      light: { paper: '#FFFFFF', ink: '#000000' },
      dark: {}
    }
    const css = paletteToCss(state)
    expect(css).toContain('[data-theme="light"]')
    expect(css).toContain('--paper: #FFFFFF')
    expect(css).toContain('--ink: #000000')
    expect(css).not.toContain('[data-theme="dark"]')
  })

  test('both modes produce two rules in order', () => {
    const state: PaletteState = {
      light: { paper: '#FFFFFF' },
      dark: { paper: '#000000' }
    }
    const css = paletteToCss(state)
    const lightIdx = css.indexOf('[data-theme="light"]')
    const darkIdx = css.indexOf('[data-theme="dark"]')
    expect(lightIdx).toBeGreaterThanOrEqual(0)
    expect(darkIdx).toBeGreaterThan(lightIdx)
  })

  test('unknown keys are filtered out', () => {
    const state = {
      light: { paper: '#FFF', 'evil-key': 'red' } as Record<string, string>,
      dark: {}
    } as unknown as PaletteState
    const css = paletteToCss(state)
    expect(css).toContain('--paper: #FFF')
    expect(css).not.toContain('evil-key')
  })

  test('empty-string values are filtered out', () => {
    const state: PaletteState = {
      light: { paper: '', ink: '#000' },
      dark: {}
    }
    const css = paletteToCss(state)
    expect(css).not.toContain('--paper')
    expect(css).toContain('--ink: #000')
  })
})

describe('PALETTE_KEYS + PALETTE_DEFAULTS', () => {
  test('every key has a light and dark default', () => {
    for (const k of PALETTE_KEYS) {
      expect(PALETTE_DEFAULTS.light[k]).toBeTruthy()
      expect(PALETTE_DEFAULTS.dark[k]).toBeTruthy()
    }
  })

  test('there are exactly 12 keys', () => {
    expect(PALETTE_KEYS).toHaveLength(12)
  })
})
