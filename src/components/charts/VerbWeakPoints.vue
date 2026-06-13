<script setup lang="ts">
import { computed } from 'vue'
import type { QuizHistoryEntry } from '../../composables/useQuizHistory'
import { computeVerbWeakPoints } from '../../composables/useVerbSentenceStats'

const props = defineProps<{ entries: QuizHistoryEntry[] }>()

const wp = computed(() => computeVerbWeakPoints(props.entries))
const topVerbs = computed(() => wp.value.weakVerbs.filter(v => v.wrong > 0).slice(0, 8))
const topNouns = computed(() => wp.value.weakNouns.filter(n => n.wrong > 0).slice(0, 8))
const hasData = computed(() => topVerbs.value.length > 0 || topNouns.value.length > 0)
function pct(wrong: number, seen: number): number { return seen > 0 ? Math.round((wrong / seen) * 100) : 0 }
</script>

<template>
  <section v-if="hasData" class="card weak-card">
    <h3 class="weak-title">Verb weak points</h3>
    <p class="weak-sub">Highest miss-rate from your recent verb sentence runs.</p>
    <div class="weak-cols">
      <div v-if="topVerbs.length" class="weak-col">
        <div class="weak-h">Verbs</div>
        <ul class="weak-list">
          <li v-for="v in topVerbs" :key="v.verbKey"><span class="weak-key">{{ v.verbKey }}</span><span class="weak-rate">{{ pct(v.wrong, v.seen) }}% · {{ v.wrong }}/{{ v.seen }}</span></li>
        </ul>
      </div>
      <div v-if="topNouns.length" class="weak-col">
        <div class="weak-h">Nouns</div>
        <ul class="weak-list">
          <li v-for="n in topNouns" :key="n.nounKey"><span class="weak-key">{{ n.nounKey }}</span><span class="weak-rate">{{ pct(n.wrong, n.seen) }}% · {{ n.wrong }}/{{ n.seen }}</span></li>
        </ul>
      </div>
    </div>
  </section>
</template>

<style scoped>
.weak-card { padding: 20px; }
.weak-title { font-family: var(--font-display); margin: 0 0 4px; }
.weak-sub { font-size: 13px; color: var(--mute); margin: 0 0 16px; }
.weak-cols { display: flex; gap: 32px; flex-wrap: wrap; }
.weak-col { flex: 1; min-width: 200px; }
.weak-h { font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--mute); margin-bottom: 8px; }
.weak-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
.weak-list li { display: flex; justify-content: space-between; gap: 12px; font-size: 14px; }
.weak-key { font-family: var(--font-body); color: var(--ink); }
.weak-rate { font-family: var(--font-mono); font-size: 12px; color: var(--danger); }
</style>
