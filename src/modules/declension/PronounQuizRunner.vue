<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePronounQuiz } from '../../composables/useDeclensionQuiz'
import { saveQuizRun } from '../../composables/useQuizHistory'
import { PRONOUNS, PRONOUN_CATEGORIES, type PronounCategory, type PronounEntry } from '../../data/pronouns'
import type { DeclCase } from '../../data/declension'
import { createPool, type FieldMatchers } from '../../data/pool'

const CASE_SHORT: Record<DeclCase, string> = {
  nominative: 'NOM.',
  accusative: 'AKK.',
  dative: 'DAT.',
  genitive: 'GEN.'
}

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const error = ref<string | null>(null)
let quiz: ReturnType<typeof usePronounQuiz> | null = null
const ready = ref(false)
const inputs = ref<string[]>([])
const submitted = ref(false)
const startedAtMs = ref<number>(0)
const selectedCategories = ref<PronounCategory[]>([])
const historySaved = ref(false)

function csv<T extends string>(raw: unknown, allowed: readonly T[]): T[] {
  if (typeof raw !== 'string' || raw.length === 0) return [...allowed]
  const set = new Set<string>(allowed)
  return raw.split(',').map(s => s.trim()).filter((x): x is T => set.has(x))
}

type PronounFilter = { categories?: PronounCategory[] }
const pronounPool = createPool<PronounEntry, PronounFilter>(PRONOUNS, {
  categories: p => p.category,
} satisfies FieldMatchers<PronounEntry, PronounFilter>)

onMounted(() => {
  const count = Math.max(1, parseInt((route.query.count as string) ?? '10', 10) || 10)
  const categories = csv<PronounCategory>(route.query.categories, PRONOUN_CATEGORIES)
  selectedCategories.value = categories
  try {
    const deck = pronounPool.sample(count, { categories })
    if (deck.length === 0) {
      error.value = 'Nothing to quiz on.'
    } else {
      quiz = usePronounQuiz(deck)
      ready.value = true
      resetInputs()
      startedAtMs.value = Date.now()
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load.'
  } finally {
    loading.value = false
  }
})

function resetInputs() {
  const q = quiz?.current.value
  inputs.value = q ? q.rows.map(() => '') : []
  submitted.value = false
}

const current = computed(() => (ready.value, quiz?.current.value ?? null))
const finished = computed(() => (ready.value, quiz?.finished.value ?? false))
const total = computed(() => (ready.value, quiz?.total.value ?? 0))
const questionIndex = computed(() => (ready.value, quiz?.currentIndex.value ?? 0))
const questions = computed(() => (ready.value, quiz?.questions.value ?? []))

const pips = computed(() => {
  const out: string[] = []
  for (let n = 0; n < total.value; n++) {
    if (n < questionIndex.value) {
      const q = questions.value[n]
      out.push(q && q.correctCount === q.totalCount ? 'done' : 'wrong')
    } else if (n === questionIndex.value && submitted.value) {
      const q = questions.value[n]
      out.push(q && q.correctCount === q.totalCount ? 'done' : 'wrong')
    } else if (n === questionIndex.value) {
      out.push('current')
    } else {
      out.push('')
    }
  }
  return out
})

function submit() {
  if (!quiz || submitted.value) return
  quiz.submit(inputs.value)
  submitted.value = true
}

function next() {
  if (!quiz) return
  const wasLast = questionIndex.value + 1 === total.value
  quiz.advance()
  if (!wasLast) {
    resetInputs()
    nextTick(() => {
      const first = document.querySelector<HTMLInputElement>('.decl-input')
      first?.focus()
    })
  }
}

function skip() {
  if (!quiz || submitted.value) return
  quiz.skip()
  resetInputs()
}

function restart() { router.push({ name: 'declension-pronoun' }) }

// Save history + stash result once the quiz transitions to finished.
watch(finished, (now) => {
  if (!now || historySaved.value || !quiz) return
  historySaved.value = true
  const finishedAt = Date.now()
  saveQuizRun({
    type: 'decl-pronoun',
    startedAt: new Date(startedAtMs.value).toISOString(),
    finishedAt: new Date(finishedAt).toISOString(),
    durationMs: finishedAt - startedAtMs.value,
    count: quiz.totalRows.value,
    correct: quiz.correctRows.value,
    meta: {
      declPronounCategories: selectedCategories.value
    }
  })
  try {
    sessionStorage.setItem('gt:lastDeclPronoun', JSON.stringify({
      questions: quiz.questions.value,
      totalRows: quiz.totalRows.value,
      correctRows: quiz.correctRows.value,
      totalEntries: quiz.total.value
    }))
  } catch { /* ignore */ }
  router.push({ name: 'declension-pronoun-result' })
})
</script>

<template>
  <div v-if="loading" class="page loading-state"><div class="micro-mark">Loading…</div></div>
  <div v-else-if="error" class="page">
    <div class="alert alert-danger">
      <span class="alert-label">Error</span>{{ error }}
    </div>
    <button class="btn btn-ghost" @click="restart">← Back to setup</button>
  </div>

  <div v-else-if="current" class="page">
    <div class="decl-quiz-stage">
      <div class="quiz-meta">
        <span class="quiz-counter">Frage {{ questionIndex + 1 }} · von {{ total }}</span>
        <button class="btn btn-quiet" type="button" @click="restart">End quiz</button>
      </div>

      <div class="quiz-progress-bar">
        <div v-for="(cls, i) in pips" :key="i" class="pip" :class="cls" />
      </div>

      <div class="prompt-card decl-prompt">
        <div class="prompt-german decl-prompt-german">{{ current.entry.nominative }}</div>
        <div v-if="current.entry.meta" class="decl-prompt-meta">{{ current.entry.meta }}</div>
        <div v-if="current.entry.english" class="decl-prompt-english">{{ current.entry.english }}</div>
      </div>

      <div class="decl-table" :class="{ submitted }">
        <div class="decl-rows-grid">
          <div v-for="(row, i) in current.rows" :key="i" class="decl-row-input">
            <span class="decl-case">{{ CASE_SHORT[row.case] }}</span>
            <template v-if="row.skipped">
              <span class="decl-skip-dash">—</span>
            </template>
            <template v-else>
              <input
                v-model="inputs[i]"
                class="input decl-input"
                type="text"
                :readonly="submitted"
                autocomplete="off"
                spellcheck="false"
                :style="submitted ? {
                  color: row.isCorrect ? 'var(--success)' : 'var(--danger)',
                  borderBottomColor: row.isCorrect ? 'var(--success)' : 'var(--danger)'
                } : undefined"
                @keyup.enter="submitted ? next() : submit()"
              />
              <div v-if="submitted" class="decl-feedback">
                <span v-if="row.isCorrect" class="ok-mark">✓</span>
                <span v-else class="row-expected">→ <strong>{{ row.expected }}</strong></span>
              </div>
            </template>
          </div>
        </div>
      </div>

      <div class="quiz-actions decl-actions">
        <span class="micro-mark">Press <span class="kbd">Enter</span> in any field to {{ submitted ? 'advance' : 'submit' }}</span>
        <div class="action-buttons">
          <button v-if="!submitted" class="btn btn-ghost" type="button" @click="skip">Skip</button>
          <button v-if="!submitted" class="btn btn-accent" type="button" @click="submit">
            Submit <span aria-hidden="true">→</span>
          </button>
          <button v-else class="btn btn-accent" type="button" @click="next">
            {{ questionIndex + 1 === total ? 'Finish quiz' : 'Next' }} <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.loading-state { text-align: center; padding-top: 120px; }

.decl-quiz-stage {
  max-width: 760px;
  margin: 0 auto;
}

.decl-prompt {
  padding: 40px 0 32px;
  text-align: center;
}
.decl-prompt-german {
  font-size: var(--decl-prompt-size, 56px);
  font-style: italic;
  line-height: 1.1;
}
.decl-prompt-meta {
  margin-top: 14px;
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--mute);
}
.decl-prompt-english {
  margin-top: 6px;
  font-style: italic;
  font-size: 14px;
  color: var(--mute);
}
@media (max-width: 720px) {
  .decl-prompt-german { font-size: calc(var(--decl-prompt-size, 56px) * 0.65); }
}

.decl-table {
  border: 1px solid var(--rule);
  border-radius: 2px;
  margin: 28px 0 16px;
  padding: 18px 22px;
  background: var(--paper-card);
}

.decl-rows-grid {
  display: grid;
  gap: 8px;
}

.decl-row-input {
  display: grid;
  grid-template-columns: 70px 1fr;
  align-items: baseline;
  gap: 14px;
  padding: 8px 0;
  border-bottom: 1px dotted var(--hairline);
}
.decl-row-input:last-child { border-bottom: none; }

.decl-case {
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.1em;
  color: var(--ink-soft);
}

.decl-input {
  font-family: var(--font-mono);
  font-size: 17px;
  padding: 4px 0;
  border-bottom-width: 1px;
  width: 100%;
}

.decl-skip-dash {
  font-family: var(--font-mono);
  font-size: 17px;
  color: var(--mute);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  border: none;
  padding: 4px 0;
}

.decl-feedback {
  grid-column: 2 / 3;
  font-family: var(--font-mono);
  font-size: 12px;
  margin-top: 2px;
}
.ok-mark { color: var(--success); font-weight: 600; }
.row-expected { color: var(--danger); }

.decl-actions {
  margin-top: 24px;
}
.action-buttons {
  display: flex;
  gap: 12px;
}

@media (max-width: 720px) {
  .decl-row-input { grid-template-columns: 60px 1fr; gap: 10px; }
  .decl-input { font-size: 16px; }
}
</style>
