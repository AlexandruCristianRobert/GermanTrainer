<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  filterTrapItems, sampleDativeCards, buildTrapCards, gradeDativeAnswer,
  DATIVE_FAMILIES, type DativeCard, type DativeFamily,
} from '../../composables/useDativeDrill'
import { DATIVE_ITEM_LEVELS, type TrapItem, type DativeItemLevel } from '../../data/dativeItems'
import { saveQuizRun } from '../../composables/useQuizHistory'
import { bumpDativeLedger } from '../../composables/useDativeLedger'
import RetryModal from '../../components/RetryModal.vue'

const route = useRoute()
const router = useRouter()

interface RunCard extends DativeCard {
  typed: string | null
  isCorrect: boolean | null
}

const loading = ref(true)
const error = ref<string | null>(null)
const items = ref<TrapItem[]>([])          // parallel to cards — english/cue live here
const cards = ref<RunCard[]>([])
const index = ref(0)
const input = ref('')
const submitted = ref(false)
const startedAtMs = ref(0)
const historySaved = ref(false)
const showRetryModal = ref(false)
const dismissed = ref(false)
const queriedLevels = ref<DativeItemLevel[]>([])
const queriedFamilies = ref<DativeFamily[]>([])
const inputRef = ref<HTMLInputElement | null>(null)
const nextBtnRef = ref<HTMLButtonElement | null>(null)

function rebuild(sampled: TrapItem[]) {
  items.value = sampled
  cards.value = buildTrapCards(sampled).map(c => ({ ...c, typed: null, isCorrect: null }))
  index.value = 0
  input.value = ''
  submitted.value = false
  nextTick(() => inputRef.value?.focus())
}

onMounted(() => {
  const count = Math.max(1, parseInt((route.query.count as string) ?? '10', 10) || 10)
  const rawLevels = ((route.query.levels as string) ?? '').split(',').filter(Boolean)
  const levels = rawLevels.filter((l): l is DativeItemLevel => (DATIVE_ITEM_LEVELS as readonly string[]).includes(l))
  const rawFamilies = ((route.query.families as string) ?? '').split(',').filter(Boolean)
  const families = rawFamilies.filter((f): f is DativeFamily => (DATIVE_FAMILIES as readonly string[]).includes(f))
  queriedLevels.value = levels.length ? levels : [...DATIVE_ITEM_LEVELS]
  queriedFamilies.value = families.length ? families : [...DATIVE_FAMILIES]

  const pool = filterTrapItems({ levels: queriedLevels.value, families: queriedFamilies.value })
  const sampled = sampleDativeCards(pool, count)
  if (sampled.length === 0) {
    error.value = 'Nothing to drill — adjust your filters.'
  } else {
    rebuild(sampled)
    startedAtMs.value = Date.now()
  }
  loading.value = false
})

const current = computed(() => cards.value[index.value] ?? null)
const currentItem = computed(() => items.value[index.value] ?? null)
const total = computed(() => cards.value.length)
const finished = computed(() => total.value > 0 && index.value >= total.value)
const score = computed(() => cards.value.filter(c => c.isCorrect === true).length)
const wrongIdx = computed(() => cards.value.map((c, i) => c.isCorrect === false ? i : -1).filter(i => i >= 0))

const pips = computed(() => cards.value.map((c, n) => {
  if (n < index.value) return c.isCorrect ? 'done' : 'wrong'
  if (n === index.value && submitted.value) return c.isCorrect ? 'done' : 'wrong'
  if (n === index.value) return 'current'
  return ''
}))

const promptParts = computed(() => current.value ? current.value.prompt.split('___') : [])
const filledSentence = computed(() =>
  current.value ? current.value.prompt.replace('___', current.value.answers[0]) : ''
)

function submit() {
  const c = current.value
  if (!c || submitted.value || !input.value.trim()) return
  c.typed = input.value
  c.isCorrect = gradeDativeAnswer(input.value, c.answers)
  submitted.value = true
  nextTick(() => nextBtnRef.value?.focus())
}

function next() {
  index.value++
  input.value = ''
  submitted.value = false
  if (!finished.value) nextTick(() => inputRef.value?.focus())
}

function recordRun() {
  if (historySaved.value || cards.value.length === 0) return
  historySaved.value = true
  const finishedAt = Date.now()
  for (const c of cards.value) {
    if (c.verb) bumpDativeLedger(c.verb, c.isCorrect === true, finishedAt)
  }
  saveQuizRun({
    type: 'dat-trap',
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
    if (wrongIdx.value.length > 0 && !dismissed.value) showRetryModal.value = true
  }
})

function retryWrong() {
  showRetryModal.value = false
  const redo = wrongIdx.value.map(i => items.value[i])
  if (redo.length === 0) return
  rebuild(sampleDativeCards(redo, redo.length))
}

function dismissRetry() {
  showRetryModal.value = false
  dismissed.value = true
}
</script>

<template>
  <div v-if="loading" class="page loading-state">
    <div class="micro-mark">Loading…</div>
  </div>

  <div v-else-if="error" class="page">
    <div class="alert alert-danger"><span class="alert-label">Error</span>{{ error }}</div>
    <button class="btn btn-ghost" @click="router.push({ name: 'dative-trap' })">← Back to setup</button>
  </div>

  <!-- Summary -->
  <div v-else-if="finished && !showRetryModal" class="page result-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Auswertung · Fallen-Karten</div>
        <div class="result-score">{{ score }} / {{ total }} correct</div>
        <p class="section-subtitle">Trap round complete.</p>
      </div>
      <div class="result-actions">
        <button class="btn btn-ghost" @click="router.push({ name: 'dative' })">← Dativ</button>
        <button class="btn btn-accent" @click="router.push({ name: 'dative-trap' })">Start another drill <span aria-hidden="true">→</span></button>
      </div>
    </header>

    <div class="result-list">
      <div v-for="(c, i) in cards" :key="c.id" class="result-row drill-result-row">
        <div class="result-verb">
          <div class="dat-english-sm">{{ items[i].english }}</div>
          <div class="german">{{ c.prompt.replace('___', '＿＿') }} <em>({{ items[i].cue }})</em></div>
        </div>
        <div class="result-answer">
          <span class="result-picked" :class="c.isCorrect ? 'ok' : 'err'">{{ c.typed ?? '—' }}</span>
          <span v-if="!c.isCorrect" class="result-correct">→ <strong>{{ c.answers[0] }}</strong></span>
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
      :wrong-count="wrongIdx.length"
      item-label="sentences"
      @retry="retryWrong"
      @dismiss="dismissRetry"
    />
  </div>

  <!-- Active card -->
  <div v-else-if="current" class="page">
    <div class="drill-stage">
      <div class="quiz-meta">
        <span class="quiz-counter">Satz {{ index + 1 }} · von {{ total }}</span>
        <button class="btn btn-quiet" type="button" @click="router.push({ name: 'dative-trap' })">End drill</button>
      </div>

      <div class="quiz-progress-bar">
        <div v-for="(cls, n) in pips" :key="n" class="pip" :class="cls" />
      </div>

      <div class="drill-prompt">
        <p class="dat-english">{{ currentItem?.english }}</p>
        <p class="drill-sentence">
          <template v-for="(part, i) in promptParts" :key="i">{{ part }}<span v-if="i < promptParts.length - 1" class="drill-gap">___</span></template>
        </p>
        <p class="dat-cue">Grundform: <strong>{{ currentItem?.cue }}</strong></p>
      </div>

      <form class="dat-input-row" @submit.prevent="submitted ? next() : submit()">
        <input
          ref="inputRef"
          v-model="input"
          class="input"
          type="text"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          :disabled="submitted"
          placeholder="Dativform eintippen …"
        />
        <button v-if="!submitted" class="btn btn-accent" type="submit" :disabled="!input.trim()">Prüfen</button>
      </form>

      <div v-if="submitted" class="drill-feedback">
        <span v-if="current.isCorrect" class="feedback-line correct">
          ✓ Richtig — <strong>{{ current.answers[0] }}</strong>
        </span>
        <template v-else>
          <span class="feedback-line wrong">✗ Korrekt: <strong>{{ current.answers[0] }}</strong></span>
          <p class="dat-filled">{{ filledSentence }}</p>
          <p class="dat-explain">{{ current.explanation }}</p>
        </template>
        <button ref="nextBtnRef" type="button" class="btn btn-accent drill-advance" @click="next">
          {{ index + 1 >= total ? 'Finish drill' : 'Next' }} <span aria-hidden="true">→</span>
        </button>
      </div>

      <div class="drill-hint micro-mark">
        <template v-if="!submitted">Press <span class="kbd">Enter</span> to check</template>
        <template v-else>Press <span class="kbd">Enter</span> to {{ index + 1 >= total ? 'finish' : 'continue' }}</template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dat-english {
  font-family: var(--font-body);
  font-size: 16px;
  font-style: italic;
  color: var(--ink-soft);
  margin: 0 0 10px;
}
.dat-english-sm {
  font-family: var(--font-body);
  font-size: 13px;
  font-style: italic;
  color: var(--mute);
}
.dat-cue {
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--mute);
  margin: 6px 0 0;
}
.dat-input-row { display: flex; gap: 10px; margin-top: 18px; }
.dat-input-row .input { flex: 1; }
.dat-filled, .dat-explain {
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--ink-soft);
  margin: 0;
}
.dat-explain { max-width: 60ch; color: var(--mute); }
.drill-result-row { grid-template-columns: 1fr 220px auto; }
@media (max-width: 720px) {
  .drill-result-row { grid-template-columns: 1fr; gap: 4px; }
}
</style>
