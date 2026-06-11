<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { shuffle } from '../../data/pool'
import { checkArticle } from '../../composables/usePrepositionQuiz'
import { checkTranslation } from '../../composables/useNounQuiz'
import { checkSentence, gradeAnswer, buildDrillItem } from '../../composables/useSentenceQuiz'
import { saveQuizRun, type PrepDrillItem } from '../../composables/useQuizHistory'
import type { RemedialQuestion } from '../../composables/usePrepRemedial'
import type { Gender } from '../../db/types'
import { useSettings } from '../../composables/useSettings'
import { resolveAiClient } from '../../composables/localClaude'
import { useToast } from '../../composables/useToast'
import RetryModal from '../../components/RetryModal.vue'
import QuizProgress from '../../components/QuizProgress.vue'

const STASH_KEY = 'gt:lastPrepRemedial'
const router = useRouter()
const { settings, load: loadSettings } = useSettings()
const toast = useToast()

interface Stash { deck: RemedialQuestion[] }

interface Result {
  correct: boolean
  correction: string
  tip?: string
  tags?: string[]
}

const ready = ref(false)
const error = ref<string | null>(null)
const deck = ref<RemedialQuestion[]>([])
const answers = ref<string[]>([])
const results = ref<Map<number, Result>>(new Map())
const items = ref<PrepDrillItem[]>([])
const startedAt = ref(0)
const historySaved = ref(false)

const index = ref(0)
const userInput = ref('')
const phase = ref<'input' | 'checking' | 'graded'>('input')
const finished = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)
const nextBtnRef = ref<HTMLButtonElement | null>(null)

function loadDeck(qs: RemedialQuestion[]) {
  deck.value = qs
  answers.value = qs.map(() => '')
  results.value = new Map()
  items.value = []
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
    if (!raw) { error.value = 'No remedial drill in this session. Go back to setup and build one.'; return }
    const s = JSON.parse(raw) as Stash
    if (!Array.isArray(s.deck) || s.deck.length === 0) {
      error.value = 'The session had no questions. Build a drill from setup.'
      return
    }
    loadDeck(s.deck)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load.'
  } finally {
    ready.value = true
  }
})

const total = computed(() => deck.value.length)
const current = computed<RemedialQuestion | null>(() => deck.value[index.value] ?? null)
const currentResult = computed(() => results.value.get(index.value) ?? null)
const correctCount = computed(() => {
  let n = 0
  for (const r of results.value.values()) if (r.correct) n++
  return n
})
const wrongAnswered = computed(() => {
  let n = 0
  for (const r of results.value.values()) if (!r.correct) n++
  return n
})
const wrongCount = computed(() => total.value - correctCount.value)
const allCorrect = computed(() => finished.value && wrongCount.value === 0)
const isLast = computed(() => index.value + 1 >= total.value)

// Per-format display helpers.
function formatBadge(q: RemedialQuestion): string {
  switch (q.format) {
    case 'case-fill': return 'Case · Artikel'
    case 'noun-gender': return 'Noun · Genus'
    case 'noun-translation': return 'Noun · Übersetzung'
    case 'sentence': return 'Satz'
  }
}

/** The prompt text shown for a question (used live + in the result list). */
function promptText(q: RemedialQuestion): string {
  switch (q.format) {
    case 'case-fill': return q.example.blanked
    case 'noun-gender': return q.noun.german
    case 'noun-translation': return `${q.noun.gender} ${q.noun.german}`
    case 'sentence': return q.sentence.english
  }
}

const isPicker = computed(() => current.value?.format === 'noun-gender')

const genderButtons: Array<{ value: Gender; label: string }> = [
  { value: 'der', label: 'masculine' },
  { value: 'die', label: 'feminine' },
  { value: 'das', label: 'neuter' }
]

function genderBtnClass(g: Gender): string {
  if (phase.value !== 'graded' || current.value?.format !== 'noun-gender') return ''
  const noun = current.value.noun
  if (g === noun.gender) return 'correct'
  if (g === answers.value[index.value]) return 'wrong'
  return 'dim'
}

// Grade + record a locally-checked (non-sentence) question. Sentence questions
// are graded inline in submit() because they await the AI grader.
function record(q: Exclude<RemedialQuestion, { format: 'sentence' }>, correct: boolean, correction: string) {
  const i = index.value
  results.value.set(i, { correct, correction })
  results.value = new Map(results.value)
  phase.value = 'graded'

  const item: PrepDrillItem = q.format === 'case-fill'
    ? { prepId: q.prepId, prepGerman: q.prepGerman, correct, ...(correct ? {} : { tags: ['case'] as PrepDrillItem['tags'] }) }
    : { nounKeys: [q.noun.german], correct, ...(correct ? {} : { tags: ['noun'] as PrepDrillItem['tags'] }) }
  items.value.push(item)
  nextTick(() => nextBtnRef.value?.focus())
}

async function submit() {
  const q = current.value
  if (!q || phase.value !== 'input') return
  // Text-input formats require a non-blank entry.
  if (q.format !== 'noun-gender' && userInput.value.trim().length === 0) return
  const i = index.value

  if (q.format === 'case-fill') {
    answers.value[i] = userInput.value
    const correct = checkArticle(userInput.value, q.example.expectedAnswer, q.example.alternatives ?? [])
    record(q, correct, q.example.expectedAnswer)
  } else if (q.format === 'noun-translation') {
    answers.value[i] = userInput.value
    const correct = checkTranslation(userInput.value, q.noun.english)
    record(q, correct, q.noun.english)
  } else if (q.format === 'sentence') {
    answers.value[i] = userInput.value
    const s = q.sentence
    phase.value = 'checking'
    try {
      const grade = await gradeAnswer(resolveAiClient(settings.value), {
        model: settings.value.model,
        direction: 'en-de',
        english: s.english,
        german: s.german,
        prepGerman: s.prepGerman,
        prepEnglish: s.prepEnglish,
        case: s.case,
        userAnswer: userInput.value
      })
      // Build the drill item from the real grade tags, then record for display.
      items.value.push(buildDrillItem(s, grade.correct, grade.tags))
      const i2 = index.value
      results.value.set(i2, { correct: grade.correct, correction: s.german, tip: grade.tip, tags: grade.tags })
      results.value = new Map(results.value)
      phase.value = 'graded'
      nextTick(() => nextBtnRef.value?.focus())
    } catch {
      const correct = checkSentence(userInput.value, s.german)
      items.value.push(buildDrillItem(s, correct))
      const i2 = index.value
      results.value.set(i2, { correct, correction: s.german })
      results.value = new Map(results.value)
      phase.value = 'graded'
      toast.info('Graded offline', { description: 'The AI grader was unreachable, so this answer was checked by exact match.' })
      nextTick(() => nextBtnRef.value?.focus())
    }
  }
}

function pickGender(g: Gender) {
  const q = current.value
  if (!q || q.format !== 'noun-gender' || phase.value !== 'input') return
  answers.value[index.value] = g
  record(q, g === q.noun.gender, q.noun.gender)
}

function finishQuiz() {
  finished.value = true
  if (!historySaved.value) {
    historySaved.value = true
    const finishedAt = Date.now()
    saveQuizRun({
      type: 'prep-remedial',
      startedAt: new Date(startedAt.value).toISOString(),
      finishedAt: new Date(finishedAt).toISOString(),
      durationMs: finishedAt - startedAt.value,
      count: total.value,
      correct: correctCount.value,
      meta: { sentenceItems: items.value }
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
  if (phase.value === 'input') submit()
  else next()
}

function retryWrong() {
  const wrong = deck.value.filter((_, i) => !results.value.get(i)?.correct)
  if (wrong.length === 0) return
  loadDeck(shuffle(wrong))
}

function newQuiz() { router.push({ name: 'prepositions-remedial' }) }
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
        <div class="breadcrumb">Kapitel IV · Schwachstellen · Auswertung</div>
        <h1 class="section-title">{{ correctCount }} / {{ total }}<em>.</em></h1>
        <p v-if="allCorrect" class="section-subtitle">Alles richtig! 🎉</p>
        <p v-else class="section-subtitle">{{ wrongCount }} to fix. Answers and notes below.</p>
      </div>
    </header>

    <div class="result-rows">
      <div
        v-for="(q, i) in deck"
        :key="i"
        class="result-row"
        :class="{ good: results.get(i)?.correct, bad: !results.get(i)?.correct }"
      >
        <div class="rr-head">
          <span class="rr-mark">{{ results.get(i)?.correct ? '✓' : '✗' }}</span>
          <span class="rr-en">{{ promptText(q) }}</span>
          <span class="rr-tags">
            <span class="tag">{{ formatBadge(q) }}</span>
            <span v-for="t in results.get(i)?.tags" :key="t" class="tag tag-error">{{ t }}</span>
          </span>
        </div>
        <div class="rr-you" :class="{ 'rr-you-empty': !answers[i]?.trim() }">
          <span class="rr-label">You</span> {{ answers[i]?.trim() || '— (blank)' }}
        </div>
        <div v-if="!results.get(i)?.correct" class="rr-ref">
          <span class="rr-label">Answer</span> {{ results.get(i)?.correction }}
        </div>
        <div v-if="!results.get(i)?.correct && results.get(i)?.tip" class="rr-tip">
          <span class="rr-label">Tip</span> {{ results.get(i)?.tip }}
        </div>
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

    <RetryModal :wrong-count="wrongCount" item-label="questions" @retry="retryWrong" />
  </div>

  <!-- ───────────────────── One question per step ───────────────────── -->
  <div v-else-if="current" class="page">
    <div class="quiz-card">
      <div class="quiz-meta">
        <span class="quiz-counter">Frage {{ index + 1 }} · von {{ total }}</span>
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
        <span class="tag format-badge">{{ formatBadge(current) }}</span>

        <!-- case-fill -->
        <template v-if="current.format === 'case-fill'">
          <div class="prep-prompt">
            <span class="prep-prompt-word">{{ current.prepGerman }}</span>
            <span class="prep-prompt-case">{{ current.prepEnglish }}</span>
          </div>
          <div class="en-sentence sentence-sm">{{ current.example.blanked }}</div>
          <div class="en-hint normalcase">{{ current.example.gloss }}</div>
        </template>

        <!-- noun-gender -->
        <template v-else-if="current.format === 'noun-gender'">
          <div class="en-sentence">{{ current.noun.german }}</div>
          <div class="en-hint">Der, die or das?</div>
        </template>

        <!-- noun-translation -->
        <template v-else-if="current.format === 'noun-translation'">
          <div class="en-sentence">{{ current.noun.gender }} {{ current.noun.german }}</div>
          <div class="en-hint">Type the English.</div>
        </template>

        <!-- sentence -->
        <template v-else>
          <div class="en-sentence">{{ current.sentence.english }}</div>
          <div class="en-hint">Translate into German.</div>
        </template>
      </div>

      <!-- der/die/das picker -->
      <div v-if="isPicker && current.format === 'noun-gender'" class="gender-row">
        <button
          v-for="b in genderButtons"
          :key="b.value"
          class="gender-btn"
          :class="genderBtnClass(b.value)"
          :aria-disabled="phase !== 'input'"
          :style="phase !== 'input' ? 'pointer-events: none' : undefined"
          @click="pickGender(b.value)"
        >
          {{ b.value }}
          <span class="sub">{{ b.label }}</span>
        </button>
      </div>

      <!-- text input for all other formats -->
      <form v-else class="prep-input-wrap" @submit.prevent="submit">
        <input
          ref="inputRef"
          class="input prep-input"
          type="text"
          :placeholder="current.format === 'sentence' ? 'Deutsch…' : current.format === 'noun-translation' ? 'English…' : 'Article…'"
          v-model="userInput"
          :readonly="phase !== 'input'"
          autocomplete="off"
          spellcheck="false"
          @keydown.enter="onEnter"
          :style="phase === 'graded' ? {
            color: currentResult?.correct ? 'var(--success)' : 'var(--danger)',
            borderBottomColor: currentResult?.correct ? 'var(--success)' : 'var(--danger)'
          } : undefined"
        />
        <button
          v-if="phase === 'input'"
          type="submit"
          class="btn btn-accent"
          :disabled="userInput.trim().length === 0"
        >Submit</button>
        <button
          v-else-if="phase === 'checking'"
          type="button"
          class="btn btn-accent"
          disabled
        >Checking…</button>
        <button
          v-else
          ref="nextBtnRef"
          type="button"
          class="btn btn-accent"
          @click="next"
        >{{ isLast ? 'Finish quiz' : 'Next' }} <span aria-hidden="true">→</span></button>
      </form>

      <!-- Next button for the picker (no form) -->
      <div v-if="isPicker && phase === 'graded'" class="picker-actions">
        <button
          ref="nextBtnRef"
          type="button"
          class="btn btn-accent"
          @click="next"
          @keyup.enter="next"
        >{{ isLast ? 'Finish quiz' : 'Next' }} <span aria-hidden="true">→</span></button>
      </div>

      <div v-if="phase === 'graded' && currentResult" class="prep-feedback">
        <span
          class="prep-feedback-mark"
          :class="currentResult.correct ? 'prep-feedback-ok' : 'prep-feedback-bad'"
        >{{ currentResult.correct ? '✓ Richtig.' : '✗ Nicht ganz.' }}</span>
        <span v-if="!currentResult.correct" class="prep-feedback-full">{{ currentResult.correction }}</span>
        <span v-if="currentResult.tip" class="prep-feedback-tip">💡 {{ currentResult.tip }}</span>
        <span v-if="currentResult.tags && currentResult.tags.length" class="prep-feedback-tags">
          <span v-for="t in currentResult.tags" :key="t" class="tag tag-error">{{ t }}</span>
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
.format-badge { margin-bottom: 16px; display: inline-block; font-size: 10px; }
.prep-prompt { margin-bottom: 10px; }
.prep-prompt-word {
  font-family: var(--font-display);
  font-weight: 500;
  font-size: 26px;
  color: var(--accent);
  margin-right: 10px;
}
.prep-prompt-case {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--mute);
}
.en-sentence {
  font-family: var(--font-display);
  font-weight: 500;
  font-size: 30px;
  line-height: 1.3;
  letter-spacing: -0.005em;
  color: var(--ink);
}
.en-sentence.sentence-sm { font-size: 24px; }
.en-hint {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--mute);
  margin-top: 14px;
}
.en-hint.normalcase {
  text-transform: none;
  letter-spacing: 0;
  font-family: var(--font-body);
  font-style: italic;
  font-size: 16px;
}

.gender-row { margin-top: 32px; }
.gender-btn.dim { opacity: 0.35; }

.picker-actions { display: flex; justify-content: center; margin-top: 28px; }

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
.prep-feedback-tip {
  font-size: 14px;
  color: var(--ink-soft);
}
.prep-feedback-tags { margin-top: 4px; display: inline-flex; flex-wrap: wrap; gap: 6px; justify-content: center; }
.tag.tag-error { background: var(--danger-tint); color: var(--danger); }

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
.rr-tags { margin-left: auto; display: inline-flex; flex-wrap: wrap; gap: 6px; justify-content: flex-end; }
.rr-you, .rr-ref, .rr-tip { font-family: var(--font-mono); font-size: 14px; margin-top: 6px; color: var(--ink-soft); }
.rr-you-empty { opacity: 0.6; }
.rr-ref { color: var(--ink); }
.rr-label {
  display: inline-block; min-width: 56px;
  font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--mute);
}

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
