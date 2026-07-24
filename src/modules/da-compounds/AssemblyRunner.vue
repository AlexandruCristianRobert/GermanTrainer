<script setup lang="ts">
import { computed, nextTick, onMounted, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  useDaAssemblyQuiz, sampleAssemblyItems, ASSEMBLY_PREPS,
} from '../../composables/useDaAssemblyQuiz'
import { assemblySentence } from '../../data/daAssembly'
import { saveQuizRun } from '../../composables/useQuizHistory'
import { csv } from '../../composables/quizQuery'
import { shuffle } from '../../data/pool'
import RetryModal from '../../components/RetryModal.vue'
import { COLLOCATION_LEVELS, type CollocationLevel } from '../../data/collocations'
import { prepColorStyle } from '../../data/prepColors'

const route = useRoute()
const router = useRouter()

// ── quiz state ──────────────────────────────────────────────────────────────
const loading = ref(true)
const error = ref<string | null>(null)
const ready = ref(false)

type Quiz = ReturnType<typeof useDaAssemblyQuiz>
const quiz = shallowRef<Quiz | null>(null)
const startedAtMs = ref(0)
const historySaved = ref(false)

const cardRef = ref<HTMLElement | null>(null)
const nextBtnRef = ref<HTMLButtonElement | null>(null)

// ── retry modal state ───────────────────────────────────────────────────────
const showRetryModal = ref(false)
const dismissed = ref(false)

// ── mount ───────────────────────────────────────────────────────────────────
onMounted(() => {
  const count = Math.max(1, parseInt((route.query.count as string) ?? '10', 10) || 10)
  const levels = csv<CollocationLevel>(route.query.levels, COLLOCATION_LEVELS)
  const preps = csv<string>(route.query.preps, ASSEMBLY_PREPS)

  try {
    const items = sampleAssemblyItems(count, { levels, preps })
    if (items.length === 0) {
      error.value = 'Nothing to drill — adjust your filters.'
    } else {
      quiz.value = useDaAssemblyQuiz(items)
      startedAtMs.value = Date.now()
      ready.value = true
      nextTick(() => cardRef.value?.focus())
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load.'
  } finally {
    loading.value = false
  }
})

// ── computed from quiz ───────────────────────────────────────────────────────
const current = computed(() => ready.value ? quiz.value?.current.value ?? null : null)
const finished = computed(() => ready.value ? quiz.value?.finished.value ?? false : false)
const total = computed(() => ready.value ? quiz.value?.total.value ?? 0 : 0)
const questionIndex = computed(() => ready.value ? quiz.value?.currentIndex.value ?? 0 : 0)
const score = computed(() => ready.value ? quiz.value?.score.value ?? 0 : 0)
const wrongItems = computed(() => ready.value ? quiz.value?.wrongItems.value ?? [] : [])
const questions = computed(() => ready.value ? quiz.value?.questions.value ?? [] : [])
const allPlacedNow = computed(() => ready.value ? quiz.value?.allPlaced.value ?? false : false)
const submittedNow = computed(() => current.value?.submitted ?? false)

const pips = computed(() => {
  const out: string[] = []
  for (let n = 0; n < total.value; n++) {
    if (n < questionIndex.value) {
      out.push(questions.value[n]?.isCorrect ? 'done' : 'wrong')
    } else if (n === questionIndex.value && submittedNow.value) {
      out.push(questions.value[n]?.isCorrect ? 'done' : 'wrong')
    } else if (n === questionIndex.value) {
      out.push('current')
    } else {
      out.push('')
    }
  }
  return out
})

// Canonical sentence is always shown on reveal; the "auch richtig" note only
// appears when the learner's accepted order was a curated variant, and shows
// the sentence they actually built (a true permutation of the same tiles).
const canonicalSentence = computed(() => current.value ? assemblySentence(current.value.item) : '')
const usedVariantSentence = computed(() =>
  current.value && current.value.usedVariant
    ? assemblySentence(current.value.item, current.value.placed)
    : ''
)

// ── actions ──────────────────────────────────────────────────────────────────
function onPlace(tileIndex: number) {
  if (!quiz.value || submittedNow.value) return
  quiz.value.place(tileIndex)
}

function onUnplace(position: number) {
  if (!quiz.value || submittedNow.value) return
  quiz.value.unplace(position)
}

function submit() {
  if (!quiz.value || !allPlacedNow.value) return
  quiz.value.submitOrder()
  nextTick(() => nextBtnRef.value?.focus())
}

function next() {
  if (!quiz.value) return
  quiz.value.advance()
  if (!quiz.value.finished.value) nextTick(() => cardRef.value?.focus())
}

// Record the main round once; retry rounds are practice, never a Run (ADR-0010).
// Offline family: once-only, retry never records, total===0 never records.
function recordRun() {
  if (historySaved.value || !quiz.value || quiz.value.total.value === 0) return
  historySaved.value = true
  const finishedAt = Date.now()
  const qs = quiz.value.questions.value
  saveQuizRun({
    type: 'dac-assembly',
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
  const wrong = quiz.value.wrongItems.value
  if (wrong.length === 0) return
  quiz.value = useDaAssemblyQuiz(shuffle(wrong, wrong.length))
  dismissed.value = false
  nextTick(() => cardRef.value?.focus())
}

function dismissRetry() {
  showRetryModal.value = false
  dismissed.value = true
}

function restart() {
  router.push({ name: 'dacompounds-assembly' })
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
        <div class="breadcrumb">Auswertung · Satzbau</div>
        <div class="result-score">{{ score }} / {{ total }} correct</div>
        <p class="section-subtitle">Sentence-assembly drill complete.</p>
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
        class="result-row asm-result-row"
        :style="prepColorStyle(q.colloc.preposition)"
      >
        <div class="result-word">
          <div class="german">{{ q.colloc.word }}</div>
          <div class="result-word-meta">{{ q.colloc.preposition }}</div>
        </div>
        <div class="result-answer">
          <span class="asm-result-sentence">{{ assemblySentence(q.item) }}</span>
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
    <div class="asm-stage" ref="cardRef" tabindex="-1">
      <div class="quiz-meta">
        <span class="quiz-counter">Card {{ questionIndex + 1 }} · of {{ total }}</span>
        <button class="btn btn-quiet" type="button" @click="router.push({ name: 'dacompounds-assembly' })">End drill</button>
      </div>

      <div class="quiz-progress-bar">
        <div v-for="(cls, n) in pips" :key="n" class="pip" :class="cls" />
      </div>

      <div class="asm-prompt">
        <p class="micro-mark sub-instruction">Tap the tiles into the right order.</p>

        <div class="asm-pool">
          <button
            v-for="t in current.pool"
            :key="'pool-' + t.index"
            type="button"
            class="asm-tile pool"
            :data-tile-index="t.index"
            :disabled="submittedNow"
            @click="onPlace(t.index)"
          >{{ t.tile }}</button>
        </div>

        <div class="asm-assembled" :class="{ empty: current.placed.length === 0 }">
          <span v-if="current.placed.length === 0" class="asm-assembled-empty micro-mark">tap tiles above</span>
          <button
            v-for="(tileIndex, pos) in current.placed"
            :key="'placed-' + pos"
            type="button"
            class="asm-tile placed"
            :data-tile-index="tileIndex"
            :disabled="submittedNow"
            @click="onUnplace(pos)"
          >{{ current.item.tiles[tileIndex] }}</button>
        </div>
      </div>

      <div v-if="!submittedNow" class="asm-actions">
        <button class="btn btn-accent" type="button" :disabled="!allPlacedNow" @click="submit">
          Submit <span aria-hidden="true">→</span>
        </button>
      </div>

      <!-- Feedback after answering -->
      <div v-else class="sub-feedback">
        <span v-if="current.isCorrect" class="sub-feedback-mark sub-feedback-ok">
          ✓ Richtig
        </span>
        <span v-else class="sub-feedback-mark sub-feedback-bad">✗ Nicht ganz richtig</span>
        <div class="sub-reveal" :style="prepColorStyle(current.colloc.preposition)">
          <div class="sub-reveal-line asm-canonical">{{ canonicalSentence }}</div>
          <div v-if="current.usedVariant" class="asm-also-correct">auch richtig: {{ usedVariantSentence }}</div>
          <div v-if="!current.isCorrect" class="sub-reveal-explanation">{{ current.colloc.coreIdeaExplanation }}</div>
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
        <template v-if="!submittedNow">Tap every tile to assemble the sentence</template>
        <template v-else>
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

.asm-stage {
  max-width: 640px;
  margin: 0 auto;
  outline: none;
}
.asm-stage:focus-visible { outline: 1px dotted var(--rule); outline-offset: 8px; }

.asm-prompt {
  padding: 20px 0 8px;
  border-bottom: 1px solid var(--hairline);
  margin-bottom: 20px;
}
.sub-instruction { margin: 0 0 16px; text-align: center; }

.asm-pool, .asm-assembled {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-height: 52px;
  align-items: flex-start;
}
.asm-pool { margin-bottom: 20px; }
.asm-assembled {
  padding: 10px;
  border: 1px dashed var(--rule);
  border-radius: 4px;
  background: var(--paper-card);
}
.asm-assembled.empty { align-items: center; justify-content: center; }
.asm-assembled-empty {
  color: var(--mute);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.asm-tile {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 8px 16px;
  font-family: var(--font-mono);
  font-size: 14.5px;
  letter-spacing: 0.01em;
  border-radius: 4px;
  border: 1px solid var(--rule);
  background: var(--paper);
  color: var(--ink);
  cursor: pointer;
  transition: all .15s;
}
.asm-tile:disabled { cursor: default; }
.asm-tile.pool:not(:disabled):hover { border-color: var(--accent); color: var(--accent); background: var(--accent-wash); }
.asm-tile.placed {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--accent-wash);
}

/* Once graded: color the assembled tiles by verdict instead of "placed" accent. */
.sub-feedback-ok  ~ .sub-reveal,
.sub-feedback-bad ~ .sub-reveal { margin-top: 4px; }

/* Actions */
.asm-actions {
  display: flex;
  justify-content: center;
  margin-top: 8px;
}

/* Feedback + reveal (shared visual language with other Da-Compounds runners) */
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
  font-family: var(--font-display);
  font-style: italic;
  font-size: 16px;
  color: var(--ink);
}
.asm-also-correct {
  font-family: var(--font-mono);
  font-size: 12.5px;
  color: var(--ink-soft);
}
.sub-reveal-explanation {
  font-family: var(--font-body);
  font-size: 14.5px;
  line-height: 1.55;
  color: var(--ink);
}

.sub-hint { margin-top: 20px; text-align: center; color: var(--mute); min-height: 16px; }

/* Result list */
.asm-result-row { grid-template-columns: 180px 1fr auto; background: var(--prep-wash); align-items: center; padding: 14px 16px; }
.result-word-meta {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.06em;
  color: var(--mute);
  margin-top: 2px;
  font-weight: 400;
}
.asm-result-sentence {
  font-family: var(--font-display);
  font-style: italic;
  font-size: 15px;
  color: var(--ink);
}
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
.tag-success { background: var(--success-tint); color: var(--success); }
.tag-danger  { background: var(--danger-tint);  color: var(--danger); }

/* Phone-first: tiles stay ≥44px and wrap comfortably at narrow widths. */
@media (max-width: 720px) {
  .asm-result-row {
    grid-template-columns: 1fr auto;
    grid-template-areas: "word verdict" "answer answer" "expl expl";
    gap: 8px 12px;
    align-items: start;
  }
  .asm-result-row .result-word { grid-area: word; }
  .asm-result-row .result-answer { grid-area: answer; }
  .asm-result-row > div:nth-child(3) { grid-area: verdict; align-self: start; }
  .asm-result-row .result-explanation { grid-area: expl; }
  .result-actions { flex-direction: column; align-items: stretch; }
  .result-actions .btn { justify-content: center; }
  .asm-tile { padding: 8px 12px; font-size: 14px; }
}
</style>
