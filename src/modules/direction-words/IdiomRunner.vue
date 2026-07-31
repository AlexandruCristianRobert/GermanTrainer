<script setup lang="ts">
// T9 "Idiom gap-fill" — one sentence with a single ___ gap standing for a WHOLE
// idiom surface, 3–4 tappable options from the closed DW_IDIOM_SURFACES
// inventory (all real German, the distractors simply wrong in this slot).
// Judge-and-reveal shape of LexicalRunner.vue; the gap styling is the module's
// existing `.gap` treatment from CompoundRunner.vue.
//
// Recording: OFFLINE drill, so the main round records exactly once and retry
// rounds never do — `historySaved` is deliberately NOT reset in retryWrong()
// (ADR-0010). This is the opposite of the Phase-4 AI drills.
import { computed, nextTick, onMounted, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  useDwIdiomQuiz, sampleIdiomItems, splitIdiomGap, filterIdiomItems,
} from '../../composables/useDwIdiomQuiz'
import { saveQuizRun } from '../../composables/useQuizHistory'
import { csv } from '../../composables/quizQuery'
import { shuffle } from '../../data/pool'
import { useBreakpoint } from '../../composables/useBreakpoint'
import { DIRECTION_LEVELS, type DirectionLevel } from '../../data/directionWords'
import RetryModal from '../../components/RetryModal.vue'

const route = useRoute()
const router = useRouter()
const { isMobile } = useBreakpoint()

// ── quiz state ──────────────────────────────────────────────────────────────
const loading = ref(true)
const error = ref<string | null>(null)
const ready = ref(false)

type Quiz = ReturnType<typeof useDwIdiomQuiz>
const quiz = shallowRef<Quiz | null>(null)
const startedAtMs = ref(0)
const historySaved = ref(false)
const queriedLevels = ref<DirectionLevel[]>([])

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

  try {
    const items = sampleIdiomItems(count, { levels })
    if (items.length === 0) {
      error.value = 'Nothing to drill — adjust your filters.'
    } else {
      queriedLevels.value = levels
      quiz.value = useDwIdiomQuiz(items)
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

/**
 * The queried levels, minus the ones this bank has no items for — what the Run
 * actually drilled. useQuizStats credits EVERY level listed in meta.levels with
 * the whole run, so recording a level the bank cannot serve invents an accuracy
 * bucket out of nothing: DIRECTION_IDIOMS carries no A2 item, yet the setup's
 * "All" button — and an empty chip set, which the runner's csv() default expands
 * to all four levels — puts A2 in the query. The A2 chip and its zero-available
 * warning stay exactly as they are; that dead end is deliberate.
 */
const recordedLevels = computed(() =>
  queriedLevels.value.filter(l => filterIdiomItems({ levels: [l] }).length > 0)
)

// The prompt sentence split around its single ___ gap, so the gap can be styled
// independently while the rest of the sentence renders as plain text.
const promptParts = computed(() => current.value ? current.value.item.sentence.split('___') : [])

// The reveal's filled sentence for the current card. splitIdiomGap owns the
// orthography (a sentence-initial or post-colon gap capitalises the surface) and
// is guarded bank-wide in tests/data/directionIdioms.test.ts.
const filledParts = computed(() =>
  current.value
    ? splitIdiomGap(current.value.item.sentence, current.value.item.answer)
    : { before: '', filled: '', after: '' }
)

/** The summary rows, each with its sentence pre-split around the filled gap. */
const resultRows = computed(() =>
  questions.value.map(q => ({ q, parts: splitIdiomGap(q.item.sentence, q.item.answer) }))
)

// ── actions ──────────────────────────────────────────────────────────────────
function pick(surface: string) {
  if (!quiz.value || submitted.value) return
  quiz.value.pick(surface)
  submitted.value = true
  nextTick(() => nextBtnRef.value?.focus())
}

function next() {
  if (!quiz.value) return
  quiz.value.advance()
  resetCard()
  if (!quiz.value.finished.value) nextTick(() => cardRef.value?.focus())
}

// Keyboard: 1–4 to pick an idiom; Enter to advance after a pick.
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
  pick(current.value.options[idx])
}

// Record the main round once; retry rounds are practice, never a Run (ADR-0010).
function recordRun() {
  if (historySaved.value || !quiz.value || quiz.value.total.value === 0) return
  historySaved.value = true
  const finishedAt = Date.now()
  saveQuizRun({
    type: 'dw-idiom',
    startedAt: new Date(startedAtMs.value).toISOString(),
    finishedAt: new Date(finishedAt).toISOString(),
    durationMs: finishedAt - startedAtMs.value,
    count: quiz.value.total.value,
    correct: quiz.value.score.value,
    meta: { levels: recordedLevels.value },
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
  // NOTE: historySaved stays true — retry rounds are practice, never a Run.
  quiz.value = useDwIdiomQuiz(shuffle(wrong))
  resetCard()
  dismissed.value = false
  nextTick(() => cardRef.value?.focus())
}

function dismissRetry() {
  showRetryModal.value = false
  dismissed.value = true
}

function restart() {
  router.push({ name: 'directionwords-idioms' })
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
        <div class="breadcrumb">Auswertung · Redewendungen</div>
        <div class="result-score">{{ score }} / {{ total }} correct</div>
        <p class="section-subtitle">Idiom gap-fill round complete.</p>
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
        v-for="({ q, parts }, i) in resultRows"
        :key="i"
        class="result-row drill-result-row"
      >
        <div class="result-sentence">{{ parts.before }}<strong>{{ parts.filled }}</strong>{{ parts.after }}</div>
        <div class="result-answer">
          <span class="result-picked" :class="q.isCorrect ? 'ok' : 'err'">{{ q.picked || '—' }}</span>
          <span v-if="!q.isCorrect" class="result-correct">→ <strong>{{ q.item.answer }}</strong></span>
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
      item-label="sentences"
      @retry="retryWrong"
      @dismiss="dismissRetry"
    />
  </div>

  <!-- Active quiz card -->
  <div v-else-if="current && ready" class="page">
    <div class="drill-stage" ref="cardRef" tabindex="-1">
      <div class="quiz-meta">
        <span class="quiz-counter">Card {{ questionIndex + 1 }} · of {{ total }}</span>
        <button class="btn btn-quiet" type="button" @click="router.push({ name: 'directionwords-idioms' })">End drill</button>
      </div>

      <div class="quiz-progress-bar">
        <div v-for="(cls, n) in pips" :key="n" class="pip" :class="cls" />
      </div>

      <!-- Prompt: the sentence with its single ___ gap -->
      <div class="drill-prompt">
        <p class="micro-mark drill-instruction">Welche Wendung passt in die Lücke?</p>
        <p class="im-sentence"><template
          v-for="(part, pi) in promptParts"
          :key="pi"
        >{{ part }}<span v-if="pi < promptParts.length - 1" class="drill-gap">___</span></template></p>
      </div>

      <!-- Pick mode: the item's 3–4 idiom surfaces -->
      <div class="choice-row quad">
        <button
          v-for="(opt, oi) in current.options"
          :key="opt"
          type="button"
          class="choice mono-face"
          :class="{
            selected: current.picked === opt,
            correct: submitted && opt === current.item.answer,
            wrong: submitted && current.picked === opt && opt !== current.item.answer,
            disabled: submitted,
          }"
          :disabled="submitted"
          @click="pick(opt)"
        >
          <span class="c-key">{{ oi + 1 }}</span>
          <span class="c-label">{{ opt }}</span>
        </button>
      </div>

      <!-- Feedback after answering — the filled sentence and the explanation
           always show, right or wrong. -->
      <div v-if="submitted" class="drill-feedback">
        <span v-if="current.isCorrect" class="feedback-line correct">
          ✓ Richtig — <strong>{{ current.item.answer }}</strong>
        </span>
        <span v-else class="feedback-line wrong">
          ✗ Falsch — richtig: <strong>{{ current.item.answer }}</strong>
        </span>
        <div class="reveal">
          <p class="im-filled">{{ filledParts.before }}<strong>{{ filledParts.filled }}</strong>{{ filledParts.after }}</p>
          <p class="im-explanation">{{ current.item.explanation }}</p>
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
/* .im-sentence is kept bespoke rather than renamed to .drill-sentence — the
   shared class is much larger/bolder (clamp(26px,3.2vw,40px), weight 500) and
   this card pairs the sentence with an instruction line above it, so it stays
   at its original, more compact size. */
.im-sentence {
  font-family: var(--font-display);
  font-size: clamp(19px, 5.6vw, 26px);
  line-height: 1.5;
  color: var(--ink);
  margin: 0 0 14px;
}

/* This drill's reveal stacks the filled sentence and its explanation with a
   fixed gap — the shared .reveal box doesn't declare a layout for multiple
   children (and the surrounding .drill-feedback centres text/shrinks width,
   so left-align + width:100% must be reasserted here), so that structure
   stays local. */
.reveal {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  text-align: left;
}
.im-filled {
  margin: 0;
  font-family: var(--font-display);
  font-style: italic;
  font-size: 16px;
  line-height: 1.5;
  color: var(--ink);
  padding-bottom: 8px;
  border-bottom: 1px dotted var(--hairline);
}
.im-filled strong { font-style: normal; color: var(--accent); }
.im-explanation {
  margin: 0;
  font-family: var(--font-body);
  font-size: 14px;
  line-height: 1.5;
  color: var(--ink);
}

/* Result list — the sentence occupies the first column instead of the shared
   vocabulary's "word" cell, so both the desktop width and the mobile named
   grid areas stay a local override. */
.drill-result-row { grid-template-columns: minmax(0, 1fr) 200px auto; align-items: baseline; }
.result-sentence {
  font-family: var(--font-display);
  font-style: italic;
  font-size: 15px;
  line-height: 1.5;
  color: var(--ink-soft);
}
.result-sentence strong { font-style: normal; color: var(--ink); }

@media (max-width: 720px) {
  .drill-result-row {
    grid-template-columns: 1fr auto;
    grid-template-areas: "sentence verdict" "answer answer" "expl expl";
    gap: 8px 12px;
    align-items: start;
  }
  .drill-result-row .result-sentence { grid-area: sentence; }
}
</style>
