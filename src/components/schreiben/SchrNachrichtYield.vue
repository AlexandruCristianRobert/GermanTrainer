<script setup lang="ts">
// Schreiben Teil 2's Nachrichtenmittel yield display — the SchrYield.vue /
// SprYield.vue / SprVortragYield.vue equivalent over the Nachrichtenmittel
// bank (see CONTEXT.md → "Nachrichtenmittel", "Redemittel yield"). Kept as its
// OWN component rather than widening SchrYield.vue: all four banks have
// disjoint Move sets, and disjoint phrase shapes are avoided this way with no
// generic prop-typing gymnastics on an already-tested shared component.
import { computed } from 'vue'
import {
  NACHRICHT_MOVES, NACHRICHT_MOVE_LABEL, SCHREIBEN_NACHRICHTENMITTEL, type NachrichtMove
} from '../../data/schreibenNachrichtenMittel'

const props = defineProps<{ usedIds: string[]; note?: string }>()

const columns = computed(() =>
  NACHRICHT_MOVES.map((m: NachrichtMove) => {
    const phrases = SCHREIBEN_NACHRICHTENMITTEL.filter(r => r.move === m)
    return {
      move: m,
      labelDe: NACHRICHT_MOVE_LABEL[m].de,
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
