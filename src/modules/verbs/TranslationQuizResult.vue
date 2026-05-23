<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { Verb } from '../../data/verbs'

interface GradedRow {
  verb: Verb
  input: string
  correct: boolean
}

interface Stashed {
  graded: GradedRow[]
  total: number
  correct: number
}

const router = useRouter()
const data = ref<Stashed | null>(null)

onMounted(() => {
  try {
    const raw = sessionStorage.getItem('gt:lastVerbTranslation')
    if (raw) data.value = JSON.parse(raw) as Stashed
  } catch { /* ignore */ }
})

const pct = computed(() => {
  if (!data.value || data.value.total === 0) return 0
  return Math.round((data.value.correct / data.value.total) * 100)
})

const summary = computed(() => {
  if (pct.value >= 80) return 'Stark. Most of these verbs are second nature now.'
  if (pct.value >= 50) return 'Solid. A few translations to revisit.'
  return 'Worth another pass — translations live in the long-term memory pile.'
})

function back() { router.push({ name: 'verbs-translation' }) }
function home() { router.push({ name: 'verbs' }) }
</script>

<template>
  <div class="page result-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Auswertung · Übersetzung</div>
        <template v-if="data">
          <div class="result-score">
            {{ data.correct }}<span class="denom"> / {{ data.total }}</span>
          </div>
          <p class="section-subtitle">{{ summary }}</p>
        </template>
        <template v-else>
          <h1 class="section-title">No result<em>.</em></h1>
          <p class="section-subtitle">
            Nothing to show — finish a verb translation quiz to land here with your score.
          </p>
        </template>
      </div>
      <div class="result-actions">
        <button class="btn btn-ghost" type="button" @click="home">← Verben</button>
        <button class="btn btn-accent" type="button" @click="back">
          Start another quiz <span aria-hidden="true">→</span>
        </button>
      </div>
    </header>

    <div v-if="data" class="result-list">
      <div v-for="(g, i) in data.graded" :key="i" class="result-row">
        <div class="german">
          {{ g.verb.german }}
          <div class="german-meta">{{ g.verb.level }} · {{ g.verb.type }}</div>
        </div>
        <div class="answers">
          your answer:
          <strong :style="g.correct ? 'color: var(--success)' : 'color: var(--danger)'">
            {{ g.input || '—' }}
          </strong>
          <span v-if="!g.correct"> · expected: <strong>{{ g.verb.english }}</strong></span>
        </div>
        <div>
          <span v-if="g.correct" class="tag tag-success">✓ Correct</span>
          <span v-else class="tag tag-danger">✗ Missed</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.result-page { max-width: 880px; }
.result-actions { display: flex; gap: 12px; flex-wrap: wrap; }

.german-meta {
  font-family: var(--font-body);
  font-style: italic;
  font-size: 13px;
  color: var(--mute);
  font-weight: 400;
  margin-top: 2px;
}

.tag-success { background: var(--success-tint); color: var(--success); }
.tag-danger { background: var(--danger-tint); color: var(--danger); }

@media (max-width: 720px) {
  .result-actions { flex-direction: column; align-items: stretch; }
  .result-actions .btn { justify-content: center; }
}
</style>
