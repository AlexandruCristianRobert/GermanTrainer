<script setup lang="ts">
import { computed, nextTick, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  filterCaseItems, sampleDativeCards, buildCaseCards,
  DATIVE_FAMILIES, type DativeCard, type DativeFamily,
} from '../../composables/useDativeDrill'
import { DATIVE_ITEM_LEVELS, type DativeItemLevel } from '../../data/dativeItems'
import { saveQuizRun } from '../../composables/useQuizHistory'
import { bumpDativeLedger } from '../../composables/useDativeLedger'
import { VERBS } from '../../data/verbs'
import RetryModal from '../../components/RetryModal.vue'

const route = useRoute()
const router = useRouter()

const ENGLISH = new Map(VERBS.map(v => [v.german, v.english]))

interface RunCard extends DativeCard {
  picked: string | null
  isCorrect: boolean | null
}

const OPTIONS = [
  { value: 'dative', label: 'Dativ' },
  { value: 'accusative', label: 'Akkusativ' },
] as const

const loading = ref(true)
const error = ref<string | null>(null)
const cards = ref<RunCard[]>([])
const index = ref(0)
const submitted = ref(false)
const startedAtMs = ref(0)
const historySaved = ref(false)
const showRetryModal = ref(false)
const dismissed = ref(false)
const queriedLevels = ref<DativeItemLevel[]>([])
const queriedFamilies = ref<DativeFamily[]>([])
const cardRef = ref<HTMLElement | null>(null)
const nextBtnRef = ref<HTMLButtonElement | null>(null)

function toRunCards(pool: DativeCard[]): RunCard[] {
  return pool.map(c => ({ ...c, picked: null, isCorrect: null }))
}

onMounted(() => {
  const count = Math.max(1, parseInt((route.query.count as string) ?? '10', 10) || 10)
  const rawLevels = ((route.query.levels as string) ?? '').split(',').filter(Boolean)
  const levels = rawLevels.filter((l): l is DativeItemLevel => (DATIVE_ITEM_LEVELS as readonly string[]).includes(l))
  const rawFamilies = ((route.query.families as string) ?? '').split(',').filter(Boolean)
  const families = rawFamilies.filter((f): f is DativeFamily => (DATIVE_FAMILIES as readonly string[]).includes(f))
  queriedLevels.value = levels.length ? levels : [...DATIVE_ITEM_LEVELS]
  queriedFamilies.value = families.length ? families : [...DATIVE_FAMILIES]

  const pool = filterCaseItems({ levels: queriedLevels.value, families: queriedFamilies.value })
  const sampled = sampleDativeCards(pool, count)
  if (sampled.length === 0) {
    error.value = 'Nothing to drill — adjust your filters.'
  } else {
    cards.value = toRunCards(buildCaseCards(sampled))
    startedAtMs.value = Date.now()
    nextTick(() => cardRef.value?.focus())
  }
  loading.value = false
  window.addEventListener('keydown', onKey)
})

onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

const current = computed(() => cards.value[index.value] ?? null)
const total = computed(() => cards.value.length)
const finished = computed(() => total.value > 0 && index.value >= total.value)
const score = computed(() => cards.value.filter(c => c.isCorrect === true).length)
const wrong = computed(() => cards.value.filter(c => c.isCorrect === false))

const pips = computed(() => cards.value.map((c, n) => {
  if (n < index.value) return c.isCorrect ? 'done' : 'wrong'
  if (n === index.value && submitted.value) return c.isCorrect ? 'done' : 'wrong'
  if (n === index.value) return 'current'
  return ''
}))

function pick(value: string) {
  const c = current.value
  if (!c || submitted.value) return
  c.picked = value
  c.isCorrect = c.answers[0] === value
  submitted.value = true
  nextTick(() => nextBtnRef.value?.focus())
}

function next() {
  index.value++
  submitted.value = false
  if (!finished.value) nextTick(() => cardRef.value?.focus())
}

function onKey(e: KeyboardEvent) {
  if (e.altKey || e.ctrlKey || e.metaKey) return
  if (!current.value) return
  if (e.key === 'Enter') {
    if (submitted.value) { e.preventDefault(); next() }
    return
  }
  if (submitted.value) return
  if (e.key === '1') { e.preventDefault(); pick('dative') }
  if (e.key === '2') { e.preventDefault(); pick('accusative') }
}

// Main round records once and bumps the ledger once per card; retry rounds
// are practice — never recorded, never bumped (ADR-0010, ADR-0017).
function recordRun() {
  if (historySaved.value || cards.value.length === 0) return
  historySaved.value = true
  const finishedAt = Date.now()
  for (const c of cards.value) {
    if (c.verb) bumpDativeLedger(c.verb, c.isCorrect === true, finishedAt)
  }
  saveQuizRun({
    type: 'dat-case',
    startedAt: new Date(startedAtMs.value).toISOString(),
    finishedAt: new Date(finishedAt).toISOString(),
    durationMs: finishedAt - startedAtMs.value,
    count: cards.value.length,
    correct: score.value,
    meta: { levels: queriedLevels.value, families: queriedFamilies.value },
  })
}

watch(finished, (now) => {
  if (now) {
    recordRun()
    if (wrong.value.length > 0 && !dismissed.value) showRetryModal.value = true
  }
})

function retryWrong() {
  showRetryModal.value = false
  const redo = wrong.value.map(c => ({ ...c, picked: null, isCorrect: null }))
  if (redo.length === 0) return
  cards.value = sampleDativeCards(redo, redo.length)
  index.value = 0
  submitted.value = false
  nextTick(() => cardRef.value?.focus())
}

function dismissRetry() {
  showRetryModal.value = false
  dismissed.value = true
}

function labelOf(value: string): string {
  return OPTIONS.find(o => o.value === value)?.label ?? value
}
</script>

<template>
  <div v-if="loading" class="page loading-state">
    <div class="micro-mark">Loading…</div>
  </div>

  <div v-else-if="error" class="page">
    <div class="alert alert-danger"><span class="alert-label">Error</span>{{ error }}</div>
    <button class="btn btn-ghost" @click="router.push({ name: 'dative-case' })">← Back to setup</button>
  </div>

  <!-- Summary -->
  <div v-else-if="finished && !showRetryModal" class="page result-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Auswertung · Dativ oder Akkusativ?</div>
        <div class="result-score">{{ score }} / {{ total }} correct</div>
        <p class="section-subtitle">Membership round complete.</p>
      </div>
      <div class="result-actions">
        <button class="btn btn-ghost" @click="router.push({ name: 'dative' })">← Dativ</button>
        <button class="btn btn-accent" @click="router.push({ name: 'dative-case' })">Start another drill <span aria-hidden="true">→</span></button>
      </div>
    </header>

    <div class="result-list">
      <div v-for="c in cards" :key="c.id" class="result-row drill-result-row">
        <div class="result-verb">
          <div class="german">{{ c.prompt }}</div>
          <div class="dat-gloss">{{ ENGLISH.get(c.verb ?? '') ?? '' }}</div>
        </div>
        <div class="result-answer">
          <span class="result-picked" :class="c.isCorrect ? 'ok' : 'err'">{{ c.picked ? labelOf(c.picked) : '—' }}</span>
          <span v-if="!c.isCorrect" class="result-correct">→ <strong>{{ labelOf(c.answers[0]) }}</strong></span>
        </div>
        <div class="result-verdict">
          <span class="tag" :class="c.isCorrect ? 'tag-success' : 'tag-danger'">{{ c.isCorrect ? '✓' : '✗' }}</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Retry modal -->
  <div v-else-if="showRetryModal" class="page">
    <RetryModal
      :wrong-count="wrong.length"
      item-label="verbs"
      @retry="retryWrong"
      @dismiss="dismissRetry"
    />
  </div>

  <!-- Active card -->
  <div v-else-if="current" class="page">
    <div class="drill-stage" ref="cardRef" tabindex="-1">
      <div class="quiz-meta">
        <span class="quiz-counter">Verb {{ index + 1 }} · von {{ total }}</span>
        <button class="btn btn-quiet" type="button" @click="router.push({ name: 'dative-case' })">End drill</button>
      </div>

      <div class="quiz-progress-bar">
        <div v-for="(cls, n) in pips" :key="n" class="pip" :class="cls" />
      </div>

      <div class="drill-prompt">
        <p class="drill-sentence dat-verb">{{ current.prompt }}</p>
        <p class="dat-gloss">{{ ENGLISH.get(current.verb ?? '') ?? '' }}</p>
      </div>

      <div class="choice-row">
        <button
          v-for="(opt, oi) in OPTIONS"
          :key="opt.value"
          type="button"
          class="choice mono-face"
          :class="{
            selected: current.picked === opt.value,
            correct: submitted && current.answers[0] === opt.value,
            wrong: submitted && current.picked === opt.value && current.answers[0] !== opt.value,
            disabled: submitted,
          }"
          :disabled="submitted"
          @click="pick(opt.value)"
        >
          <span class="c-key">{{ oi + 1 }}</span>
          <span class="c-label">{{ opt.label }}</span>
        </button>
      </div>

      <div v-if="submitted" class="drill-feedback">
        <span v-if="current.isCorrect" class="feedback-line correct">
          ✓ Richtig — <strong>{{ labelOf(current.answers[0]) }}</strong>
        </span>
        <template v-else>
          <span class="feedback-line wrong">✗ Korrekt: <strong>{{ labelOf(current.answers[0]) }}</strong></span>
          <p class="dat-explain">{{ current.explanation }}</p>
        </template>
        <button ref="nextBtnRef" type="button" class="btn btn-accent drill-advance" @click="next">
          {{ index + 1 >= total ? 'Finish drill' : 'Next' }} <span aria-hidden="true">→</span>
        </button>
      </div>

      <div class="drill-hint micro-mark">
        <template v-if="!submitted">Press <span class="kbd">1</span>–<span class="kbd">2</span> to choose</template>
        <template v-else>Press <span class="kbd">Enter</span> to {{ index + 1 >= total ? 'finish' : 'continue' }}</template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dat-verb { font-size: 28px; }
.dat-gloss {
  font-family: var(--font-body);
  font-size: 14px;
  font-style: italic;
  color: var(--mute);
  margin: 4px 0 0;
}
.dat-explain {
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--ink-soft);
  margin: 0;
  max-width: 60ch;
}
.drill-result-row { grid-template-columns: 1fr 200px auto; }
@media (max-width: 720px) {
  .drill-result-row { grid-template-columns: 1fr; gap: 4px; }
}
</style>
