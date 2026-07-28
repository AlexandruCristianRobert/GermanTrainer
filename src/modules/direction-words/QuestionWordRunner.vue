<script setup lang="ts">
import { computed, nextTick, onMounted, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  useDirectionDrill, buildQuestionWordQuestions, filterQuestionItems, type DirectionQuestion,
} from '../../composables/useDirectionDrill'
import { saveQuizRun } from '../../composables/useQuizHistory'
import { csv } from '../../composables/quizQuery'
import { shuffle } from '../../data/pool'
import { useBreakpoint } from '../../composables/useBreakpoint'
import { DIRECTION_LEVELS, type DirectionLevel } from '../../data/directionWords'
import type { QuestionWordItem } from '../../data/directionItems'
import RetryModal from '../../components/RetryModal.vue'

type QuestionMode = 'pick' | 'type'

const route = useRoute()
const router = useRouter()
const { isMobile } = useBreakpoint()

// ── quiz state ──────────────────────────────────────────────────────────────
const loading = ref(true)
const error = ref<string | null>(null)
const ready = ref(false)

type Quiz = ReturnType<typeof useDirectionDrill>
const quiz = shallowRef<Quiz | null>(null)
const startedAtMs = ref(0)
const historySaved = ref(false)
const modeUsed = ref<QuestionMode>('pick')

// The sampled items behind the current round — wrongIndexes point into this
// array (composable contract), so retry rebuilds by mapping through it.
const items = ref<QuestionWordItem[]>([])
const queriedLevels = ref<DirectionLevel[]>([])

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
  const levels = csv<DirectionLevel>(route.query.levels, DIRECTION_LEVELS)
  const mode: QuestionMode = route.query.mode === 'type' ? 'type' : 'pick'

  try {
    const sampled = shuffle(filterQuestionItems({ levels }), count)
    if (sampled.length === 0) {
      error.value = 'Nothing to drill — adjust your filters.'
    } else {
      items.value = sampled
      queriedLevels.value = levels
      modeUsed.value = mode
      quiz.value = useDirectionDrill(buildQuestionWordQuestions(sampled))
      startedAtMs.value = Date.now()
      ready.value = true
      resetInputs()
      nextTick(focusActiveInput)
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load.'
  } finally {
    loading.value = false
  }
  window.addEventListener('keydown', onKey)
})

onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

function resetInputs() {
  submitted.value = false
  typedInput.value = ''
}

function focusActiveInput() {
  if (modeUsed.value === 'type') textInputRef.value?.focus()
  else cardRef.value?.focus()
}

// ── computed from quiz ───────────────────────────────────────────────────────
const current = computed(() => ready.value ? quiz.value?.current.value ?? null : null)
const finished = computed(() => ready.value ? quiz.value?.finished.value ?? false : false)
const total = computed(() => ready.value ? quiz.value?.total.value ?? 0 : 0)
const questionIndex = computed(() => ready.value ? quiz.value?.currentIndex.value ?? 0 : 0)
const score = computed(() => ready.value ? quiz.value?.score.value ?? 0 : 0)
const wrongIndexes = computed(() => ready.value ? quiz.value?.wrongIndexes.value ?? [] : [])
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

const currentIsCorrect = computed(() => quiz.value?.current.value?.isCorrect ?? null)

// The prompt sentence split around its single ___ gap, so the gap can be
// styled independently while the rest of the sentence renders as plain text.
const promptParts = computed(() => current.value ? current.value.prompt.split('___') : [])
const filledSentence = computed(() =>
  current.value ? current.value.prompt.replace('___', current.value.answers[0]) : ''
)

// ── actions ──────────────────────────────────────────────────────────────────
function pick(option: string) {
  if (!quiz.value || submitted.value) return
  quiz.value.pickOption(option)
  submitted.value = true
  nextTick(() => nextBtnRef.value?.focus())
}

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
  if (!quiz.value.finished.value) nextTick(focusActiveInput)
}

// Keyboard: 1–N to pick a choice (pick mode only); Enter to advance after a pick.
// Type mode's Enter (submit / advance) is handled on the input itself.
function onKey(e: KeyboardEvent) {
  if (e.altKey || e.ctrlKey || e.metaKey) return
  if (!current.value || modeUsed.value !== 'pick') return
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

// Record the main round once; retry rounds are practice, never a Run (ADR-0010).
function recordRun() {
  if (historySaved.value || !quiz.value || quiz.value.total.value === 0) return
  historySaved.value = true
  const finishedAt = Date.now()
  saveQuizRun({
    type: 'dw-question',
    startedAt: new Date(startedAtMs.value).toISOString(),
    finishedAt: new Date(finishedAt).toISOString(),
    durationMs: finishedAt - startedAtMs.value,
    count: quiz.value.total.value,
    correct: quiz.value.score.value,
    meta: { levels: queriedLevels.value, mode: modeUsed.value },
  })
}

// Record the main round finish, then show retry modal when quiz finishes with wrong items
watch(finished, (now) => {
  if (now && ready.value) {
    recordRun()
    if (wrongIndexes.value.length > 0 && !dismissed.value) {
      showRetryModal.value = true
    }
  }
})

function retryWrong() {
  showRetryModal.value = false
  if (!quiz.value) return
  const wrongSourceItems = quiz.value.wrongIndexes.value.map(i => items.value[i])
  if (wrongSourceItems.length === 0) return
  const resampled = shuffle(wrongSourceItems, wrongSourceItems.length)
  items.value = resampled
  quiz.value = useDirectionDrill(buildQuestionWordQuestions(resampled))
  resetInputs()
  dismissed.value = false
  nextTick(focusActiveInput)
}

function dismissRetry() {
  showRetryModal.value = false
  dismissed.value = true
}

function restart() {
  router.push({ name: 'directionwords-questions' })
}

function resultBefore(q: DirectionQuestion): string {
  const idx = q.prompt.indexOf('___')
  return idx < 0 ? q.prompt : q.prompt.slice(0, idx)
}

function resultAfter(q: DirectionQuestion): string {
  const idx = q.prompt.indexOf('___')
  return idx < 0 ? '' : q.prompt.slice(idx + 3)
}

function resultGiven(q: DirectionQuestion): string {
  return q.picked ?? q.typed ?? '—'
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
    <button class="btn btn-ghost" @click="router.push({ name: 'directionwords-questions' })">← Back to setup</button>
  </div>

  <!-- Summary screen -->
  <div v-else-if="finished && ready && !showRetryModal" class="page result-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Auswertung · Fragewörter</div>
        <div class="result-score">{{ score }} / {{ total }} correct</div>
        <p class="section-subtitle">Question-word round complete.</p>
      </div>
      <div class="result-actions">
        <button class="btn btn-ghost" @click="router.push({ name: 'directionwords' })">← Direction Words</button>
        <button class="btn btn-accent" @click="restart">Start another drill <span aria-hidden="true">→</span></button>
      </div>
    </header>

    <div class="result-list">
      <div
        v-for="(q, i) in questions"
        :key="i"
        class="result-row qw-result-row"
      >
        <div class="result-verb">
          <div class="german">{{ resultBefore(q) }}<strong>{{ q.answers[0] }}</strong>{{ resultAfter(q) }}</div>
        </div>
        <div class="result-answer">
          <span class="result-picked" :class="q.isCorrect ? 'ok' : 'err'">
            {{ resultGiven(q) }}
          </span>
          <span v-if="!q.isCorrect" class="result-correct">
            → <strong>{{ q.answers[0] }}</strong>
          </span>
        </div>
        <div>
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
      item-label="questions"
      @retry="retryWrong"
      @dismiss="dismissRetry"
    />
  </div>

  <!-- Active quiz card -->
  <div v-else-if="current && ready" class="page">
    <div class="qw-stage" ref="cardRef" tabindex="-1">
      <div class="quiz-meta">
        <span class="quiz-counter">Satz {{ questionIndex + 1 }} · von {{ total }}</span>
        <button class="btn btn-quiet" type="button" @click="router.push({ name: 'directionwords-questions' })">End drill</button>
      </div>

      <div class="quiz-progress-bar">
        <div v-for="(cls, n) in pips" :key="n" class="pip" :class="cls" />
      </div>

      <!-- Prompt card -->
      <div class="qw-prompt">
        <p class="qw-sentence">
          <template v-for="(part, i) in promptParts" :key="i">{{ part }}<span v-if="i < promptParts.length - 1" class="gap">___</span></template>
        </p>
      </div>

      <!-- Pick mode: 3–4 option buttons -->
      <div v-if="modeUsed === 'pick'" class="qw-picker-grid">
        <button
          v-for="(opt, oi) in current.options"
          :key="opt"
          type="button"
          class="qw-choice"
          :class="{
            selected: current.picked === opt,
            correct: submitted && current.answers.includes(opt),
            wrong: submitted && current.picked === opt && !current.answers.includes(opt),
            disabled: submitted,
          }"
          :disabled="submitted"
          @click="pick(opt)"
        >
          <span class="qw-choice-key">{{ oi + 1 }}</span>
          <span class="qw-choice-label">{{ opt }}</span>
        </button>
      </div>

      <!-- Type mode: text input + submit -->
      <div v-else class="qw-type-row">
        <input
          ref="textInputRef"
          v-model="typedInput"
          class="input qw-type-input"
          type="text"
          placeholder="Fragewort oder Zeigewort"
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

      <!-- Feedback after answering — always reveals the filled sentence, translation,
           and the reveal note (split-form / daher-homograph explanations). -->
      <div v-if="submitted" class="qw-feedback">
        <span v-if="currentIsCorrect" class="qw-feedback-mark qw-feedback-ok">
          ✓ Richtig — <strong>{{ current.answers[0] }}</strong>
        </span>
        <span v-else class="qw-feedback-mark qw-feedback-bad">
          ✗ Korrekt: <strong>{{ current.answers[0] }}</strong>
        </span>
        <p class="qw-filled">{{ filledSentence }}</p>
        <p class="qw-translation">{{ current.translation }}</p>
        <p v-if="current.revealNote" class="qw-notes">{{ current.revealNote }}</p>
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

      <div class="qw-hint micro-mark">
        <template v-if="!submitted && modeUsed === 'pick' && !isMobile">
          Press <span class="kbd">1</span>–<span class="kbd">{{ current.options.length }}</span> to choose
        </template>
        <template v-else-if="!submitted && modeUsed === 'pick'">Tap a choice</template>
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

.qw-stage {
  max-width: 640px;
  margin: 0 auto;
  outline: none;
}
.qw-stage:focus-visible { outline: 1px dotted var(--rule); outline-offset: 8px; }

.qw-prompt {
  text-align: center;
  padding: 20px 0 8px;
}
.qw-sentence {
  font-family: var(--font-display);
  font-size: clamp(20px, 5vw, 28px);
  line-height: 1.5;
  color: var(--ink);
}
.gap {
  display: inline-block;
  min-width: 2.5em;
  border-bottom: 2px solid var(--accent);
  color: var(--accent);
  font-weight: 500;
}

.qw-picker-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
  margin-top: 16px;
}

.qw-choice {
  background: var(--paper-card);
  border: 1px solid var(--rule);
  border-radius: 4px;
  padding: 18px 14px;
  min-height: 56px;
  cursor: pointer;
  transition: all .15s;
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-mono);
  font-size: 15px;
  letter-spacing: 0.06em;
  color: var(--ink-soft);
  text-align: left;
}
.qw-choice:not(:disabled):hover {
  border-color: var(--accent);
  color: var(--ink);
  background: var(--accent-wash);
}
.qw-choice.selected { border-color: var(--accent); color: var(--accent); }
.qw-choice.correct  { border-color: var(--success); color: var(--success); background: var(--success-tint); }
.qw-choice.wrong    { border-color: var(--danger);  color: var(--danger);  background: var(--danger-tint); }
.qw-choice.disabled { cursor: default; }

.qw-choice-key {
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
.qw-choice.correct .qw-choice-key { border-color: var(--success); color: var(--success); }
.qw-choice.wrong   .qw-choice-key { border-color: var(--danger);  color: var(--danger); }

/* Type mode */
.qw-type-row {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-top: 16px;
}
.qw-type-input {
  flex: 1;
  font-family: var(--font-display);
  font-size: 18px;
}
.qw-type-input.ok { color: var(--success); border-bottom-color: var(--success); }
.qw-type-input.err { color: var(--danger); border-bottom-color: var(--danger); }

.qw-feedback {
  margin-top: 24px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.qw-feedback-mark {
  font-family: var(--font-display);
  font-style: italic;
  font-size: 18px;
}
.qw-feedback-ok  { color: var(--success); }
.qw-feedback-bad { color: var(--danger); }
.qw-filled {
  font-family: var(--font-body);
  font-size: 15px;
  color: var(--ink-soft);
  margin: 0;
}
.qw-translation {
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--ink-soft);
  font-style: italic;
  margin: 0;
}
.qw-notes {
  font-family: var(--font-body);
  font-size: 13px;
  color: var(--mute);
  font-style: italic;
  margin: 4px 0 0;
}

.qw-hint { margin-top: 20px; text-align: center; color: var(--mute); min-height: 16px; }

/* Result list */
.qw-result-row { grid-template-columns: 1fr 160px auto; }
.result-answer {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
  font-family: var(--font-mono);
  font-size: 13px;
}
.result-correct { color: var(--success); }
.ok  { color: var(--success); }
.err { color: var(--danger); }
.tag-success { background: var(--success-tint); color: var(--success); }
.tag-danger  { background: var(--danger-tint);  color: var(--danger); }

/* Phone-first */
@media (max-width: 720px) {
  .qw-result-row { grid-template-columns: 1fr; gap: 4px; }
  .result-actions { flex-direction: column; align-items: stretch; }
  .result-actions .btn { justify-content: center; }
  .qw-type-row { flex-direction: column; align-items: stretch; }
  .qw-type-row .btn { justify-content: center; }
}
</style>
