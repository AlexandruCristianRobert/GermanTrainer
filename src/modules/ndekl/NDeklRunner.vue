<script setup lang="ts">
// N-Deklination runner — same self-contained shape as RelativRunner.vue, with
// two card kinds in one round:
//   'form'     → typed answer, graded foldGerman(normalize) === expected
//   'classify' → the fixed two-way choice (schwach / stark)
//
// Offline deterministic (ADR-0007 family): no AI, no ledger — one saveQuizRun
// per round, band-tracked only.
//
// Keyboard (the 1.21.02 convention): Enter on the input grades an unanswered
// typed card and advances once the verdict is in; focus follows the card — the
// input (or the stage, on a classify card), then the advance button after
// grading, so a plain Enter activates it natively. The global digit handler is
// scoped to classify cards ONLY: on a typed card 1/2 belong in the input.
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { saveQuizRun } from '../../composables/useQuizHistory'
import { foldGerman } from '../../composables/drillGrading'
import { csv } from '../../composables/quizQuery'
import { shuffle } from '../../data/pool'
import {
  filterNDeklItems, NDEKL_KINDS, NDEKL_KIND_LABEL, NDEKL_LEVELS,
  type NDeklItem, type NDeklLevel,
} from '../../data/nDeklination'

interface Card { item: NDeklItem; options: string[] }
interface Result { prompt: string; given: string; answer: string; correct: boolean }

const route = useRoute()
const router = useRouter()

const cards = ref<Card[]>([])
const error = ref<string | null>(null)
const index = ref(0)
const answer = ref('')
const picked = ref<string | null>(null)
const verdict = ref<'correct' | 'wrong' | null>(null)
const results = ref<Result[]>([])
const finished = ref(false)
const startedAt = Date.now()

const cardRef = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)
const nextBtnRef = ref<HTMLButtonElement | null>(null)

const normalize = (s: string) => foldGerman(s.trim().toLowerCase())

onMounted(() => {
  const count = Math.max(1, parseInt((route.query.count as string) ?? '10', 10) || 10)
  const levels = csv<NDeklLevel>(route.query.levels, NDEKL_LEVELS)
  const kinds = csv(route.query.kinds, NDEKL_KINDS)
  const sampled = shuffle(filterNDeklItems({ levels, kinds }), count)
  if (sampled.length === 0) {
    error.value = 'Nothing to drill — adjust your filters.'
    return
  }
  // Classify options are shuffled ONCE per card here (a computed would reshuffle
  // on every re-render); form cards carry no options at all.
  cards.value = sampled.map(item => ({
    item,
    options: item.options.length > 0 ? shuffle(item.options, item.options.length) : [],
  }))
  nextTick(() => focusCard())
})

const current = computed(() => cards.value[index.value] ?? null)
const total = computed(() => cards.value.length)
const correctCount = computed(() => results.value.filter(r => r.correct).length)
const isTyped = computed(() => current.value?.item.kind === 'form')

function focusCard() {
  if (isTyped.value) inputRef.value?.focus()
  else cardRef.value?.focus()
}

/** A form prompt split around its single ___ so the gap can be marked inline. */
const gapParts = computed(() => {
  const c = current.value
  if (!c) return null
  const at = c.item.prompt.indexOf('___')
  if (at < 0) return null
  return { pre: c.item.prompt.slice(0, at), post: c.item.prompt.slice(at + 3) }
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

function record(given: string, ok: boolean) {
  const c = current.value!
  verdict.value = ok ? 'correct' : 'wrong'
  results.value.push({ prompt: c.item.prompt, given, answer: c.item.answers[0], correct: ok })
  nextTick(() => nextBtnRef.value?.focus())
}

/** Typed cards: grade the input. Umlaut- and case-folded, punctuation-free. */
function check() {
  const c = current.value
  if (!c || verdict.value !== null || !answer.value.trim()) return
  record(answer.value.trim(), normalize(answer.value) === normalize(c.item.answers[0]))
}

/** Classify cards: a click IS the answer. */
function pick(option: string) {
  const c = current.value
  if (!c || verdict.value !== null) return
  picked.value = option
  record(option, c.item.answers.includes(option))
}

// 1–2 pick a classification, matching the badges on the buttons. Never on a
// typed card (there the digits are the learner's own input), and never Enter:
// the input handles that, and after grading the advance button holds focus.
function onKey(e: KeyboardEvent) {
  if (e.altKey || e.ctrlKey || e.metaKey) return
  const c = current.value
  if (!c || verdict.value !== null || isTyped.value || e.key.length !== 1) return
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
  answer.value = ''
  picked.value = null
  verdict.value = null
  nextTick(() => focusCard())
}

// One Run per round, recorded once. Every card is answered exactly once, so
// `count` is the number attempted and `correct` the first-try hits.
function finish() {
  if (finished.value) return
  finished.value = true
  const at = Date.now()
  saveQuizRun({
    type: 'ndekl-form',
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
    <button class="btn btn-ghost" type="button" @click="router.push({ name: 'ndekl' })">← Back to setup</button>
  </div>

  <!-- Summary -->
  <div v-else-if="finished" class="page result-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Auswertung · N-Deklination</div>
        <div class="result-score">{{ correctCount }} / {{ results.length }} richtig</div>
        <p class="section-subtitle">Runde abgeschlossen.</p>
      </div>
      <div class="result-actions">
        <button class="btn btn-ghost" type="button" @click="router.push({ name: 'home' })">← Startseite</button>
        <button class="btn btn-accent" type="button" @click="router.push({ name: 'ndekl' })">
          Neue Runde <span aria-hidden="true">→</span>
        </button>
      </div>
    </header>

    <div class="result-list">
      <div v-for="(r, i) in results" :key="i" class="result-row nd-result-row">
        <div class="result-verb">
          <div class="german">{{ r.prompt.replace('___', r.answer) }}</div>
        </div>
        <div class="result-answer">
          <span class="result-picked" :class="r.correct ? 'ok' : 'err'">{{ r.given }}</span>
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
  <div v-else-if="current" class="page">
    <div class="drill-stage" ref="cardRef" tabindex="-1">
      <div class="quiz-meta">
        <span class="quiz-counter">Karte {{ index + 1 }} · von {{ total }}</span>
        <button class="btn btn-quiet" type="button" @click="router.push({ name: 'ndekl' })">End drill</button>
      </div>

      <div class="quiz-progress-bar">
        <div v-for="(cls, n) in pips" :key="n" class="pip" :class="cls" />
      </div>

      <div class="drill-prompt">
        <!-- Kind + level only: caseUsed is exactly what the learner has to read off
             the sentence, so it stays out of the header. -->
        <div class="micro-mark">
          {{ NDEKL_KIND_LABEL[current.item.kind] }} · {{ current.item.level }}
        </div>
        <p v-if="gapParts" class="drill-sentence">{{ gapParts.pre }}<span class="drill-gap" :class="{ ok: verdict === 'correct', err: verdict === 'wrong' }">{{ answer.trim() || '＿＿＿' }}</span>{{ gapParts.post }}</p>
        <p v-else class="drill-sentence">{{ current.item.prompt }}</p>
      </div>

      <!-- Typed kind: the noun form only, no article. -->
      <div v-if="isTyped" class="type-row">
        <input
          ref="inputRef"
          v-model="answer"
          class="input type-input"
          type="text"
          placeholder="Nur die Substantivform"
          :readonly="verdict !== null"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          :class="{ ok: verdict === 'correct', err: verdict === 'wrong' }"
          @keydown.enter.prevent="verdict === null ? check() : next()"
        />
        <button
          v-if="verdict === null"
          class="btn btn-accent drill-check"
          type="button"
          :disabled="!answer.trim()"
          @click="check"
        >Prüfen</button>
      </div>

      <!-- Classify kind: the fixed two-way choice. -->
      <div v-else class="choice-row">
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

      <!-- Reveal: what you gave, the expected form, the gloss, and WHY —
           including the -ns and endungslos exceptions where they apply. -->
      <div v-if="verdict !== null" class="drill-feedback">
        <p class="feedback-line" :class="verdict === 'correct' ? 'correct' : 'wrong'">
          {{ verdict === 'correct' ? 'Richtig.' : 'Noch nicht.' }}
        </p>
        <div class="nd-reveal" :class="verdict">
          <div class="nd-l">
            <span class="nd-k">Du</span>
            <span :class="verdict === 'correct' ? 'nd-right' : 'nd-wrong'">
              {{ isTyped ? (answer.trim() || '—') : (picked ?? '—') }}
            </span>
          </div>
          <div class="nd-l">
            <span class="nd-k">Besser</span>
            <span class="nd-right">{{ current.item.answers[0] }}</span>
          </div>
          <p class="nd-gloss">{{ current.item.translation }}</p>
          <p class="nd-why">{{ current.item.explanation }}</p>
          <div class="nd-l">
            <span class="nd-k">Kasus</span>
            <span class="nd-case">{{ current.item.noun }} · {{ current.item.caseUsed }} Singular</span>
          </div>
        </div>
        <button ref="nextBtnRef" type="button" class="btn btn-accent drill-advance" @click="next">
          {{ index + 1 >= total ? 'Abschließen' : 'Weiter' }} <span aria-hidden="true">→</span>
        </button>
      </div>

      <div class="drill-hint micro-mark">
        <template v-if="verdict === null && isTyped">
          <span class="kbd">Enter</span> zum Prüfen
        </template>
        <template v-else-if="verdict === null">
          Schwach oder stark? · <span class="kbd">1</span>–<span class="kbd">2</span>
        </template>
        <template v-else>
          <span class="kbd">Enter</span> für {{ index + 1 >= total ? 'Abschluss' : 'weiter' }}
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.nd-reveal {
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
.nd-reveal.correct { border-left-color: var(--success); }
.nd-l { display: flex; gap: 12px; align-items: baseline; }
.nd-k {
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--mute);
  flex: 0 0 62px;
}
.nd-wrong { color: var(--danger); text-decoration: line-through; font-family: var(--font-mono); }
.nd-right { color: var(--success); font-family: var(--font-mono); font-size: 17px; }
.nd-gloss { margin: 2px 0 0; font-size: 14px; color: var(--ink-soft); font-style: italic; }
.nd-why { margin: 2px 0 0; font-size: 13.5px; line-height: 1.55; color: var(--mute); max-width: 62ch; }
.nd-case { font-size: 13px; color: var(--ink-soft); }

.nd-result-row { grid-template-columns: 1fr 180px auto; }

@media (max-width: 720px) {
  .nd-result-row { grid-template-columns: 1fr; gap: 4px; }
  .nd-k { flex-basis: 48px; }
}
</style>
