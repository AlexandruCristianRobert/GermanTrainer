<script setup lang="ts">
import { computed } from 'vue'
import { wrongCasePreps, type CaseQuestion } from '../../composables/usePrepositionQuiz'
import RetryModal from '../../components/RetryModal.vue'

const props = defineProps<{
  questions: CaseQuestion[]
  score: number
  total: number
}>()

defineEmits<{ (e: 'restart'): void; (e: 'retry-wrong'): void }>()

const pct = computed(() => props.total === 0 ? 0 : Math.round((props.score / props.total) * 100))
const wrongCount = computed(() => wrongCasePreps(props.questions).length)

const summary = computed(() => {
  if (pct.value >= 80) return 'Stark. The case rules are sticking.'
  if (pct.value >= 50) return 'Solid. The two-way ones are the trickiest — keep at them.'
  return 'Worth another pass. Memorise the four lists from /prepositions/list.'
})
</script>

<template>
  <div class="page result-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Auswertung · Kasus</div>
        <div class="result-score">{{ score }}<span class="denom"> / {{ total }}</span></div>
        <p class="section-subtitle">{{ summary }}</p>
      </div>
      <div class="result-actions">
        <button v-if="wrongCount > 0" class="btn btn-accent" type="button" @click="$emit('retry-wrong')">
          Retry {{ wrongCount }} wrong <span aria-hidden="true">→</span>
        </button>
        <span v-else class="all-correct-banner">Alles richtig! 🎉</span>
        <button class="btn btn-ghost" type="button" @click="$emit('restart')">Setup another</button>
      </div>
    </header>

    <div class="result-list">
      <div v-for="(q, i) in questions" :key="i" class="result-row">
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

    <RetryModal :wrong-count="wrongCount" item-label="prepositions" @retry="$emit('retry-wrong')" />
  </div>
</template>

<style scoped>
.result-page { max-width: 880px; }
.result-actions { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
.all-correct-banner {
  font-family: var(--font-display);
  font-style: italic;
  font-size: 18px;
  color: var(--success);
}
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
