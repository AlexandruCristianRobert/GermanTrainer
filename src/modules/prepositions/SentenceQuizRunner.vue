<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { shuffle } from '../../data/pool'
import { useSettings } from '../../composables/useSettings'
import { makeGeminiClient } from '../../composables/useClaude'
import { gradeSentences, type GeneratedSentence, type SentenceVerdict, type GradeInput } from '../../composables/useSentenceQuiz'
import { saveQuizRun } from '../../composables/useQuizHistory'
import RetryModal from '../../components/RetryModal.vue'
import QuizProgress from '../../components/QuizProgress.vue'

const STASH_KEY = 'gt:lastPrepSentenceQuiz'
const router = useRouter()
const { settings, load: loadSettings } = useSettings()

interface Stash {
  sentences: GeneratedSentence[]
  cases?: string[]
  groups?: string[]
  nounsPer?: 1 | 2 | 'mix'
}

const ready = ref(false)
const error = ref<string | null>(null)
const deck = ref<GeneratedSentence[]>([])
const answers = ref<string[]>([])
const verdicts = ref<Map<number, SentenceVerdict>>(new Map())
const startedAt = ref(0)
const historySaved = ref(false)
const meta = ref<{ cases: string[]; groups: string[]; nounsPer: 1 | 2 | 'mix' }>({ cases: [], groups: [], nounsPer: 'mix' })

// Per-card state
const index = ref(0)
const userInput = ref('')
const phase = ref<'input' | 'graded'>('input')
const grading = ref(false)
const finished = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)
const nextBtnRef = ref<HTMLButtonElement | null>(null)

function caseTagClass(c: string): string {
  if (c === 'dative') return 'tag-clay'
  if (c === 'accusative') return 'tag-cobalt'
  if (c === 'genitive') return 'tag-ochre'
  if (c === 'two-way') return 'tag-accent'
  return ''
}
function caseHintLabel(c: string): string {
  return c === 'two-way' ? 'two-way · acc. (motion) or dat. (location)' : c
}

function loadDeck(items: GeneratedSentence[]) {
  deck.value = items
  answers.value = items.map(() => '')
  verdicts.value = new Map()
  index.value = 0
  userInput.value = ''
  phase.value = 'input'
  finished.value = false
  startedAt.value = Date.now()
  nextTick(() => inputRef.value?.focus())
}

onMounted(async () => {
  await loadSettings()
  try {
    const raw = sessionStorage.getItem(STASH_KEY)
    if (!raw) { error.value = 'No generated sentences in this session. Go back to setup and generate a quiz.'; return }
    const s = JSON.parse(raw) as Stash
    if (!Array.isArray(s.sentences) || s.sentences.length === 0) {
      error.value = 'The session had no sentences. Generate a quiz from setup.'
      return
    }
    meta.value = {
      cases: Array.isArray(s.cases) ? s.cases : [],
      groups: Array.isArray(s.groups) ? s.groups : [],
      nounsPer: s.nounsPer ?? 'mix'
    }
    loadDeck(s.sentences)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load.'
  } finally {
    ready.value = true
  }
})

const total = computed(() => deck.value.length)
const current = computed<GeneratedSentence | null>(() => deck.value[index.value] ?? null)
const currentVerdict = computed(() => verdicts.value.get(index.value) ?? null)
const correctCount = computed(() => {
  let n = 0
  for (const v of verdicts.value.values()) if (v.correct) n++
  return n
})
const wrongAnswered = computed(() => {
  let n = 0
  for (const v of verdicts.value.values()) if (!v.correct) n++
  return n
})
const wrongCount = computed(() => total.value - correctCount.value)
const allCorrect = computed(() => finished.value && wrongCount.value === 0)
const isLast = computed(() => index.value + 1 >= total.value)

async function submit() {
  if (!current.value || phase.value !== 'input' || grading.value) return
  if (userInput.value.trim().length === 0) return
  grading.value = true
  const i = index.value
  const s = current.value
  const input: GradeInput = {
    index: i, english: s.english, german: s.german,
    prepGerman: s.prepGerman, case: s.case, answer: userInput.value
  }
  let verdict: SentenceVerdict
  try {
    const client = makeGeminiClient(settings.value.geminiApiKey)
    const result = await gradeSentences(client, settings.value.model, [input])
    verdict = result.get(i) ?? { index: i, correct: false, feedback: '', correction: s.german }
  } catch {
    verdict = { index: i, correct: false, feedback: '', correction: s.german }
  }
  answers.value[i] = userInput.value
  verdicts.value.set(i, verdict)
  verdicts.value = new Map(verdicts.value) // trigger reactivity
  phase.value = 'graded'
  grading.value = false
  nextTick(() => nextBtnRef.value?.focus())
}

function finishQuiz() {
  finished.value = true
  if (!historySaved.value) {
    historySaved.value = true
    const finishedAt = Date.now()
    saveQuizRun({
      type: 'prep-sentence',
      startedAt: new Date(startedAt.value).toISOString(),
      finishedAt: new Date(finishedAt).toISOString(),
      durationMs: finishedAt - startedAt.value,
      count: total.value,
      correct: correctCount.value,
      meta: { sentenceCases: meta.value.cases, sentenceGroups: meta.value.groups, nounsPerSentence: meta.value.nounsPer }
    })
  }
}

function next() {
  if (phase.value !== 'graded') return
  if (isLast.value) { finishQuiz(); return }
  index.value++
  userInput.value = ''
  phase.value = 'input'
  nextTick(() => inputRef.value?.focus())
}

function onEnter(e: KeyboardEvent) {
  e.preventDefault()
  if (grading.value) return
  if (phase.value === 'input') submit()
  else next()
}

function retryWrong() {
  const wrong = deck.value.filter((_, i) => !verdicts.value.get(i)?.correct)
  if (wrong.length === 0) return
  loadDeck(shuffle(wrong))
}

function newQuiz() { router.push({ name: 'prepositions-sentence' }) }
function endQuiz() { router.push({ name: 'prepositions' }) }
</script>

<template>
  <div v-if="!ready" class="page loading-state"><div class="micro-mark">Loading…</div></div>

  <div v-else-if="error" class="page">
    <div class="alert alert-danger"><span class="alert-label">Error</span>{{ error }}</div>
    <button class="btn btn-ghost" type="button" @click="newQuiz">← Back to setup</button>
  </div>

  <!-- ───────────────────────── Result ───────────────────────── -->
  <div v-else-if="finished" class="page result-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Kapitel IV · Satzübersetzung · Auswertung</div>
        <h1 class="section-title">{{ correctCount }} / {{ total }}<em>.</em></h1>
        <p v-if="allCorrect" class="section-subtitle">Alles richtig! 🎉</p>
        <p v-else class="section-subtitle">{{ wrongCount }} to fix. Reference translations and notes below.</p>
      </div>
    </header>

    <div class="result-rows">
      <div
        v-for="(s, i) in deck"
        :key="i"
        class="result-row"
        :class="{ good: verdicts.get(i)?.correct, bad: !verdicts.get(i)?.correct }"
      >
        <div class="rr-head">
          <span class="rr-mark">{{ verdicts.get(i)?.correct ? '✓' : '✗' }}</span>
          <span class="rr-en">{{ s.english }}</span>
          <span class="rr-tags">
            <span class="tag" :class="caseTagClass(s.case)">{{ s.case }}</span>
          </span>
        </div>
        <div class="rr-you" :class="{ 'rr-you-empty': !answers[i]?.trim() }">
          <span class="rr-label">You</span> {{ answers[i]?.trim() || '— (blank)' }}
        </div>
        <div v-if="!verdicts.get(i)?.correct" class="rr-ref">
          <span class="rr-label">Answer</span> {{ verdicts.get(i)?.correction || s.german }}
        </div>
        <div v-if="verdicts.get(i)?.feedback" class="rr-fb">{{ verdicts.get(i)?.feedback }}</div>
      </div>
    </div>

    <div class="setup-actions">
      <button class="btn btn-ghost" type="button" @click="endQuiz">← Prepositions</button>
      <div class="result-cta">
        <button v-if="wrongCount > 0" class="btn btn-quiet" type="button" @click="retryWrong">
          Retry {{ wrongCount }} wrong
        </button>
        <button class="btn btn-accent" type="button" @click="newQuiz">New quiz <span aria-hidden="true">→</span></button>
      </div>
    </div>

    <RetryModal :wrong-count="wrongCount" item-label="sentences" @retry="retryWrong" />
  </div>

  <!-- ───────────────────── One sentence per step ───────────────────── -->
  <div v-else-if="current" class="page">
    <div class="quiz-card">
      <div class="quiz-meta">
        <span class="quiz-counter">Satz {{ index + 1 }} · von {{ total }}</span>
        <button class="btn btn-quiet" type="button" @click="endQuiz">End quiz</button>
      </div>

      <QuizProgress
        class="sentence-progress"
        :correct="correctCount"
        :wrong="wrongAnswered"
        :total="total"
        :current-index="index"
      />

      <div class="prompt-card">
        <div class="en-sentence">{{ current.english }}</div>
        <div class="en-hint">Translate into German.</div>
      </div>

      <form class="prep-input-wrap" @submit.prevent="submit">
        <input
          ref="inputRef"
          class="input prep-input"
          type="text"
          placeholder="Deutsch…"
          v-model="userInput"
          :readonly="phase === 'graded'"
          autocomplete="off"
          spellcheck="false"
          @keydown.enter="onEnter"
          :style="phase === 'graded' ? {
            color: currentVerdict?.correct ? 'var(--success)' : 'var(--danger)',
            borderBottomColor: currentVerdict?.correct ? 'var(--success)' : 'var(--danger)'
          } : undefined"
        />
        <button
          v-if="phase === 'input'"
          type="submit"
          class="btn btn-accent"
          :disabled="userInput.trim().length === 0 || grading"
        >{{ grading ? 'Checking…' : 'Submit' }}</button>
        <button
          v-else
          ref="nextBtnRef"
          type="button"
          class="btn btn-accent"
          @click="next"
        >{{ isLast ? 'Finish quiz' : 'Next' }} <span aria-hidden="true">→</span></button>
      </form>

      <div v-if="phase === 'graded' && currentVerdict" class="prep-feedback">
        <span
          class="prep-feedback-mark"
          :class="currentVerdict.correct ? 'prep-feedback-ok' : 'prep-feedback-bad'"
        >{{ currentVerdict.correct ? '✓ Richtig.' : '✗ Nicht ganz.' }}</span>
        <span class="prep-feedback-full">{{ currentVerdict.correction || current.german }}</span>
        <span v-if="currentVerdict.feedback" class="prep-feedback-note">{{ currentVerdict.feedback }}</span>
        <span class="prep-feedback-tags">
          <span class="tag" :class="caseTagClass(current.case)">{{ current.prepGerman }} · {{ caseHintLabel(current.case) }}</span>
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.loading-state { text-align: center; padding-top: 120px; }

.quiz-card { max-width: 720px; margin: 0 auto; }
.quiz-meta {
  display: flex; justify-content: space-between; align-items: baseline;
  margin-bottom: 16px;
}
.quiz-counter {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--mute);
}
.sentence-progress { margin-bottom: 36px; }

.prompt-card { text-align: center; }
.en-sentence {
  font-family: var(--font-display);
  font-weight: 500;
  font-size: 30px;
  line-height: 1.3;
  letter-spacing: -0.005em;
  color: var(--ink);
}
.en-hint {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--mute);
  margin-top: 14px;
}

.prep-input-wrap {
  display: flex;
  gap: 12px;
  align-items: flex-end;
  margin-top: 36px;
}
.prep-input {
  flex: 1;
  text-align: center;
  font-size: 22px;
  border: 0;
  border-bottom: 2px solid var(--rule);
  padding: 8px 0;
}
.prep-input:focus { border-bottom-color: var(--accent); outline: none; }

.prep-feedback {
  margin-top: 18px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.prep-feedback-mark { font-family: var(--font-display); font-style: italic; font-size: 17px; }
.prep-feedback-ok { color: var(--success); }
.prep-feedback-bad { color: var(--danger); }
.prep-feedback-full {
  font-family: var(--font-display);
  font-size: 18px;
  color: var(--ink);
}
.prep-feedback-note {
  font-family: var(--font-body);
  font-style: italic;
  font-size: 14px;
  color: var(--mute);
}
.prep-feedback-tags { margin-top: 4px; }

/* Result list */
.result-page { max-width: 880px; }
.result-rows { display: flex; flex-direction: column; gap: 12px; margin: 24px 0; }
.result-row {
  border: 1px solid var(--rule);
  border-left: 3px solid var(--rule);
  border-radius: 3px;
  padding: 14px 16px;
}
.result-row.good { border-left-color: var(--sage, #6b8e6b); }
.result-row.bad { border-left-color: var(--clay, #b5654a); }
.rr-head { display: flex; align-items: baseline; gap: 10px; }
.rr-mark { font-family: var(--font-mono); font-weight: 600; }
.result-row.good .rr-mark { color: var(--sage, #6b8e6b); }
.result-row.bad .rr-mark { color: var(--clay, #b5654a); }
.rr-en { flex: 1; font-family: var(--font-body); color: var(--ink); }
.rr-tags { margin-left: auto; }
.rr-you, .rr-ref { font-family: var(--font-mono); font-size: 14px; margin-top: 6px; color: var(--ink-soft); }
.rr-you-empty { opacity: 0.6; }
.rr-ref { color: var(--ink); }
.rr-label {
  display: inline-block; min-width: 56px;
  font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--mute);
}
.rr-fb { margin-top: 6px; font-family: var(--font-body); font-size: 13px; color: var(--mute); font-style: italic; }

.setup-actions {
  display: flex; justify-content: space-between; align-items: center;
  margin-top: 32px; gap: 16px;
}
.result-cta { display: flex; gap: 12px; }
@media (max-width: 720px) {
  .setup-actions { flex-direction: column-reverse; align-items: stretch; }
  .result-cta { flex-direction: column; }
  .setup-actions .btn { justify-content: center; }
}
</style>
