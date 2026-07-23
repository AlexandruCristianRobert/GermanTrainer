<script setup lang="ts">
import { computed, nextTick, onMounted, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDaFormationQuiz, buildFormationItems, type FormationChoice } from '../../composables/useDaFormationQuiz'
import { saveQuizRun } from '../../composables/useQuizHistory'
import { shuffle } from '../../data/pool'
import { useBreakpoint } from '../../composables/useBreakpoint'
import RetryModal from '../../components/RetryModal.vue'

// The natural anaphor per no-compound trap — "Präposition + Pronomen" would
// mislead for the genitive/temporal traps (*wegen es; the anaphor is deswegen).
const TRAP_WORKAROUND: Record<string, string> = {
  ohne: 'ohne es',
  seit: 'seitdem',
  außer: 'außer diesem',
  gegenüber: 'dem gegenüber',
  während: 'währenddessen',
  wegen: 'deswegen',
  trotz: 'trotzdem',
  statt: 'stattdessen',
}

const CHOICE_BUTTONS: { value: FormationChoice; label: string }[] = [
  { value: 'da',   label: 'da-' },
  { value: 'dar',  label: 'dar-' },
  { value: 'none', label: 'keine Bildung' },
]
const CHOICE_VALUES = CHOICE_BUTTONS.map(b => b.value)

const route = useRoute()
const router = useRouter()
const { isMobile } = useBreakpoint()

// ── quiz state ──────────────────────────────────────────────────────────────
const loading = ref(true)
const error = ref<string | null>(null)
const ready = ref(false)

type Quiz = ReturnType<typeof useDaFormationQuiz>
const quiz = shallowRef<Quiz | null>(null)
const startedAtMs = ref(0)
const historySaved = ref(false)

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
  const includeTraps = (route.query.traps as string) !== '0'

  try {
    const items = shuffle(buildFormationItems(includeTraps), count)
    if (items.length === 0) {
      error.value = 'Nothing to drill — adjust your filters.'
    } else {
      quiz.value = useDaFormationQuiz(items)
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
const current = computed(() => ready.value ? quiz.value?.current.value ?? null : null)
const finished = computed(() => ready.value ? quiz.value?.finished.value ?? false : false)
const total = computed(() => ready.value ? quiz.value?.total.value ?? 0 : 0)
const questionIndex = computed(() => ready.value ? quiz.value?.currentIndex.value ?? 0 : 0)
const score = computed(() => ready.value ? quiz.value?.score.value ?? 0 : 0)
const wrongItems = computed(() => ready.value ? quiz.value?.wrongItems.value ?? [] : [])
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

// ── actions ──────────────────────────────────────────────────────────────────
function pick(c: FormationChoice) {
  if (!quiz.value || submitted.value) return
  quiz.value.pick(c)
  submitted.value = true
  nextTick(() => nextBtnRef.value?.focus())
}

function next() {
  if (!quiz.value) return
  quiz.value.advance()
  submitted.value = false
  if (!quiz.value.finished.value) nextTick(() => cardRef.value?.focus())
}

// Keyboard: 1–3 to pick a choice; Enter to advance after a pick
function onKey(e: KeyboardEvent) {
  if (e.altKey || e.ctrlKey || e.metaKey) return
  if (!current.value) return
  if (e.key === 'Enter') {
    if (submitted.value) { e.preventDefault(); next() }
    return
  }
  if (submitted.value) return
  const idx = e.key.charCodeAt(0) - '1'.charCodeAt(0)
  if (idx < 0 || idx >= CHOICE_VALUES.length) return
  e.preventDefault()
  pick(CHOICE_VALUES[idx])
}

// Record the main round once; retry rounds are practice, never a Run (ADR-0010).
function recordRun() {
  if (historySaved.value || !quiz.value || quiz.value.total.value === 0) return
  historySaved.value = true
  const finishedAt = Date.now()
  saveQuizRun({
    type: 'dac-formation',
    startedAt: new Date(startedAtMs.value).toISOString(),
    finishedAt: new Date(finishedAt).toISOString(),
    durationMs: finishedAt - startedAtMs.value,
    count: quiz.value.total.value,
    correct: quiz.value.score.value,
    meta: {},
  })
}

// Record the main round finish, then show retry modal when quiz finishes with wrong items
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
  const wrong = wrongItems.value
  if (wrong.length === 0) return
  quiz.value = useDaFormationQuiz(shuffle(wrong, wrong.length))
  submitted.value = false
  dismissed.value = false
  nextTick(() => cardRef.value?.focus())
}

function dismissRetry() {
  showRetryModal.value = false
  dismissed.value = true
}

function restart() {
  router.push({ name: 'dacompounds-formation' })
}

function choiceLabel(c: FormationChoice): string {
  const btn = CHOICE_BUTTONS.find(b => b.value === c)
  return btn ? btn.label : c
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
        <div class="breadcrumb">Auswertung · Bildung</div>
        <div class="result-score">{{ score }} / {{ total }} correct</div>
        <p class="section-subtitle">Formation speed round complete.</p>
      </div>
      <div class="result-actions">
        <button class="btn btn-ghost" @click="router.push({ name: 'dacompounds' })">← Da-Compounds</button>
        <button class="btn btn-accent" @click="restart">Start another drill <span aria-hidden="true">→</span></button>
      </div>
    </header>

    <div class="result-list">
      <div
        v-for="(q, i) in questions"
        :key="i"
        class="result-row fr-result-row"
      >
        <div class="result-verb">
          <div class="german">{{ q.preposition }}</div>
        </div>
        <div class="result-answer">
          <span class="result-picked" :class="q.isCorrect ? 'ok' : 'err'">
            {{ q.picked ? choiceLabel(q.picked) : '—' }}
          </span>
          <span v-if="!q.isCorrect" class="result-correct">
            → <strong>{{ choiceLabel(q.expected) }}</strong>
          </span>
          <span v-if="q.da" class="result-notes">{{ q.da }} · {{ q.wo }}</span>
        </div>
        <div>
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
      :wrong-count="wrongItems.length"
      item-label="prepositions"
      @retry="retryWrong"
      @dismiss="dismissRetry"
    />
  </div>

  <!-- Active quiz card -->
  <div v-else-if="current && ready" class="page">
    <div class="fr-stage" ref="cardRef" tabindex="-1">
      <div class="quiz-meta">
        <span class="quiz-counter">Präposition {{ questionIndex + 1 }} · von {{ total }}</span>
        <button class="btn btn-quiet" type="button" @click="router.push({ name: 'dacompounds-formation' })">End drill</button>
      </div>

      <div class="quiz-progress-bar">
        <div v-for="(cls, n) in pips" :key="n" class="pip" :class="cls" />
      </div>

      <!-- Prompt card -->
      <div class="fr-prompt">
        <div class="fr-preposition">{{ current.preposition }}</div>
        <div class="fr-ask">da-, dar- oder keine Bildung<em>?</em></div>
      </div>

      <!-- Three fixed choice buttons -->
      <div class="fr-picker-grid">
        <button
          v-for="(btn, bi) in CHOICE_BUTTONS"
          :key="btn.value"
          type="button"
          class="fr-choice"
          :class="{
            selected: current.picked === btn.value,
            correct: submitted && current.expected === btn.value,
            wrong: submitted && current.picked === btn.value && current.expected !== btn.value,
            disabled: submitted,
          }"
          :disabled="submitted"
          @click="pick(btn.value)"
        >
          <span class="fr-choice-key">{{ bi + 1 }}</span>
          <span class="fr-choice-label">{{ btn.label }}</span>
        </button>
      </div>

      <!-- Feedback after pick -->
      <div v-if="submitted" class="fr-feedback">
        <template v-if="current.da">
          <span v-if="currentIsCorrect" class="fr-feedback-mark fr-feedback-ok">
            ✓ Richtig — <strong>{{ current.da }} · {{ current.wo }}</strong>
          </span>
          <span v-else class="fr-feedback-mark fr-feedback-bad">
            ✗ Korrekt: <strong>{{ current.da }} · {{ current.wo }}</strong>
          </span>
        </template>
        <template v-else>
          <span v-if="currentIsCorrect" class="fr-feedback-mark fr-feedback-ok">
            ✓ Richtig — bildet keine Zusammensetzung
          </span>
          <span v-else class="fr-feedback-mark fr-feedback-bad">
            ✗ Korrekt: bildet keine Zusammensetzung
          </span>
          <p class="fr-notes">Stattdessen: {{ TRAP_WORKAROUND[current.preposition] ?? 'Präposition + Pronomen' }}</p>
        </template>
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

      <div class="fr-hint micro-mark">
        <template v-if="!submitted && !isMobile">
          Press <span class="kbd">1</span>–<span class="kbd">3</span> to choose
        </template>
        <template v-else-if="submitted">
          Press <span class="kbd">Enter</span> to {{ questionIndex + 1 >= total ? 'finish' : 'continue' }}
        </template>
        <template v-else>Tap a choice button</template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.loading-state { text-align: center; padding-top: 120px; }
.result-page { max-width: 880px; }
.result-actions { display: flex; gap: 12px; flex-wrap: wrap; }

.fr-stage {
  max-width: 640px;
  margin: 0 auto;
  outline: none;
}
.fr-stage:focus-visible { outline: 1px dotted var(--rule); outline-offset: 8px; }

.fr-prompt {
  text-align: center;
  padding: 20px 0 8px;
}
.fr-preposition {
  font-family: var(--font-display);
  font-weight: 500;
  font-size: clamp(40px, 14vw, 68px);
  color: var(--accent);
  line-height: 1.1;
}
.fr-ask {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--mute);
  margin: 12px 0 24px;
}
.fr-ask em { font-style: normal; color: var(--accent); }

/* Three-button grid — one column, thumb-friendly on phones */
.fr-picker-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.fr-choice {
  background: var(--paper-card);
  border: 1px solid var(--rule);
  border-radius: 4px;
  padding: 18px 14px;
  min-height: 56px;
  cursor: pointer;
  transition: all .15s;
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-mono);
  font-size: 15px;
  letter-spacing: 0.06em;
  color: var(--ink-soft);
  text-align: left;
}
.fr-choice:not(:disabled):hover {
  border-color: var(--accent);
  color: var(--ink);
  background: var(--accent-wash);
}
.fr-choice.selected { border-color: var(--accent); color: var(--accent); }
.fr-choice.correct  { border-color: var(--success); color: var(--success); background: var(--success-tint); }
.fr-choice.wrong    { border-color: var(--danger);  color: var(--danger);  background: var(--danger-tint); }
.fr-choice.disabled { cursor: default; }

.fr-choice-key {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 4px;
  font-size: 11px;
  letter-spacing: 0;
  color: var(--mute);
  border: 1px solid var(--hairline);
  border-radius: 2px;
  background: var(--paper);
  flex-shrink: 0;
}
.fr-choice.correct .fr-choice-key { border-color: var(--success); color: var(--success); }
.fr-choice.wrong   .fr-choice-key { border-color: var(--danger);  color: var(--danger); }

.fr-feedback {
  margin-top: 24px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.fr-feedback-mark {
  font-family: var(--font-display);
  font-style: italic;
  font-size: 18px;
}
.fr-feedback-ok  { color: var(--success); }
.fr-feedback-bad { color: var(--danger); }
.fr-notes {
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--ink-soft);
  font-style: italic;
  margin: 0;
}

.fr-hint { margin-top: 20px; text-align: center; color: var(--mute); }

/* Result list */
.fr-result-row { grid-template-columns: 120px 1fr auto; }
.result-answer {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
  font-family: var(--font-mono);
  font-size: 13px;
}
.result-correct { color: var(--success); }
.result-notes {
  font-family: var(--font-body);
  font-style: italic;
  font-size: 12px;
  color: var(--ink-soft);
}
.ok  { color: var(--success); }
.err { color: var(--danger); }
.tag-success { background: var(--success-tint); color: var(--success); }
.tag-danger  { background: var(--danger-tint);  color: var(--danger); }

/* Phone-first */
@media (max-width: 720px) {
  .fr-result-row { grid-template-columns: 1fr; gap: 4px; }
  .result-actions { flex-direction: column; align-items: stretch; }
  .result-actions .btn { justify-content: center; }
}
</style>
