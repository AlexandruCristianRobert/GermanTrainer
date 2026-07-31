<script setup lang="ts">
import { computed } from 'vue'

// Port of the React `Mastery` component (drill-bits.jsx): five upright
// strokes rising in height, `.on` from the left up to `band`. `band === null`
// means "reference item, not tracked" and renders only the caption.

const props = withDefaults(
  defineProps<{
    band: number | null
    attempts?: number | null
    showNum?: boolean
  }>(),
  {
    attempts: null,
    showNum: true,
  },
)

const strokes = [0, 1, 2, 3, 4]

const ariaLabel = computed(() => {
  if (props.band === null || props.band === undefined) return undefined
  const tail = props.attempts ? `${props.attempts} attempts` : 'new'
  return `Mastery ${props.band} of 5, ${tail}`
})
</script>

<template>
  <span v-if="band === null || band === undefined" class="mast-num">reference</span>
  <span v-else class="mast-wrap">
    <span class="mast" :title="`${band} / 5 mastery`" :aria-label="ariaLabel">
      <i
        v-for="i in strokes"
        :key="i"
        :class="{ on: i < band }"
        :style="{ height: (44 + i * 14) + '%' }"
        aria-hidden="true"
      />
    </span>
    <span v-if="showNum" class="mast-num">{{ attempts ? `${attempts} versucht` : 'neu' }}</span>
  </span>
</template>
