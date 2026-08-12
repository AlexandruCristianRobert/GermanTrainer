<script setup lang="ts">
// Schreiben Teil 1's Schreibmittel yield display — the Sprechen SprYield.vue /
// SprVortragYield.vue equivalent over the Schreibmittel bank (see CONTEXT.md
// → "Schreibmittel", "Redemittel yield"). Kept as its OWN component rather
// than widening either Sprechen yield component: all three banks have
// disjoint Move sets, and disjoint phrase shapes are avoided this way with no
// generic prop-typing gymnastics on an already-tested shared component.
import { computed } from 'vue'
import {
  SCHREIB_MOVES, SCHREIB_MOVE_LABEL, SCHREIBEN_SCHREIBMITTEL, type SchreibMove
} from '../../data/schreibenMittel'

const props = defineProps<{ usedIds: string[]; note?: string }>()

const columns = computed(() =>
  SCHREIB_MOVES.map((m: SchreibMove) => {
    const phrases = SCHREIBEN_SCHREIBMITTEL.filter(r => r.move === m)
    return {
      move: m,
      labelDe: SCHREIB_MOVE_LABEL[m].de,
      phrases: phrases.map(p => ({ ...p, on: props.usedIds.includes(p.id) })),
      hit: phrases.filter(p => props.usedIds.includes(p.id)).length,
      total: phrases.length
    }
  })
)
</script>

<template>
  <div class="spr-yield">
    <div v-for="c in columns" :key="c.move" class="spr-ymove">
      <div class="spr-ymove-h">
        <span class="spr-ymove-t">{{ c.labelDe }}</span>
        <span class="spr-ymove-n spr-num">{{ c.hit }}/{{ c.total }}</span>
      </div>
      <div class="spr-ticks">
        <span v-for="p in c.phrases" :key="p.id" class="spr-tick" :class="{ on: p.on }"
          :title="p.phraseDe" />
      </div>
      <p v-if="c.hit === 0" class="spr-ymove-cold">{{ note ?? 'Nie benutzt.' }}</p>
    </div>
  </div>
</template>
