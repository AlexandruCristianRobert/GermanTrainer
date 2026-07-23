<script setup lang="ts">
import { computed, nextTick, onMounted, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  useDaContrastQuiz, sampleContrastItems, splitContrastSentence,
} from '../../composables/useDaContrastQuiz'
import { saveQuizRun } from '../../composables/useQuizHistory'
import { csv } from '../../composables/quizQuery'
import { shuffle } from '../../data/pool'
import { useBreakpoint } from '../../composables/useBreakpoint'
import RetryModal from '../../components/RetryModal.vue'
import { COLLOCATION_LEVELS, type CollocationLevel } from '../../data/collocations'

const route = useRoute()
const router = useRouter()
const { isMobile } = useBreakpoint()

// ── quiz state ──────────────────────────────────────────────────────────────
const loading = ref(true)
const error = ref<string | null>(null)
const ready = ref(false)

type Quiz = ReturnType<typeof useDaContrastQuiz>
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

  try {
    const items = sampleContrastItems(count, { levels })
    if (items.length === 0) {
      error.value = 'Nothing to drill — adjust your filters.'
    } else {
      quiz.value = useDaContrastQuiz(items)
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

const sentenceParts = computed(() => current.value ? splitContrastSentence(current.value.item.sentence) : null)

/** The sense line for a given preposition on the current question (for the result list). */
function senseFor(q: { options: { preposition: string; sense: string }[] }, prep: string): string {
  return q.options.find(o => o.preposition === prep)?.sense ?? ''
}

// ── actions ──────────────────────────────────────────────────────────────────
function pick(preposition: string) {
  if (!quiz.value || submitted.value) return
  quiz.value.pickOption(preposition)
  submitted.value = true
  nextTick(() => nextBtnRef.value?.focus())
}

function next() {
  if (!quiz.value) return
  quiz.value.advance()
  resetCard()
  if (!quiz.value.finished.value) nextTick(() => cardRef.value?.focus())
}

// Keyboard: 1–3 to pick a choice; Enter to advance after a pick.
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
  pick(current.value.options[idx].preposition)
}

// Record the main round once; retry rounds are practice, never a Run (ADR-0010).
function recordRun() {
  if (historySaved.value || !quiz.value || quiz.value.total.value === 0) return
  historySaved.value = true
  const finishedAt = Date.now()
  const qs = quiz.value.questions.value
  saveQuizRun({
    type: 'dac-contrast',
    startedAt: new Date(startedAtMs.value).toISOString(),
    finishedAt: new Date(finishedAt).toISOString(),
    durationMs: finishedAt - startedAtMs.value,
    count: quiz.value.total.value,
    correct: quiz.value.score.value,
    meta: {
      levels: Array.from(new Set(qs.map(q => q.item.level))).sort(),
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
  quiz.value = useDaContrastQuiz(shuffle(wrong))
  resetCard()
  dismissed.value = false
  nextTick(() => cardRef.value?.focus())
}

function dismissRetry() {
  showRetryModal.value = false
  dismissed.value = true
}

function restart() {
  router.push({ name: 'dacompounds-contrast' })
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
        <div class="breadcrumb">Auswertung · Meaning contrast</div>
        <div class="result-score">{{ score }} / {{ total }} correct</div>
        <p class="section-subtitle">Meaning-contrast drill complete.</p>
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
        class="result-row sub-result-row"
      >
        <div class="result-word">
          <div class="german">{{ q.word }}</div>
          <div class="result-word-meta">{{ q.item.level }}</div>
        </div>
        <div class="result-answer">
          <span class="result-picked" :class="q.isCorrect ? 'ok' : 'err'">{{ q.picked || '—' }}</span>
          <span v-if="!q.isCorrect" class="result-correct">→ <strong>{{ q.item.correct }}</strong></span>
        </div>
        <div>
          <span class="tag" :class="q.isCorrect ? 'tag-success' : 'tag-danger'">
            {{ q.isCorrect ? '✓' : '✗' }}
          </span>
        </div>
        <div v-if="!q.isCorrect" class="result-explanation">{{ senseFor(q, q.item.correct) }}</div>
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
    <div class="sub-stage" ref="cardRef" tabindex="-1">
      <div class="quiz-meta">
        <span class="quiz-counter">Card {{ questionIndex + 1 }} · of {{ total }}</span>
        <button class="btn btn-quiet" type="button" @click="router.push({ name: 'dacompounds-contrast' })">End drill</button>
      </div>

      <div class="quiz-progress-bar">
        <div v-for="(cls, n) in pips" :key="n" class="pip" :class="cls" />
      </div>

      <!-- Prompt: the verb, then the sentence with its single gap -->
      <div class="sub-prompt">
        <p class="micro-mark sub-instruction">Welche Präposition passt hier — <strong>{{ current.word }}</strong>?</p>
        <p class="sub-stem">
          {{ sentenceParts!.pre }}<span
            class="sub-gap"
            :class="{ filled: submitted, ok: submitted && current.isCorrect, err: submitted && !current.isCorrect }"
          >{{ submitted ? current.picked : '＿＿＿' }}</span>{{ sentenceParts!.post }}
        </p>
      </div>

      <!-- Pick mode: 2-3 option buttons, one per competing preposition -->
      <div class="sub-picker-grid">
        <button
          v-for="(opt, oi) in current.options"
          :key="opt.preposition"
          type="button"
          class="sub-choice"
          :class="{
            selected: current.picked === opt.preposition,
            correct: submitted && opt.preposition === current.item.correct,
            wrong: submitted && current.picked === opt.preposition && opt.preposition !== current.item.correct,
            disabled: submitted,
          }"
          :disabled="submitted"
          @click="pick(opt.preposition)"
        >
          <span class="sub-choice-key">{{ oi + 1 }}</span>
          <span class="sub-choice-label">{{ opt.preposition }}</span>
        </button>
      </div>

      <!-- Feedback after answering — EVERY option's sense line always shows, right or wrong -->
      <div v-if="submitted" class="sub-feedback">
        <span v-if="current.isCorrect" class="sub-feedback-mark sub-feedback-ok">
          ✓ Richtig
        </span>
        <span v-else class="sub-feedback-mark sub-feedback-bad">
          ✗ Falsch — richtig: <strong>{{ current.item.correct }}</strong>
        </span>
        <div class="sub-reveal">
          <div
            v-for="opt in current.options"
            :key="opt.preposition"
            class="contrast-sense-line"
            :class="{ correct: opt.preposition === current.item.correct }"
          >
            <span class="contrast-sense-prep">{{ opt.preposition }}</span>
            <span class="contrast-sense-text">{{ opt.sense }}</span>
          </div>
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

      <div class="sub-hint micro-mark">
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

.sub-stage {
  max-width: 640px;
  margin: 0 auto;
  outline: none;
}
.sub-stage:focus-visible { outline: 1px dotted var(--rule); outline-offset: 8px; }

.sub-prompt {
  text-align: center;
  padding: 20px 0 8px;
  border-bottom: 1px solid var(--hairline);
  margin-bottom: 20px;
}
.sub-instruction { margin: 0 0 10px; }
.sub-stem {
  font-family: var(--font-display);
  font-style: italic;
  font-size: clamp(19px, 5.6vw, 26px);
  color: var(--ink);
  margin: 0 0 18px;
}
.sub-gap {
  display: inline-block;
  font-family: var(--font-mono);
  font-style: normal;
  color: var(--accent);
  border-bottom: 2px solid var(--accent);
  padding: 0 2px;
}
.sub-gap.filled.ok { color: var(--success); border-color: var(--success); }
.sub-gap.filled.err { color: var(--danger); border-color: var(--danger); }

/* Pick mode — one column, thumb-friendly on phones */
.sub-picker-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
@media (max-width: 560px) {
  .sub-picker-grid { grid-template-columns: 1fr; }
}

.sub-choice {
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
  font-size: 15px;
  letter-spacing: 0.03em;
  color: var(--ink-soft);
  text-align: left;
}
.sub-choice:not(:disabled):hover {
  border-color: var(--accent);
  color: var(--ink);
  background: var(--accent-wash);
}
.sub-choice.selected { border-color: var(--accent); color: var(--accent); }
.sub-choice.correct  { border-color: var(--success); color: var(--success); background: var(--success-tint); }
.sub-choice.wrong    { border-color: var(--danger);  color: var(--danger);  background: var(--danger-tint); }
.sub-choice.disabled { cursor: default; }

.sub-choice-key {
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
.sub-choice.correct .sub-choice-key { border-color: var(--success); color: var(--success); }
.sub-choice.wrong   .sub-choice-key { border-color: var(--danger);  color: var(--danger); }

/* Feedback + reveal */
.sub-feedback {
  margin-top: 24px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.sub-feedback-mark {
  font-family: var(--font-display);
  font-style: italic;
  font-size: 18px;
}
.sub-feedback-ok  { color: var(--success); }
.sub-feedback-bad { color: var(--danger); }

.sub-reveal {
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
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.03em;
}
.contrast-sense-line.correct .contrast-sense-prep { color: var(--success); }
.contrast-sense-text { color: var(--ink); }
.contrast-sense-line.correct .contrast-sense-text { color: var(--success); }

.sub-hint { margin-top: 20px; text-align: center; color: var(--mute); min-height: 16px; }

/* Result list */
.sub-result-row { grid-template-columns: 100px 1fr auto; background: var(--paper-card); align-items: center; padding: 14px 16px; }
.result-word-meta {
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
  .sub-result-row {
    grid-template-columns: 1fr auto;
    grid-template-areas: "word verdict" "answer answer" "expl expl";
    gap: 8px 12px;
    align-items: start;
  }
  .sub-result-row .result-word { grid-area: word; }
  .sub-result-row .result-answer { grid-area: answer; }
  .sub-result-row > div:nth-child(3) { grid-area: verdict; align-self: start; }
  .sub-result-row .result-explanation { grid-area: expl; }
  .result-actions { flex-direction: column; align-items: stretch; }
  .result-actions .btn { justify-content: center; }
}
</style>
