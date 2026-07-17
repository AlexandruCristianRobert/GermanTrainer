<script setup lang="ts">
import { computed, nextTick, onMounted, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCollocations } from '../../composables/useCollocations'
import { useCollocationQuiz } from '../../composables/useCollocationQuiz'
import { csv } from '../../composables/quizQuery'
import { shuffle } from '../../data/pool'
import { useBreakpoint } from '../../composables/useBreakpoint'
import RetryModal from '../../components/RetryModal.vue'
import {
  COLLOCATION_LEVELS, COLLOCATION_ROLES,
  type Collocation, type CollocationCase, type CollocationLevel, type CollocationRole,
} from '../../data/collocations'
import { prepColorStyle } from '../../data/prepColors'

const route  = useRoute()
const router = useRouter()
const { sample } = useCollocations()
const { isMobile } = useBreakpoint()

// Core-idea hints are on unless the query param explicitly turns them off.
const hintsOn = computed(() => route.query.hints !== '0')
// "Type it out on a miss" — on unless explicitly turned off. When on, a wrong card
// makes the learner retype the full answer (word + preposition) before advancing.
const retypeOn = computed(() => route.query.retype !== '0')

// ── quiz state ──────────────────────────────────────────────────────────────
const loading = ref(true)
const error   = ref<string | null>(null)
const ready   = ref(false)

type Quiz = ReturnType<typeof useCollocationQuiz>
const quiz = shallowRef<Quiz | null>(null)

// ── per-card input state ────────────────────────────────────────────────────
const inputPreposition = ref('')
const selectedCase     = ref<CollocationCase | null>(null)
const submitted        = ref(false)
const retypeInput      = ref('')

// ── retry modal state ───────────────────────────────────────────────────────
const showRetryModal = ref(false)
const dismissed      = ref(false)

// ── refs for focus ──────────────────────────────────────────────────────────
const prepInputRef   = ref<HTMLInputElement | null>(null)
const retypeInputRef = ref<HTMLInputElement | null>(null)

// ── mount ───────────────────────────────────────────────────────────────────
onMounted(() => {
  const count  = Math.max(1, parseInt((route.query.count as string) ?? '10', 10) || 10)
  const levels = csv<CollocationLevel>(route.query.levels, COLLOCATION_LEVELS)
  const roles  = csv<CollocationRole>(route.query.roles, COLLOCATION_ROLES)

  try {
    const items: Collocation[] = sample(count, { levels, roles })
    if (items.length === 0) {
      error.value = 'Nothing to drill — adjust your filters.'
    } else {
      quiz.value = useCollocationQuiz(items)
      ready.value = true
      resetInputs()
      nextTick(() => prepInputRef.value?.focus())
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load.'
  } finally {
    loading.value = false
  }
})

function resetInputs() {
  inputPreposition.value = ''
  selectedCase.value     = null
  submitted.value        = false
  retypeInput.value      = ''
}

// ── computed from quiz ───────────────────────────────────────────────────────
const current       = computed(() => (ready.value, quiz.value?.current.value ?? null))
const finished      = computed(() => (ready.value, quiz.value?.finished.value ?? false))
const total         = computed(() => (ready.value, quiz.value?.total.value ?? 0))
const questionIndex = computed(() => (ready.value, quiz.value?.currentIndex.value ?? 0))
const score         = computed(() => (ready.value, quiz.value?.score.value ?? 0))
const wrongItems    = computed(() => (ready.value, quiz.value?.wrongItems.value ?? []))

const questions = computed(() => (ready.value, quiz.value?.questions.value ?? []))
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

// ── retype-on-miss ─────────────────────────────────────────────────────────
// After a wrong answer (when the setting is on) the learner must type the full
// collocation — word + a correct preposition, e.g. "glauben an" — before advancing.
const mustRetype = computed(() =>
  submitted.value && retypeOn.value && current.value != null && current.value.isCorrect === false
)
function normPhrase(s: string): string {
  return s.toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/^(der|die|das|sich)\s+/, '')  // article / reflexive is optional to retype
    .replace(/\s+/g, ' ')
    .trim()
}
const acceptablePhrases = computed(() => {
  const it = current.value?.item
  if (!it) return [] as string[]
  const preps = [it.preposition, ...(it.alsoAccept?.map(a => a.preposition) ?? [])]
  return preps.map(p => normPhrase(`${it.word} ${p}`))
})
const retypeOk = computed(() => {
  const typed = normPhrase(retypeInput.value)
  return typed.length > 0 && acceptablePhrases.value.includes(typed)
})
// Can leave the current card: submitted, and either no retype is required or it's satisfied.
const canAdvance = computed(() => submitted.value && (!mustRetype.value || retypeOk.value))

// ── actions ──────────────────────────────────────────────────────────────────
// 1 = Akkusativ · 2 = Dativ, chosen from the keyboard while the preposition
// input holds focus. Swallow the digit so it never lands in the field; ignored
// once the card is submitted (the case is locked).
function onPrepKeydown(e: KeyboardEvent) {
  if (submitted.value || e.altKey || e.ctrlKey || e.metaKey) return
  if (e.key === '1') { e.preventDefault(); selectedCase.value = 'accusative' }
  else if (e.key === '2') { e.preventDefault(); selectedCase.value = 'dative' }
}

function submit() {
  if (!quiz.value || submitted.value) return
  if (!selectedCase.value) return
  quiz.value.submit({
    preposition: inputPreposition.value,
    case: selectedCase.value,
  })
  submitted.value = true
  // On a miss with retype on, drop the cursor straight into the retype box.
  if (mustRetype.value) {
    retypeInput.value = ''
    nextTick(() => retypeInputRef.value?.focus())
  }
}

function next() {
  if (!quiz.value) return
  if (!canAdvance.value) return  // retype required but not yet correct
  quiz.value.advance()
  resetInputs()
  nextTick(() => prepInputRef.value?.focus())
}

function onFinished() {
  if (wrongItems.value.length > 0 && !dismissed.value) {
    showRetryModal.value = true
  }
}

watch(finished, (now) => {
  if (now && ready.value) onFinished()
})

function retryWrong() {
  showRetryModal.value = false
  if (!quiz.value) return
  const wrong = wrongItems.value
  if (wrong.length === 0) return
  quiz.value = useCollocationQuiz(shuffle(wrong))
  resetInputs()
  dismissed.value = false
  nextTick(() => prepInputRef.value?.focus())
}

function dismissRetry() {
  showRetryModal.value = false
  dismissed.value = true
}

function restart() {
  router.push({ name: 'prepositions-collocations' })
}

// Display helper
function caseName(c: CollocationCase): string {
  return c === 'accusative' ? 'Akkusativ' : 'Dativ'
}
const shortCase = (c: CollocationCase) => (c === 'accusative' ? 'Akk' : 'Dat')

// All acceptable answers for a card (primary + interchangeable alsoAccept), for the
// reveal on merged cards — e.g. "an (Akk) · nach (Dat)".
function acceptedAnswers(item: Collocation): string {
  const all = [{ preposition: item.preposition, case: item.case }, ...(item.alsoAccept ?? [])]
  return all.map(a => `${a.preposition} (${shortCase(a.case)})`).join(' · ')
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
        <div class="breadcrumb">Auswertung · Feste Präpositionen</div>
        <div class="result-score">{{ score }} / {{ total }} correct</div>
        <p class="section-subtitle">Fixed prepositions drill complete.</p>
      </div>
      <div class="result-actions">
        <button class="btn btn-ghost" @click="router.push({ name: 'prepositions' })">← Präpositionen</button>
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
        class="result-row colloc-result-row"
        :style="prepColorStyle(q.item.preposition)"
      >
        <div class="result-word">
          <div class="german">{{ q.item.word }}</div>
          <div class="result-word-meta">{{ q.item.english }}</div>
        </div>
        <div class="result-parts">
          <span class="result-part">
            <span class="part-label">Prep.</span>
            <strong class="prep-accent-text">{{ q.item.preposition }}</strong>
          </span>
          <span class="result-part">
            <span class="part-label">Case</span>
            <strong :class="q.caseOk ? 'ok' : 'err'">{{ caseName(q.item.case) }}</strong>
          </span>
        </div>
        <div class="result-verdict">
          <span class="tag" :class="q.isCorrect ? 'tag-success' : 'tag-danger'">
            {{ q.isCorrect ? '✓' : '✗' }}
          </span>
        </div>
        <div v-if="!q.isCorrect" class="result-explanation">{{ q.item.coreIdeaExplanation }}</div>
      </div>
    </div>
  </div>

  <!-- Retry modal -->
  <div v-else-if="showRetryModal" class="page">
    <RetryModal
      :wrong-count="wrongItems.length"
      item-label="collocations"
      @retry="retryWrong"
      @dismiss="dismissRetry"
    />
  </div>

  <!-- Active quiz card -->
  <div v-else-if="current && ready" class="page">
    <div
      class="colloc-stage colloc-testcard"
      :class="{ submitted }"
      :style="submitted ? prepColorStyle(current.item.preposition) : undefined"
    >
      <div class="quiz-meta">
        <span class="quiz-counter">Card {{ questionIndex + 1 }} · of {{ total }}</span>
      </div>

      <div class="quiz-progress-bar">
        <div v-for="(cls, i) in pips" :key="i" class="pip" :class="cls" />
      </div>

      <!-- Prompt card -->
      <div class="prompt-card colloc-prompt" :class="{ submitted }">
        <div class="prompt-chips">
          <span class="tag">{{ current.item.role }}</span>
          <span class="tag">{{ current.item.level }}</span>
        </div>
        <div class="prompt-german colloc-german">{{ current.item.word }}</div>
        <div class="prompt-english">{{ current.item.english }}</div>
        <div v-if="hintsOn" class="prompt-hint">{{ current.item.coreIdeaHint }}</div>
      </div>

      <!-- Input area -->
      <div class="colloc-inputs" :class="{ submitted }">
        <!-- Preposition text input -->
        <div class="colloc-input-row">
          <label class="colloc-label">Preposition</label>
          <input
            ref="prepInputRef"
            v-model="inputPreposition"
            class="input input-prep"
            type="text"
            placeholder="Präposition"
            :readonly="submitted"
            autocomplete="off"
            spellcheck="false"
            :style="submitted ? {
              color: current.prepositionOk ? 'var(--success)' : 'var(--danger)',
              borderBottomColor: current.prepositionOk ? 'var(--success)' : 'var(--danger)'
            } : undefined"
            @keydown="onPrepKeydown"
            @keyup.enter="submitted ? next() : submit()"
          />
          <div v-if="submitted" class="colloc-feedback">
            <span v-if="current.prepositionOk" class="ok-mark">✓</span>
            <span v-else class="row-expected">→</span>
            <strong class="prep-accent-text">{{ current.item.preposition }}</strong>
          </div>
        </div>

        <!-- Case buttons -->
        <div class="colloc-input-row colloc-case-row">
          <label class="colloc-label">Case</label>
          <div class="case-buttons">
            <button
              v-for="c in (['accusative', 'dative'] as CollocationCase[])"
              :key="c"
              class="btn case-btn"
              :class="{
                'case-selected': selectedCase === c,
                'case-correct': submitted && current.item.case === c,
                'case-wrong': submitted && current.item.case !== c && selectedCase === c,
              }"
              :disabled="submitted"
              type="button"
              @click="selectedCase = c"
            >{{ caseName(c) }}</button>
          </div>
          <div v-if="submitted" class="colloc-feedback colloc-case-feedback">
            <span v-if="current.caseOk" class="ok-mark">✓</span>
            <span v-else class="row-expected">→ <strong>{{ caseName(current.item.case) }}</strong></span>
          </div>
        </div>

        <!-- Reveal: on a miss, the core-idea explanation leads; then example + notes -->
        <div v-if="submitted" class="colloc-reveal">
          <div v-if="current.item.alsoAccept?.length" class="reveal-accepted">
            Both correct: {{ acceptedAnswers(current.item) }}
          </div>
          <div v-if="!current.isCorrect" class="reveal-explanation">
            <span class="reveal-why">Why?</span>{{ current.item.coreIdeaExplanation }}
          </div>
          <div class="reveal-example">{{ current.item.example }}</div>
          <div v-if="current.item.notes" class="reveal-notes">{{ current.item.notes }}</div>
        </div>

        <!-- Retype the full answer to continue (setting: "type it out on a miss") -->
        <div v-if="mustRetype" class="colloc-input-row colloc-retype-row">
          <label class="colloc-label">Type it out</label>
          <input
            ref="retypeInputRef"
            v-model="retypeInput"
            class="input retype-input"
            :class="{ 'retype-ok': retypeOk }"
            type="text"
            placeholder="Type the word + preposition to continue"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            @keyup.enter="next()"
          />
          <div class="colloc-feedback">
            <span v-if="retypeOk" class="ok-mark">✓</span>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="quiz-actions colloc-actions">
        <span v-if="!submitted && isMobile" class="micro-mark">Pick a case, then tap Submit</span>
        <span v-if="!submitted && !isMobile" class="micro-mark">Pick a case, then press <span class="kbd">Enter</span> or Submit</span>
        <span v-if="mustRetype && !retypeOk" class="micro-mark">Type the correct answer above to continue</span>
        <div class="action-buttons">
          <button
            v-if="!submitted"
            class="btn btn-accent"
            type="button"
            :disabled="!selectedCase"
            @click="submit"
          >
            Submit <span aria-hidden="true">→</span>
          </button>
          <button
            v-else
            class="btn btn-accent"
            type="button"
            :disabled="mustRetype && !retypeOk"
            @click="next"
          >
            {{ questionIndex + 1 === total ? 'Finish drill' : 'Next' }} <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.loading-state { text-align: center; padding-top: 120px; }
.result-page { max-width: 880px; }
.result-actions { display: flex; gap: 12px; flex-wrap: wrap; }

.colloc-stage {
  max-width: 680px;
  margin: 0 auto;
}

/* Test card — one framed, high-contrast surface holding the whole drill, so the
   reading area stays legible on any theme or custom palette. The preposition
   colour is contained to the frame (top spine) and the reveal, never the surface. */
.colloc-testcard {
  position: relative;
  background: var(--paper-card);
  border: 1px solid var(--hairline);
  border-radius: 8px;
  padding: 20px 40px 32px;
  overflow: hidden;
  box-shadow: 0 24px 60px -34px rgba(20, 17, 10, 0.34);
  transition: box-shadow .3s ease;
}
[data-theme="dark"] .colloc-testcard {
  border-color: var(--rule);
  box-shadow: 0 24px 60px -30px rgba(0, 0, 0, 0.66);
}
.colloc-testcard.submitted {
  box-shadow: 0 30px 70px -32px rgba(20, 17, 10, 0.42);
}
[data-theme="dark"] .colloc-testcard.submitted {
  box-shadow: 0 30px 70px -28px rgba(0, 0, 0, 0.74);
}
/* Top spine — neutral while answering, the preposition's hue on reveal. */
.colloc-testcard::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
  background: var(--hairline);
  transition: background .35s ease;
}
.colloc-testcard.submitted::before {
  background: var(--prep-accent);
}

/* Prompt */
.prompt-chips {
  position: absolute;
  top: 4px;
  left: 0;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.colloc-prompt {
  padding: 44px 0 26px;
  border-top: 0;
  border-bottom: 1px solid var(--hairline);
}
.colloc-german {
  font-size: clamp(28px, 8vw, 56px);
  font-style: italic;
}
.prompt-english {
  margin-top: 4px;
  font-family: var(--font-body);
  font-size: 18px;
  color: var(--ink-soft);
}
.prompt-hint {
  margin-top: 8px;
  font-family: var(--font-body);
  font-style: italic;
  font-size: 13px;
  color: var(--ink);
}

/* Inputs — no box of their own; they live inside the test card. */
.colloc-inputs {
  border: 0;
  margin: 18px 0 8px;
  padding: 4px 0 0;
  background: transparent;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.colloc-input-row {
  display: grid;
  grid-template-columns: 120px 1fr auto;
  align-items: baseline;
  gap: 12px;
}

.colloc-label {
  font-family: var(--font-body);
  font-style: italic;
  color: var(--ink-soft);
  font-size: 14px;
  white-space: nowrap;
}

.colloc-feedback {
  font-family: var(--font-mono);
  font-size: 12px;
  white-space: nowrap;
}
.ok-mark { color: var(--success); font-weight: 600; }
.row-expected { color: var(--danger); }
.prep-accent-text { color: var(--prep-accent); font-weight: 600; }

/* Case row */
.colloc-case-row {
  align-items: center;
}
.case-buttons {
  display: flex;
  gap: 8px;
}
.case-btn {
  flex: 1;
  min-width: 100px;
  text-align: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: 15px;
  border: 1px solid var(--rule);
  background: transparent;
  color: var(--ink);
  padding: 10px 16px;
  cursor: pointer;
  transition: background 0.1s, color 0.1s;
}
.case-btn:hover:not(:disabled) {
  background: var(--paper-card);
  border-color: var(--ink);
}
.case-selected {
  background: var(--ink) !important;
  color: var(--paper) !important;
  border-color: var(--ink) !important;
}
.case-correct {
  background: var(--success-tint, #d4edda) !important;
  color: var(--success) !important;
  border-color: var(--success) !important;
}
.case-wrong {
  background: var(--danger-tint, #f8d7da) !important;
  color: var(--danger) !important;
  border-color: var(--danger) !important;
}
.colloc-case-feedback {
  align-self: center;
}

/* Reveal block — the one place the preposition colour tints a surface, kept
   small and contained: a coloured spine + a faint wash behind the example. */
.colloc-reveal {
  margin-top: 4px;
  border-left: 3px solid var(--prep-accent);
  background: var(--prep-wash);
  border-radius: 0 3px 3px 0;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.reveal-example {
  font-family: var(--font-display);
  font-style: italic;
  font-size: 17px;
  color: var(--prep-accent);
}
.reveal-notes {
  font-family: var(--font-body);
  font-size: 13px;
  color: var(--ink-soft);
}
.reveal-explanation {
  font-family: var(--font-body);
  font-size: 14.5px;
  line-height: 1.55;
  color: var(--ink);
}
.reveal-why {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--prep-accent);
  margin-right: 8px;
}
.reveal-accepted {
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.02em;
  color: var(--prep-accent);
  font-weight: 600;
}

/* Retype-to-continue row */
.colloc-retype-row { align-items: center; }
.retype-input {
  width: 100%;
  font-family: var(--font-display);
  font-size: 18px;
}
.retype-input.retype-ok {
  color: var(--success);
  border-bottom-color: var(--success);
}

/* Actions */
.colloc-actions {
  margin-top: 24px;
}
.action-buttons {
  display: flex;
  gap: 12px;
}

/* Result list */
.colloc-result-row {
  grid-template-columns: 180px 1fr auto;
  background: var(--prep-wash);
  align-items: center;
  padding: 14px 16px;
}
.result-verdict { justify-self: end; }
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
.result-word-meta {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.06em;
  color: var(--mute);
  margin-top: 2px;
  font-weight: 400;
}
.result-parts {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: baseline;
}
.result-part {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  font-family: var(--font-mono);
  font-size: 13px;
}
.part-label {
  color: var(--ink-soft);
  font-style: italic;
  font-family: var(--font-body);
  font-size: 12px;
}
.ok  { color: var(--success); }
.err { color: var(--danger); }
.tag-success { background: var(--success-tint); color: var(--success); }
.tag-danger  { background: var(--danger-tint);  color: var(--danger); }

/* Mobile — phone-first */
@media (max-width: 720px) {
  /* Word on the left, verdict on the right, prep/case spanning full width below —
     so each row uses the whole strip instead of a single left-hugging column. */
  .colloc-result-row {
    grid-template-columns: 1fr auto;
    grid-template-areas:
      "word verdict"
      "parts parts"
      "expl expl";
    gap: 8px 12px;
    align-items: start;
  }
  .colloc-result-row .result-word { grid-area: word; }
  .colloc-result-row .result-parts { grid-area: parts; }
  .colloc-result-row .result-verdict { grid-area: verdict; align-self: start; }
  .colloc-result-row .result-explanation { grid-area: expl; }
  .result-actions { flex-direction: column; align-items: stretch; }
  .result-actions .btn { justify-content: center; }
}

@media (max-width: 600px) {
  .colloc-testcard { padding: 16px 18px 24px; border-radius: 6px; }
  .colloc-inputs { padding: 4px 0 0; }

  /* Label and the correct-answer feedback share the top line (feedback pinned
     right, using the full width); the input / case buttons span full width below. */
  .colloc-input-row {
    grid-template-columns: 1fr auto;
    grid-template-areas:
      "label feedback"
      "field field";
    gap: 6px 12px;
    align-items: center;
  }
  .colloc-label { grid-area: label; }
  .colloc-input-row > .input-prep,
  .colloc-input-row > .case-buttons { grid-area: field; }
  .colloc-feedback {
    grid-area: feedback;
    justify-self: end;
    text-align: right;
    padding-left: 0;
    font-size: 13px;
  }
  .colloc-case-feedback { align-self: center; }

  .case-buttons {
    width: 100%;
  }
  .case-btn {
    flex: 1;
    padding: 14px 8px;
    font-size: 17px;
  }

  .action-buttons {
    flex-direction: column;
  }
  .action-buttons .btn {
    width: 100%;
    justify-content: center;
  }
  .colloc-actions { margin-top: 16px; }
}
</style>
