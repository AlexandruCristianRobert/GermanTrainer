<script setup lang="ts">
import { computed, nextTick, onMounted, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useVerbs } from '../../composables/useVerbs'
import { useStammformenQuiz } from '../../composables/useStammformenQuiz'
import { csv } from '../../composables/quizQuery'
import { shuffle } from '../../data/pool'
import { useBreakpoint } from '../../composables/useBreakpoint'
import RetryModal from '../../components/RetryModal.vue'
import {
  VERB_LEVELS, VERB_TYPES,
  type Verb, type VerbLevel, type VerbType,
} from '../../data/verbs'

const route  = useRoute()
const router = useRouter()
const { sample } = useVerbs()
const { isMobile } = useBreakpoint()

// ── quiz state ──────────────────────────────────────────────────────────────
const loading = ref(true)
const error   = ref<string | null>(null)
const ready   = ref(false)

type Quiz = ReturnType<typeof useStammformenQuiz>
const quiz = shallowRef<Quiz | null>(null)

// ── per-card input state ────────────────────────────────────────────────────
const inputPraeteritum = ref('')
const inputPartizip    = ref('')
const selectedAux      = ref<'haben' | 'sein' | null>(null)
const submitted        = ref(false)

// ── retry modal state ───────────────────────────────────────────────────────
const showRetryModal = ref(false)
const dismissed      = ref(false)

// ── refs for focus ──────────────────────────────────────────────────────────
const praeteritumRef = ref<HTMLInputElement | null>(null)

// ── mount ───────────────────────────────────────────────────────────────────
onMounted(() => {
  const count = Math.max(1, parseInt((route.query.count as string) ?? '10', 10) || 10)
  const levels = csv<VerbLevel>(route.query.levels, VERB_LEVELS)
  const types  = csv<VerbType>(route.query.types, VERB_TYPES)

  try {
    const verbs: Verb[] = sample(count, { levels, types })
    if (verbs.length === 0) {
      error.value = 'Nothing to drill — adjust your filters.'
    } else {
      quiz.value = useStammformenQuiz(verbs)
      ready.value = true
      resetInputs()
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load.'
  } finally {
    loading.value = false
  }
})

function resetInputs() {
  inputPraeteritum.value = ''
  inputPartizip.value    = ''
  selectedAux.value      = null
  submitted.value        = false
}

// ── computed from quiz ───────────────────────────────────────────────────────
const current       = computed(() => (ready.value, quiz.value?.current.value ?? null))
const finished      = computed(() => (ready.value, quiz.value?.finished.value ?? false))
const total         = computed(() => (ready.value, quiz.value?.total.value ?? 0))
const questionIndex = computed(() => (ready.value, quiz.value?.currentIndex.value ?? 0))
const score         = computed(() => (ready.value, quiz.value?.score.value ?? 0))
const wrongVerbs    = computed(() => (ready.value, quiz.value?.wrongVerbs.value ?? []))

// pips
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

// ── actions ──────────────────────────────────────────────────────────────────
function submit() {
  if (!quiz.value || submitted.value) return
  if (!selectedAux.value) return // require aux selection
  quiz.value.submit({
    praeteritum: inputPraeteritum.value,
    partizip:    inputPartizip.value,
    aux:         selectedAux.value,
  })
  submitted.value = true
}

function next() {
  if (!quiz.value) return
  quiz.value.advance()
  resetInputs()
  nextTick(() => praeteritumRef.value?.focus())
}

// When quiz finishes — show retry modal if there are wrong verbs
function onFinished() {
  if (wrongVerbs.value.length > 0 && !dismissed.value) {
    showRetryModal.value = true
  }
}

watch(finished, (now) => {
  if (now && ready.value) onFinished()
})

function retryWrong() {
  showRetryModal.value = false
  if (!quiz.value) return
  const wrong = wrongVerbs.value
  if (wrong.length === 0) return
  quiz.value = useStammformenQuiz(shuffle(wrong))
  resetInputs()
  dismissed.value = false
}

function dismissRetry() {
  showRetryModal.value = false
  dismissed.value = true
}

function restart() {
  router.push({ name: 'verbs-stammformen' })
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
        <div class="breadcrumb">Auswertung · Stammformen</div>
        <div class="result-score">{{ score }} / {{ total }} correct</div>
        <p class="section-subtitle">Principal parts drill complete.</p>
      </div>
      <div class="result-actions">
        <button class="btn btn-ghost" @click="router.push({ name: 'verbs' })">← Verben</button>
        <button class="btn btn-accent" @click="restart">Start another drill <span aria-hidden="true">→</span></button>
      </div>
    </header>

    <div class="result-list">
      <div
        v-for="(q, i) in questions"
        :key="i"
        class="result-row stammf-result-row"
      >
        <div class="result-verb">
          <div class="german">{{ q.verb.german }}</div>
          <div class="result-verb-meta">{{ q.verb.english }}</div>
        </div>
        <div class="result-parts">
          <span class="result-part">
            <span class="part-label">Prät.</span>
            <strong :class="q.praeteritumOk ? 'ok' : 'err'">
              {{ q.expected.praeteritum }}
            </strong>
          </span>
          <span class="result-part">
            <span class="part-label">Part. II</span>
            <strong :class="q.partizipOk ? 'ok' : 'err'">
              {{ q.expected.partizip2 }}
            </strong>
          </span>
          <span class="result-part">
            <span class="part-label">Aux.</span>
            <strong :class="q.auxOk ? 'ok' : 'err'">
              {{ q.expected.aux }}
            </strong>
          </span>
        </div>
        <div>
          <span class="tag" :class="q.isCorrect ? 'tag-success' : 'tag-danger'">
            {{ q.isCorrect ? '✓' : '✗' }}
          </span>
        </div>
      </div>
    </div>

    <RetryModal
      v-if="wrongVerbs.length > 0"
      :wrong-count="wrongVerbs.length"
      item-label="verbs"
      @retry="retryWrong"
      @dismiss="dismissRetry"
    />
  </div>

  <!-- Active quiz card -->
  <div v-else-if="current && ready" class="page">
    <div class="stammformen-stage">
      <div class="quiz-meta">
        <span class="quiz-counter">Card {{ questionIndex + 1 }} · of {{ total }}</span>
      </div>

      <div class="quiz-progress-bar">
        <div v-for="(cls, i) in pips" :key="i" class="pip" :class="cls" />
      </div>

      <!-- Prompt card -->
      <div class="prompt-card stammf-prompt">
        <div class="prompt-chips">
          <span class="tag" :class="current.verb.type === 'irregular' ? 'tag-clay' : current.verb.type === 'separable' ? 'tag-cobalt' : current.verb.type === 'modal' ? 'tag-ochre' : current.verb.type === 'mixed' ? 'tag-accent' : ''">
            {{ current.verb.type }}
          </span>
          <span class="tag">{{ current.verb.level }}</span>
        </div>
        <div class="prompt-german stammf-german">{{ current.verb.german }}</div>
        <div class="prompt-english">{{ current.verb.english }}</div>
      </div>

      <!-- Input area -->
      <div class="stammf-inputs" :class="{ submitted }">
        <!-- Präteritum -->
        <div class="stammf-input-row">
          <label class="stammf-label">er/sie/es (Prät.)</label>
          <input
            ref="praeteritumRef"
            v-model="inputPraeteritum"
            class="input input-praeteritum"
            type="text"
            placeholder="Präteritum"
            :readonly="submitted"
            autocomplete="off"
            spellcheck="false"
            :style="submitted ? {
              color: current.praeteritumOk ? 'var(--success)' : 'var(--danger)',
              borderBottomColor: current.praeteritumOk ? 'var(--success)' : 'var(--danger)'
            } : undefined"
            @keyup.enter="submitted ? next() : submit()"
          />
          <div v-if="submitted" class="stammf-feedback">
            <span v-if="current.praeteritumOk" class="ok-mark">✓</span>
            <span v-else class="row-expected">→ <strong>{{ current.expected.praeteritum }}</strong></span>
          </div>
        </div>

        <!-- Partizip II -->
        <div class="stammf-input-row">
          <label class="stammf-label">Partizip II</label>
          <input
            v-model="inputPartizip"
            class="input input-partizip"
            type="text"
            placeholder="Partizip II"
            :readonly="submitted"
            autocomplete="off"
            spellcheck="false"
            :style="submitted ? {
              color: current.partizipOk ? 'var(--success)' : 'var(--danger)',
              borderBottomColor: current.partizipOk ? 'var(--success)' : 'var(--danger)'
            } : undefined"
            @keyup.enter="submitted ? next() : submit()"
          />
          <div v-if="submitted" class="stammf-feedback">
            <span v-if="current.partizipOk" class="ok-mark">✓</span>
            <span v-else class="row-expected">→ <strong>{{ current.expected.partizip2 }}</strong></span>
          </div>
        </div>

        <!-- Auxiliary buttons -->
        <div class="stammf-input-row stammf-aux-row">
          <label class="stammf-label">Auxiliary</label>
          <div class="aux-buttons">
            <button
              class="btn aux-btn"
              :class="{
                'aux-selected': selectedAux === 'haben',
                'aux-correct': submitted && current.expected.aux === 'haben',
                'aux-wrong': submitted && current.expected.aux !== 'haben' && selectedAux === 'haben',
              }"
              :disabled="submitted"
              type="button"
              @click="selectedAux = 'haben'"
            >haben</button>
            <button
              class="btn aux-btn"
              :class="{
                'aux-selected': selectedAux === 'sein',
                'aux-correct': submitted && current.expected.aux === 'sein',
                'aux-wrong': submitted && current.expected.aux !== 'sein' && selectedAux === 'sein',
              }"
              :disabled="submitted"
              type="button"
              @click="selectedAux = 'sein'"
            >sein</button>
          </div>
          <div v-if="submitted" class="stammf-feedback stammf-aux-feedback">
            <span v-if="current.auxOk" class="ok-mark">✓</span>
            <span v-else class="row-expected">→ <strong>{{ current.expected.aux }}</strong></span>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="quiz-actions stammf-actions">
        <span v-if="!submitted && isMobile" class="micro-mark">Tap Submit when ready</span>
        <span v-if="!submitted && !isMobile" class="micro-mark">Press <span class="kbd">Enter</span> in a field to submit</span>
        <div class="action-buttons">
          <button
            v-if="!submitted"
            class="btn btn-accent"
            type="button"
            :disabled="!selectedAux"
            @click="submit"
          >
            Submit <span aria-hidden="true">→</span>
          </button>
          <button
            v-else
            class="btn btn-accent"
            type="button"
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

.stammformen-stage {
  max-width: 680px;
  margin: 0 auto;
}

/* Prompt card */
.prompt-chips {
  position: absolute;
  top: 16px;
  left: 0;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.stammf-prompt {
  padding: 56px 0 32px;
}
.stammf-german {
  font-size: 64px;
  font-style: italic;
}
.prompt-english {
  margin-top: 4px;
  font-family: var(--font-body);
  font-size: 18px;
  color: var(--ink-soft);
}

@media (max-width: 720px) {
  .stammf-german { font-size: 40px; }
}
@media (max-width: 600px) {
  .stammf-german { font-size: 32px; }
}

/* Inputs */
.stammf-inputs {
  border: 1px solid var(--rule);
  border-radius: 2px;
  margin: 24px 0 16px;
  padding: 18px 22px;
  background: var(--paper-card);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stammf-input-row {
  display: grid;
  grid-template-columns: 140px 1fr auto;
  align-items: baseline;
  gap: 12px;
}

.stammf-label {
  font-family: var(--font-body);
  font-style: italic;
  color: var(--ink-soft);
  font-size: 14px;
  white-space: nowrap;
}

.stammf-feedback {
  font-family: var(--font-mono);
  font-size: 12px;
  white-space: nowrap;
}
.ok-mark { color: var(--success); font-weight: 600; }
.row-expected { color: var(--danger); }

/* Auxiliary row */
.stammf-aux-row {
  align-items: center;
}
.aux-buttons {
  display: flex;
  gap: 8px;
}
.aux-btn {
  flex: 1;
  min-width: 90px;
  text-align: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: 15px;
  border: 1px solid var(--rule);
  background: transparent;
  color: var(--ink);
  padding: 8px 16px;
  cursor: pointer;
  transition: background 0.1s, color 0.1s;
}
.aux-btn:hover:not(:disabled) {
  background: var(--paper-card);
  border-color: var(--ink);
}
.aux-selected {
  background: var(--ink) !important;
  color: var(--paper) !important;
  border-color: var(--ink) !important;
}
.aux-correct {
  background: var(--success-tint, #d4edda) !important;
  color: var(--success) !important;
  border-color: var(--success) !important;
}
.aux-wrong {
  background: var(--danger-tint, #f8d7da) !important;
  color: var(--danger) !important;
  border-color: var(--danger) !important;
}

.stammf-aux-feedback {
  align-self: center;
}

/* Actions */
.stammf-actions {
  margin-top: 24px;
}
.action-buttons {
  display: flex;
  gap: 12px;
}

/* Result list */
.stammf-result-row {
  grid-template-columns: 180px 1fr auto;
}
.result-verb-meta {
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
  .stammf-result-row { grid-template-columns: 1fr; gap: 4px; }
  .result-actions { flex-direction: column; align-items: stretch; }
  .result-actions .btn { justify-content: center; }
}

@media (max-width: 600px) {
  .stammf-inputs { padding: 14px 12px; }

  /* Stack each input row vertically */
  .stammf-input-row {
    grid-template-columns: 1fr;
    gap: 4px;
  }
  .stammf-feedback {
    padding-left: 0;
  }

  /* Make aux buttons full-width side by side */
  .aux-buttons {
    width: 100%;
  }
  .aux-btn {
    flex: 1;
    padding: 12px 8px;
    font-size: 17px;
  }

  /* Full-width action buttons */
  .action-buttons {
    flex-direction: column;
  }
  .action-buttons .btn {
    width: 100%;
    justify-content: center;
  }
  .stammf-actions { margin-top: 16px; }
}
</style>
