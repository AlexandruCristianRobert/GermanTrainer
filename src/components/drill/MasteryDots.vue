<script setup lang="ts">
import { computed } from 'vue'

// Port of the React `MasteryDots` component (drill-bits.jsx): five dots,
// denser than MasteryBars, used by the Da-Compounds ledger. `band === null`
// means "reference item, not tracked".
//
// styles-modules.css also defines a `.mdot i.half` half-step modifier that
// the React original never emits (it only ever passes an integer band). We
// support a fractional `band` here so the dot straddling the fractional
// boundary gets `.half` — whole-number bands behave identically to the
// React source.

const props = defineProps<{ band: number | null }>()

const dots = [0, 1, 2, 3, 4]

function dotClass(i: number): string {
  if (props.band === null || props.band === undefined) return ''
  const floor = Math.floor(props.band)
  if (i < floor) return 'on'
  if (i === floor && props.band % 1 !== 0) return 'half'
  return ''
}

const ariaLabel = computed(() => {
  if (props.band === null || props.band === undefined) return undefined
  return `Mastery ${props.band} of 5`
})
</script>

<template>
  <span v-if="band === null || band === undefined" class="mast-num">ref</span>
  <span v-else class="mdot" :title="`${band} / 5 mastery`" :aria-label="ariaLabel">
    <i v-for="i in dots" :key="i" :class="dotClass(i)" aria-hidden="true" />
  </span>
</template>
