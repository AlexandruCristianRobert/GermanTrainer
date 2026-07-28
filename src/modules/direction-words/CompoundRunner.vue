<script setup lang="ts">
import { computed, nextTick, onMounted, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  useDirectionDrill, buildCompoundQuestions, filterCompoundItems, type DirectionQuestion,
} from '../../composables/useDirectionDrill'
import { saveQuizRun } from '../../composables/useQuizHistory'
import { csv } from '../../composables/quizQuery'
import { shuffle } from '../../data/pool'
import { useBreakpoint } from '../../composables/useBreakpoint'
import { ADVERB_PAIRS, DIRECTION_LEVELS, type DirectionLevel, type PerspectiveItem } from '../../data/directionWords'
import RetryModal from '../../components/RetryModal.vue'
import SceneDiagram from './SceneDiagram.vue'

type CompoundMode = 'pick' | 'type'
const PAIR_ELEMENTS = ADVERB_PAIRS.map(p => p.element)

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
const modeUsed = ref<CompoundMode>('pick')

// The sampled items behind the current round — wrongIndexes point into this
// array (composable contract), so retry rebuilds by mapping through it.
const items = ref<PerspectiveItem[]>([])
const queriedLevels = ref<DirectionLevel[]>([])
const queriedPairs = ref<string[]>([])

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
  const pairs = csv<string>(route.query.pairs, PAIR_ELEMENTS)
  const mode: CompoundMode = route.query.mode === 'type' ? 'type' : 'pick'

  try {
    const sampled = shuffle(filterCompoundItems({ levels, pairs }), count)
    if (sampled.length === 0) {
      error.value = 'Nothing to drill — adjust your filters.'
    } else {
      items.value = sampled
      queriedLevels.value = levels
      queriedPairs.value = pairs
      modeUsed.value = mode
      quiz.value = useDirectionDrill(buildCompoundQuestions(sampled))
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

// Keyboard: 1–4 to pick a choice (pick mode only); Enter to advance after a pick.
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
    type: 'dw-compound',
    startedAt: new Date(startedAtMs.value).toISOString(),
    finishedAt: new Date(finishedAt).toISOString(),
    durationMs: finishedAt - startedAtMs.value,
    count: quiz.value.total.value,
    correct: quiz.value.score.value,
    meta: { levels: queriedLevels.value, pairs: queriedPairs.value, mode: modeUsed.value },
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
  quiz.value = useDirectionDrill(buildCompoundQuestions(resampled))
  resetInputs()
  dismissed.value = false
  nextTick(focusActiveInput)
}

function dismissRetry() {
  showRetryModal.value = false
  dismissed.value = true
}

function restart() {
  router.push({ name: 'directionwords-compounds' })
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
    <button class="btn btn-ghost" @click="router.push({ name: 'directionwords-compounds' })">← Back to setup</button>
  </div>

  <!-- Summary screen -->
  <div v-else-if="finished && ready && !showRetryModal" class="page result-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Auswertung · Zusammensetzungen</div>
        <div class="result-score">{{ score }} / {{ total }} correct</div>
        <p class="section-subtitle">Compound gap-fill round complete.</p>
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
        class="result-row cp-result-row"
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
      item-label="sentences"
      @retry="retryWrong"
      @dismiss="dismissRetry"
    />
  </div>

  <!-- Active quiz card -->
  <div v-else-if="current && ready" class="page">
    <div class="cp-stage" ref="cardRef" tabindex="-1">
      <div class="quiz-meta">
        <span class="quiz-counter">Satz {{ questionIndex + 1 }} · von {{ total }}</span>
        <button class="btn btn-quiet" type="button" @click="router.push({ name: 'directionwords-compounds' })">End drill</button>
      </div>

      <div class="quiz-progress-bar">
        <div v-for="(cls, n) in pips" :key="n" class="pip" :class="cls" />
      </div>

      <SceneDiagram :scene="current.scene!" class="cp-scene" />

      <!-- Prompt card -->
      <div class="cp-prompt">
        <p class="cp-sentence">
          <template v-for="(part, i) in promptParts" :key="i">{{ part }}<span v-if="i < promptParts.length - 1" class="gap">___</span></template>
        </p>
      </div>

      <!-- Pick mode: 4 option buttons -->
      <div v-if="modeUsed === 'pick'" class="cp-picker-grid">
        <button
          v-for="(opt, oi) in current.options"
          :key="opt"
          type="button"
          class="cp-choice"
          :class="{
            selected: current.picked === opt,
            correct: submitted && current.answers.includes(opt),
            wrong: submitted && current.picked === opt && !current.answers.includes(opt),
            disabled: submitted,
          }"
          :disabled="submitted"
          @click="pick(opt)"
        >
          <span class="cp-choice-key">{{ oi + 1 }}</span>
          <span class="cp-choice-label">{{ opt }}</span>
        </button>
      </div>

      <!-- Type mode: text input + submit -->
      <div v-else class="cp-type-row">
        <input
          ref="textInputRef"
          v-model="typedInput"
          class="input cp-type-input"
          type="text"
          placeholder="hin- oder her-Kompositum"
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
           and the r-form note (revealNote): r-forms are never accepted as answers, so
           the reveal is where that distinction gets taught, win or lose. -->
      <div v-if="submitted" class="cp-feedback">
        <span v-if="currentIsCorrect" class="cp-feedback-mark cp-feedback-ok">
          ✓ Richtig — <strong>{{ current.answers[0] }}</strong>
        </span>
        <span v-else class="cp-feedback-mark cp-feedback-bad">
          ✗ Korrekt: <strong>{{ current.answers[0] }}</strong>
        </span>
        <p class="cp-filled">{{ filledSentence }}</p>
        <p class="cp-translation">{{ current.translation }}</p>
        <p v-if="current.revealNote" class="cp-notes">{{ current.revealNote }}</p>
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

      <div class="cp-hint micro-mark">
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

.cp-stage {
  max-width: 640px;
  margin: 0 auto;
  outline: none;
}
.cp-stage:focus-visible { outline: 1px dotted var(--rule); outline-offset: 8px; }

.cp-scene {
  max-width: 340px;
  margin: 20px auto 0;
}

.cp-prompt {
  text-align: center;
  padding: 20px 0 8px;
}
.cp-sentence {
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

.cp-picker-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 16px;
}
@media (max-width: 560px) {
  .cp-picker-grid { grid-template-columns: 1fr; }
}

.cp-choice {
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
.cp-choice:not(:disabled):hover {
  border-color: var(--accent);
  color: var(--ink);
  background: var(--accent-wash);
}
.cp-choice.selected { border-color: var(--accent); color: var(--accent); }
.cp-choice.correct  { border-color: var(--success); color: var(--success); background: var(--success-tint); }
.cp-choice.wrong    { border-color: var(--danger);  color: var(--danger);  background: var(--danger-tint); }
.cp-choice.disabled { cursor: default; }

.cp-choice-key {
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
.cp-choice.correct .cp-choice-key { border-color: var(--success); color: var(--success); }
.cp-choice.wrong   .cp-choice-key { border-color: var(--danger);  color: var(--danger); }

/* Type mode */
.cp-type-row {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-top: 16px;
}
.cp-type-input {
  flex: 1;
  font-family: var(--font-display);
  font-size: 18px;
}
.cp-type-input.ok { color: var(--success); border-bottom-color: var(--success); }
.cp-type-input.err { color: var(--danger); border-bottom-color: var(--danger); }

.cp-feedback {
  margin-top: 24px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.cp-feedback-mark {
  font-family: var(--font-display);
  font-style: italic;
  font-size: 18px;
}
.cp-feedback-ok  { color: var(--success); }
.cp-feedback-bad { color: var(--danger); }
.cp-filled {
  font-family: var(--font-body);
  font-size: 15px;
  color: var(--ink-soft);
  margin: 0;
}
.cp-translation {
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--ink-soft);
  font-style: italic;
  margin: 0;
}
.cp-notes {
  font-family: var(--font-body);
  font-size: 13px;
  color: var(--mute);
  font-style: italic;
  margin: 4px 0 0;
}

.cp-hint { margin-top: 20px; text-align: center; color: var(--mute); min-height: 16px; }

/* Result list */
.cp-result-row { grid-template-columns: 1fr 160px auto; }
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
  .cp-result-row { grid-template-columns: 1fr; gap: 4px; }
  .result-actions { flex-direction: column; align-items: stretch; }
  .result-actions .btn { justify-content: center; }
  .cp-type-row { flex-direction: column; align-items: stretch; }
  .cp-type-row .btn { justify-content: center; }
}
</style>
