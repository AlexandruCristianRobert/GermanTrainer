<script setup lang="ts">
import { computed, nextTick, onMounted, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  useDaMatchQuiz, sampleMatchCollocations, MATCH_PREPS, type MatchLeftRow,
} from '../../composables/useDaMatchQuiz'
import { daCompound } from '../../data/daCompounds'
import { saveQuizRun } from '../../composables/useQuizHistory'
import { csv } from '../../composables/quizQuery'
import { shuffle } from '../../data/pool'
import RetryModal from '../../components/RetryModal.vue'
import {
  COLLOCATION_LEVELS, COLLOCATION_ROLES, type Collocation,
  type CollocationLevel, type CollocationRole,
} from '../../data/collocations'
import { prepColorStyle } from '../../data/prepColors'

const route = useRoute()
const router = useRouter()

// ── quiz state ──────────────────────────────────────────────────────────────
const loading = ref(true)
const error = ref<string | null>(null)
const ready = ref(false)

type Quiz = ReturnType<typeof useDaMatchQuiz>
const quiz = shallowRef<Quiz | null>(null)
const startedAtMs = ref(0)
const historySaved = ref(false)
let sampledCollocs: Collocation[] = []

// ── per-screen interaction state ─────────────────────────────────────────────
const selectedLeft = ref<string | null>(null)
const cardRef = ref<HTMLElement | null>(null)
const nextBtnRef = ref<HTMLButtonElement | null>(null)

// ── retry modal state ───────────────────────────────────────────────────────
const showRetryModal = ref(false)
const dismissed = ref(false)

// ── mount ───────────────────────────────────────────────────────────────────
onMounted(() => {
  const count = Math.max(1, parseInt((route.query.count as string) ?? '15', 10) || 15)
  const levels = csv<CollocationLevel>(route.query.levels, COLLOCATION_LEVELS)
  const roles = csv<CollocationRole>(route.query.roles, COLLOCATION_ROLES)
  const preps = csv<string>(route.query.preps, MATCH_PREPS)

  try {
    const sample = sampleMatchCollocations(count, { levels, roles, preps })
    if (sample.length === 0) {
      error.value = 'Nothing to drill — adjust your filters.'
    } else {
      sampledCollocs = sample
      quiz.value = useDaMatchQuiz(sample)
      startedAtMs.value = Date.now()
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
const currentScreen = computed(() => ready.value ? quiz.value?.currentScreen.value ?? null : null)
const finished = computed(() => ready.value ? quiz.value?.finished.value ?? false : false)
const total = computed(() => ready.value ? quiz.value?.total.value ?? 0 : 0)
const score = computed(() => ready.value ? quiz.value?.score.value ?? 0 : 0)
const wrongCollocs = computed(() => ready.value ? quiz.value?.wrongCollocs.value ?? [] : [])
const graded = computed(() => currentScreen.value?.submitted ?? false)
const allAssignedNow = computed(() => ready.value ? quiz.value?.allAssigned.value ?? false : false)

const screenCount = computed(() => ready.value ? quiz.value?.screens.value.length ?? 0 : 0)
const screenNumber = computed(() => ready.value ? (quiz.value?.screenIndex.value ?? 0) + 1 : 0)
const isLastScreen = computed(() =>
  ready.value && quiz.value ? quiz.value.screenIndex.value + 1 >= quiz.value.screens.value.length : false
)

const availableRight = computed(() => {
  const s = currentScreen.value
  if (!s) return []
  const used = new Set(s.pairs.values())
  return s.right.filter(c => !used.has(c))
})

const pips = computed(() => {
  const out: string[] = []
  if (!ready.value || !quiz.value) return out
  const screensArr = quiz.value.screens.value
  const idx = quiz.value.screenIndex.value
  for (let n = 0; n < screensArr.length; n++) {
    if (n < idx) out.push(screenAllCorrect(screensArr[n]) ? 'done' : 'wrong')
    else if (n === idx && screensArr[n].submitted) out.push(screenAllCorrect(screensArr[n]) ? 'done' : 'wrong')
    else if (n === idx) out.push('current')
    else out.push('')
  }
  return out
})

function screenAllCorrect(s: { left: MatchLeftRow[]; results: Map<string, boolean> }): boolean {
  return s.left.every(row => s.results.get(row.collocId) === true)
}

/** Every graded row across every screen — built only for the finished summary screen. */
const allRows = computed(() => {
  if (!ready.value || !quiz.value) return []
  return quiz.value.screens.value.flatMap(s => s.left.map(row => ({
    collocId: row.collocId,
    word: row.word,
    english: row.english,
    preposition: row.preposition,
    assigned: s.pairs.get(row.collocId) ?? null,
    correct: s.results.get(row.collocId) === true,
  })))
})

// ── per-row helpers ──────────────────────────────────────────────────────────
function isAssigned(collocId: string): boolean {
  return currentScreen.value?.pairs.has(collocId) ?? false
}
function assignedCompound(collocId: string): string | null {
  return currentScreen.value?.pairs.get(collocId) ?? null
}
function rowIsCorrect(collocId: string): boolean | null {
  const s = currentScreen.value
  if (!s || !s.results.has(collocId)) return null
  return s.results.get(collocId)!
}

// ── actions ──────────────────────────────────────────────────────────────────
function rowTap(collocId: string) {
  if (!quiz.value || graded.value) return
  if (isAssigned(collocId)) {
    quiz.value.unassign(collocId)
    if (selectedLeft.value === collocId) selectedLeft.value = null
    return
  }
  selectedLeft.value = selectedLeft.value === collocId ? null : collocId
}

function chipTap(compound: string) {
  if (!quiz.value || graded.value || !selectedLeft.value) return
  quiz.value.assign(selectedLeft.value, compound)
  selectedLeft.value = null
}

function submit() {
  if (!quiz.value || !quiz.value.allAssigned.value) return
  quiz.value.submitScreen()
  nextTick(() => nextBtnRef.value?.focus())
}

function next() {
  if (!quiz.value) return
  quiz.value.advanceScreen()
  selectedLeft.value = null
  if (!quiz.value.finished.value) nextTick(() => cardRef.value?.focus())
}

// Keyboard: Enter submits (once all assigned) or advances (once graded).
function onKey(e: KeyboardEvent) {
  if (e.altKey || e.ctrlKey || e.metaKey) return
  if (e.key !== 'Enter') return
  if (!currentScreen.value) return
  e.preventDefault()
  if (graded.value) next()
  else if (allAssignedNow.value) submit()
}

// Record the main round once; retry rounds are practice, never a Run (ADR-0010).
function recordRun() {
  if (historySaved.value || !quiz.value || quiz.value.total.value === 0) return
  historySaved.value = true
  const finishedAt = Date.now()
  saveQuizRun({
    type: 'dac-match',
    startedAt: new Date(startedAtMs.value).toISOString(),
    finishedAt: new Date(finishedAt).toISOString(),
    durationMs: finishedAt - startedAtMs.value,
    count: quiz.value.total.value,
    correct: quiz.value.score.value,
    meta: {
      levels: Array.from(new Set(sampledCollocs.map(c => c.level))).sort(),
      roles: Array.from(new Set(sampledCollocs.map(c => c.role))).sort(),
      preps: Array.from(new Set(sampledCollocs.map(c => c.preposition))).sort(),
    },
  })
}

watch(finished, (now) => {
  if (now && ready.value) {
    recordRun()
    if (wrongCollocs.value.length > 0 && !dismissed.value) {
      showRetryModal.value = true
    }
  }
})

function retryWrong() {
  showRetryModal.value = false
  if (!quiz.value) return
  const wrong = quiz.value.wrongCollocs.value
  if (wrong.length === 0) return
  quiz.value = useDaMatchQuiz(shuffle(wrong, wrong.length))
  selectedLeft.value = null
  dismissed.value = false
  nextTick(() => cardRef.value?.focus())
}

function dismissRetry() {
  showRetryModal.value = false
  dismissed.value = true
}

function restart() {
  router.push({ name: 'dacompounds-match' })
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
        <div class="breadcrumb">Auswertung · Zuordnung</div>
        <div class="result-score">{{ score }} / {{ total }} correct</div>
        <p class="section-subtitle">Matching drill complete.</p>
      </div>
      <div class="result-actions">
        <button class="btn btn-ghost" @click="router.push({ name: 'dacompounds' })">← Da-Compounds</button>
        <button
          v-if="wrongCollocs.length"
          class="btn btn-ghost"
          @click="retryWrong"
        >Retry the {{ wrongCollocs.length }} wrong</button>
        <button class="btn btn-accent" @click="restart">Start another drill <span aria-hidden="true">→</span></button>
      </div>
    </header>

    <div class="result-list">
      <div
        v-for="row in allRows"
        :key="row.collocId"
        class="result-row match-result-row"
        :style="prepColorStyle(row.preposition)"
      >
        <div class="result-word">
          <div class="german">{{ row.word }}</div>
          <div class="result-word-meta">{{ row.english }} · {{ row.preposition }}</div>
        </div>
        <div class="result-answer">
          <span class="result-picked" :class="row.correct ? 'ok' : 'err'">{{ row.assigned || '—' }}</span>
          <span v-if="!row.correct" class="result-correct">→ <strong>{{ daCompound(row.preposition) }}</strong></span>
        </div>
        <div>
          <span class="tag" :class="row.correct ? 'tag-success' : 'tag-danger'">
            {{ row.correct ? '✓' : '✗' }}
          </span>
        </div>
      </div>
    </div>
  </div>

  <!-- Retry modal -->
  <div v-else-if="showRetryModal" class="page">
    <RetryModal
      :wrong-count="wrongCollocs.length"
      item-label="pairs"
      @retry="retryWrong"
      @dismiss="dismissRetry"
    />
  </div>

  <!-- Active screen -->
  <div v-else-if="currentScreen && ready" class="page">
    <div class="match-stage" ref="cardRef" tabindex="-1">
      <div class="quiz-meta">
        <span class="quiz-counter">Screen {{ screenNumber }} · of {{ screenCount }}</span>
        <button class="btn btn-quiet" type="button" @click="router.push({ name: 'dacompounds-match' })">End drill</button>
      </div>

      <div class="quiz-progress-bar">
        <div v-for="(cls, n) in pips" :key="n" class="pip" :class="cls" />
      </div>

      <div class="match-columns">
        <div class="match-left">
          <div
            v-for="row in currentScreen.left"
            :key="row.collocId"
            class="match-row"
            role="button"
            :tabindex="graded ? -1 : 0"
            :data-prep="row.preposition"
            :class="{
              selected: selectedLeft === row.collocId,
              assigned: isAssigned(row.collocId),
              correct: graded && rowIsCorrect(row.collocId) === true,
              wrong: graded && rowIsCorrect(row.collocId) === false,
              disabled: graded,
            }"
            @click="rowTap(row.collocId)"
            @keydown.enter.prevent="rowTap(row.collocId)"
            @keydown.space.prevent="rowTap(row.collocId)"
          >
            <div class="match-word">
              <div class="german">{{ row.word }}</div>
              <div class="match-gloss">{{ row.english }}</div>
            </div>
            <div class="match-slot">
              <span v-if="assignedCompound(row.collocId)" class="match-chip placed">{{ assignedCompound(row.collocId) }}</span>
              <span v-else class="match-slot-empty">tap to pair</span>
            </div>
            <div
              v-if="graded && rowIsCorrect(row.collocId) === false"
              class="match-reveal"
              :style="prepColorStyle(row.preposition)"
            >
              Richtig: <strong class="prep-accent-text">{{ daCompound(row.preposition) }}</strong>
            </div>
          </div>
        </div>

        <div class="match-right-pool">
          <button
            v-for="c in availableRight"
            :key="c"
            type="button"
            class="match-chip pool"
            :disabled="graded || !selectedLeft"
            @click="chipTap(c)"
          >{{ c }}</button>
        </div>
      </div>

      <div class="match-actions">
        <button
          v-if="!graded"
          class="btn btn-accent"
          type="button"
          :disabled="!allAssignedNow"
          @click="submit"
        >Submit <span aria-hidden="true">→</span></button>
        <button
          v-else
          ref="nextBtnRef"
          class="btn btn-accent"
          type="button"
          @click="next"
        >{{ isLastScreen ? 'Finish drill' : 'Next' }} <span aria-hidden="true">→</span></button>
      </div>

      <div class="match-hint micro-mark">
        <template v-if="!graded">Tap a word, then its match</template>
        <template v-else>Press <span class="kbd">Enter</span> to {{ isLastScreen ? 'finish' : 'continue' }}</template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.loading-state { text-align: center; padding-top: 120px; }
.result-page { max-width: 880px; }
.result-actions { display: flex; gap: 12px; flex-wrap: wrap; }

.match-stage {
  max-width: 720px;
  margin: 0 auto;
  outline: none;
}
.match-stage:focus-visible { outline: 1px dotted var(--rule); outline-offset: 8px; }

.match-columns {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 24px;
  align-items: start;
  margin: 20px 0 28px;
}

.match-left {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.match-row {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 10px 16px;
  min-height: 44px;
  padding: 12px 14px;
  background: var(--paper-card);
  border: 1px solid var(--rule);
  border-radius: 4px;
  cursor: pointer;
  transition: all .15s;
}
.match-row:hover:not(.disabled) { border-color: var(--accent); background: var(--accent-wash); }
.match-row.selected { border-color: var(--accent); box-shadow: inset 0 0 0 1px var(--accent); }
.match-row.assigned { border-style: solid; }
.match-row.correct { border-color: var(--success); background: var(--success-tint); }
.match-row.wrong    { border-color: var(--danger);  background: var(--danger-tint); }
.match-row.disabled { cursor: default; }

.match-word { min-width: 0; }
.match-gloss {
  font-family: var(--font-body);
  font-style: italic;
  font-size: 13px;
  color: var(--ink-soft);
  margin-top: 2px;
}

.match-slot { display: flex; justify-content: flex-end; }
.match-slot-empty {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.06em;
  color: var(--mute);
  text-transform: uppercase;
}

.match-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 8px 14px;
  font-family: var(--font-mono);
  font-size: 14px;
  letter-spacing: 0.03em;
  border-radius: 4px;
  border: 1px solid var(--rule);
  background: var(--paper);
  color: var(--ink);
}
.match-chip.pool {
  cursor: pointer;
  transition: all .15s;
}
.match-chip.pool:not(:disabled):hover { border-color: var(--accent); color: var(--accent); background: var(--accent-wash); }
.match-chip.pool:disabled { opacity: 0.5; cursor: not-allowed; }
.match-chip.placed { border-color: var(--accent); color: var(--accent); background: var(--accent-wash); }
.match-row.correct .match-chip.placed { border-color: var(--success); color: var(--success); background: transparent; }
.match-row.wrong .match-chip.placed { border-color: var(--danger); color: var(--danger); background: transparent; }

.match-right-pool {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 150px;
}

.match-reveal {
  grid-column: 1 / -1;
  border-left: 3px solid var(--prep-accent);
  background: var(--prep-wash);
  border-radius: 0 3px 3px 0;
  padding: 8px 12px;
  font-family: var(--font-mono);
  font-size: 12.5px;
  text-align: left;
}
.prep-accent-text { color: var(--prep-accent); font-weight: 600; }

.match-actions { display: flex; justify-content: center; margin-top: 8px; }
.match-hint { margin-top: 16px; text-align: center; color: var(--mute); min-height: 16px; }

/* Result list */
.match-result-row { grid-template-columns: 180px 1fr auto; background: var(--prep-wash); align-items: center; padding: 14px 16px; }
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
.ok  { color: var(--success); }
.err { color: var(--danger); }
.tag-success { background: var(--success-tint); color: var(--success); }
.tag-danger  { background: var(--danger-tint);  color: var(--danger); }

/* Phone-first: stack the columns, chips pool moves above the list */
@media (max-width: 560px) {
  .match-columns { grid-template-columns: 1fr; }
  .match-right-pool {
    flex-direction: row;
    flex-wrap: wrap;
    order: -1;
    min-width: 0;
  }
  .match-chip.pool { flex: 1 1 auto; }
  .match-row { min-height: 44px; }
}

@media (max-width: 720px) {
  .match-result-row {
    grid-template-columns: 1fr auto;
    grid-template-areas: "word verdict" "answer answer";
    gap: 8px 12px;
    align-items: start;
  }
  .match-result-row .result-word { grid-area: word; }
  .match-result-row .result-answer { grid-area: answer; }
  .match-result-row > div:nth-child(3) { grid-area: verdict; align-self: start; }
  .result-actions { flex-direction: column; align-items: stretch; }
  .result-actions .btn { justify-content: center; }
}
</style>
