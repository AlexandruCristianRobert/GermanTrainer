<script setup lang="ts">
import { computed } from 'vue'
import type { QuizHistoryEntry } from '../../composables/useQuizHistory'
import { computeDacWeakPoints } from '../../composables/useDacSentenceStats'

const props = defineProps<{ entries: QuizHistoryEntry[] }>()

const wp = computed(() => computeDacWeakPoints(props.entries))
const topCollocs = computed(() => wp.value.weakCollocs.filter(c => c.wrong > 0).slice(0, 8))
const topPreps = computed(() => wp.value.weakPreps.filter(p => p.wrong > 0).slice(0, 8))
const hasData = computed(() => topCollocs.value.length > 0 || topPreps.value.length > 0)
function pct(wrong: number, seen: number): number { return seen > 0 ? Math.round((wrong / seen) * 100) : 0 }
</script>

<template>
  <section v-if="hasData" class="card weak-card">
    <h3 class="weak-title">Da-compound weak points</h3>
    <p class="weak-sub">Highest miss-rate from your recent EN→DE sentence runs.</p>
    <div v-if="topCollocs.length" class="weak-block">
      <div class="weak-h">Collocations</div>
      <ul class="weak-list">
        <li v-for="c in topCollocs" :key="c.collocId">
          <span class="weak-key">{{ c.label }}</span>
          <span class="weak-rate">{{ pct(c.wrong, c.seen) }}% · {{ c.wrong }}/{{ c.seen }}</span>
        </li>
      </ul>
    </div>
    <div v-if="topPreps.length" class="weak-block">
      <div class="weak-h">Prepositions</div>
      <div class="weak-chips">
        <span v-for="p in topPreps" :key="p.prepGerman" class="weak-chip">
          <span class="weak-chip-term">{{ p.prepGerman }}</span>
          <span class="weak-chip-rate">{{ pct(p.wrong, p.seen) }}% · {{ p.wrong }}/{{ p.seen }}</span>
        </span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.weak-card { padding: 20px; }
.weak-title { font-family: var(--font-display); margin: 0 0 4px; }
.weak-sub { font-size: 13px; color: var(--mute); margin: 0 0 16px; }
.weak-block + .weak-block { margin-top: 16px; }
.weak-h { font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--mute); margin-bottom: 8px; }
.weak-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
.weak-list li { display: flex; justify-content: space-between; gap: 12px; font-size: 14px; }
.weak-key { font-family: var(--font-body); color: var(--ink); }
.weak-rate { font-family: var(--font-mono); font-size: 12px; color: var(--danger); }
.weak-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.weak-chip {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  padding: 4px 10px;
  border: 1px solid var(--hairline);
  border-radius: 999px;
  font-size: 13px;
}
.weak-chip-term { font-family: var(--font-display); color: var(--ink); }
.weak-chip-rate { font-family: var(--font-mono); font-size: 11px; color: var(--danger); }
</style>
