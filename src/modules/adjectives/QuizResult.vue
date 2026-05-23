<script setup lang="ts">
import { computed } from 'vue'
import type { AdjectiveQuestion } from '../../composables/useAdjectiveQuiz'

const props = defineProps<{
  questions: AdjectiveQuestion[]
  score: number
  total: number
}>()

defineEmits<{ (e: 'restart'): void }>()

const pct = computed(() => props.total === 0 ? 0 : Math.round((props.score / props.total) * 100))

const summary = computed(() => {
  if (pct.value >= 80) return 'Stark. Most of the endings are clicking.'
  if (pct.value >= 50) return 'Solid. A few inflections to revisit.'
  return 'Keep at it — adjective endings take a few hundred reps to internalise.'
})
</script>

<template>
  <div class="page result-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Auswertung · Adjektive</div>
        <div class="result-score">
          {{ score }}<span class="denom"> / {{ total }}</span>
        </div>
        <p class="section-subtitle">{{ summary }}</p>
      </div>
      <div class="result-actions">
        <button class="btn btn-accent" type="button" @click="$emit('restart')">
          Start another quiz <span aria-hidden="true">→</span>
        </button>
      </div>
    </header>

    <div class="result-list">
      <div v-for="(q, i) in questions" :key="i" class="result-row adj-result-row">
        <div class="sentence-cell">
          <div class="sentence-line">{{ q.item.sentence }}</div>
          <div class="form-line">
            <span class="form-base">base:</span> <strong>{{ q.item.adjective_base }}</strong>
            <span class="form-sep">·</span>
            <span class="form-base">inflected:</span> <strong>{{ q.item.adjective_inflected }}</strong>
          </div>
        </div>
        <div class="answers">
          your answer:
          <strong :style="q.isCorrect ? 'color: var(--success)' : 'color: var(--danger)'">
            {{ q.userAnswer || '—' }}
          </strong>
        </div>
        <div>
          <span v-if="q.isCorrect" class="tag tag-success">✓ Correct</span>
          <span v-else class="tag tag-danger">✗ Missed</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.result-page { max-width: 880px; }

.result-actions { display: flex; gap: 12px; flex-wrap: wrap; }

.adj-result-row {
  grid-template-columns: 1fr auto auto;
  gap: 18px;
}

.sentence-cell { min-width: 0; }
.sentence-line {
  font-family: var(--font-display);
  font-size: 17px;
  font-weight: 500;
  color: var(--ink);
}
.form-line {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--mute);
  margin-top: 4px;
  letter-spacing: 0.04em;
}
.form-base { color: var(--mute); }
.form-line strong {
  color: var(--ink-soft);
  font-weight: 500;
}
.form-sep { margin: 0 6px; }

.tag-success { background: var(--success-tint); color: var(--success); }
.tag-danger { background: var(--danger-tint); color: var(--danger); }

@media (max-width: 720px) {
  .adj-result-row { grid-template-columns: 1fr; gap: 4px; }
  .result-actions { flex-direction: column; align-items: stretch; }
  .result-actions .btn { justify-content: center; }
}
</style>
