<script setup lang="ts">
// Redemittel yield display (CONTEXT.md → "Redemittel yield"). Used at three
// scopes with the same markup: the hub's lifetime figure, the runner rail's
// live figure, and the Auswertung's per-Discussion figure.
import { computed } from 'vue'
import { MOVES, MOVE_LABEL, SPRECHEN_REDEMITTEL, type Move } from '../../data/sprechenRedemittel'

const props = defineProps<{ usedIds: string[]; note?: string }>()

const columns = computed(() =>
  MOVES.map((m: Move) => {
    const phrases = SPRECHEN_REDEMITTEL.filter(r => r.move === m)
    return {
      move: m,
      labelDe: MOVE_LABEL[m].de,
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
