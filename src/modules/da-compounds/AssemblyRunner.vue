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
        class="result-row drill-result-row is-prep"
        :style="prepColorStyle(q.colloc.preposition)"
      >
        <div class="result-word">
          <div class="german">{{ q.colloc.word }}</div>
          <div class="result-word-meta">{{ q.colloc.preposition }}</div>
        </div>
        <div class="result-answer">
          <span class="asm-result-sentence">{{ assemblySentence(q.item) }}</span>
        </div>
        <div class="result-verdict">
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
    <div class="drill-stage" ref="cardRef" tabindex="-1">
      <div class="quiz-meta">
        <span class="quiz-counter">Card {{ questionIndex + 1 }} · of {{ total }}</span>
        <button class="btn btn-quiet" type="button" @click="router.push({ name: 'dacompounds-assembly' })">End drill</button>
      </div>

      <div class="quiz-progress-bar">
        <div v-for="(cls, n) in pips" :key="n" class="pip" :class="cls" />
      </div>

      <div class="drill-prompt">
        <p class="micro-mark drill-instruction is-centered">Tap the tiles into the right order.</p>

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
      <div v-else class="drill-feedback">
        <span v-if="current.isCorrect" class="feedback-line correct">
          ✓ Richtig
        </span>
        <span v-else class="feedback-line wrong">✗ Nicht ganz richtig</span>
        <div class="reveal is-prep" :style="prepColorStyle(current.colloc.preposition)">
          <div class="reveal-t asm-canonical">{{ canonicalSentence }}</div>
          <div v-if="current.usedVariant" class="asm-also-correct">auch richtig: {{ usedVariantSentence }}</div>
          <div v-if="!current.isCorrect" class="reveal-b">{{ current.colloc.coreIdeaExplanation }}</div>
        </div>
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
        <template v-if="!submittedNow">Tap every tile to assemble the sentence</template>
        <template v-else>
          Press <span class="kbd">Enter</span> to {{ questionIndex + 1 >= total ? 'finish' : 'continue' }}
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
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

/* Actions */
.asm-actions {
  display: flex;
  justify-content: center;
  margin-top: 8px;
}

/* "Also correct" note — bespoke, uses .reveal-t's own margin-bottom
   convention for stacking now that .reveal is a plain block (no flex/gap). */
.asm-also-correct {
  font-family: var(--font-mono);
  font-size: 12.5px;
  color: var(--ink-soft);
  margin: 0 0 8px;
}

/* Result list */
.asm-result-sentence {
  font-family: var(--font-display);
  font-style: italic;
  font-size: 15px;
  color: var(--ink);
}

/* Phone-first: this drill's own tweak beyond the shared .drill-result-row breakpoint. */
@media (max-width: 720px) {
  .asm-tile { padding: 8px 12px; font-size: 14px; }
}
</style>
