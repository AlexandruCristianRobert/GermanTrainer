<script setup lang="ts">
import { computed } from 'vue'
import type { NounQuestion, NounQuizMode } from '../../composables/useNounQuiz'
import { usePagination } from '../../composables/usePagination'
import Pagination from '../../components/Pagination.vue'

const props = defineProps<{
  questions: NounQuestion[]
  score: number
  total: number
  mode: NounQuizMode
}>()

const pagination = usePagination(() => props.questions, 25)

defineEmits<{ (e: 'restart'): void; (e: 'retry-wrong'): void }>()

const pct = computed(() => props.total === 0 ? 0 : Math.round((props.score / props.total) * 100))
const wrongCount = computed(() => props.total - props.score)

const summary = computed(() => {
  if (pct.value >= 80) return 'Stark. Most of these are in your bones now.'
  if (pct.value >= 50) return 'Solid. A couple weak spots to revisit.'
  return 'Keep at it — the gendered articles are the slowest to internalise.'
})

const youLabel = computed(() => props.mode === 'gender' ? 'DU · YOU' : 'DU · YOU')
const correctLabel = computed(() => props.mode === 'gender' ? 'RICHTIG' : 'EXPECTED')

function expectedAnswer(q: NounQuestion): string {
  return props.mode === 'gender' ? q.noun.gender : q.noun.english
}
</script>

<template>
  <div class="page result-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Auswertung · Ergebnis</div>
        <div class="result-score">
          {{ score }}<span class="denom"> / {{ total }}</span>
        </div>
        <p class="section-subtitle">{{ summary }}</p>
      </div>
      <div class="result-actions">
        <button
          v-if="wrongCount > 0"
          class="btn btn-accent"
          type="button"
          @click="$emit('retry-wrong')"
        >
          Retry {{ wrongCount }} wrong <span aria-hidden="true">→</span>
        </button>
        <span v-else class="all-correct-banner">Alles richtig! 🎉</span>
        <button class="btn btn-ghost" type="button" @click="$emit('restart')">Setup another</button>
      </div>
    </header>

    <div class="verb-result-summary">
      <div class="vrs-cell is-correct">
        <div class="vrs-num">{{ score }}</div>
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
        v-for="(q, i) in pagination.slice.value"
        :key="i"
        class="verb-result-card"
        :class="q.isCorrect ? 'is-correct' : 'is-wrong'"
      >
        <div class="verb-result-num"># {{ String(pagination.start.value + i + 1).padStart(2, '0') }}</div>
        <div class="verb-result-prompt">
          <div class="vrp-german">
            <span class="prompt-gender-inline">{{ q.noun.gender }}</span> {{ q.noun.german }}
          </div>
          <div class="vrp-meta">
            <span>{{ q.noun.english }}</span><span class="vrp-dot">·</span>
            <span>{{ q.noun.group }}</span>
          </div>
        </div>

        <div class="verb-result-answers">
          <div class="verb-result-line">
            <span class="vrl-label">{{ youLabel }}</span>
            <span class="vrl-value">
              <span
                v-if="q.userAnswer"
                class="vr-stamp"
                :class="q.isCorrect ? 'vr-stamp-right' : 'vr-stamp-wrong'"
              >{{ q.userAnswer }}</span>
              <span v-else class="vr-stamp vr-stamp-empty">—</span>
            </span>
          </div>
          <div v-if="!q.isCorrect" class="verb-result-line">
            <span class="vrl-label">{{ correctLabel }}</span>
            <span class="vrl-value">
              <span class="vr-stamp vr-stamp-right">{{ expectedAnswer(q) }}</span>
            </span>
          </div>
        </div>

        <div class="verb-result-mark">{{ q.isCorrect ? '✓' : '✗' }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.result-page { max-width: 880px; }
.result-actions { display: flex; gap: 12px; flex-wrap: wrap; }

.prompt-gender-inline {
  color: var(--mute);
  font-style: italic;
  font-weight: 400;
  margin-right: 2px;
}

.vrs-pct-suffix { font-size: 18px; color: var(--mute); margin-left: 2px; }

.all-correct-banner {
  font-family: var(--font-display);
  font-style: italic;
  font-size: 18px;
  color: var(--success);
  align-self: center;
}

@media (max-width: 720px) {
  .result-actions { flex-direction: column; align-items: stretch; }
  .result-actions .btn { justify-content: center; }
}
</style>
