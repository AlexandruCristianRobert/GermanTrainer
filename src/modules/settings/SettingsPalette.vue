<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  usePalette,
  PALETTE_KEYS,
  PALETTE_DEFAULTS,
  type PaletteKey,
  type ThemeMode,
  type PaletteState
} from '../../composables/usePalette'

const {
  palette,
  effective,
  isOverridden,
  setValue,
  reset,
  resetMode,
  resetAll,
  replace
} = usePalette()

const mode = ref<ThemeMode>('light')

const importing = ref(false)
const importText = ref('')
const importError = ref<string | null>(null)
const copyFlash = ref(false)

function isHex(v: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(v)
}

function onColorPick(key: PaletteKey, e: Event) {
  const v = (e.target as HTMLInputElement).value
  setValue(mode.value, key, v)
}

function onHexInput(key: PaletteKey, e: Event) {
  const v = (e.target as HTMLInputElement).value
  setValue(mode.value, key, v)
}

function copyAsJson() {
  const txt = JSON.stringify(palette.value, null, 2)
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(txt).then(() => {
      copyFlash.value = true
      setTimeout(() => { copyFlash.value = false }, 1600)
    })
  }
}

function tryImport() {
  try {
    const parsed: unknown = JSON.parse(importText.value)
    if (!parsed || typeof parsed !== 'object') throw new Error('Expected an object')
    const obj = parsed as Record<string, unknown>
    let next: PaletteState
    if ('light' in obj || 'dark' in obj) {
      next = {
        light: {
          ...palette.value.light,
          ...((obj.light ?? {}) as PaletteState['light'])
        },
        dark: {
          ...palette.value.dark,
          ...((obj.dark ?? {}) as PaletteState['dark'])
        }
      }
    } else {
      next = {
        light: { ...palette.value.light },
        dark: { ...palette.value.dark }
      }
      next[mode.value] = {
        ...next[mode.value],
        ...(obj as PaletteState['light'])
      }
    }
    replace(next)
    importing.value = false
    importText.value = ''
    importError.value = null
  } catch (err) {
    importError.value = err instanceof Error ? err.message : 'Invalid JSON'
  }
}

function onResetAll() {
  if (window.confirm('Reset both light and dark palettes to defaults?')) {
    resetAll()
  }
}

const rows = computed(() =>
  PALETTE_KEYS.map(key => {
    const v = effective(mode.value, key)
    return {
      key,
      value: v,
      overridden: isOverridden(mode.value, key),
      isHexValue: isHex(v),
      placeholder: PALETTE_DEFAULTS[mode.value][key]
    }
  })
)
</script>

<template>
  <section>
    <!-- ── Mode switch ─────────────────────────────────────────── -->
    <div class="field">
      <div class="field-row">
        <div class="field-label">Apply to theme</div>
        <span class="editing-tag">editing <strong>{{ mode }}</strong></span>
      </div>
      <div class="segmented">
        <button
          type="button"
          :class="{ active: mode === 'light' }"
          @click="mode = 'light'"
        >Light</button>
        <button
          type="button"
          :class="{ active: mode === 'dark' }"
          @click="mode = 'dark'"
        >Dark</button>
      </div>
    </div>

    <!-- ── Palette grid ────────────────────────────────────────── -->
    <div class="palette-grid">
      <div v-for="r in rows" :key="r.key" class="palette-row">
        <div class="palette-key">
          <span class="palette-swatch" :style="{ background: r.value }" />
          <code>--{{ r.key }}</code>
          <span v-if="r.overridden" class="edited-mark">edited</span>
        </div>
        <div class="palette-controls">
          <input
            v-if="r.isHexValue"
            type="color"
            class="palette-color-picker"
            :value="r.value"
            :aria-label="`Pick ${r.key} color`"
            @input="onColorPick(r.key, $event)"
          />
          <input
            type="text"
            class="input palette-hex-input"
            :value="r.value"
            :placeholder="r.placeholder"
            @input="onHexInput(r.key, $event)"
          />
          <button
            v-if="r.overridden"
            type="button"
            class="btn btn-quiet"
            title="Reset to default"
            @click="reset(mode, r.key)"
          >↺</button>
        </div>
      </div>
    </div>

    <!-- ── Live preview ────────────────────────────────────────── -->
    <div class="palette-preview">
      <div class="palette-preview-label">Live preview</div>
      <div class="palette-preview-card">
        <div class="palette-preview-title">Aa</div>
        <div class="palette-preview-body">
          <p>
            <strong>Editorial sample.</strong> Paper bg, ink text. <em>Italic for soft.</em>
          </p>
          <div class="tag-row">
            <span class="tag tag-cobalt">der</span>
            <span class="tag tag-clay">die</span>
            <span class="tag tag-ochre">das</span>
            <span class="tag tag-accent">accent</span>
          </div>
          <button type="button" class="btn btn-accent" style="margin-top: 12px;">
            Sample CTA <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ── Actions ─────────────────────────────────────────────── -->
    <div class="palette-actions">
      <button
        type="button"
        class="btn btn-quiet"
        @click="importing = !importing"
      >
        {{ importing ? 'Close import' : 'Import JSON…' }}
      </button>
      <button
        type="button"
        class="btn btn-quiet"
        @click="copyAsJson"
      >Copy current as JSON</button>
      <span v-if="copyFlash" class="copy-flash">✓ Copied to clipboard.</span>
      <span class="spacer" />
      <button type="button" class="btn btn-ghost" @click="resetMode(mode)">
        Reset {{ mode }}
      </button>
      <button type="button" class="btn btn-ghost btn-danger" @click="onResetAll">
        Reset all
      </button>
    </div>

    <!-- ── Import box ─────────────────────────────────────────── -->
    <div v-if="importing" class="import-box">
      <div class="field-label" style="margin-bottom: 8px;">Paste palette JSON</div>
      <p class="import-blurb">
        Accepts either the full shape <code>{ "light": {…}, "dark": {…} }</code>
        or a flat object of token overrides for the currently-edited mode.
      </p>
      <textarea
        v-model="importText"
        class="palette-json-input"
        rows="8"
        placeholder='{ "paper": "#FAF7F0", "ink": "#15130E", "sage": "#5C7A52" }'
        @input="importError = null"
      />
      <div v-if="importError" class="alert alert-danger" style="margin-top: 10px;">
        <span class="alert-label">Parse error</span>
        {{ importError }}
      </div>
      <button type="button" class="btn btn-accent" style="margin-top: 12px;" @click="tryImport">
        Apply import
      </button>
    </div>
  </section>
</template>

<style scoped>
.field-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.editing-tag {
  font-size: 12px;
  color: var(--mute);
  font-style: italic;
}
.editing-tag strong {
  color: var(--accent);
  text-transform: capitalize;
}
.copy-flash {
  font-family: var(--font-display);
  font-style: italic;
  color: var(--success);
  font-size: 14px;
}
.import-box { margin-top: 18px; }
.import-blurb {
  font-size: 13px;
  color: var(--ink-soft);
  font-style: italic;
  margin: 0 0 10px 0;
}
.import-blurb code {
  font-family: var(--font-mono);
  font-size: 12px;
}
</style>
