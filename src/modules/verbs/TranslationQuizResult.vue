<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { Verb } from '../../data/verbs'
import { usePagination } from '../../composables/usePagination'
import Pagination from '../../components/Pagination.vue'

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

const wrongCount = computed(() => (data.value?.total ?? 0) - (data.value?.correct ?? 0))

const pagination = usePagination(() => data.value?.graded ?? [], 25)

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

    <template v-if="data">
      <div class="verb-result-summary">
        <div class="vrs-cell is-correct">
          <div class="vrs-num">{{ data.correct }}</div>
          <div class="vrs-label">Richtig · correct</div>
        </div>
        <div class="vrs-cell is-wrong">
          <div class="vrs-num">{{ wrongCount }}</div>
          <div class="vrs-label">Falsch · missed</div>
        </div>
        <div class="vrs-cell">
          <div class="vrs-num">{{ pct }}<span class="vrs-pct-suffix">%</span></div>
          <div class="vrs-label">Quote · score</div>
        </div>
      </div>

      <Pagination :pagination="pagination" label="rows" :hide-page-size-below="25" />

      <div class="verb-result-list">
        <div
          v-for="(g, i) in pagination.slice.value"
          :key="i"
          class="verb-result-card"
          :class="g.correct ? 'is-correct' : 'is-wrong'"
        >
          <div class="verb-result-num"># {{ String(pagination.start.value + i + 1).padStart(2, '0') }}</div>
          <div class="verb-result-prompt">
            <div class="vrp-german">{{ g.verb.german }}</div>
            <div class="vrp-meta">
              <span>{{ g.verb.level }}</span><span class="vrp-dot">·</span>
              <span>{{ g.verb.type }}</span><span class="vrp-dot">·</span>
              <span>{{ g.verb.case }}</span>
            </div>
          </div>

          <div class="verb-result-answers">
            <div class="verb-result-line">
              <span class="vrl-label">DU · YOU</span>
              <span class="vrl-value">
                <span
                  v-if="g.input"
                  class="vr-stamp"
                  :class="g.correct ? 'vr-stamp-right' : 'vr-stamp-wrong'"
                >{{ g.input }}</span>
                <span v-else class="vr-stamp vr-stamp-empty">—</span>
              </span>
            </div>
            <div v-if="!g.correct" class="verb-result-line">
              <span class="vrl-label">RICHTIG</span>
              <span class="vrl-value">
                <span class="vr-stamp vr-stamp-right">{{ g.verb.english }}</span>
              </span>
            </div>
          </div>

          <div class="verb-result-mark">{{ g.correct ? '✓' : '✗' }}</div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.result-page { max-width: 880px; }
.result-actions { display: flex; gap: 12px; flex-wrap: wrap; }
.vrs-pct-suffix { font-size: 18px; color: var(--mute); margin-left: 2px; }

@media (max-width: 720px) {
  .result-actions { flex-direction: column; align-items: stretch; }
  .result-actions .btn { justify-content: center; }
}
</style>
