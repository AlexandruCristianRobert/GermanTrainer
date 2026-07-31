<script setup lang="ts">
import { computed } from 'vue'

// Port of the `.dw-dial` donut from DwHub in direction-words.jsx: a 56px SVG
// ring showing overall module progress as a percentage. The rotation to
// -90deg (so the fill starts at 12 o'clock) is a CSS rule on `.dw-dial svg`
// in styles-modules.css, hence the wrapping `.dw-dial` element here — this
// mirrors the React original's <div className="dw-dial"><svg>...</svg></div>
// structure rather than putting the class on the <svg> itself, which would
// leave that descendant selector unmatched.

const props = defineProps<{ pct: number }>()

const R = 25
const C = 2 * Math.PI * R

const dashoffset = computed(() => C * (1 - props.pct / 100))
const rounded = computed(() => Math.round(props.pct))
</script>

<template>
  <div class="dw-dial">
    <svg width="56" height="56" viewBox="0 0 56 56" role="img" :aria-label="`${rounded}% mastered`">
      <circle class="dw-dial-track" cx="28" cy="28" r="25" />
      <circle
        class="dw-dial-fill"
        cx="28"
        cy="28"
        r="25"
        :stroke-dasharray="C"
        :stroke-dashoffset="dashoffset"
      />
    </svg>
    <div class="dw-dial-num">{{ rounded }}%</div>
  </div>
</template>
