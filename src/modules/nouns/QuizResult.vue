<script setup lang="ts">
import { computed } from 'vue'
import type { NounQuestion, NounQuizMode } from '../../composables/useNounQuiz'

const props = defineProps<{
  questions: NounQuestion[]
  score: number
  total: number
  mode: NounQuizMode
}>()

defineEmits<{ (e: 'restart'): void }>()

const pct = computed(() => props.total === 0 ? 0 : Math.round((props.score / props.total) * 100))

const summary = computed(() => {
  if (pct.value >= 80) return 'Stark. Most of these are in your bones now.'
  if (pct.value >= 50) return 'Solid. A couple weak spots to revisit.'
  return 'Keep at it — the gendered articles are the slowest to internalise.'
})
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
        <button class="btn btn-ghost" type="button" @click="$emit('restart')">Setup another</button>
        <button class="btn btn-accent" type="button" @click="$emit('restart')">
          Start another quiz <span aria-hidden="true">→</span>
        </button>
      </div>
    </header>

    <div class="result-list">
      <div v-for="(q, i) in questions" :key="i" class="result-row">
        <div class="german">
          <span class="german-gender">{{ q.noun.gender }}</span> {{ q.noun.german }}
          <div class="german-english">{{ q.noun.english }}</div>
        </div>
        <div class="answers">
          <template v-if="mode === 'gender'">
            your answer:
            <strong :style="q.isCorrect ? 'color: var(--success)' : 'color: var(--danger)'">
              {{ q.userAnswer || '—' }}
            </strong>
            <span v-if="!q.isCorrect"> · correct: <strong>{{ q.noun.gender }}</strong></span>
          </template>
          <template v-else>
            your answer:
            <strong :style="q.isCorrect ? 'color: var(--success)' : 'color: var(--danger)'">
              {{ q.userAnswer || '—' }}
            </strong>
            <span v-if="!q.isCorrect"> · correct: <strong>{{ q.noun.english }}</strong></span>
          </template>
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

.result-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.german-gender {
  color: var(--mute);
  font-style: italic;
  font-weight: 400;
}
.german-english {
  font-family: var(--font-body);
  font-style: italic;
  font-size: 14px;
  color: var(--ink-soft);
  font-weight: 400;
  margin-top: 2px;
}

.tag-success {
  background: var(--success-tint);
  color: var(--success);
}
.tag-danger {
  background: var(--danger-tint);
  color: var(--danger);
}

@media (max-width: 720px) {
  .result-actions { flex-direction: column; align-items: stretch; }
  .result-actions .btn { justify-content: center; }
}
</style>
