<script setup lang="ts">
import { computed, nextTick, onMounted, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  useDativeQuiz, buildSubjectCards, filterSubjectItems, type DativeQuizCard,
} from '../../composables/useDativeDrill'
import { DATIVE_DRILL_LEVELS, type DativeDrillLevel, type ExperiencerSubjectItem } from '../../data/dativeExperiencer'
import { saveQuizRun } from '../../composables/useQuizHistory'
import { bumpDativeLedger } from '../../composables/useDativeLedger'
import { csv } from '../../composables/quizQuery'
import { shuffle } from '../../data/pool'
import { useBreakpoint } from '../../composables/useBreakpoint'
import RetryModal from '../../components/RetryModal.vue'

const SUBJECT_KINDS = ['subject', 'agreement'] as const

const route = useRoute()
const router = useRouter()
const { isMobile } = useBreakpoint()

// ── quiz state ──────────────────────────────────────────────────────────────
const loading = ref(true)
const error = ref<string | null>(null)
const ready = ref(false)

type Quiz = ReturnType<typeof useDativeQuiz>
const quiz = shallowRef<Quiz | null>(null)
const startedAtMs = ref(0)
const historySaved = ref(false)

// The sampled items behind the current round — wrongIndexes point into this
// array (composable contract), so retry rebuilds by mapping through it.
const items = ref<ExperiencerSubjectItem[]>([])
const queriedLevels = ref<DativeDrillLevel[]>([])
const queriedKinds = ref<string[]>([])

// ── per-card state ──────────────────────────────────────────────────────────
const cardRef = ref<HTMLElement | null>(null)
const nextBtnRef = ref<HTMLButtonElement | null>(null)

// ── retry modal state ───────────────────────────────────────────────────────
const showRetryModal = ref(false)
const dismissed = ref(false)

// ── mount ───────────────────────────────────────────────────────────────────
onMounted(() => {
  const count = Math.max(1, parseInt((route.query.count as string) ?? '10', 10) || 10)
  const levels = csv<DativeDrillLevel>(route.query.levels, DATIVE_DRILL_LEVELS)
  const kinds = csv<string>(route.query.kinds, SUBJECT_KINDS)

  try {
    const sampled = shuffle(filterSubjectItems({ levels, kinds }), count)
    if (sampled.length === 0) {
      error.value = 'Nothing to drill — adjust your filters.'
    } else {
      items.value = sampled
      queriedLevels.value = levels
      queriedKinds.value = kinds
      quiz.value = useDativeQuiz(buildSubjectCards(sampled))
      startedAtMs.value = Date.now()
      ready.value = true
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
const wrongIndexes = computed(() => ready.value ? quiz.value?.wrongIndexes.value ?? [] : [])
const questions = computed(() => ready.value ? quiz.value?.questions.value ?? [] : [])
const submitted = computed(() => current.value?.isCorrect !== null && current.value !== null)

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

// The gap-fill ('agreement' kind) sentences carry one ___ — reveal the filled
// sentence beside the feedback line; 'subject' kind sentences have no gap.
const filledSentence = computed(() =>
  current.value && current.value.prompt.includes('___')
    ? current.value.prompt.replace('___', current.value.answers[0])
    : null
)

// ── actions ──────────────────────────────────────────────────────────────────
function pick(option: string) {
  if (!quiz.value || submitted.value) return
  quiz.value.pickOption(option)
  nextTick(() => nextBtnRef.value?.focus())
}

function next() {
  if (!quiz.value) return
  quiz.value.advance()
  if (!quiz.value.finished.value) nextTick(() => cardRef.value?.focus())
}

// Keyboard: 1–2 to pick a choice; Enter to advance after a pick.
function onKey(e: KeyboardEvent) {
  if (e.altKey || e.ctrlKey || e.metaKey) return
  if (!current.value) return
  if (e.key === 'Enter') {
    if (submitted.value) { e.preventDefault(); next() }
    return
  }
  if (submitted.value) return
  const idx = e.key.charCodeAt(0) - '1'.charCodeAt(0)
  if (idx < 0 || idx >= current.value.options.length) return
  e.preventDefault()
  pick(current.value.options[idx])
}

// Main round records once and bumps the ledger once per card, keyed by the
// dative verb; retry rounds are practice and never re-bump (ADR-0010).
function recordRun() {
  if (historySaved.value || !quiz.value || quiz.value.total.value === 0) return
  historySaved.value = true
  const finishedAt = Date.now()
  for (const q of quiz.value.questions.value) {
    if (q.ledgerKey && q.isCorrect !== null) bumpDativeLedger(q.ledgerKey, q.isCorrect, finishedAt)
  }
  saveQuizRun({
    type: 'dat-subject',
    startedAt: new Date(startedAtMs.value).toISOString(),
    finishedAt: new Date(finishedAt).toISOString(),
    durationMs: finishedAt - startedAtMs.value,
    count: quiz.value.total.value,
    correct: quiz.value.score.value,
    meta: { levels: queriedLevels.value, kinds: queriedKinds.value },
  })
}

watch(finished, (now) => {
  if (now && ready.value) {
    recordRun()
    if (wrongIndexes.value.length > 0 && !dismissed.value) showRetryModal.value = true
  }
})

function retryWrong() {
  showRetryModal.value = false
  if (!quiz.value) return
  const wrongSourceItems = quiz.value.wrongIndexes.value.map(i => items.value[i])
  if (wrongSourceItems.length === 0) return
  const resampled = shuffle(wrongSourceItems, wrongSourceItems.length)
  items.value = resampled
  quiz.value = useDativeQuiz(buildSubjectCards(resampled))
  dismissed.value = false
  nextTick(() => cardRef.value?.focus())
}

function dismissRetry() {
  showRetryModal.value = false
  dismissed.value = true
}

function restart() {
  router.push({ name: 'dative-subject' })
}

function resultBefore(q: DativeQuizCard): string {
  const idx = q.prompt.indexOf('___')
  return idx < 0 ? q.prompt : q.prompt.slice(0, idx)
}

function resultAfter(q: DativeQuizCard): string {
  const idx = q.prompt.indexOf('___')
  return idx < 0 ? '' : q.prompt.slice(idx + 3)
}

function resultGiven(q: DativeQuizCard): string {
  return q.picked ?? '—'
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
    <button class="btn btn-ghost" @click="router.push({ name: 'dative-subject' })">← Back to setup</button>
  </div>

  <!-- Summary screen -->
  <div v-else-if="finished && ready && !showRetryModal" class="page result-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Auswertung · Wer ist Subjekt?</div>
        <div class="result-score">{{ score }} / {{ total }} correct</div>
        <p class="section-subtitle">Subject round complete.</p>
      </div>
      <div class="result-actions">
        <button class="btn btn-ghost" @click="router.push({ name: 'dative' })">← Dativ</button>
        <button class="btn btn-accent" @click="restart">Start another drill <span aria-hidden="true">→</span></button>
      </div>
    </header>

    <div class="result-list">
      <div
        v-for="(q, i) in questions"
        :key="i"
        class="result-row drill-result-row"
      >
        <div class="result-verb">
          <div class="german">
            <template v-if="q.prompt.includes('___')">{{ resultBefore(q) }}<strong>{{ q.answers[0] }}</strong>{{ resultAfter(q) }}</template>
            <template v-else>{{ q.prompt }}</template>
          </div>
        </div>
        <div class="result-answer">
          <span class="result-picked" :class="q.isCorrect ? 'ok' : 'err'">
            {{ resultGiven(q) }}
          </span>
          <span v-if="!q.isCorrect" class="result-correct">
            → <strong>{{ q.answers[0] }}</strong>
          </span>
        </div>
        <div class="result-verdict">
          <span class="tag" :class="q.isCorrect ? 'tag-success' : 'tag-danger'">
            {{ q.isCorrect ? '✓' : '✗' }}
          </span>
        </div>
      </div>
    </div>
  </div>

  <!-- Retry modal -->
  <div v-else-if="showRetryModal" class="page">
    <RetryModal
      :wrong-count="wrongIndexes.length"
      item-label="cards"
      @retry="retryWrong"
      @dismiss="dismissRetry"
    />
  </div>

  <!-- Active quiz card -->
  <div v-else-if="current && ready" class="page">
    <div class="drill-stage" ref="cardRef" tabindex="-1">
      <div class="quiz-meta">
        <span class="quiz-counter">Karte {{ questionIndex + 1 }} · von {{ total }}</span>
        <button class="btn btn-quiet" type="button" @click="router.push({ name: 'dative-subject' })">End drill</button>
      </div>

      <div class="quiz-progress-bar">
        <div v-for="(cls, n) in pips" :key="n" class="pip" :class="cls" />
      </div>

      <div class="drill-prompt">
        <p class="drill-sentence">{{ current.prompt }}</p>
      </div>

      <div class="choice-row">
        <button
          v-for="(opt, oi) in current.options"
          :key="opt"
          type="button"
          class="choice mono-face"
          :class="{
            selected: current.picked === opt,
            correct: submitted && current.answers.includes(opt),
            wrong: submitted && current.picked === opt && !current.answers.includes(opt),
            disabled: submitted,
          }"
          :disabled="submitted"
          @click="pick(opt)"
        >
          <span class="c-key">{{ oi + 1 }}</span>
          <span class="c-label">{{ opt }}</span>
        </button>
      </div>

      <div v-if="submitted" class="drill-feedback">
        <span v-if="current.isCorrect" class="feedback-line correct">
          ✓ Richtig — <strong>{{ current.answers[0] }}</strong>
        </span>
        <span v-else class="feedback-line wrong">
          ✗ Korrekt: <strong>{{ current.answers[0] }}</strong>
        </span>
        <p v-if="filledSentence" class="dat-filled">{{ filledSentence }}</p>
        <p class="dat-gloss">{{ current.translation }}</p>
        <p class="dat-explain">{{ current.note }}</p>
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
          Press <span class="kbd">1</span>–<span class="kbd">{{ current.options.length }}</span> to choose
        </template>
        <template v-else-if="!submitted">Tap a choice</template>
        <template v-else>
          Press <span class="kbd">Enter</span> to {{ questionIndex + 1 >= total ? 'finish' : 'continue' }}
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dat-filled {
  font-family: var(--font-body);
  font-size: 15px;
  color: var(--ink-soft);
  margin: 0;
}
.dat-gloss {
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--ink-soft);
  font-style: italic;
  margin: 0;
}
.dat-explain {
  font-family: var(--font-body);
  font-size: 13px;
  color: var(--mute);
  margin: 4px 0 0;
  max-width: 60ch;
}

.drill-result-row { grid-template-columns: 1fr 160px auto; }

@media (max-width: 720px) {
  .drill-result-row { grid-template-columns: 1fr; gap: 4px; }
}
</style>
