<script setup lang="ts">
import { computed, nextTick, onMounted, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  useDaWoQuestionQuiz, sampleWoQuestionItems, splitWoScaffold,
  WO_QUESTION_PREPS,
} from '../../composables/useDaWoQuestionQuiz'
import { saveQuizRun } from '../../composables/useQuizHistory'
import { csv } from '../../composables/quizQuery'
import { shuffle } from '../../data/pool'
import { useBreakpoint } from '../../composables/useBreakpoint'
import RetryModal from '../../components/RetryModal.vue'
import {
  COLLOCATION_LEVELS, COLLOCATION_ROLES,
  type CollocationLevel, type CollocationRole,
} from '../../data/collocations'
import { prepColorStyle } from '../../data/prepColors'

const route = useRoute()
const router = useRouter()
const { isMobile } = useBreakpoint()

// ── quiz state ──────────────────────────────────────────────────────────────
const loading = ref(true)
const error = ref<string | null>(null)
const ready = ref(false)

type Quiz = ReturnType<typeof useDaWoQuestionQuiz>
const quiz = shallowRef<Quiz | null>(null)
const startedAtMs = ref(0)
const historySaved = ref(false)

// ── per-card state ──────────────────────────────────────────────────────────
const submitted = ref(false)
const typedInput = ref('')
const cardRef = ref<HTMLElement | null>(null)
const textInputRef = ref<HTMLInputElement | null>(null)
const nextBtnRef = ref<HTMLButtonElement | null>(null)

// ── retry modal state ───────────────────────────────────────────────────────
const showRetryModal = ref(false)
const dismissed = ref(false)

// ── mount ───────────────────────────────────────────────────────────────────
onMounted(() => {
  const count = Math.max(1, parseInt((route.query.count as string) ?? '10', 10) || 10)
  const levels = csv<CollocationLevel>(route.query.levels, COLLOCATION_LEVELS)
  const roles = csv<CollocationRole>(route.query.roles, COLLOCATION_ROLES)
  const preps = csv<string>(route.query.preps, WO_QUESTION_PREPS)

  try {
    const items = sampleWoQuestionItems(count, { levels, roles, preps })
    if (items.length === 0) {
      error.value = 'Nothing to drill — adjust your filters.'
    } else {
      quiz.value = useDaWoQuestionQuiz(items)
      startedAtMs.value = Date.now()
      ready.value = true
      resetInputs()
      nextTick(focusInput)
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load.'
  } finally {
    loading.value = false
  }
})

function resetInputs() {
  submitted.value = false
  typedInput.value = ''
}

function focusInput() {
  textInputRef.value?.focus()
}

// ── computed from quiz ───────────────────────────────────────────────────────
const current = computed(() => ready.value ? quiz.value?.current.value ?? null : null)
const finished = computed(() => ready.value ? quiz.value?.finished.value ?? false : false)
const total = computed(() => ready.value ? quiz.value?.total.value ?? 0 : 0)
const questionIndex = computed(() => ready.value ? quiz.value?.currentIndex.value ?? 0 : 0)
const score = computed(() => ready.value ? quiz.value?.score.value ?? 0 : 0)
const wrongItems = computed(() => ready.value ? quiz.value?.wrongItems.value ?? [] : [])
const questions = computed(() => ready.value ? quiz.value?.questions.value ?? [] : [])

const pips = computed(() => {
  const out: string[] = []
  for (let n = 0; n < total.value; n++) {
    if (n < questionIndex.value) {
      out.push(questions.value[n]?.isCorrect ? 'done' : 'wrong')
    } else if (n === questionIndex.value && submitted.value) {
      out.push(questions.value[n]?.isCorrect ? 'done' : 'wrong')
    } else if (n === questionIndex.value) {
      out.push('current')
    } else {
      out.push('')
    }
  }
  return out
})

// The scaffold's leading gap is always first (dataset invariant); only the tail
// after "___ " remains to render next to the gap/answer.
const scaffoldPost = computed(() => current.value ? splitWoScaffold(current.value.item).post : '')

/** English label for the reveal's kind tag. */
function kindLabel(kind: 'thing' | 'person'): string {
  return kind === 'thing' ? 'Sache' : 'Person'
}

// ── actions ──────────────────────────────────────────────────────────────────
function submit() {
  if (!quiz.value || submitted.value) return
  quiz.value.submitText(typedInput.value)
  submitted.value = true
  nextTick(() => nextBtnRef.value?.focus())
}

function next() {
  if (!quiz.value) return
  quiz.value.advance()
  resetInputs()
  if (!quiz.value.finished.value) nextTick(focusInput)
}

// Record the main round once; retry rounds are practice, never a Run (ADR-0010).
function recordRun() {
  if (historySaved.value || !quiz.value || quiz.value.total.value === 0) return
  historySaved.value = true
  const finishedAt = Date.now()
  const qs = quiz.value.questions.value
  saveQuizRun({
    type: 'dac-wo-question',
    startedAt: new Date(startedAtMs.value).toISOString(),
    finishedAt: new Date(finishedAt).toISOString(),
    durationMs: finishedAt - startedAtMs.value,
    count: quiz.value.total.value,
    correct: quiz.value.score.value,
    meta: {
      levels: Array.from(new Set(qs.map(q => q.colloc.level))).sort(),
      roles: Array.from(new Set(qs.map(q => q.colloc.role))).sort(),
      preps: Array.from(new Set(qs.map(q => q.colloc.preposition))).sort(),
    },
  })
}

watch(finished, (now) => {
  if (now && ready.value) {
    recordRun()
    if (wrongItems.value.length > 0 && !dismissed.value) {
      showRetryModal.value = true
    }
  }
})

function retryWrong() {
  showRetryModal.value = false
  if (!quiz.value) return
  const wrong = wrongItems.value
  if (wrong.length === 0) return
  quiz.value = useDaWoQuestionQuiz(shuffle(wrong))
  resetInputs()
  dismissed.value = false
  nextTick(focusInput)
}

function dismissRetry() {
  showRetryModal.value = false
  dismissed.value = true
}

function restart() {
  router.push({ name: 'dacompounds-wo-question' })
}
</script>

<template>
  <div v-if="loading" class="page loading-state">
    <div class="micro-mark">Loading…</div>
  </div>

  <div v-else-if="error" class="page">
    <div class="alert alert-danger">
      <span class="alert-label">Error</span>{{ error }}
    </div>
    <button class="btn btn-ghost" @click="restart">← Back to setup</button>
  </div>

  <!-- Summary screen -->
  <div v-else-if="finished && ready && !showRetryModal" class="page result-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Auswertung · W-Fragen</div>
        <div class="result-score">{{ score }} / {{ total }} correct</div>
        <p class="section-subtitle">Wo-question drill complete.</p>
      </div>
      <div class="result-actions">
        <button class="btn btn-ghost" @click="router.push({ name: 'dacompounds' })">← Da-Compounds</button>
        <button
          v-if="wrongItems.length"
          class="btn btn-ghost"
          @click="retryWrong"
        >Retry the {{ wrongItems.length }} wrong</button>
        <button class="btn btn-accent" @click="restart">Start another drill <span aria-hidden="true">→</span></button>
      </div>
    </header>

    <div class="result-list">
      <div
        v-for="(q, i) in questions"
        :key="i"
        class="result-row drill-result-row is-prep"
        :style="prepColorStyle(q.colloc.preposition)"
      >
        <div class="result-word">
          <div class="german">{{ q.colloc.word }}</div>
          <div class="result-word-meta">{{ q.colloc.preposition }} · {{ kindLabel(q.item.objectKind) }}</div>
        </div>
        <div class="result-answer">
          <span class="result-picked" :class="q.isCorrect ? 'ok' : 'err'">{{ q.typed || '—' }}</span>
          <span v-if="!q.isCorrect" class="result-correct">→ <strong>{{ q.answer }}</strong></span>
        </div>
        <div class="result-verdict">
          <span class="tag" :class="q.isCorrect ? 'tag-success' : 'tag-danger'">
            {{ q.isCorrect ? '✓' : '✗' }}
          </span>
        </div>
        <div v-if="!q.isCorrect" class="result-explanation">{{ q.colloc.coreIdeaExplanation }}</div>
      </div>
    </div>
  </div>

  <!-- Retry modal -->
  <div v-else-if="showRetryModal" class="page">
    <RetryModal
      :wrong-count="wrongItems.length"
      item-label="questions"
      @retry="retryWrong"
      @dismiss="dismissRetry"
    />
  </div>

  <!-- Active quiz card -->
  <div v-else-if="current && ready" class="page">
    <div class="drill-stage" ref="cardRef" tabindex="-1">
      <div class="quiz-meta">
        <span class="quiz-counter">Card {{ questionIndex + 1 }} · of {{ total }}</span>
        <button class="btn btn-quiet" type="button" @click="router.push({ name: 'dacompounds-wo-question' })">End drill</button>
      </div>

      <div class="quiz-progress-bar">
        <div v-for="(cls, n) in pips" :key="n" class="pip" :class="cls" />
      </div>

      <!-- Statement: deliberately NOT highlighting the object — the learner judges
           animacy themselves (see useDaWoQuestionQuiz.ts). -->
      <div class="drill-prompt">
        <p class="micro-mark drill-instruction">Sache oder Person? Frag danach.</p>
        <p class="drill-context">{{ current.item.statement }}</p>
        <p class="drill-sentence is-compact">
          <span class="drill-gap" :class="{ ok: submitted && current.isCorrect, err: submitted && !current.isCorrect }">{{ submitted ? current.answer : '＿＿＿' }}</span> {{ scaffoldPost }}
        </p>
      </div>

      <!-- Type-only: single text input for the interrogative -->
      <div class="type-row">
        <input
          ref="textInputRef"
          v-model="typedInput"
          class="input type-input"
          type="text"
          placeholder="Wo(r)…? / Präp. + wen/wem?"
          :readonly="submitted"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          :class="{ ok: submitted && current.isCorrect, err: submitted && !current.isCorrect }"
          @keyup.enter="submitted ? next() : submit()"
        />
        <button v-if="!submitted" class="btn btn-accent" type="button" @click="submit">
          Submit <span aria-hidden="true">→</span>
        </button>
      </div>

      <!-- Feedback after answering -->
      <div v-if="submitted" class="drill-feedback">
        <span v-if="current.isCorrect" class="feedback-line correct">
          ✓ Richtig — <strong>{{ current.answer }}</strong>
        </span>
        <template v-else>
          <span class="feedback-line wrong">✗ Korrekt: <strong>{{ current.answer }}</strong></span>
          <div class="reveal is-prep" :style="prepColorStyle(current.colloc.preposition)">
            <div class="reveal-l">
              <strong class="prep-accent-text">{{ current.colloc.word }}</strong>
              · <span class="prep-accent-text">{{ current.colloc.preposition }}</span>
              · <span class="tag" :class="current.item.objectKind === 'thing' ? 'tag-thing' : 'tag-person'">
                {{ kindLabel(current.item.objectKind) }}
              </span>
            </div>
            <div class="reveal-note micro-mark">Sache → wo(r)-, Person → Präposition + wen/wem</div>
            <div class="reveal-b">{{ current.colloc.coreIdeaExplanation }}</div>
          </div>
        </template>
        <button
          ref="nextBtnRef"
          type="button"
          class="btn btn-accent drill-advance"
          @click="next"
        >
          {{ questionIndex + 1 >= total ? 'Finish drill' : 'Next' }} <span aria-hidden="true">→</span>
        </button>
      </div>

      <div class="drill-hint micro-mark">
        <template v-if="!submitted && !isMobile">Type the question word(s) and press Enter</template>
        <template v-else-if="!submitted">Type the question word(s)</template>
        <template v-else-if="submitted">
          Press <span class="kbd">Enter</span> to {{ questionIndex + 1 >= total ? 'finish' : 'continue' }}
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Bespoke to this drill — no shared-vocabulary equivalent. */
.tag-thing  { background: var(--accent-wash); color: var(--accent); }
.tag-person { background: var(--prep-wash); color: var(--prep-accent); }

/* See ArticleFillRunner.vue for why this drill opts into .drill-sentence's
   smaller .is-compact size and keeps the pre-migration italic treatment. */
.drill-sentence.is-compact {
  font-style: italic;
  font-weight: 400;
  letter-spacing: normal;
  line-height: 1.4;
  font-size: clamp(20px, 6vw, 28px);
  color: var(--ink);
  margin: 0 0 18px;
}
</style>
