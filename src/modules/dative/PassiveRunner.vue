<script setup lang="ts">
import { computed, nextTick, onMounted, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  useDativeQuiz, buildPassiveCards, filterPassiveItems, type DativeQuizCard,
} from '../../composables/useDativeDrill'
import { saveQuizRun } from '../../composables/useQuizHistory'
import { csv } from '../../composables/quizQuery'
import { shuffle } from '../../data/pool'
import { useBreakpoint } from '../../composables/useBreakpoint'
import { DATIVE_DRILL_LEVELS, type DativeDrillLevel } from '../../data/dativeExperiencer'
import type { PassiveItem } from '../../data/dativeConsequences'
import RetryModal from '../../components/RetryModal.vue'

// Rule-driven family (spec, family X): a dative verb has no personal passive —
// nothing to memorise per verb, just the grammar consequence. This runner
// deliberately imports no useDativeLedger / bumpDativeLedger. Band-tracked
// only, via saveQuizRun below.

type PassiveKind = PassiveItem['kind']
const KINDS: PassiveKind[] = ['transform', 'agreement', 'es']

const route = useRoute()
const router = useRouter()
const { isMobile } = useBreakpoint()

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
const items = ref<PassiveItem[]>([])
const queriedLevels = ref<DativeDrillLevel[]>([])
const queriedKinds = ref<string[]>([])

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
  const levels = csv<DativeDrillLevel>(route.query.levels, DATIVE_DRILL_LEVELS)
  const kinds = csv<PassiveKind>(route.query.kinds, KINDS)

  try {
    const sampled = shuffle(filterPassiveItems({ levels, kinds }), count)
    if (sampled.length === 0) {
      error.value = 'Nothing to drill — adjust your filters.'
    } else {
      items.value = sampled
      queriedLevels.value = levels
      queriedKinds.value = kinds
      quiz.value = useDativeQuiz(buildPassiveCards(sampled))
      startedAtMs.value = Date.now()
      ready.value = true
      resetInputs()
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

function resetInputs() {
  submitted.value = false
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

// Only the agreement-kind prompts carry a ___ gap (wird/werden); transform and
// es prompts are complete sentences/questions already, so promptParts is a
// single-element array for them and the v-for below renders no gap at all.
const hasGap = computed(() => current.value ? current.value.prompt.includes('___') : false)
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

function next() {
  if (!quiz.value) return
  quiz.value.advance()
  resetInputs()
  if (!quiz.value.finished.value) nextTick(() => cardRef.value?.focus())
}

// Keyboard: 1–2 to pick a choice; Enter to advance after a pick.
function onKey(e: KeyboardEvent) {
  if (e.altKey || e.ctrlKey || e.metaKey) return
  if (!current.value) return
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

// Record the main round once. NO ledger bump anywhere in this function — T12
// is rule-driven (spec): band-tracked only via saveQuizRun. Retry rounds and
// empty rounds never record (ADR-0010).
function recordRun() {
  if (historySaved.value || !quiz.value || quiz.value.total.value === 0) return
  historySaved.value = true
  const finishedAt = Date.now()
  saveQuizRun({
    type: 'dat-passive',
    startedAt: new Date(startedAtMs.value).toISOString(),
    finishedAt: new Date(finishedAt).toISOString(),
    durationMs: finishedAt - startedAtMs.value,
    count: quiz.value.total.value,
    correct: quiz.value.score.value,
    meta: { levels: queriedLevels.value, kinds: queriedKinds.value },
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
  quiz.value = useDativeQuiz(buildPassiveCards(resampled))
  resetInputs()
  dismissed.value = false
  nextTick(() => cardRef.value?.focus())
}

function dismissRetry() {
  showRetryModal.value = false
  dismissed.value = true
}

function restart() {
  router.push({ name: 'dative-passive' })
}

function resultBefore(q: DativeQuizCard): string {
  const idx = q.prompt.indexOf('___')
  return idx < 0 ? q.prompt : q.prompt.slice(0, idx)
}

function resultAfter(q: DativeQuizCard): string {
  const idx = q.prompt.indexOf('___')
  return idx < 0 ? '' : q.prompt.slice(idx + 3)
}

function resultGiven(q: DativeQuizCard): string {
  return q.picked ?? '—'
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
    <button class="btn btn-ghost" @click="router.push({ name: 'dative-passive' })">← Back to setup</button>
  </div>

  <!-- Summary screen -->
  <div v-else-if="finished && ready && !showRetryModal" class="page result-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Auswertung · Kein persönliches Passiv</div>
        <div class="result-score">{{ score }} / {{ total }} correct</div>
        <p class="section-subtitle">Passive round complete.</p>
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
      item-label="cards"
      @retry="retryWrong"
      @dismiss="dismissRetry"
    />
  </div>

  <!-- Active quiz card -->
  <div v-else-if="current && ready" class="page">
    <div class="drill-stage" ref="cardRef" tabindex="-1">
      <div class="quiz-meta">
        <span class="quiz-counter">Karte {{ questionIndex + 1 }} · von {{ total }}</span>
        <button class="btn btn-quiet" type="button" @click="router.push({ name: 'dative-passive' })">End drill</button>
      </div>

      <div class="quiz-progress-bar">
        <div v-for="(cls, n) in pips" :key="n" class="pip" :class="cls" />
      </div>

      <!-- Prompt card — transform/es prompts are full questions and render as
           plain text (promptParts is a single element, so the loop below adds
           no gap); agreement prompts carry one ___ gap for wird/werden. -->
      <div class="drill-prompt">
        <p class="drill-sentence">
          <template v-for="(part, i) in promptParts" :key="i">{{ part }}<span v-if="i < promptParts.length - 1" class="drill-gap">___</span></template>
        </p>
      </div>

      <!-- Pick mode: exactly 2 option buttons. Some agreement rounds contrast
           an accusative verb (fragen, abholen, einladen, kontrollieren) whose
           passive DOES take werden — the pick is a genuine decision, not a
           reflex, so options are never pre-filtered to only dative verbs. -->
      <div class="choice-row">
        <button
          v-for="(opt, oi) in current.options"
          :key="opt"
          type="button"
          class="choice mono-face"
          :class="{
            selected: current.picked === opt,
            correct: submitted && current.answers.includes(opt),
            wrong: submitted && current.picked === opt && !current.answers.includes(opt),
            disabled: submitted,
          }"
          :disabled="submitted"
          @click="pick(opt)"
        >
          <span class="c-key">{{ oi + 1 }}</span>
          <span class="c-label">{{ opt }}</span>
        </button>
      </div>

      <!-- Feedback always reveals the correct form, the filled sentence when
           there was a gap, the English gloss, and the note explaining why the
           dative survives / the verb freezes / es vanishes — win or lose. -->
      <div v-if="submitted" class="drill-feedback">
        <span v-if="currentIsCorrect" class="feedback-line correct">
          ✓ Richtig — <strong>{{ current.answers[0] }}</strong>
        </span>
        <span v-else class="feedback-line wrong">
          ✗ Korrekt: <strong>{{ current.answers[0] }}</strong>
        </span>
        <p v-if="hasGap" class="dat-filled">{{ filledSentence }}</p>
        <p class="dat-gloss">{{ current.translation }}</p>
        <p v-if="current.note" class="dat-explain">{{ current.note }}</p>
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
.dat-filled {
  font-family: var(--font-body);
  font-size: 15px;
  color: var(--ink-soft);
  margin: 0;
}
.dat-gloss {
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--ink-soft);
  font-style: italic;
  margin: 0;
}
.dat-explain {
  font-family: var(--font-body);
  font-size: 13px;
  color: var(--mute);
  margin: 4px 0 0;
  max-width: 60ch;
}

.drill-result-row { grid-template-columns: 1fr 220px auto; }

@media (max-width: 720px) {
  .drill-result-row { grid-template-columns: 1fr; gap: 4px; }
}
</style>
