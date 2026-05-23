<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { CaseQuestion } from '../../composables/usePrepositionQuiz'

interface Stashed { questions: CaseQuestion[]; score: number; total: number }

const router = useRouter()
const data = ref<Stashed | null>(null)

onMounted(() => {
  try {
    const raw = sessionStorage.getItem('gt:lastPrepCase')
    if (raw) data.value = JSON.parse(raw) as Stashed
  } catch { /* ignore */ }
})

const pct = computed(() => {
  const d = data.value
  if (!d || d.total === 0) return 0
  return Math.round((d.score / d.total) * 100)
})

const summary = computed(() => {
  if (pct.value >= 80) return 'Stark. The case rules are sticking.'
  if (pct.value >= 50) return 'Solid. The two-way ones are the trickiest — keep at them.'
  return 'Worth another pass. Memorise the four lists from /prepositions/list.'
})

function restart() { router.push({ name: 'prepositions-case' }) }
function home() { router.push({ name: 'prepositions' }) }
</script>

<template>
  <div v-if="!data" class="page">
    <div class="alert alert-info">No recent quiz result to show.</div>
    <button class="btn btn-accent" @click="restart">Start a new quiz →</button>
  </div>

  <div v-else class="page result-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Auswertung · Kasus</div>
        <div class="result-score">{{ data.score }}<span class="denom"> / {{ data.total }}</span></div>
        <p class="section-subtitle">{{ summary }}</p>
      </div>
      <div class="result-actions">
        <button class="btn btn-ghost" type="button" @click="home">← Prepositions</button>
        <button class="btn btn-accent" type="button" @click="restart">Start another <span aria-hidden="true">→</span></button>
      </div>
    </header>

    <div class="result-list">
      <div v-for="(q, i) in data.questions" :key="i" class="result-row">
        <div class="german">
          <span class="prep-result-german">{{ q.prep.german }}</span>
          <div class="prep-result-en">{{ q.prep.english }}</div>
        </div>
        <div class="answers">
          your answer:
          <strong :style="q.isCorrect ? 'color: var(--success)' : 'color: var(--danger)'">
            {{ q.picked ?? '—' }}
          </strong>
          <span v-if="!q.isCorrect"> · correct: <strong>{{ q.prep.case }}</strong></span>
        </div>
        <div>
          <span v-if="q.isCorrect" class="tag" style="background: var(--success-tint); color: var(--success)">✓ Correct</span>
          <span v-else class="tag" style="background: var(--danger-tint); color: var(--danger)">✗ Missed</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.result-page { max-width: 880px; }
.result-actions { display: flex; gap: 12px; flex-wrap: wrap; }
.prep-result-german {
  font-family: var(--font-display);
  font-weight: 500;
  font-size: 20px;
}
.prep-result-en {
  font-family: var(--font-body);
  font-style: italic;
  font-size: 13px;
  color: var(--ink-soft);
  margin-top: 2px;
}
</style>
