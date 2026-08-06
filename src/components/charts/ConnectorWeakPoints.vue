<script setup lang="ts">
import { computed } from 'vue'
import type { QuizHistoryEntry } from '../../composables/useQuizHistory'
import { computeConnectorWeakPoints } from '../../composables/useConnectorStats'

const props = defineProps<{ entries: QuizHistoryEntry[] }>()

const wp = computed(() => computeConnectorWeakPoints(props.entries))
const top = computed(() => wp.value.weakConnectors.filter(c => c.wrong > 0).slice(0, 8))
const hasData = computed(() => top.value.length > 0)
function pct(wrong: number, seen: number): number { return seen > 0 ? Math.round((wrong / seen) * 100) : 0 }
</script>

<template>
  <section v-if="hasData" class="card weak-card">
    <h3 class="weak-title">Connector weak points</h3>
    <p class="weak-sub">Highest miss-rate from your packed sentence runs.</p>
    <ul class="weak-list">
      <li v-for="c in top" :key="c.connId"><span class="weak-key">{{ c.word }}</span><span class="weak-rate">{{ pct(c.wrong, c.seen) }}% · {{ c.wrong }}/{{ c.seen }}</span></li>
    </ul>
  </section>
</template>

<style scoped>
.weak-card { padding: 20px; }
.weak-title { font-family: var(--font-display); margin: 0 0 4px; }
.weak-sub { font-size: 13px; color: var(--mute); margin: 0 0 16px; }
.weak-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
.weak-list li { display: flex; justify-content: space-between; gap: 12px; font-size: 14px; }
.weak-key { font-family: var(--font-body); color: var(--ink); }
.weak-rate { font-family: var(--font-mono); font-size: 12px; color: var(--danger); }
</style>
