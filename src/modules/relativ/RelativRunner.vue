<script setup lang="ts">
// Relativsätze runner — self-contained local state in the SprechenDrill.vue
// style (items/index/verdict/pick/next/finish + one saveQuizRun), reading its
// filters off the query string the way FreeRunner.vue does (csv + shuffle).
//
// Offline deterministic (ADR-0007 family): the answer is one of the item's own
// four options, so grading is a plain membership test — no AI anywhere.
// Band-tracked only, via saveQuizRun; this module has no ledger.
//
// Keyboard (the 1.21.02 convention): Enter is NOT handled here. Focus follows
// the card — the stage while the card is open, the advance button once the
// verdict is in — so a plain Enter after answering activates the focused button
// natively, with no risk of a double advance. The global handler covers only
// the digit keys the option badges advertise.
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { saveQuizRun } from '../../composables/useQuizHistory'
import { csv } from '../../composables/quizQuery'
import { shuffle } from '../../data/pool'
import {
  filterRelativItems, RELATIV_KINDS, RELATIV_KIND_LABEL, RELATIV_LEVELS,
  type RelativItem, type RelativLevel,
} from '../../data/relativItems'

interface Card { item: RelativItem; options: string[] }
interface Result { prompt: string; picked: string; answer: string; correct: boolean }

const route = useRoute()
const router = useRouter()

const cards = ref<Card[]>([])
const error = ref<string | null>(null)
const index = ref(0)
const picked = ref<string | null>(null)
const verdict = ref<'correct' | 'wrong' | null>(null)
const results = ref<Result[]>([])
const finished = ref(false)
const startedAt = Date.now()

const cardRef = ref<HTMLElement | null>(null)
const nextBtnRef = ref<HTMLButtonElement | null>(null)

onMounted(() => {
  const count = Math.max(1, parseInt((route.query.count as string) ?? '10', 10) || 10)
  const levels = csv<RelativLevel>(route.query.levels, RELATIV_LEVELS)
  const kinds = csv(route.query.kinds, RELATIV_KINDS)
  const sampled = shuffle(filterRelativItems({ levels, kinds }), count)
  if (sampled.length === 0) {
    error.value = 'Nothing to drill — adjust your filters.'
    return
  }
  // Options are shuffled ONCE per card, here — a computed would reshuffle on
  // every re-render and move the buttons out from under the learner's cursor.
  cards.value = sampled.map(item => ({ item, options: shuffle(item.options, item.options.length) }))
  nextTick(() => cardRef.value?.focus())
})

const current = computed(() => cards.value[index.value] ?? null)
const total = computed(() => cards.value.length)
const correctCount = computed(() => results.value.filter(r => r.correct).length)

/** The prompt split around its single ___ so the gap can be marked inline. */
const gapParts = computed(() => {
  const c = current.value
  if (!c) return null
  const at = c.item.prompt.indexOf('___')
  if (at < 0) return { pre: c.item.prompt, post: '' }
  return { pre: c.item.prompt.slice(0, at), post: c.item.prompt.slice(at + 3) }
})

/** The whole sentence with the gap filled by the right pronoun — the reveal. */
const corrected = computed(() => {
  const c = current.value
  return c ? c.item.prompt.replace('___', c.item.answers[0]) : ''
})

const pips = computed(() => {
  const out: string[] = []
  for (let n = 0; n < total.value; n++) {
    if (n < results.value.length) out.push(results.value[n].correct ? 'done' : 'wrong')
    else if (n === index.value) out.push('current')
    else out.push('')
  }
  return out
})

function pick(option: string) {
  const c = current.value
  if (!c || verdict.value !== null) return
  const ok = c.item.answers.includes(option)
  picked.value = option
  verdict.value = ok ? 'correct' : 'wrong'
  results.value.push({
    prompt: c.item.prompt, picked: option, answer: c.item.answers[0], correct: ok,
  })
  nextTick(() => nextBtnRef.value?.focus())
}

// 1–4 pick an option, matching the badges on the buttons. Enter is deliberately
// absent: after a pick the advance button holds focus and handles it natively.
function onKey(e: KeyboardEvent) {
  if (e.altKey || e.ctrlKey || e.metaKey) return
  const c = current.value
  if (!c || verdict.value !== null || e.key.length !== 1) return
  const idx = e.key.charCodeAt(0) - '1'.charCodeAt(0)
  if (idx < 0 || idx >= c.options.length) return
  e.preventDefault()
  pick(c.options[idx])
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

function next() {
  if (index.value + 1 >= cards.value.length) { finish(); return }
  index.value += 1
  picked.value = null
  verdict.value = null
  nextTick(() => cardRef.value?.focus())
}

// One Run per round, recorded once. Every card is answered exactly once, so
// `count` is the number attempted and `correct` the first-try hits.
function finish() {
  if (finished.value) return
  finished.value = true
  const at = Date.now()
  saveQuizRun({
    type: 'relativ-pronomen',
    startedAt: new Date(startedAt).toISOString(),
    finishedAt: new Date(at).toISOString(),
    durationMs: at - startedAt,
    count: results.value.length,
    correct: correctCount.value,
    meta: {},
  })
}
</script>

<template>
  <div v-if="error" class="page">
    <div class="alert alert-danger">
      <span class="alert-label">Error</span>{{ error }}
    </div>
    <button class="btn btn-ghost" type="button" @click="router.push({ name: 'relativ' })">← Back to setup</button>
  </div>

  <!-- Summary -->
  <div v-else-if="finished" class="page result-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Auswertung · Relativsätze</div>
        <div class="result-score">{{ correctCount }} / {{ results.length }} richtig</div>
        <p class="section-subtitle">Runde abgeschlossen.</p>
      </div>
      <div class="result-actions">
        <button class="btn btn-ghost" type="button" @click="router.push({ name: 'home' })">← Startseite</button>
        <button class="btn btn-accent" type="button" @click="router.push({ name: 'relativ' })">
          Neue Runde <span aria-hidden="true">→</span>
        </button>
      </div>
    </header>

    <div class="result-list">
      <div v-for="(r, i) in results" :key="i" class="result-row rel-result-row">
        <div class="result-verb">
          <div class="german">{{ r.prompt.replace('___', r.answer) }}</div>
        </div>
        <div class="result-answer">
          <span class="result-picked" :class="r.correct ? 'ok' : 'err'">{{ r.picked }}</span>
          <span v-if="!r.correct" class="result-correct">→ <strong>{{ r.answer }}</strong></span>
        </div>
        <div class="result-verdict">
          <span class="tag" :class="r.correct ? 'tag-success' : 'tag-danger'">
            {{ r.correct ? '✓' : '✗' }}
          </span>
        </div>
      </div>
    </div>
  </div>

  <!-- Active card -->
  <div v-else-if="current && gapParts" class="page">
    <div class="drill-stage" ref="cardRef" tabindex="-1">
      <div class="quiz-meta">
        <span class="quiz-counter">Karte {{ index + 1 }} · von {{ total }}</span>
        <button class="btn btn-quiet" type="button" @click="router.push({ name: 'relativ' })">End drill</button>
      </div>

      <div class="quiz-progress-bar">
        <div v-for="(cls, n) in pips" :key="n" class="pip" :class="cls" />
      </div>

      <div class="drill-prompt">
        <!-- Kind + level only. The antecedent and the in-clause role are the two
             things the learner is supposed to work out, so they belong in the
             reveal, never in the header above the still-unanswered card. -->
        <div class="micro-mark">
          {{ RELATIV_KIND_LABEL[current.item.kind] }} · {{ current.item.level }}
        </div>
        <p class="drill-sentence">{{ gapParts.pre }}<span class="drill-gap" :class="{ ok: verdict === 'correct', err: verdict === 'wrong' }">{{ picked ?? '＿＿＿' }}</span>{{ gapParts.post }}</p>
      </div>

      <div class="choice-row quad">
        <button
          v-for="(opt, oi) in current.options"
          :key="opt"
          type="button"
          class="choice mono-face"
          :class="{
            selected: picked === opt,
            correct: verdict !== null && current.item.answers.includes(opt),
            wrong: verdict !== null && picked === opt && !current.item.answers.includes(opt),
            disabled: verdict !== null,
          }"
          :disabled="verdict !== null"
          @click="pick(opt)"
        >
          <span class="c-key">{{ oi + 1 }}</span>
          <span class="c-label">{{ opt }}</span>
        </button>
      </div>

      <!-- Reveal: what you picked, what it should be, the whole sentence put
           right, and WHY — the antecedent's gender/number plus the in-clause role. -->
      <div v-if="verdict !== null" class="drill-feedback">
        <p class="feedback-line" :class="verdict === 'correct' ? 'correct' : 'wrong'">
          {{ verdict === 'correct' ? 'Richtig.' : 'Noch nicht.' }}
        </p>
        <div class="rel-reveal" :class="verdict">
          <div class="rel-l">
            <span class="rel-k">Du</span>
            <span :class="verdict === 'correct' ? 'rel-right' : 'rel-wrong'">{{ picked }}</span>
          </div>
          <div class="rel-l">
            <span class="rel-k">Besser</span>
            <span class="rel-right">{{ current.item.answers[0] }}</span>
          </div>
          <p class="rel-full">{{ corrected }}</p>
          <p class="rel-gloss">{{ current.item.translation }}</p>
          <p class="rel-why">{{ current.item.explanation }}</p>
          <div class="rel-l">
            <span class="rel-k">Bezug</span>
            <span class="rel-case">
              {{ current.item.antecedent }} · {{ current.item.roleCase }} im Relativsatz
            </span>
          </div>
        </div>
        <button ref="nextBtnRef" type="button" class="btn btn-accent drill-advance" @click="next">
          {{ index + 1 >= total ? 'Abschließen' : 'Weiter' }} <span aria-hidden="true">→</span>
        </button>
      </div>

      <div class="drill-hint micro-mark">
        <template v-if="verdict === null">
          Wähle das Relativpronomen ·
          <span class="kbd">1</span>–<span class="kbd">{{ current.options.length }}</span>
        </template>
        <template v-else>
          <span class="kbd">Enter</span> für {{ index + 1 >= total ? 'Abschluss' : 'weiter' }}
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rel-reveal {
  align-self: stretch;
  text-align: left;
  margin: 18px 0 0;
  padding: 15px 18px;
  background: var(--paper-deep);
  border-left: 2px solid var(--danger);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.rel-reveal.correct { border-left-color: var(--success); }
.rel-l { display: flex; gap: 12px; align-items: baseline; }
.rel-k {
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--mute);
  flex: 0 0 62px;
}
.rel-wrong { color: var(--danger); text-decoration: line-through; font-family: var(--font-mono); }
.rel-right { color: var(--success); font-family: var(--font-mono); font-size: 17px; }
.rel-full { margin: 2px 0 0; font-family: var(--font-display); font-size: 17px; line-height: 1.5; }
.rel-gloss { margin: 0; font-size: 14px; color: var(--ink-soft); font-style: italic; }
.rel-why { margin: 2px 0 0; font-size: 13.5px; line-height: 1.55; color: var(--mute); max-width: 62ch; }
.rel-case { font-size: 13px; color: var(--ink-soft); }

.rel-result-row { grid-template-columns: 1fr 160px auto; }

@media (max-width: 720px) {
  .rel-result-row { grid-template-columns: 1fr; gap: 4px; }
  .rel-k { flex-basis: 48px; }
}
</style>
