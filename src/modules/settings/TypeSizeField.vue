<script setup lang="ts">
import type { PromptSizeSpec } from '../../composables/usePromptSizes'

defineProps<{
  label: string
  blurb?: string
  spec: PromptSizeSpec
  value: number
  scaleLeft?: string
  scaleMid?: string
  scaleRight?: string
}>()

defineEmits<{ (e: 'update:value', v: number): void }>()
</script>

<template>
  <div class="field">
    <div class="field-row">
      <div class="field-label">{{ label }}</div>
      <span class="micro-mark size-readout">{{ value }}<span class="px-suffix">px</span></span>
    </div>
    <p v-if="blurb" class="blurb">{{ blurb }}</p>
    <input
      type="range"
      class="range-slider"
      :min="spec.min"
      :max="spec.max"
      step="1"
      :value="value"
      @input="$emit('update:value', parseInt(($event.target as HTMLInputElement).value, 10))"
    />
    <div class="range-slider-scale">
      <span class="micro-mark">{{ scaleLeft ?? `${spec.min} · default` }}</span>
      <span class="micro-mark">{{ scaleMid ?? `${Math.round((spec.min + spec.max) / 2)} · medium` }}</span>
      <span class="micro-mark">{{ scaleRight ?? `${spec.max} · large` }}</span>
    </div>
    <div class="preset-row">
      <button
        v-for="p in spec.presets"
        :key="p.value"
        type="button"
        class="btn btn-quiet"
        @click="$emit('update:value', p.value)"
      >
        {{ p.label }} · {{ p.value }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.field-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.blurb {
  font-size: 14px;
  color: var(--ink-soft);
  font-style: italic;
  margin: 0 0 12px 0;
}
.size-readout { color: var(--ink-soft); }
.px-suffix { color: var(--mute); }
.preset-row {
  margin-top: 10px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
</style>
