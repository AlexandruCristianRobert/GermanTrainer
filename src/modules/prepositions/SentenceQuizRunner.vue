<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { shuffle } from '../../data/pool'
import { useSettings } from '../../composables/useSettings'
import { useLoading } from '../../composables/useLoading'
import { useToast } from '../../composables/useToast'
import { makeGeminiClient } from '../../composables/useClaude'
import { gradeSentences, type GeneratedSentence, type SentenceVerdict, type GradeInput } from '../../composables/useSentenceQuiz'
import { saveQuizRun } from '../../composables/useQuizHistory'
import RetryModal from '../../components/RetryModal.vue'

const STASH_KEY = 'gt:lastPrepSentenceQuiz'
const router = useRouter()
const { settings, load: loadSettings } = useSettings()
const loading = useLoading()
const toast = useToast()

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
const inputRefs = ref<HTMLInputElement[]>([])
const startedAt = ref(0)
const finished = ref(false)
const verdicts = ref<Map<number, SentenceVerdict>>(new Map())
const historySaved = ref(false)
const meta = ref<{ cases: string[]; groups: string[]; nounsPer: 1 | 2 | 'mix' }>({ cases: [], groups: [], nounsPer: 'mix' })

function caseTagClass(c: string): string {
  if (c === 'dative') return 'tag-clay'
  if (c === 'accusative') return 'tag-cobalt'
  if (c === 'genitive') return 'tag-ochre'
  if (c === 'two-way') return 'tag-accent'
  return ''
}

function loadDeck(items: GeneratedSentence[]) {
  deck.value = items
  answers.value = items.map(() => '')
  verdicts.value = new Map()
  finished.value = false
  startedAt.value = Date.now()
  nextTick(() => inputRefs.value[0]?.focus())
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

function setAnswer(i: number, v: string) { answers.value[i] = v }

const filledCount = computed(() => answers.value.filter(a => a.trim().length > 0).length)
const total = computed(() => deck.value.length)
const correctCount = computed(() => {
  let n = 0
  for (const v of verdicts.value.values()) if (v.correct) n++
  return n
})
const wrongCount = computed(() => total.value - correctCount.value)
const allCorrect = computed(() => finished.value && wrongCount.value === 0)

function onEnter(i: number) {
  if (i + 1 < deck.value.length) inputRefs.value[i + 1]?.focus()
  else document.getElementById('submit-all-btn')?.focus()
}

async function submitAll() {
  if (filledCount.value === 0 || finished.value) return
  const inputs: GradeInput[] = deck.value.map((s, i) => ({
    index: i,
    english: s.english,
    german: s.german,
    prepGerman: s.prepGerman,
    case: s.case,
    answer: answers.value[i] ?? ''
  }))
  try {
    const result = await loading.wrap(
      async () => {
        const client = makeGeminiClient(settings.value.geminiApiKey)
        return await gradeSentences(client, settings.value.model, inputs)
      },
      { title: 'Grading your translations', subtitle: 'The AI is checking meaning, preposition and case — a few seconds.' }
    )
    verdicts.value = result
  } catch (e) {
    toast.error('Grading failed', { description: e instanceof Error ? e.message : String(e) })
    return
  }

  finished.value = true

  // Save to history once — retry rounds are practice only.
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

  <!-- ───────────────────────── Quiz sheet ───────────────────────── -->
  <div v-else class="page">
    <div class="test-sheet">
      <header class="section-header" style="margin-bottom: 0">
        <div>
          <div class="breadcrumb">Kapitel IV · Satzübersetzung · {{ total }} Sätze</div>
          <h1 class="section-title">Übersetzung<em>.</em></h1>
          <p class="section-subtitle">
            Read the English sentence and type the German translation. Press Enter to jump to the next line.
            <em class="hint-aside">Each sentence hides a preposition — get the case right.</em>
          </p>
        </div>
        <button class="btn btn-quiet" type="button" @click="endQuiz">End quiz</button>
      </header>

      <div class="test-sheet-header">
        <span class="filled-count"><strong>{{ filledCount }}</strong> · von {{ total }} ausgefüllt</span>
        <div class="quiz-progress-bar test-progress">
          <div v-for="(_, i) in deck" :key="i" class="pip" :class="{ current: !!answers[i]?.trim() }" />
        </div>
      </div>

      <div class="test-rows">
        <div v-for="(s, i) in deck" :key="i" class="test-row">
          <div class="test-num"><strong>{{ String(i + 1).padStart(2, '0') }}.</strong></div>
          <div class="test-content">
            <div class="test-prompt-row">
              <span class="test-verb">{{ s.english }}</span>
            </div>
            <input
              :ref="(el) => { if (el) inputRefs[i] = el as HTMLInputElement }"
              class="test-input"
              type="text"
              placeholder="Deutsch…"
              :value="answers[i]"
              @input="setAnswer(i, ($event.target as HTMLInputElement).value)"
              @keydown.enter.prevent="onEnter(i)"
              autocomplete="off"
              spellcheck="false"
            />
          </div>
        </div>
      </div>

      <div class="test-sheet-footer">
        <span class="filled-count"><strong>{{ filledCount }}</strong> filled · {{ total - filledCount }} remaining</span>
        <button
          id="submit-all-btn"
          class="btn btn-accent btn-meta"
          type="button"
          :disabled="filledCount === 0"
          @click="submitAll"
        >
          <span class="bm-main">Submit all <span aria-hidden="true">→</span></span>
          <span class="bm-sub">{{ total }} sentences</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.loading-state { text-align: center; padding-top: 120px; }
.test-progress { flex: 1; max-width: 280px; margin: 0 0 0 24px; }

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
