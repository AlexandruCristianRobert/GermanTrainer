<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { sampleTwoWayExamples } from '../../composables/usePrepositions'
import { useTwoWayQuiz, type TwoWayPick } from '../../composables/usePrepositionQuiz'
import { saveQuizRun } from '../../composables/useQuizHistory'
import type { Preposition, PrepositionExample } from '../../data/prepositions'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const error = ref<string | null>(null)
let quiz: ReturnType<typeof useTwoWayQuiz> | null = null
const ready = ref(false)
const startedAt = ref<number>(0)
const historySaved = ref(false)
const submitted = ref(false)

onMounted(() => {
  const count = Math.max(1, parseInt((route.query.count as string) ?? '10', 10) || 10)
  try {
    const pairs = sampleTwoWayExamples(count)
    if (pairs.length === 0) {
      error.value = 'No two-way examples available.'
    } else {
      quiz = useTwoWayQuiz(pairs)
      ready.value = true
      startedAt.value = Date.now()
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load.'
  } finally {
    loading.value = false
  }
})

const current = computed<{ prep: Preposition; example: PrepositionExample } | null>(() => {
  if (!ready.value || !quiz) return null
  const q = quiz.current.value
  return q ? { prep: q.prep, example: q.example } : null
})

const finished = computed(() => ready.value && quiz?.finished.value === true)
const currentIsCorrect = computed(() => {
  if (!ready.value || !quiz) return null
  return quiz.current.value?.isCorrect ?? null
})

function pick(value: TwoWayPick) {
  if (!quiz || submitted.value) return
  quiz.pick(value)
  submitted.value = true
}
function next() {
  if (!quiz) return
  quiz.advance()
  submitted.value = false
}

// Save history once when finished.
watch(finished, (now) => {
  if (!now || !quiz || historySaved.value) return
  historySaved.value = true
  const finishedAt = Date.now()
  saveQuizRun({
    type: 'prep-two-way',
    startedAt: new Date(startedAt.value).toISOString(),
    finishedAt: new Date(finishedAt).toISOString(),
    durationMs: finishedAt - startedAt.value,
    count: quiz.total.value,
    correct: quiz.score.value,
    meta: {}
  })
})

function restart() { router.push({ name: 'prepositions-twoway' }) }
function endQuiz() { router.push({ name: 'prepositions-twoway' }) }
</script>

<template>
  <div v-if="loading" class="page loading-state"><div class="micro-mark">Loading…</div></div>

  <div v-else-if="error" class="page">
    <div class="alert alert-danger"><span class="alert-label">Error</span>{{ error }}</div>
    <button class="btn btn-ghost" @click="restart">← Back to setup</button>
  </div>

  <div v-else-if="finished && quiz" class="page result-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Auswertung · Wechsel</div>
        <div class="result-score">
          {{ quiz.score.value }}<span class="denom"> / {{ quiz.total.value }}</span>
        </div>
        <p class="section-subtitle">
          The motion-vs-location distinction is the hardest B1 rule. Misses below are worth re-reading slowly.
        </p>
      </div>
      <div class="result-actions">
        <button class="btn btn-ghost" type="button" @click="restart">Setup another</button>
        <button class="btn btn-accent" type="button" @click="restart">Start another quiz <span aria-hidden="true">→</span></button>
      </div>
    </header>

    <div class="result-list">
      <div v-for="(q, i) in quiz.questions.value" :key="i" class="result-row">
        <div class="german">
          <span class="prep-result-prep">{{ q.prep.german }}</span>
          <div class="prep-result-sentence">{{ q.example.sentence }}</div>
          <div class="prep-result-gloss">{{ q.example.gloss }}</div>
        </div>
        <div class="answers">
          you picked:
          <strong :style="q.isCorrect ? 'color: var(--success)' : 'color: var(--danger)'">
            {{ q.picked ?? '—' }}
          </strong>
          <span v-if="!q.isCorrect"> · correct: <strong>{{ q.example.usedCase }}</strong></span>
        </div>
        <div>
          <span v-if="q.isCorrect" class="tag" style="background: var(--success-tint); color: var(--success)">✓</span>
          <span v-else class="tag" style="background: var(--danger-tint); color: var(--danger)">✗</span>
        </div>
      </div>
    </div>
  </div>

  <div v-else-if="current && quiz" class="page">
    <div class="quiz-card">
      <div class="quiz-meta">
        <span class="quiz-counter">Satz {{ quiz.currentIndex.value + 1 }} · von {{ quiz.total.value }}</span>
        <button class="btn btn-quiet" type="button" @click="endQuiz">End quiz</button>
      </div>

      <div class="prep-prompt">
        <span class="prep-prompt-word">{{ current.prep.german }}</span>
        <span class="prep-prompt-case">two-way · acc. or dat.?</span>
      </div>

      <div class="prompt-card">
        <div class="prep-sentence" :style="{ fontSize: 'var(--noun-prompt-size, 48px)' }">
          {{ current.example.sentence }}
        </div>
        <div class="prep-gloss">{{ current.example.gloss }}</div>
      </div>

      <div class="twoway-row">
        <button
          type="button"
          class="twoway-btn"
          :disabled="submitted"
          @click="pick('accusative')"
        >
          <span class="twoway-btn-de">Akkusativ</span>
          <span class="twoway-btn-en">Wohin? · motion</span>
        </button>
        <button
          type="button"
          class="twoway-btn"
          :disabled="submitted"
          @click="pick('dative')"
        >
          <span class="twoway-btn-de">Dativ</span>
          <span class="twoway-btn-en">Wo? · location</span>
        </button>
      </div>

      <div v-if="submitted" class="prep-feedback">
        <template v-if="currentIsCorrect">
          <span class="prep-feedback-mark prep-feedback-ok">✓ Richtig — {{ current.example.usedCase }}.</span>
        </template>
        <template v-else>
          <span class="prep-feedback-mark prep-feedback-bad">✗ Korrekt: <strong>{{ current.example.usedCase }}</strong>.</span>
        </template>
        <button type="button" class="btn btn-accent" style="margin-top: 16px;" @click="next">
          {{ quiz.currentIndex.value + 1 >= quiz.total.value ? 'Finish quiz' : 'Next' }} <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.loading-state { text-align: center; padding-top: 120px; }
.result-page { max-width: 880px; }
.result-actions { display: flex; gap: 12px; flex-wrap: wrap; }

.quiz-card { max-width: 720px; margin: 0 auto; }
.quiz-meta { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 32px; }
.quiz-counter {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--mute);
}

.prep-prompt { text-align: center; margin-bottom: 8px; }
.prep-prompt-word {
  font-family: var(--font-display);
  font-weight: 500;
  font-size: 28px;
  color: var(--accent);
  margin-right: 12px;
}
.prep-prompt-case {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--mute);
}

.prep-sentence {
  font-family: var(--font-display);
  font-weight: 500;
  line-height: 1.3;
  letter-spacing: -0.005em;
  color: var(--ink);
  text-align: center;
}
.prep-gloss {
  font-family: var(--font-body);
  font-style: italic;
  font-size: 18px;
  color: var(--ink-soft);
  margin-top: 14px;
  text-align: center;
}

.twoway-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-top: 36px;
}
.twoway-btn {
  background: var(--paper-card);
  border: 1px solid var(--rule);
  border-radius: 4px;
  padding: 36px 24px;
  cursor: pointer;
  text-align: center;
  transition: all .15s;
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
}
.twoway-btn:not(:disabled):hover {
  transform: translateY(-2px);
  border-color: var(--accent);
  background: var(--accent-wash);
}
.twoway-btn-de {
  font-family: var(--font-display);
  font-style: italic;
  font-weight: 500;
  font-size: 36px;
  color: var(--ink);
}
.twoway-btn-en {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--mute);
}

.prep-feedback {
  margin-top: 18px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.prep-feedback-mark { font-family: var(--font-display); font-style: italic; font-size: 17px; }
.prep-feedback-ok { color: var(--success); }
.prep-feedback-bad { color: var(--danger); }

.prep-result-prep {
  font-family: var(--font-display);
  font-weight: 500;
  font-size: 18px;
  color: var(--accent);
  margin-right: 10px;
}
.prep-result-sentence {
  font-family: var(--font-display);
  font-size: 16px;
  margin-top: 6px;
}
.prep-result-gloss {
  font-family: var(--font-body);
  font-style: italic;
  font-size: 13px;
  color: var(--ink-soft);
  margin-top: 2px;
}
</style>
