<script setup lang="ts">
import { computed, nextTick, onMounted, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useVerbs } from '../../composables/useVerbs'
import { useCaseGovernmentQuiz } from '../../composables/useCaseGovernmentQuiz'
import { csv } from '../../composables/quizQuery'
import { shuffle } from '../../data/pool'
import { useBreakpoint } from '../../composables/useBreakpoint'
import RetryModal from '../../components/RetryModal.vue'
import {
  VERB_LEVELS, VERB_TYPES,
  type Verb, type VerbCase, type VerbLevel, type VerbType,
} from '../../data/verbs'

// The six determinate cases — always shown as buttons regardless of filter.
const CASE_BUTTONS: { value: VerbCase; label: string }[] = [
  { value: 'accusative',        label: 'Akkusativ' },
  { value: 'dative',            label: 'Dativ' },
  { value: 'dative+accusative', label: 'Dativ + Akkusativ' },
  { value: 'genitive',          label: 'Genitiv' },
  { value: 'reflexive',         label: 'Reflexiv' },
  { value: 'none',              label: 'Kein Objekt' },
]

// The six values, in the same order, for keyboard shortcut mapping
const CASE_VALUES = CASE_BUTTONS.map(b => b.value) as VerbCase[]

const DETERMINABLE_CASES = [
  'accusative', 'dative', 'dative+accusative',
  'genitive', 'reflexive', 'none',
] as const satisfies readonly VerbCase[]

type DeterminableCase = (typeof DETERMINABLE_CASES)[number]

const route  = useRoute()
const router = useRouter()
const { sample } = useVerbs()
const { isMobile } = useBreakpoint()

// ── quiz state ──────────────────────────────────────────────────────────────
const loading = ref(true)
const error   = ref<string | null>(null)
const ready   = ref(false)

type Quiz = ReturnType<typeof useCaseGovernmentQuiz>
const quiz = shallowRef<Quiz | null>(null)

// ── per-card state ──────────────────────────────────────────────────────────
const submitted = ref(false)
const cardRef = ref<HTMLElement | null>(null)
const nextBtnRef = ref<HTMLButtonElement | null>(null)

// ── retry modal state ───────────────────────────────────────────────────────
const showRetryModal = ref(false)
const dismissed      = ref(false)

// ── mount ───────────────────────────────────────────────────────────────────
onMounted(() => {
  const count = Math.max(1, parseInt((route.query.count as string) ?? '10', 10) || 10)
  const levels = csv<VerbLevel>(route.query.levels, VERB_LEVELS)
  const types  = csv<VerbType>(route.query.types, VERB_TYPES)
  // Only sample verbs from the six determinable cases (excludes 'varies' entirely)
  const rawCases = csv<DeterminableCase>(route.query.cases, DETERMINABLE_CASES)

  try {
    // Sample verbs and defensively drop any 'varies' that may have slipped through
    const verbs: Verb[] = sample(count, { levels, types, cases: rawCases })
      .filter(v => v.case !== 'varies')
    if (verbs.length === 0) {
      error.value = 'Nothing to drill — adjust your filters.'
    } else {
      quiz.value = useCaseGovernmentQuiz(verbs)
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
const current       = computed(() => (ready.value, quiz.value?.current.value ?? null))
const finished      = computed(() => (ready.value, quiz.value?.finished.value ?? false))
const total         = computed(() => (ready.value, quiz.value?.total.value ?? 0))
const questionIndex = computed(() => (ready.value, quiz.value?.currentIndex.value ?? 0))
const score         = computed(() => (ready.value, quiz.value?.score.value ?? 0))
const wrongVerbs    = computed(() => (ready.value, quiz.value?.wrongVerbs.value ?? []))
const questions     = computed(() => (ready.value, quiz.value?.questions.value ?? []))

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

// ── actions ──────────────────────────────────────────────────────────────────
function pick(c: VerbCase) {
  if (!quiz.value || submitted.value) return
  quiz.value.pick(c)
  submitted.value = true
  nextTick(() => nextBtnRef.value?.focus())
}

function next() {
  if (!quiz.value) return
  quiz.value.advance()
  submitted.value = false
  if (!quiz.value.finished.value) nextTick(() => cardRef.value?.focus())
}

// Keyboard: 1–6 to pick a case; Enter to advance after a pick
function onKey(e: KeyboardEvent) {
  if (e.altKey || e.ctrlKey || e.metaKey) return
  if (!current.value) return
  if (e.key === 'Enter') {
    if (submitted.value) { e.preventDefault(); next() }
    return
  }
  if (submitted.value) return
  const idx = e.key.charCodeAt(0) - '1'.charCodeAt(0)
  if (idx < 0 || idx >= CASE_VALUES.length) return
  e.preventDefault()
  pick(CASE_VALUES[idx])
}

// Show retry modal when quiz finishes with wrong verbs
watch(finished, (now) => {
  if (now && ready.value && wrongVerbs.value.length > 0 && !dismissed.value) {
    showRetryModal.value = true
  }
})

function retryWrong() {
  showRetryModal.value = false
  if (!quiz.value) return
  const wrong = wrongVerbs.value
  if (wrong.length === 0) return
  quiz.value = useCaseGovernmentQuiz(shuffle(wrong))
  submitted.value = false
  dismissed.value = false
  nextTick(() => cardRef.value?.focus())
}

function dismissRetry() {
  showRetryModal.value = false
  dismissed.value = true
}

function restart() {
  router.push({ name: 'verbs-case-government' })
}

function caseLabel(c: VerbCase): string {
  const btn = CASE_BUTTONS.find(b => b.value === c)
  return btn ? btn.label : c
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
        <div class="breadcrumb">Auswertung · Rektion</div>
        <div class="result-score">{{ score }} / {{ total }} correct</div>
        <p class="section-subtitle">Case government drill complete.</p>
      </div>
      <div class="result-actions">
        <button class="btn btn-ghost" @click="router.push({ name: 'verbs' })">← Verben</button>
        <button class="btn btn-accent" @click="restart">Start another drill <span aria-hidden="true">→</span></button>
      </div>
    </header>

    <div class="result-list">
      <div
        v-for="(q, i) in questions"
        :key="i"
        class="result-row cg-result-row"
      >
        <div class="result-verb">
          <div class="german">{{ q.verb.german }}</div>
          <div class="result-verb-meta">{{ q.verb.english }}</div>
        </div>
        <div class="result-answer">
          <span class="result-picked" :class="q.isCorrect ? 'ok' : 'err'">
            {{ q.picked ? caseLabel(q.picked) : '—' }}
          </span>
          <span v-if="!q.isCorrect" class="result-correct">
            → <strong>{{ caseLabel(q.verb.case) }}</strong>
          </span>
          <span v-if="q.verb.notes" class="result-notes">{{ q.verb.notes }}</span>
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
      :wrong-count="wrongVerbs.length"
      item-label="verbs"
      @retry="retryWrong"
      @dismiss="dismissRetry"
    />
  </div>

  <!-- Active quiz card -->
  <div v-else-if="current && ready" class="page">
    <div class="cg-stage" ref="cardRef" tabindex="-1">
      <div class="quiz-meta">
        <span class="quiz-counter">Verb {{ questionIndex + 1 }} · von {{ total }}</span>
        <button class="btn btn-quiet" type="button" @click="router.push({ name: 'verbs-case-government' })">End drill</button>
      </div>

      <div class="quiz-progress-bar">
        <div v-for="(cls, n) in pips" :key="n" class="pip" :class="cls" />
      </div>

      <!-- Prompt card -->
      <div class="cg-prompt">
        <div class="cg-verb-german">{{ current.verb.german }}</div>
        <div class="cg-verb-english">{{ current.verb.english }}</div>
        <div class="cg-ask">Welcher Kasus<em>?</em></div>
      </div>

      <!-- Six fixed case buttons — always all shown -->
      <div class="cg-picker-grid">
        <button
          v-for="(btn, bi) in CASE_BUTTONS"
          :key="btn.value"
          type="button"
          class="cg-choice"
          :class="{
            selected: current.picked === btn.value,
            correct: submitted && current.verb.case === btn.value,
            wrong: submitted && current.picked === btn.value && current.verb.case !== btn.value,
            disabled: submitted,
          }"
          :disabled="submitted"
          @click="pick(btn.value)"
        >
          <span class="cg-choice-key">{{ bi + 1 }}</span>
          <span class="cg-choice-label">{{ btn.label }}</span>
        </button>
      </div>

      <!-- Feedback after pick -->
      <div v-if="submitted" class="cg-feedback">
        <span v-if="currentIsCorrect" class="cg-feedback-mark cg-feedback-ok">
          ✓ Richtig — {{ caseLabel(current.verb.case) }}.
        </span>
        <span v-else class="cg-feedback-mark cg-feedback-bad">
          ✗ Korrekt: <strong>{{ caseLabel(current.verb.case) }}</strong>.
        </span>
        <p v-if="current.verb.notes" class="cg-notes">{{ current.verb.notes }}</p>
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

      <div class="cg-hint micro-mark">
        <template v-if="!submitted && !isMobile">
          Press <span class="kbd">1</span>–<span class="kbd">6</span> to choose
        </template>
        <template v-else-if="submitted">
          Press <span class="kbd">Enter</span> to {{ questionIndex + 1 >= total ? 'finish' : 'continue' }}
        </template>
        <template v-else>Tap a case button</template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.loading-state { text-align: center; padding-top: 120px; }
.result-page { max-width: 880px; }
.result-actions { display: flex; gap: 12px; flex-wrap: wrap; }

.cg-stage {
  max-width: 640px;
  margin: 0 auto;
  outline: none;
}
.cg-stage:focus-visible { outline: 1px dotted var(--rule); outline-offset: 8px; }

.cg-prompt {
  text-align: center;
  padding: 20px 0 8px;
}
.cg-verb-german {
  font-family: var(--font-display);
  font-weight: 500;
  font-size: clamp(32px, 10vw, 52px);
  color: var(--accent);
  line-height: 1.1;
}
.cg-verb-english {
  font-family: var(--font-body);
  font-style: italic;
  font-size: 18px;
  color: var(--ink-soft);
  margin-top: 4px;
}
.cg-ask {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--mute);
  margin: 12px 0 24px;
}
.cg-ask em { font-style: normal; color: var(--accent); }

/* Six-button grid — 2 columns on wide, wraps to 1 column on phones */
.cg-picker-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.cg-choice {
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
  font-size: 13px;
  letter-spacing: 0.06em;
  color: var(--ink-soft);
  text-align: left;
}
.cg-choice:not(:disabled):hover {
  border-color: var(--accent);
  color: var(--ink);
  background: var(--accent-wash);
}
.cg-choice.selected { border-color: var(--accent); color: var(--accent); }
.cg-choice.correct  { border-color: var(--success); color: var(--success); background: var(--success-tint); }
.cg-choice.wrong    { border-color: var(--danger);  color: var(--danger);  background: var(--danger-tint); }
.cg-choice.disabled { cursor: default; }

.cg-choice-key {
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
.cg-choice.correct .cg-choice-key { border-color: var(--success); color: var(--success); }
.cg-choice.wrong   .cg-choice-key { border-color: var(--danger);  color: var(--danger); }

.cg-feedback {
  margin-top: 24px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.cg-feedback-mark {
  font-family: var(--font-display);
  font-style: italic;
  font-size: 18px;
}
.cg-feedback-ok  { color: var(--success); }
.cg-feedback-bad { color: var(--danger); }
.cg-notes {
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--ink-soft);
  font-style: italic;
  margin: 0;
}

.cg-hint { margin-top: 20px; text-align: center; color: var(--mute); }

/* Result list */
.cg-result-row { grid-template-columns: 180px 1fr auto; }
.result-verb-meta {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.06em;
  color: var(--mute);
  margin-top: 2px;
  font-weight: 400;
}
.result-answer {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
  font-family: var(--font-mono);
  font-size: 13px;
}
.result-correct { color: var(--success); }
.result-notes {
  font-family: var(--font-body);
  font-style: italic;
  font-size: 12px;
  color: var(--ink-soft);
}
.ok  { color: var(--success); }
.err { color: var(--danger); }
.tag-success { background: var(--success-tint); color: var(--success); }
.tag-danger  { background: var(--danger-tint);  color: var(--danger); }

/* Phone-first */
@media (max-width: 720px) {
  .cg-result-row { grid-template-columns: 1fr; gap: 4px; }
  .result-actions { flex-direction: column; align-items: stretch; }
  .result-actions .btn { justify-content: center; }
}

@media (max-width: 600px) {
  /* Stack to single column for easy thumb tapping */
  .cg-picker-grid {
    grid-template-columns: 1fr;
  }
  .cg-choice {
    padding: 16px 14px;
    min-height: 52px;
    font-size: 15px;
  }
}
</style>
