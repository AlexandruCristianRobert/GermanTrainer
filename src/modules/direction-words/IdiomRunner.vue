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
import { useDwIdiomQuiz, sampleIdiomItems } from '../../composables/useDwIdiomQuiz'
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

// The prompt sentence split around its single ___ gap, so the gap can be styled
// independently while the rest of the sentence renders as plain text.
const promptParts = computed(() => current.value ? current.value.item.sentence.split('___') : [])

/**
 * Does a surface dropped into this gap start a sentence? True when the gap opens
 * the sentence (id-5 puts it in the Vorfeld) and when the text before it ends in
 * a colon or in terminal punctuation — Duden capitalises a full utterance after a
 * colon, which is what "…nur eines: Her mit dem Geld!" (id-26) needs. A bare
 * Gedankenstrich is NOT a trigger: it starts no new sentence, so "Nicht lange
 * diskutieren — her mit dem Schlüssel" (id-27) stays lowercase; a dash that
 * follows terminal punctuation does count.
 */
function startsSentence(before: string): boolean {
  const trimmed = before.trimEnd()
  if (trimmed === '') return true
  return /[:.!?…](\s*[—–-]+)?$/.test(trimmed)
}

/** The sentence in three pieces, with the surface capitalised where German does. */
function gapParts(sentence: string, surface: string): { before: string; filled: string; after: string } {
  const idx = sentence.indexOf('___')
  if (idx < 0) return { before: sentence, filled: '', after: '' }
  const before = sentence.slice(0, idx)
  const filled = startsSentence(before)
    ? surface.charAt(0).toUpperCase() + surface.slice(1)
    : surface
  return { before, filled, after: sentence.slice(idx + '___'.length) }
}

/** The reveal's filled sentence for the current card. */
const filledParts = computed(() =>
  current.value
    ? gapParts(current.value.item.sentence, current.value.item.answer)
    : { before: '', filled: '', after: '' }
)

/** The summary rows, each with its sentence pre-split around the filled gap. */
const resultRows = computed(() =>
  questions.value.map(q => ({ q, parts: gapParts(q.item.sentence, q.item.answer) }))
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
    meta: { levels: queriedLevels.value },
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
        class="result-row im-result-row"
      >
        <div class="result-sentence">{{ parts.before }}<strong>{{ parts.filled }}</strong>{{ parts.after }}</div>
        <div class="result-answer">
          <span class="result-picked" :class="q.isCorrect ? 'ok' : 'err'">{{ q.picked || '—' }}</span>
          <span v-if="!q.isCorrect" class="result-correct">→ <strong>{{ q.item.answer }}</strong></span>
        </div>
        <div>
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
    <div class="im-stage" ref="cardRef" tabindex="-1">
      <div class="quiz-meta">
        <span class="quiz-counter">Card {{ questionIndex + 1 }} · of {{ total }}</span>
        <button class="btn btn-quiet" type="button" @click="router.push({ name: 'directionwords-idioms' })">End drill</button>
      </div>

      <div class="quiz-progress-bar">
        <div v-for="(cls, n) in pips" :key="n" class="pip" :class="cls" />
      </div>

      <!-- Prompt: the sentence with its single ___ gap -->
      <div class="im-prompt">
        <p class="micro-mark im-instruction">Welche Wendung passt in die Lücke?</p>
        <p class="im-sentence"><template
          v-for="(part, pi) in promptParts"
          :key="pi"
        >{{ part }}<span v-if="pi < promptParts.length - 1" class="gap">___</span></template></p>
      </div>

      <!-- Pick mode: the item's 3–4 idiom surfaces -->
      <div class="im-picker-grid">
        <button
          v-for="(opt, oi) in current.options"
          :key="opt"
          type="button"
          class="im-choice"
          :class="{
            selected: current.picked === opt,
            correct: submitted && opt === current.item.answer,
            wrong: submitted && current.picked === opt && opt !== current.item.answer,
            disabled: submitted,
          }"
          :disabled="submitted"
          @click="pick(opt)"
        >
          <span class="im-choice-key">{{ oi + 1 }}</span>
          <span class="im-choice-label">{{ opt }}</span>
        </button>
      </div>

      <!-- Feedback after answering — the filled sentence and the explanation
           always show, right or wrong. -->
      <div v-if="submitted" class="im-feedback">
        <span v-if="current.isCorrect" class="im-feedback-mark im-feedback-ok">
          ✓ Richtig — <strong>{{ current.item.answer }}</strong>
        </span>
        <span v-else class="im-feedback-mark im-feedback-bad">
          ✗ Falsch — richtig: <strong>{{ current.item.answer }}</strong>
        </span>
        <div class="im-reveal">
          <p class="im-filled">{{ filledParts.before }}<strong>{{ filledParts.filled }}</strong>{{ filledParts.after }}</p>
          <p class="im-explanation">{{ current.item.explanation }}</p>
        </div>
        <button
          ref="nextBtnRef"
          type="button"
          class="btn btn-accent"
          style="margin-top: 16px;"
          @click="next"
        >
          {{ questionIndex + 1 >= total ? 'Finish drill' : 'Next' }} <span aria-hidden="true">→</span>
        </button>
      </div>

      <div class="im-hint micro-mark">
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
.loading-state { text-align: center; padding-top: 120px; }
.result-page { max-width: 880px; }
.result-actions { display: flex; gap: 12px; flex-wrap: wrap; }

.im-stage {
  max-width: 640px;
  margin: 0 auto;
  outline: none;
}
.im-stage:focus-visible { outline: 1px dotted var(--rule); outline-offset: 8px; }

.im-prompt {
  text-align: center;
  padding: 20px 0 8px;
  border-bottom: 1px solid var(--hairline);
  margin-bottom: 20px;
}
.im-instruction { margin: 0 0 10px; }
.im-sentence {
  font-family: var(--font-display);
  font-size: clamp(19px, 5.6vw, 26px);
  line-height: 1.5;
  color: var(--ink);
  margin: 0 0 14px;
}
/* The module's gap treatment (CompoundRunner.vue) */
.gap {
  display: inline-block;
  min-width: 2.5em;
  border-bottom: 2px solid var(--accent);
  color: var(--accent);
  font-weight: 500;
}

/* Pick mode — two columns on desktop, one thumb-friendly column on phones */
.im-picker-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
@media (max-width: 560px) {
  .im-picker-grid { grid-template-columns: 1fr; }
}

.im-choice {
  background: var(--paper-card);
  border: 1px solid var(--rule);
  border-radius: 4px;
  padding: 16px 14px;
  min-height: 52px;
  cursor: pointer;
  transition: all .15s;
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-mono);
  font-size: 14.5px;
  letter-spacing: 0.04em;
  color: var(--ink-soft);
  text-align: left;
}
.im-choice:not(:disabled):hover {
  border-color: var(--accent);
  color: var(--ink);
  background: var(--accent-wash);
}
.im-choice.selected { border-color: var(--accent); color: var(--accent); }
.im-choice.correct  { border-color: var(--success); color: var(--success); background: var(--success-tint); }
.im-choice.wrong    { border-color: var(--danger);  color: var(--danger);  background: var(--danger-tint); }
.im-choice.disabled { cursor: default; }

.im-choice-key {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 4px;
  font-size: 11px;
  letter-spacing: 0;
  color: var(--mute);
  border: 1px solid var(--hairline);
  border-radius: 2px;
  background: var(--paper);
  flex-shrink: 0;
}
.im-choice.correct .im-choice-key { border-color: var(--success); color: var(--success); }
.im-choice.wrong   .im-choice-key { border-color: var(--danger);  color: var(--danger); }

/* Feedback + reveal */
.im-feedback {
  margin-top: 24px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.im-feedback-mark {
  font-family: var(--font-display);
  font-style: italic;
  font-size: 18px;
}
.im-feedback-ok  { color: var(--success); }
.im-feedback-bad { color: var(--danger); }

.im-reveal {
  margin-top: 8px;
  width: 100%;
  border-left: 3px solid var(--accent);
  background: var(--paper-card);
  border-radius: 0 3px 3px 0;
  padding: 12px 16px;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 10px;
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

.im-hint { margin-top: 20px; text-align: center; color: var(--mute); min-height: 16px; }

/* Result list */
.im-result-row { grid-template-columns: minmax(0, 1fr) 200px auto; background: var(--paper-card); align-items: baseline; padding: 14px 16px; }
.result-sentence {
  font-family: var(--font-display);
  font-style: italic;
  font-size: 15px;
  line-height: 1.5;
  color: var(--ink-soft);
}
.result-sentence strong { font-style: normal; color: var(--ink); }
.result-answer {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
  font-family: var(--font-mono);
  font-size: 13px;
}
.result-correct { color: var(--success); }
.result-explanation {
  grid-column: 1 / -1;
  font-family: var(--font-body);
  font-size: 13.5px;
  line-height: 1.5;
  color: var(--ink);
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dotted var(--hairline);
}
.ok  { color: var(--success); }
.err { color: var(--danger); }
.tag-success { background: var(--success-tint); color: var(--success); }
.tag-danger  { background: var(--danger-tint);  color: var(--danger); }

/* Phone-first */
@media (max-width: 720px) {
  .im-result-row {
    grid-template-columns: 1fr auto;
    grid-template-areas: "sentence verdict" "answer answer" "expl expl";
    gap: 8px 12px;
    align-items: start;
  }
  .im-result-row .result-sentence { grid-area: sentence; }
  .im-result-row .result-answer { grid-area: answer; }
  .im-result-row > div:nth-child(3) { grid-area: verdict; align-self: start; }
  .im-result-row .result-explanation { grid-area: expl; }
  .result-actions { flex-direction: column; align-items: stretch; }
  .result-actions .btn { justify-content: center; }
}
</style>
