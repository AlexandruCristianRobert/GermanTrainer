<script setup lang="ts">
import { computed, nextTick, onMounted, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  useDaSubstitutionQuiz, sampleSubstitutionItems, highlightContext, splitGap,
  SUBSTITUTION_PREPS,
} from '../../composables/useDaSubstitutionQuiz'
import { saveQuizRun } from '../../composables/useQuizHistory'
import { csv } from '../../composables/quizQuery'
import { shuffle } from '../../data/pool'
import { useBreakpoint } from '../../composables/useBreakpoint'
import RetryModal from '../../components/RetryModal.vue'
import {
  COLLOCATION_LEVELS, COLLOCATION_ROLES,
  type CollocationCase, type CollocationLevel, type CollocationRole,
} from '../../data/collocations'
import { prepColorStyle } from '../../data/prepColors'

const route = useRoute()
const router = useRouter()
const { isMobile } = useBreakpoint()

// ── quiz state ──────────────────────────────────────────────────────────────
const loading = ref(true)
const error = ref<string | null>(null)
const ready = ref(false)

type Quiz = ReturnType<typeof useDaSubstitutionQuiz>
const quiz = shallowRef<Quiz | null>(null)
const startedAtMs = ref(0)
const historySaved = ref(false)

// ── per-card state ──────────────────────────────────────────────────────────
const submitted = ref(false)
const cardRef = ref<HTMLElement | null>(null)
const nextBtnRef = ref<HTMLButtonElement | null>(null)

// ── retry modal state ───────────────────────────────────────────────────────
const showRetryModal = ref(false)
const dismissed = ref(false)

// ── mount ───────────────────────────────────────────────────────────────────
onMounted(() => {
  const count = Math.max(1, parseInt((route.query.count as string) ?? '10', 10) || 10)
  const levels = csv<CollocationLevel>(route.query.levels, COLLOCATION_LEVELS)
  const roles = csv<CollocationRole>(route.query.roles, COLLOCATION_ROLES)
  const preps = csv<string>(route.query.preps, SUBSTITUTION_PREPS)

  try {
    const items = sampleSubstitutionItems(count, { levels, roles, preps })
    if (items.length === 0) {
      error.value = 'Nothing to drill — adjust your filters.'
    } else {
      quiz.value = useDaSubstitutionQuiz(items, { mode: 'pick', distractors: 'neighbors' })
      startedAtMs.value = Date.now()
      ready.value = true
      submitted.value = false
      nextTick(() => cardRef.value?.focus())
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load.'
  } finally {
    loading.value = false
  }
  window.addEventListener('keydown', onKey)
})

onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

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

const contextParts = computed(() =>
  current.value ? highlightContext(current.value.item.context, current.value.colloc.word) : null
)
const gapParts = computed(() => current.value ? splitGap(current.value.item.stem) : null)

// ── actions ──────────────────────────────────────────────────────────────────
function pick(option: string) {
  if (!quiz.value || submitted.value) return
  quiz.value.pickOption(option)
  submitted.value = true
  nextTick(() => nextBtnRef.value?.focus())
}

function next() {
  if (!quiz.value) return
  quiz.value.advance()
  submitted.value = false
  if (!quiz.value.finished.value) nextTick(() => cardRef.value?.focus())
}

// Keyboard: 1–4 to pick a choice; Enter to advance after a pick.
function onKey(e: KeyboardEvent) {
  if (e.altKey || e.ctrlKey || e.metaKey) return
  if (!current.value) return
  if (e.key === 'Enter') {
    if (submitted.value) { e.preventDefault(); next() }
    return
  }
  if (submitted.value) return
  const idx = e.key.charCodeAt(0) - '1'.charCodeAt(0)
  if (idx < 0 || idx >= (current.value.options?.length ?? 0)) return
  e.preventDefault()
  pick(current.value.options![idx])
}

// Record the main round once; retry rounds are practice, never a Run (ADR-0010).
function recordRun() {
  if (historySaved.value || !quiz.value || quiz.value.total.value === 0) return
  historySaved.value = true
  const finishedAt = Date.now()
  const qs = quiz.value.questions.value
  saveQuizRun({
    type: 'dac-neighbors',
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
  quiz.value = useDaSubstitutionQuiz(shuffle(wrong), { mode: 'pick', distractors: 'neighbors' })
  submitted.value = false
  dismissed.value = false
  nextTick(() => cardRef.value?.focus())
}

function dismissRetry() {
  showRetryModal.value = false
  dismissed.value = true
}

function restart() {
  router.push({ name: 'dacompounds-neighbors' })
}

function caseName(c: CollocationCase): string {
  return c === 'accusative' ? 'Akkusativ' : 'Dativ'
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
        <div class="breadcrumb">Auswertung · Verwechslungsgefahr</div>
        <div class="result-score">{{ score }} / {{ total }} correct</div>
        <p class="section-subtitle">Near-neighbor drill complete.</p>
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
          <div class="result-word-meta">{{ q.colloc.preposition }} · {{ caseName(q.colloc.case) }}</div>
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
      item-label="near-neighbor gaps"
      @retry="retryWrong"
      @dismiss="dismissRetry"
    />
  </div>

  <!-- Active quiz card -->
  <div v-else-if="current && ready" class="page">
    <div class="drill-stage" ref="cardRef" tabindex="-1">
      <div class="quiz-meta">
        <span class="quiz-counter">Card {{ questionIndex + 1 }} · of {{ total }}</span>
        <button class="btn btn-quiet" type="button" @click="router.push({ name: 'dacompounds-neighbors' })">End drill</button>
      </div>

      <div class="quiz-progress-bar">
        <div v-for="(cls, n) in pips" :key="n" class="pip" :class="cls" />
      </div>

      <!-- Prompt: the natural context sentence, then the gapped follow-up -->
      <div class="drill-prompt">
        <p class="drill-context">
          {{ contextParts!.pre }}<strong v-if="contextParts!.match">{{ contextParts!.match }}</strong>{{ contextParts!.post }}
        </p>
        <p class="drill-sentence">
          {{ gapParts!.pre }}<span class="drill-gap" :class="{ filled: submitted, ok: submitted && current.isCorrect, err: submitted && !current.isCorrect }">{{ submitted ? current.answer : '＿＿＿' }}</span>{{ gapParts!.post }}
        </p>
      </div>

      <!-- 4 option buttons: the answer plus its 3 near-neighbor compounds -->
      <div class="choice-row quad">
        <button
          v-for="(opt, oi) in current.options"
          :key="opt"
          type="button"
          class="choice mono-face"
          :class="{
            selected: current.typed === opt,
            correct: submitted && current.answer === opt,
            wrong: submitted && current.typed === opt && current.answer !== opt,
            disabled: submitted,
          }"
          :disabled="submitted"
          @click="pick(opt)"
        >
          <span class="c-key">{{ oi + 1 }}</span>
          <span class="c-label">{{ opt }}</span>
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
              · {{ caseName(current.colloc.case) }}
            </div>
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
        <template v-if="!submitted && !isMobile">
          Press <span class="kbd">1</span>–<span class="kbd">4</span> to choose
        </template>
        <template v-else-if="!submitted">Tap a choice</template>
        <template v-else-if="submitted">
          Press <span class="kbd">Enter</span> to {{ questionIndex + 1 >= total ? 'finish' : 'continue' }}
        </template>
      </div>
    </div>
  </div>
</template>

