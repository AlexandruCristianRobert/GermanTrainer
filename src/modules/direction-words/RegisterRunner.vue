<script setup lang="ts">
import { computed, nextTick, onMounted, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  useDwRegisterQuiz, sampleDwRegisterItems, dwCorrectedForm,
  type DwRegisterQuestion, type DwRegisterVerdict,
} from '../../composables/useDirectionRegisterQuiz'
import { saveQuizRun } from '../../composables/useQuizHistory'
import { csv } from '../../composables/quizQuery'
import { shuffle } from '../../data/pool'
import { useBreakpoint } from '../../composables/useBreakpoint'
import { ADVERB_PAIRS, DIRECTION_LEVELS, type DirectionLevel } from '../../data/directionWords'
import RetryModal from '../../components/RetryModal.vue'

const PAIR_ELEMENTS = ADVERB_PAIRS.map(p => p.element)

const route = useRoute()
const router = useRouter()
const { isMobile } = useBreakpoint()

// ── quiz state ──────────────────────────────────────────────────────────────
const loading = ref(true)
const error = ref<string | null>(null)
const ready = ref(false)

type Quiz = ReturnType<typeof useDwRegisterQuiz>
const quiz = shallowRef<Quiz | null>(null)
const startedAtMs = ref(0)
const historySaved = ref(false)
const queriedLevels = ref<DirectionLevel[]>([])
const queriedPairs = ref<string[]>([])

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
  const levels = csv<DirectionLevel>(route.query.levels, DIRECTION_LEVELS)
  // 'none' is RegisterSetup's explicit sentinel for "no pairs selected" —
  // csv() can't express that itself (an empty string means "no param", which
  // defaults to all pairs), so it's special-cased here, before csv() runs.
  // A missing/absent pairs param still falls through to the all-pairs default.
  const pairs = route.query.pairs === 'none' ? [] : csv<string>(route.query.pairs, PAIR_ELEMENTS)

  try {
    const items = sampleDwRegisterItems(count, { levels, pairs })
    if (items.length === 0) {
      error.value = 'Nothing to drill — adjust your filters.'
    } else {
      queriedLevels.value = levels
      queriedPairs.value = pairs
      quiz.value = useDwRegisterQuiz(items)
      startedAtMs.value = Date.now()
      ready.value = true
      resetCard()
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

function resetCard() {
  submitted.value = false
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

/** The option label for a given verdict on a question (for the result list / reveal). */
function labelFor(q: DwRegisterQuestion, verdict: DwRegisterVerdict | null): string {
  if (!verdict) return ''
  return q.options.find(o => o.verdict === verdict)?.label ?? ''
}

/** The corrected form named in a 'wrong' item's explanation, or null (used for the struck-through line). */
const fixText = computed(() => current.value ? dwCorrectedForm(current.value.item) : null)

// ── actions ──────────────────────────────────────────────────────────────────
function pick(verdict: DwRegisterVerdict) {
  if (!quiz.value || submitted.value) return
  quiz.value.pick(verdict)
  submitted.value = true
  nextTick(() => nextBtnRef.value?.focus())
}

function next() {
  if (!quiz.value) return
  quiz.value.advance()
  resetCard()
  if (!quiz.value.finished.value) nextTick(() => cardRef.value?.focus())
}

// Keyboard: 1–3 to pick a verdict; Enter to advance after a pick.
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
  pick(current.value.options[idx].verdict)
}

// Record the main round once; retry rounds are practice, never a Run (ADR-0010).
function recordRun() {
  if (historySaved.value || !quiz.value || quiz.value.total.value === 0) return
  historySaved.value = true
  const finishedAt = Date.now()
  saveQuizRun({
    type: 'dw-register',
    startedAt: new Date(startedAtMs.value).toISOString(),
    finishedAt: new Date(finishedAt).toISOString(),
    durationMs: finishedAt - startedAtMs.value,
    count: quiz.value.total.value,
    correct: quiz.value.score.value,
    meta: { levels: queriedLevels.value, pairs: queriedPairs.value },
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
  quiz.value = useDwRegisterQuiz(shuffle(wrong))
  resetCard()
  dismissed.value = false
  nextTick(() => cardRef.value?.focus())
}

function dismissRetry() {
  showRetryModal.value = false
  dismissed.value = true
}

function restart() {
  router.push({ name: 'directionwords-register' })
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
        <div class="breadcrumb">Auswertung · Kurzformen</div>
        <div class="result-score">{{ score }} / {{ total }} correct</div>
        <p class="section-subtitle">Register drill complete.</p>
      </div>
      <div class="result-actions">
        <button class="btn btn-ghost" @click="router.push({ name: 'directionwords' })">← Direction Words</button>
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
        class="result-row drill-result-row"
      >
        <div class="result-word">
          <div class="german">{{ q.item.phrase }}</div>
          <div class="result-word-meta">{{ q.item.level }}</div>
        </div>
        <div class="result-answer">
          <span class="result-picked" :class="q.isCorrect ? 'ok' : 'err'">{{ labelFor(q, q.picked) || '—' }}</span>
          <span v-if="!q.isCorrect" class="result-correct">→ <strong>{{ labelFor(q, q.item.verdict) }}</strong></span>
        </div>
        <div class="result-verdict">
          <span class="tag" :class="q.isCorrect ? 'tag-success' : 'tag-danger'">
            {{ q.isCorrect ? '✓' : '✗' }}
          </span>
        </div>
        <div v-if="!q.isCorrect" class="result-explanation">{{ q.item.explanation }}</div>
      </div>
    </div>
  </div>

  <!-- Retry modal -->
  <div v-else-if="showRetryModal" class="page">
    <RetryModal
      :wrong-count="wrongItems.length"
      item-label="cards"
      @retry="retryWrong"
      @dismiss="dismissRetry"
    />
  </div>

  <!-- Active quiz card -->
  <div v-else-if="current && ready" class="page">
    <div class="drill-stage" ref="cardRef" tabindex="-1">
      <div class="quiz-meta">
        <span class="quiz-counter">Card {{ questionIndex + 1 }} · of {{ total }}</span>
        <button class="btn btn-quiet" type="button" @click="router.push({ name: 'directionwords-register' })">End drill</button>
      </div>

      <div class="quiz-progress-bar">
        <div v-for="(cls, n) in pips" :key="n" class="pip" :class="cls" />
      </div>

      <!-- Prompt: the phrase, shown in quotes -->
      <div class="drill-prompt">
        <p class="micro-mark drill-instruction">Standard, nur gesprochen, oder immer falsch?</p>
        <p class="drill-sentence">„{{ current.item.phrase }}“</p>
      </div>

      <!-- Pick mode: three fixed option buttons — standard / spoken / wrong.
           Options are long sentences, so this stays a single-column stack. -->
      <div class="choice-row">
        <button
          v-for="(opt, oi) in current.options"
          :key="opt.verdict"
          type="button"
          class="choice"
          :class="{
            selected: current.picked === opt.verdict,
            correct: submitted && opt.verdict === current.item.verdict,
            wrong: submitted && current.picked === opt.verdict && opt.verdict !== current.item.verdict,
            disabled: submitted,
          }"
          :disabled="submitted"
          @click="pick(opt.verdict)"
        >
          <span class="c-key">{{ oi + 1 }}</span>
          <span class="c-label">{{ opt.label }}</span>
        </button>
      </div>

      <!-- Feedback after answering — explanation ALWAYS shows, right or wrong -->
      <div v-if="submitted" class="drill-feedback">
        <span v-if="current.isCorrect" class="feedback-line correct">
          ✓ Richtig
        </span>
        <span v-else class="feedback-line wrong">
          ✗ Falsch — richtig: <strong>{{ labelFor(current, current.item.verdict) }}</strong>
        </span>
        <div class="reveal">
          <p class="reveal-b">{{ current.item.explanation }}</p>
          <div v-if="current.item.verdict === 'wrong' && fixText" class="reveal-fix">
            <s>{{ current.item.phrase }}</s>
            <span aria-hidden="true">→</span>
            <strong>{{ fixText }}</strong>
          </div>
        </div>
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
        <template v-else-if="submitted">
          Press <span class="kbd">Enter</span> to {{ questionIndex + 1 >= total ? 'finish' : 'continue' }}
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* This drill's reveal stacks the explanation and the optional corrected-form
   line with a fixed gap — the shared .reveal box doesn't declare a layout
   for multiple children (and the surrounding .drill-feedback centres
   text/shrinks width, so left-align + width:100% must be reasserted here),
   so that structure stays local. .reveal-fix itself (incl. its <s>/<strong>
   children) now comes from modules.css verbatim. */
.reveal {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  text-align: left;
}

/* Result list — this drill's two text columns are both flexible instead of
   the shared vocabulary's fixed 180px first column. */
.drill-result-row { grid-template-columns: minmax(0, 1fr) 1fr auto; }
.result-answer { font-family: var(--font-body); }

@media (max-width: 720px) {
  .drill-result-row { gap: 8px 12px; align-items: start; }
}
</style>
