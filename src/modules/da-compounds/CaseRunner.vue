<script setup lang="ts">
import { computed, nextTick, onMounted, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDaCaseQuiz } from '../../composables/useDaCaseQuiz'
import { sampleSubstitutionItems, SUBSTITUTION_PREPS } from '../../composables/useDaSubstitutionQuiz'
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

type Quiz = ReturnType<typeof useDaCaseQuiz>
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
      quiz.value = useDaCaseQuiz(items)
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

// ── actions ──────────────────────────────────────────────────────────────────
// Picking a case grades and locks the card immediately — there is nothing else
// to fill in, so (unlike the fixed-prepositions drill) there is no separate
// Submit step.
function pick(c: CollocationCase) {
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

// Keyboard: 1 = Akkusativ · 2 = Dativ; Enter to advance after a pick.
function onKey(e: KeyboardEvent) {
  if (e.altKey || e.ctrlKey || e.metaKey) return
  if (!current.value) return
  if (e.key === 'Enter') {
    if (submitted.value) { e.preventDefault(); next() }
    return
  }
  if (submitted.value) return
  if (e.key === '1') { e.preventDefault(); pick('accusative') }
  else if (e.key === '2') { e.preventDefault(); pick('dative') }
}

// Record the main round once; retry rounds are practice, never a Run (ADR-0010).
function recordRun() {
  if (historySaved.value || !quiz.value || quiz.value.total.value === 0) return
  historySaved.value = true
  const finishedAt = Date.now()
  const qs = quiz.value.questions.value
  saveQuizRun({
    type: 'dac-case',
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
  quiz.value = useDaCaseQuiz(shuffle(wrong))
  submitted.value = false
  dismissed.value = false
  nextTick(() => cardRef.value?.focus())
}

function dismissRetry() {
  showRetryModal.value = false
  dismissed.value = true
}

function restart() {
  router.push({ name: 'dacompounds-case' })
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
        <div class="breadcrumb">Auswertung · Kasus</div>
        <div class="result-score">{{ score }} / {{ total }} correct</div>
        <p class="section-subtitle">Case-pick drill complete.</p>
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
        class="result-row case-result-row"
        :style="prepColorStyle(q.colloc.preposition)"
      >
        <div class="result-word">
          <div class="german">{{ q.colloc.word }}</div>
          <div class="result-word-meta">{{ q.colloc.preposition }} · {{ caseName(q.colloc.case) }}</div>
        </div>
        <div class="result-answer">
          <span class="result-picked" :class="q.isCorrect ? 'ok' : 'err'">{{ q.picked ? caseName(q.picked) : '—' }}</span>
          <span v-if="!q.isCorrect" class="result-correct">→ <strong>{{ caseName(q.colloc.case) }}</strong></span>
        </div>
        <div>
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
      item-label="case picks"
      @retry="retryWrong"
      @dismiss="dismissRetry"
    />
  </div>

  <!-- Active quiz card -->
  <div v-else-if="current && ready" class="page">
    <div class="case-stage" ref="cardRef" tabindex="-1">
      <div class="quiz-meta">
        <span class="quiz-counter">Card {{ questionIndex + 1 }} · of {{ total }}</span>
        <button class="btn btn-quiet" type="button" @click="router.push({ name: 'dacompounds-case' })">End drill</button>
      </div>

      <div class="quiz-progress-bar">
        <div v-for="(cls, n) in pips" :key="n" class="pip" :class="cls" />
      </div>

      <!-- Prompt: the sentence already filled with the da-compound (bolded) -->
      <div class="case-prompt">
        <p class="case-sentence">
          {{ current.sentence.pre }}<strong
            class="case-compound"
            :class="{ 'prep-accent-text': submitted }"
            :style="submitted ? prepColorStyle(current.colloc.preposition) : undefined"
          >{{ current.sentence.compound }}</strong>{{ current.sentence.post }}
        </p>
      </div>

      <!-- Case buttons -->
      <div class="case-buttons">
        <button
          v-for="c in (['accusative', 'dative'] as CollocationCase[])"
          :key="c"
          class="btn case-btn"
          :class="{
            'case-selected': current.picked === c,
            'case-correct': submitted && current.acceptedCases.includes(c),
            'case-wrong': submitted && current.picked === c && !current.acceptedCases.includes(c),
          }"
          :disabled="submitted"
          type="button"
          @click="pick(c)"
        >{{ caseName(c) }}</button>
      </div>

      <!-- Feedback after answering -->
      <div v-if="submitted" class="case-feedback">
        <span v-if="current.isCorrect" class="case-feedback-mark case-feedback-ok">
          ✓ Richtig — <strong>{{ caseName(current.picked!) }}</strong>
        </span>
        <template v-else>
          <span class="case-feedback-mark case-feedback-bad">✗ Korrekt: <strong>{{ caseName(current.colloc.case) }}</strong></span>
          <div class="case-reveal" :style="prepColorStyle(current.colloc.preposition)">
            <div class="case-reveal-line">
              <strong class="prep-accent-text">{{ current.colloc.word }}</strong>
              · <span class="prep-accent-text">{{ current.colloc.preposition }}</span>
              · {{ caseName(current.colloc.case) }}
            </div>
            <div class="case-reveal-explanation">{{ current.colloc.coreIdeaExplanation }}</div>
          </div>
        </template>
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

      <div class="case-hint micro-mark">
        <template v-if="!submitted && !isMobile">
          Press <span class="kbd">1</span> / <span class="kbd">2</span> to choose
        </template>
        <template v-else-if="!submitted">Tap a case</template>
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

.case-stage {
  max-width: 640px;
  margin: 0 auto;
  outline: none;
}
.case-stage:focus-visible { outline: 1px dotted var(--rule); outline-offset: 8px; }

.case-prompt {
  text-align: center;
  padding: 24px 0;
  border-bottom: 1px solid var(--hairline);
  margin-bottom: 24px;
}
.case-sentence {
  font-family: var(--font-display);
  font-style: italic;
  font-size: clamp(20px, 6vw, 28px);
  color: var(--ink);
  margin: 0;
}
.case-compound { font-style: normal; color: var(--ink); }
.case-compound.prep-accent-text { color: var(--prep-accent); }

/* Case buttons — mirrors CollocationsRunner.vue's case-button markup */
.case-buttons {
  display: flex;
  gap: 10px;
}
.case-btn {
  flex: 1;
  min-width: 100px;
  text-align: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: 16px;
  border: 1px solid var(--rule);
  background: transparent;
  color: var(--ink);
  padding: 16px;
  cursor: pointer;
  transition: background 0.1s, color 0.1s;
}
.case-btn:hover:not(:disabled) {
  background: var(--paper-card);
  border-color: var(--ink);
}
.case-selected {
  background: var(--ink) !important;
  color: var(--paper) !important;
  border-color: var(--ink) !important;
}
.case-correct {
  background: var(--success-tint, #d4edda) !important;
  color: var(--success) !important;
  border-color: var(--success) !important;
}
.case-wrong {
  background: var(--danger-tint, #f8d7da) !important;
  color: var(--danger) !important;
  border-color: var(--danger) !important;
}

/* Feedback + reveal */
.case-feedback {
  margin-top: 24px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.case-feedback-mark {
  font-family: var(--font-display);
  font-style: italic;
  font-size: 18px;
}
.case-feedback-ok  { color: var(--success); }
.case-feedback-bad { color: var(--danger); }

.case-reveal {
  margin-top: 8px;
  width: 100%;
  border-left: 3px solid var(--prep-accent);
  background: var(--prep-wash);
  border-radius: 0 3px 3px 0;
  padding: 12px 16px;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.case-reveal-line {
  font-family: var(--font-mono);
  font-size: 13px;
}
.prep-accent-text { color: var(--prep-accent); font-weight: 600; }
.case-reveal-explanation {
  font-family: var(--font-body);
  font-size: 14.5px;
  line-height: 1.55;
  color: var(--ink);
}

.case-hint { margin-top: 20px; text-align: center; color: var(--mute); min-height: 16px; }

/* Result list */
.case-result-row { grid-template-columns: 180px 1fr auto; background: var(--prep-wash); align-items: center; padding: 14px 16px; }
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
  .case-result-row {
    grid-template-columns: 1fr auto;
    grid-template-areas: "word verdict" "answer answer" "expl expl";
    gap: 8px 12px;
    align-items: start;
  }
  .case-result-row .result-word { grid-area: word; }
  .case-result-row .result-answer { grid-area: answer; }
  .case-result-row > div:nth-child(3) { grid-area: verdict; align-self: start; }
  .case-result-row .result-explanation { grid-area: expl; }
  .result-actions { flex-direction: column; align-items: stretch; }
  .result-actions .btn { justify-content: center; }

  .case-buttons { flex-direction: column; }
  .case-btn { padding: 16px 8px; font-size: 17px; }
}
</style>
