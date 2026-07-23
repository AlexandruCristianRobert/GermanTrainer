<script setup lang="ts">
import { computed, nextTick, onMounted, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  useDaParaphraseQuiz, sampleParaphraseItems, splitParaphraseSentence,
  PARAPHRASE_PREPS,
} from '../../composables/useDaParaphraseQuiz'
import { saveQuizRun } from '../../composables/useQuizHistory'
import { csv } from '../../composables/quizQuery'
import { shuffle } from '../../data/pool'
import { useBreakpoint } from '../../composables/useBreakpoint'
import RetryModal from '../../components/RetryModal.vue'
import { COLLOCATION_LEVELS, type CollocationLevel } from '../../data/collocations'
import { prepColorStyle } from '../../data/prepColors'

const route = useRoute()
const router = useRouter()
const { isMobile } = useBreakpoint()

// ── quiz state ──────────────────────────────────────────────────────────────
const loading = ref(true)
const error = ref<string | null>(null)
const ready = ref(false)

type Quiz = ReturnType<typeof useDaParaphraseQuiz>
const quiz = shallowRef<Quiz | null>(null)
const startedAtMs = ref(0)
const historySaved = ref(false)

// ── per-card state — two graded inputs, one Submit ─────────────────────────
const submitted = ref(false)
const prepInput = ref('')
const korrelatInput = ref('')
const cardRef = ref<HTMLElement | null>(null)
const prepInputRef = ref<HTMLInputElement | null>(null)
const nextBtnRef = ref<HTMLButtonElement | null>(null)

// ── retry modal state ───────────────────────────────────────────────────────
const showRetryModal = ref(false)
const dismissed = ref(false)

// ── mount ───────────────────────────────────────────────────────────────────
onMounted(() => {
  const count = Math.max(1, parseInt((route.query.count as string) ?? '10', 10) || 10)
  const levels = csv<CollocationLevel>(route.query.levels, COLLOCATION_LEVELS)
  const preps = csv<string>(route.query.preps, PARAPHRASE_PREPS)

  try {
    const items = sampleParaphraseItems(count, { levels, preps })
    if (items.length === 0) {
      error.value = 'Nothing to drill — adjust your filters.'
    } else {
      quiz.value = useDaParaphraseQuiz(items)
      startedAtMs.value = Date.now()
      ready.value = true
      resetInputs()
      nextTick(focusPrep)
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load.'
  } finally {
    loading.value = false
  }
})

function resetInputs() {
  submitted.value = false
  prepInput.value = ''
  korrelatInput.value = ''
}

function focusPrep() {
  prepInputRef.value?.focus()
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

// Both sentences carry exactly one gap (dataset invariant); split around it so
// the input can sit inline, mid-sentence for both the noun and clause versions.
const nounSplit = computed(() =>
  current.value ? splitParaphraseSentence(current.value.item.nounSentence) : { pre: '', post: '' }
)
const clauseSplit = computed(() =>
  current.value ? splitParaphraseSentence(current.value.item.clauseSentence) : { pre: '', post: '' }
)

/** Submit is enabled only once BOTH gaps carry non-whitespace text. */
const canSubmit = computed(() => prepInput.value.trim().length > 0 && korrelatInput.value.trim().length > 0)

// ── actions ──────────────────────────────────────────────────────────────────
function submit() {
  if (!quiz.value || submitted.value || !canSubmit.value) return
  quiz.value.submitBoth(prepInput.value, korrelatInput.value)
  submitted.value = true
  nextTick(() => nextBtnRef.value?.focus())
}

function next() {
  if (!quiz.value) return
  quiz.value.advance()
  resetInputs()
  if (!quiz.value.finished.value) nextTick(focusPrep)
}

// Record the main round once; retry rounds are practice, never a Run (ADR-0010).
function recordRun() {
  if (historySaved.value || !quiz.value || quiz.value.total.value === 0) return
  historySaved.value = true
  const finishedAt = Date.now()
  const qs = quiz.value.questions.value
  saveQuizRun({
    type: 'dac-paraphrase',
    startedAt: new Date(startedAtMs.value).toISOString(),
    finishedAt: new Date(finishedAt).toISOString(),
    durationMs: finishedAt - startedAtMs.value,
    count: quiz.value.total.value,
    correct: quiz.value.score.value,
    meta: {
      levels: Array.from(new Set(qs.map(q => q.colloc.level))).sort(),
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
  quiz.value = useDaParaphraseQuiz(shuffle(wrong))
  resetInputs()
  dismissed.value = false
  nextTick(focusPrep)
}

function dismissRetry() {
  showRetryModal.value = false
  dismissed.value = true
}

function restart() {
  router.push({ name: 'dacompounds-paraphrase' })
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
        <div class="breadcrumb">Auswertung · Paraphrase</div>
        <div class="result-score">{{ score }} / {{ total }} correct</div>
        <p class="section-subtitle">Paraphrase drill complete.</p>
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
        class="result-row pp-result-row"
        :style="prepColorStyle(q.colloc.preposition)"
      >
        <div class="result-word">
          <div class="german">{{ q.colloc.word }}</div>
          <div class="result-word-meta">{{ q.colloc.preposition }}</div>
        </div>
        <div class="result-answer pp-result-answer">
          <span class="pp-result-slot">
            <span class="result-picked" :class="q.prepOk ? 'ok' : 'err'">{{ q.prepTyped || '—' }}</span>
            <span v-if="!q.prepOk" class="result-correct">→ <strong>{{ q.answer.prep }}</strong></span>
          </span>
          <span class="pp-result-slot">
            <span class="result-picked" :class="q.korrelatOk ? 'ok' : 'err'">{{ q.korrelatTyped || '—' }}</span>
            <span v-if="!q.korrelatOk" class="result-correct">→ <strong>{{ q.answer.korrelat }}</strong></span>
          </span>
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
      item-label="cards"
      @retry="retryWrong"
      @dismiss="dismissRetry"
    />
  </div>

  <!-- Active quiz card -->
  <div v-else-if="current && ready" class="page">
    <div class="pp-stage" ref="cardRef" tabindex="-1">
      <div class="quiz-meta">
        <span class="quiz-counter">Card {{ questionIndex + 1 }} · of {{ total }}</span>
        <button class="btn btn-quiet" type="button" @click="router.push({ name: 'dacompounds-paraphrase' })">End drill</button>
      </div>

      <div class="quiz-progress-bar">
        <div v-for="(cls, n) in pips" :key="n" class="pip" :class="cls" />
      </div>

      <div class="pp-prompt">
        <p class="micro-mark sub-instruction">Fill both gaps — same idea, two ways.</p>

        <p class="pp-line pp-noun">
          <span class="pp-pre">{{ nounSplit.pre }}</span>
          <input
            ref="prepInputRef"
            v-model="prepInput"
            class="input pp-gap-input"
            type="text"
            aria-label="Präposition"
            placeholder="Präp."
            :readonly="submitted"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            :class="{ ok: submitted && current.prepOk, err: submitted && !current.prepOk }"
            @keyup.enter="submitted ? next() : submit()"
          />
          <span class="pp-post">{{ nounSplit.post }}</span>
          <template v-if="submitted">
            <span v-if="current.prepOk" class="ok-mark">✓</span>
            <span v-else class="pp-expected">✗ → <strong>{{ current.answer.prep }}</strong></span>
          </template>
        </p>

        <p class="pp-line pp-clause">
          <span class="pp-pre">{{ clauseSplit.pre }}</span>
          <input
            v-model="korrelatInput"
            class="input pp-gap-input"
            type="text"
            aria-label="Korrelat (da-Verbindung)"
            placeholder="da(r)…"
            :readonly="submitted"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            :class="{ ok: submitted && current.korrelatOk, err: submitted && !current.korrelatOk }"
            @keyup.enter="submitted ? next() : submit()"
          />
          <span class="pp-post">{{ clauseSplit.post }}</span>
          <template v-if="submitted">
            <span v-if="current.korrelatOk" class="ok-mark">✓</span>
            <span v-else class="pp-expected">✗ → <strong>{{ current.answer.korrelat }}</strong></span>
          </template>
        </p>
      </div>

      <div v-if="!submitted" class="pp-actions">
        <button class="btn btn-accent" type="button" :disabled="!canSubmit" @click="submit">
          Submit <span aria-hidden="true">→</span>
        </button>
      </div>

      <!-- Feedback after answering -->
      <div v-if="submitted" class="sub-feedback">
        <span v-if="current.isCorrect" class="sub-feedback-mark sub-feedback-ok">
          ✓ Richtig
        </span>
        <template v-else>
          <span class="sub-feedback-mark sub-feedback-bad">✗ Nicht ganz richtig</span>
          <div class="sub-reveal" :style="prepColorStyle(current.colloc.preposition)">
            <div class="sub-reveal-line">
              <strong class="prep-accent-text">{{ current.colloc.word }}</strong>
              · <span class="prep-accent-text">{{ current.colloc.preposition }}</span>
            </div>
            <div class="sub-reveal-explanation">{{ current.colloc.coreIdeaExplanation }}</div>
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

      <div class="sub-hint micro-mark">
        <template v-if="!submitted && !isMobile">Fill both gaps and press Enter</template>
        <template v-else-if="!submitted">Fill both gaps</template>
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

.pp-stage {
  max-width: 640px;
  margin: 0 auto;
  outline: none;
}
.pp-stage:focus-visible { outline: 1px dotted var(--rule); outline-offset: 8px; }

.pp-prompt {
  padding: 20px 0 8px;
  border-bottom: 1px solid var(--hairline);
  margin-bottom: 20px;
}
.sub-instruction { margin: 0 0 16px; text-align: center; }

.pp-line {
  font-family: var(--font-display);
  font-style: italic;
  font-size: clamp(17px, 4.6vw, 22px);
  color: var(--ink);
  margin: 0 0 16px;
  line-height: 1.5;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 2px 6px;
}
.pp-clause { margin-bottom: 4px; }
.pp-pre, .pp-post { white-space: pre-wrap; }

.pp-gap-input {
  display: inline-block;
  width: auto;
  min-width: 90px;
  max-width: 220px;
  font-family: var(--font-mono);
  font-style: normal;
  /* Never below 16px — smaller focused inputs trigger iOS Safari's auto-zoom. */
  font-size: max(16px, 0.85em);
  color: var(--accent);
  border: none;
  border-bottom: 2px solid var(--accent);
  background: transparent;
  padding: 0 2px;
  text-align: center;
}
.pp-gap-input.ok  { color: var(--success); border-color: var(--success); }
.pp-gap-input.err { color: var(--danger); border-color: var(--danger); }

.ok-mark { color: var(--success); font-weight: 600; font-family: var(--font-mono); font-size: 14px; }
.pp-expected {
  color: var(--danger);
  font-family: var(--font-mono);
  font-style: normal;
  font-size: 13px;
  white-space: nowrap;
}

/* Actions */
.pp-actions {
  display: flex;
  justify-content: center;
  margin-top: 8px;
}

/* Feedback + reveal (shared visual language with other T-series runners) */
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
  border-left: 3px solid var(--prep-accent);
  background: var(--prep-wash);
  border-radius: 0 3px 3px 0;
  padding: 12px 16px;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.sub-reveal-line {
  font-family: var(--font-mono);
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.prep-accent-text { color: var(--prep-accent); font-weight: 600; }
.sub-reveal-explanation {
  font-family: var(--font-body);
  font-size: 14.5px;
  line-height: 1.55;
  color: var(--ink);
}

.sub-hint { margin-top: 20px; text-align: center; color: var(--mute); min-height: 16px; }

/* Result list */
.pp-result-row { grid-template-columns: 180px 1fr auto; background: var(--prep-wash); align-items: center; padding: 14px 16px; }
.result-word-meta {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.06em;
  color: var(--mute);
  margin-top: 2px;
  font-weight: 400;
}
.pp-result-answer {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-family: var(--font-mono);
  font-size: 13px;
}
.pp-result-slot {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
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
  .pp-result-row {
    grid-template-columns: 1fr auto;
    grid-template-areas: "word verdict" "answer answer" "expl expl";
    gap: 8px 12px;
    align-items: start;
  }
  .pp-result-row .result-word { grid-area: word; }
  .pp-result-row .pp-result-answer { grid-area: answer; }
  .pp-result-row > div:nth-child(3) { grid-area: verdict; align-self: start; }
  .pp-result-row .result-explanation { grid-area: expl; }
  .result-actions { flex-direction: column; align-items: stretch; }
  .result-actions .btn { justify-content: center; }
  .pp-gap-input { min-width: 70px; }
}
</style>
