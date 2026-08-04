<script setup lang="ts">
// Teil 1's Vortragsmittel yield display — the Teil 2 SprYield.vue equivalent
// over the Vortragsmittel bank (see CONTEXT.md → "Vortragsmittel", "Redemittel
// yield"). Kept as its OWN component rather than widening SprYield.vue: the
// two banks have disjoint Move sets (seven Vortrag Moves vs. six Diskussion
// Moves) and disjoint phrase shapes are avoided this way with no generic
// prop-typing gymnastics on the shared, already-tested component.
import { computed } from 'vue'
import {
  VORTRAG_MOVES, VORTRAG_MOVE_LABEL, SPRECHEN_VORTRAGSMITTEL, type VortragMove
} from '../../data/sprechenVortragsmittel'

const props = defineProps<{ usedIds: string[]; note?: string }>()

const columns = computed(() =>
  VORTRAG_MOVES.map((m: VortragMove) => {
    const phrases = SPRECHEN_VORTRAGSMITTEL.filter(r => r.move === m)
    return {
      move: m,
      labelDe: VORTRAG_MOVE_LABEL[m].de,
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
