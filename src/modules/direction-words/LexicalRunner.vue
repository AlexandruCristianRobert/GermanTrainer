<script setup lang="ts">
// T8 "Directional or lexicalized?" — one sentence per card, judge whether the
// hin-/her- prefix still points somewhere or the verb has fused into plain
// vocabulary. Judge-and-reveal shape of RegisterRunner.vue; the two-reading
// reveal (both labels shown, the correct one marked) follows
// da-compounds/HomographRunner.vue.
//
// Recording: OFFLINE drill, so the main round records exactly once and retry
// rounds never do — `historySaved` is deliberately NOT reset in retryWrong()
// (ADR-0010). This is the opposite of the Phase-4 AI drills.
import { computed, nextTick, onMounted, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  useDwLexicalQuiz, sampleLexicalItems, splitVerbSentence, filterLexicalItems,
  type DwLexicalQuestion, type DwVerbReading,
} from '../../composables/useDwLexicalQuiz'
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

type Quiz = ReturnType<typeof useDwLexicalQuiz>
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
    const items = sampleLexicalItems(count, { levels })
    if (items.length === 0) {
      error.value = 'Nothing to drill — adjust your filters.'
    } else {
      queriedLevels.value = levels
      quiz.value = useDwLexicalQuiz(items)
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
 * bucket out of nothing: DIRECTION_VERBS carries no A2 item, yet the setup's
 * "All" button — and an empty chip set, which the runner's csv() default expands
 * to all four levels — puts A2 in the query. The A2 chip and its zero-available
 * warning stay exactly as they are; that dead end is deliberate.
 */
const recordedLevels = computed(() =>
  queriedLevels.value.filter(l => filterLexicalItems({ levels: [l] }).length > 0)
)

/** The sentence split around its 1–2 verb surfaces, so they can be bolded in place. */
const sentenceParts = computed(() =>
  current.value ? splitVerbSentence(current.value.item) : []
)

/** The option label for a given reading on a question (for the result list / reveal). */
function labelFor(q: DwLexicalQuestion, reading: DwVerbReading | null): string {
  if (!reading) return ''
  return q.options.find(o => o.reading === reading)?.label ?? ''
}

// ── actions ──────────────────────────────────────────────────────────────────
function pick(reading: DwVerbReading) {
  if (!quiz.value || submitted.value) return
  quiz.value.pick(reading)
  submitted.value = true
  nextTick(() => nextBtnRef.value?.focus())
}

function next() {
  if (!quiz.value) return
  quiz.value.advance()
  resetCard()
  if (!quiz.value.finished.value) nextTick(() => cardRef.value?.focus())
}

// Keyboard: 1–2 to pick a reading; Enter to advance after a pick.
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
  pick(current.value.options[idx].reading)
}

// Record the main round once; retry rounds are practice, never a Run (ADR-0010).
function recordRun() {
  if (historySaved.value || !quiz.value || quiz.value.total.value === 0) return
  historySaved.value = true
  const finishedAt = Date.now()
  saveQuizRun({
    type: 'dw-lexical',
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
  quiz.value = useDwLexicalQuiz(shuffle(wrong))
  resetCard()
  dismissed.value = false
  nextTick(() => cardRef.value?.focus())
}

function dismissRetry() {
  showRetryModal.value = false
  dismissed.value = true
}

function restart() {
  router.push({ name: 'directionwords-lexical' })
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
        <div class="breadcrumb">Auswertung · Verblasste Richtung</div>
        <div class="result-score">{{ score }} / {{ total }} correct</div>
        <p class="section-subtitle">Lexicalized-verb drill complete.</p>
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
          <div class="german">{{ q.item.verb }}</div>
          <div class="result-word-meta">{{ q.item.level }}</div>
        </div>
        <div class="result-answer">
          <span class="result-picked" :class="q.isCorrect ? 'ok' : 'err'">{{ labelFor(q, q.picked) || '—' }}</span>
          <span v-if="!q.isCorrect" class="result-correct">→ <strong>{{ labelFor(q, q.item.reading) }}</strong></span>
        </div>
        <div class="result-verdict">
          <span class="tag" :class="q.isCorrect ? 'tag-success' : 'tag-danger'">
            {{ q.isCorrect ? '✓' : '✗' }}
          </span>
        </div>
        <div class="result-sentence">{{ q.item.sentence }}</div>
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
        <button class="btn btn-quiet" type="button" @click="router.push({ name: 'directionwords-lexical' })">End drill</button>
      </div>

      <div class="quiz-progress-bar">
        <div v-for="(cls, n) in pips" :key="n" class="pip" :class="cls" />
      </div>

      <!-- Prompt: the sentence with its verb surfaces bolded, plus the infinitive -->
      <div class="drill-prompt">
        <p class="micro-mark drill-instruction">Noch Richtung — oder nur noch Vokabular?</p>
        <p class="drill-sentence"><template
          v-for="(part, pi) in sentenceParts"
          :key="pi"
        ><strong v-if="part.bold">{{ part.text }}</strong><template v-else>{{ part.text }}</template></template></p>
        <p class="drill-caption micro-mark">{{ current.item.verb }}</p>
      </div>

      <!-- Pick mode: two option buttons — directional reading vs. fused reading -->
      <div class="choice-row quad">
        <button
          v-for="(opt, oi) in current.options"
          :key="opt.reading"
          type="button"
          class="choice"
          :class="{
            selected: current.picked === opt.reading,
            correct: submitted && opt.reading === current.item.reading,
            wrong: submitted && current.picked === opt.reading && opt.reading !== current.item.reading,
            disabled: submitted,
          }"
          :disabled="submitted"
          @click="pick(opt.reading)"
        >
          <span class="c-key">{{ oi + 1 }}</span>
          <span class="c-label">{{ opt.label }}</span>
        </button>
      </div>

      <!-- Feedback after answering — explanation + BOTH labels always show, right or wrong -->
      <div v-if="submitted" class="drill-feedback">
        <span v-if="current.isCorrect" class="feedback-line correct">
          ✓ Richtig
        </span>
        <span v-else class="feedback-line wrong">
          ✗ Falsch — richtig: <strong>{{ labelFor(current, current.item.reading) }}</strong>
        </span>
        <div class="reveal">
          <p class="reveal-b is-divided">{{ current.item.explanation }}</p>
          <div
            v-for="opt in current.options"
            :key="opt.reading"
            class="contrast-sense-line"
            :class="{ correct: opt.reading === current.item.reading }"
          >
            <span class="contrast-sense-prep">{{ opt.reading === 'directional' ? 'Richtung' : 'Lexikalisiert' }}</span>
            <span class="contrast-sense-text">{{ opt.label }}</span>
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
/* The verb surfaces highlighted within the sentence — the shared
   .drill-sentence doesn't declare a `strong` treatment. */
.drill-sentence strong { color: var(--accent); }

/* This drill's reveal stacks the explanation and the two contrast-sense lines
   with a fixed gap — the shared .reveal box doesn't declare a layout for
   multiple children (and the surrounding .drill-feedback centres text/shrinks
   width, so left-align + width:100% must be reasserted here), so that
   structure stays local. The divider under the explanation itself now comes
   from the shared .reveal-b.is-divided modifier (see template) instead of a
   local override. */
.contrast-sense-line {
  font-family: var(--font-body);
  font-size: 14px;
  line-height: 1.5;
  color: var(--ink-soft);
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.contrast-sense-line.correct { color: var(--success); }
.contrast-sense-prep {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}
.contrast-sense-line.correct .contrast-sense-prep { color: var(--success); }
.contrast-sense-text { color: var(--ink); }
.contrast-sense-line.correct .contrast-sense-text { color: var(--success); }

/* Result list — this drill has a narrower first column and an extra
   full-width sentence line the shared vocabulary doesn't define. */
.drill-result-row { grid-template-columns: 140px minmax(0, 1fr) auto; }
.result-answer { font-family: var(--font-body); }
.result-sentence {
  grid-column: 1 / -1;
  font-family: var(--font-display);
  font-style: italic;
  font-size: 15px;
  line-height: 1.5;
  color: var(--ink-soft);
  margin-top: 8px;
}

@media (max-width: 720px) {
  .drill-result-row {
    grid-template-areas: "word verdict" "answer answer" "sentence sentence" "expl expl";
    gap: 8px 12px;
    align-items: start;
  }
  .drill-result-row .result-sentence { grid-area: sentence; }
}
</style>
