<script setup lang="ts">
import { computed, nextTick, onMounted, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  useDativeQuiz, buildProductionCards, filterProductionItems, type DativeQuizCard,
} from '../../composables/useDativeDrill'
import {
  DATIVE_DRILL_LEVELS, EXPERIENCER_VERBS, type DativeDrillLevel, type ExperiencerProductionItem,
} from '../../data/dativeExperiencer'
import { saveQuizRun } from '../../composables/useQuizHistory'
import { bumpDativeLedger } from '../../composables/useDativeLedger'
import { csv } from '../../composables/quizQuery'
import { shuffle } from '../../data/pool'
import RetryModal from '../../components/RetryModal.vue'

const route = useRoute()
const router = useRouter()

// ── quiz state ──────────────────────────────────────────────────────────────
const loading = ref(true)
const error = ref<string | null>(null)
const ready = ref(false)

type Quiz = ReturnType<typeof useDativeQuiz>
const quiz = shallowRef<Quiz | null>(null)
const startedAtMs = ref(0)
const historySaved = ref(false)

// The sampled items behind the current round — wrongIndexes point into this
// array (composable contract), so retry rebuilds by mapping through it.
const items = ref<ExperiencerProductionItem[]>([])
const queriedLevels = ref<DativeDrillLevel[]>([])
const queriedVerbs = ref<string[]>([])

// ── per-card state ──────────────────────────────────────────────────────────
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
  const levels = csv<DativeDrillLevel>(route.query.levels, DATIVE_DRILL_LEVELS)
  const verbs = csv<string>(route.query.verbs, EXPERIENCER_VERBS)

  try {
    const sampled = shuffle(filterProductionItems({ levels, verbs }), count)
    if (sampled.length === 0) {
      error.value = 'Nothing to drill — adjust your filters.'
    } else {
      items.value = sampled
      queriedLevels.value = levels
      queriedVerbs.value = verbs
      quiz.value = useDativeQuiz(buildProductionCards(sampled))
      startedAtMs.value = Date.now()
      ready.value = true
      resetInput()
      nextTick(() => textInputRef.value?.focus())
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load.'
  } finally {
    loading.value = false
  }
})

onBeforeUnmount(() => { /* no window-level listeners in type mode */ })

function resetInput() {
  typedInput.value = ''
}

// ── computed from quiz ───────────────────────────────────────────────────────
const current = computed(() => ready.value ? quiz.value?.current.value ?? null : null)
const finished = computed(() => ready.value ? quiz.value?.finished.value ?? false : false)
const total = computed(() => ready.value ? quiz.value?.total.value ?? 0 : 0)
const questionIndex = computed(() => ready.value ? quiz.value?.currentIndex.value ?? 0 : 0)
const score = computed(() => ready.value ? quiz.value?.score.value ?? 0 : 0)
const wrongIndexes = computed(() => ready.value ? quiz.value?.wrongIndexes.value ?? [] : [])
const questions = computed(() => ready.value ? quiz.value?.questions.value ?? [] : [])
const submitted = computed(() => current.value !== null && current.value.isCorrect !== null)

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
function submit() {
  if (!quiz.value || submitted.value) return
  quiz.value.submitText(typedInput.value)
  nextTick(() => nextBtnRef.value?.focus())
}

/** Enter-driven submit. Blank input is a no-op so a stray keystroke cannot burn
 *  a card — clicking Submit stays the deliberate "reveal it, I don't know" path.
 *  Bound to keydown, never keyup: advancing happens on the focused Next
 *  button's keydown, which re-focuses this input mid-keystroke, so a keyup
 *  binding here would fire the next card's submit on the SAME physical press. */
function submitFromKey() {
  if (typedInput.value.trim().length === 0) return
  submit()
}

function next() {
  if (!quiz.value) return
  quiz.value.advance()
  resetInput()
  if (!quiz.value.finished.value) nextTick(() => textInputRef.value?.focus())
}

// Main round records once and bumps the ledger once per card, keyed by the
// dative verb; retry rounds are practice and never re-bump (ADR-0010).
function recordRun() {
  if (historySaved.value || !quiz.value || quiz.value.total.value === 0) return
  historySaved.value = true
  const finishedAt = Date.now()
  for (const q of quiz.value.questions.value) {
    if (q.ledgerKey && q.isCorrect !== null) bumpDativeLedger(q.ledgerKey, q.isCorrect, finishedAt)
  }
  saveQuizRun({
    type: 'dat-experiencer',
    startedAt: new Date(startedAtMs.value).toISOString(),
    finishedAt: new Date(finishedAt).toISOString(),
    durationMs: finishedAt - startedAtMs.value,
    count: quiz.value.total.value,
    correct: quiz.value.score.value,
    meta: { levels: queriedLevels.value, verbs: queriedVerbs.value },
  })
}

watch(finished, (now) => {
  if (now && ready.value) {
    recordRun()
    if (wrongIndexes.value.length > 0 && !dismissed.value) showRetryModal.value = true
  }
})

function retryWrong() {
  showRetryModal.value = false
  if (!quiz.value) return
  const wrongSourceItems = quiz.value.wrongIndexes.value.map(i => items.value[i])
  if (wrongSourceItems.length === 0) return
  const resampled = shuffle(wrongSourceItems, wrongSourceItems.length)
  items.value = resampled
  quiz.value = useDativeQuiz(buildProductionCards(resampled))
  resetInput()
  dismissed.value = false
  nextTick(() => textInputRef.value?.focus())
}

function dismissRetry() {
  showRetryModal.value = false
  dismissed.value = true
}

function restart() {
  router.push({ name: 'dative-experiencer' })
}

function resultGiven(q: DativeQuizCard): string {
  return q.typed ?? '—'
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
    <button class="btn btn-ghost" @click="router.push({ name: 'dative-experiencer' })">← Back to setup</button>
  </div>

  <!-- Summary screen -->
  <div v-else-if="finished && ready && !showRetryModal" class="page result-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Auswertung · Produktion</div>
        <div class="result-score">{{ score }} / {{ total }} correct</div>
        <p class="section-subtitle">Production round complete.</p>
      </div>
      <div class="result-actions">
        <button class="btn btn-ghost" @click="router.push({ name: 'dative' })">← Dativ</button>
        <button class="btn btn-accent" @click="restart">Start another drill <span aria-hidden="true">→</span></button>
      </div>
    </header>

    <div class="result-list">
      <div
        v-for="(q, i) in questions"
        :key="i"
        class="result-row drill-result-row"
      >
        <div class="result-verb">
          <div class="german">{{ q.prompt }}</div>
        </div>
        <div class="result-answer">
          <span class="result-picked" :class="q.isCorrect ? 'ok' : 'err'">
            {{ resultGiven(q) }}
          </span>
          <span v-if="!q.isCorrect" class="result-correct">
            → <strong>{{ q.answers[0] }}</strong>
          </span>
        </div>
        <div class="result-verdict">
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
    <div class="drill-stage" ref="cardRef" tabindex="-1">
      <div class="quiz-meta">
        <span class="quiz-counter">Satz {{ questionIndex + 1 }} · von {{ total }}</span>
        <button class="btn btn-quiet" type="button" @click="router.push({ name: 'dative-experiencer' })">End drill</button>
      </div>

      <div class="quiz-progress-bar">
        <div v-for="(cls, n) in pips" :key="n" class="pip" :class="cls" />
      </div>

      <div class="drill-prompt">
        <p class="drill-sentence">{{ current.prompt }}</p>
        <p class="micro-mark ep-cue">{{ current.translation }}</p>
      </div>

      <div class="type-row">
        <input
          ref="textInputRef"
          v-model="typedInput"
          class="input type-input"
          type="text"
          placeholder="Deutscher Satz…"
          :readonly="submitted"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          :class="{ ok: submitted && current.isCorrect, err: submitted && !current.isCorrect }"
          @keydown.enter.prevent="submitted ? next() : submitFromKey()"
        />
        <button v-if="!submitted" class="btn btn-accent" type="button" @click="submit">
          Submit <span aria-hidden="true">→</span>
        </button>
      </div>

      <div v-if="submitted" class="drill-feedback">
        <span v-if="current.isCorrect" class="feedback-line correct">
          ✓ Richtig — <strong>{{ current.answers[0] }}</strong>
        </span>
        <span v-else class="feedback-line wrong">
          ✗ Korrekt: <strong>{{ current.answers[0] }}</strong>
        </span>
        <p v-if="current.answers[1]" class="ep-alt">Auch richtig: {{ current.answers[1] }}</p>
        <p class="ep-note">{{ current.note }}</p>
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
        <template v-if="!submitted">Type the German sentence, then press <span class="kbd">Enter</span></template>
        <template v-else>
          Press <span class="kbd">Enter</span> to {{ questionIndex + 1 >= total ? 'finish' : 'continue' }}
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ep-cue {
  margin-top: 8px;
}
.ep-alt {
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--ink-soft);
  font-style: italic;
  margin: 0;
}
.ep-note {
  font-family: var(--font-body);
  font-size: 13px;
  color: var(--mute);
  margin: 4px 0 0;
  max-width: 60ch;
}

.type-row { margin-top: 16px; }

.drill-result-row { grid-template-columns: 1fr 160px auto; }

@media (max-width: 720px) {
  .drill-result-row { grid-template-columns: 1fr; gap: 4px; }
}
</style>
