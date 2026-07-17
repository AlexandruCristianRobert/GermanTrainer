<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { saveQuizRun } from '../../composables/useQuizHistory'
import { usePagination } from '../../composables/usePagination'
import Pagination from '../../components/Pagination.vue'
import type { MultiArticleEntry, Difficulty } from '../../data/declension-ai'
import { CASE_LABEL_DE, DECL_CASES, type DeclCase } from '../../data/declension'
import { planRampBatches, generateProgressively } from '../../composables/useProgressiveGenerator'
import { generateDeclensionArticles } from '../../composables/useDeclensionAI'
import { useSettings } from '../../composables/useSettings'
import { resolveAiClient } from '../../composables/localClaude'
import { useSound } from '../../composables/useSound'

interface Stash {
  aiCount: number
  difficulty: Difficulty
  focusCases?: string[]
  model?: string
}

interface BlankAnswer {
  userInput: string
  isCorrect: boolean | null
}

interface QuestionState {
  entry: MultiArticleEntry
  blanks: BlankAnswer[]
  submitted: boolean
  correctCount: number
}

const router = useRouter()
const { settings, load: loadSettings } = useSettings()
const sound = useSound()
let chimed = false

const error = ref<string | null>(null)
const startedAt = ref<number>(0)
const historySaved = ref(false)

const difficulty = ref<Difficulty>('medium')
const expected = ref(0)              // requested N
const questions = ref<QuestionState[]>([])  // arrival order
const generationDone = ref(false)
const currentIndex = ref(0)
const awaitingNext = ref(false)      // outran generation

const ready = computed(() => questions.value.length > 0 || generationDone.value || error.value !== null)
const current = computed(() => questions.value[currentIndex.value] ?? null)
const finished = ref(false)
const total = computed(() => questions.value.length)

const totalBlanks = computed(() => questions.value.reduce((s, q) => s + q.blanks.length, 0))
const correctBlanks = computed(() => questions.value.reduce((s, q) => s + q.correctCount, 0))
const wrongBlanks = computed(() => totalBlanks.value - correctBlanks.value)
const pctScore = computed(() => totalBlanks.value === 0 ? 0 : Math.round((correctBlanks.value / totalBlanks.value) * 100))
const isLastGenerated = computed(() => currentIndex.value + 1 >= questions.value.length)

onMounted(async () => {
  await loadSettings()
  let s: Stash | null = null
  try {
    const raw = sessionStorage.getItem('gt:lastDeclArticleAI')
    if (!raw) {
      error.value = 'No AI sentences in session. Go back to Setup and run Generate.'
      return
    }
    s = JSON.parse(raw) as Stash
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load.'
    return
  }
  if (!s || typeof s.aiCount !== 'number' || s.aiCount <= 0) {
    error.value = 'AI session contained no request. Go back to Setup and run Generate.'
    return
  }

  expected.value = s.aiCount
  difficulty.value = s.difficulty ?? 'medium'
  startedAt.value = Date.now()

  const model = s.model ?? settings.value.model
  const focusedCases = Array.isArray(s.focusCases)
    ? (s.focusCases.filter(c => (DECL_CASES as readonly string[]).includes(c)) as DeclCase[])
    : undefined
  const focusArg = focusedCases && focusedCases.length > 0 && focusedCases.length < DECL_CASES.length
    ? focusedCases
    : undefined

  const client = resolveAiClient(settings.value)
  // Stream by count: first batch of 5 for a fast first paint, then batches of
  // 10. Sequential (concurrency 1) so cross-batch dedup stays deterministic.
  const units = Array.from({ length: expected.value }, (_, i) => i)
  const batches = planRampBatches(units, [5], 10)
  const seen = new Set<string>()

  generateProgressively<number, MultiArticleEntry>({
    batches,
    runBatch: async (chunk) => {
      const r = await generateDeclensionArticles(client, {
        model,
        count: chunk.length,
        difficulty: difficulty.value,
        focusedCases: focusArg,
        maxRetries: 1
      })
      return r.entries
    },
    onResults: (entries) => {
      let added = 0
      for (const e of entries) {
        const key = e.sentence.trim().toLowerCase()
        if (seen.has(key)) continue
        seen.add(key)
        questions.value.push({
          entry: e,
          blanks: e.blanks.map(() => ({ userInput: '', isCorrect: null })),
          submitted: false,
          correctCount: 0
        })
        added++
      }
      if (!chimed && questions.value.length > 0) { chimed = true; sound.playReady() }
      if (awaitingNext.value) tryAdvance()
      if (added > 0 && questions.value.length === added) nextTick(() => focusFirstBlank())
    },
    concurrency: 1
  }).finally(() => {
    generationDone.value = true
    if (questions.value.length === 0) error.value = 'The model returned no usable sentences. Go back and try again.'
    if (awaitingNext.value) tryAdvance()
  })
})

function focusFirstBlank() {
  const firstInput = document.querySelector('.ai-blank-input') as HTMLInputElement | null
  firstInput?.focus()
}

function templateParts(template: string): string[] {
  return template.split('___')
}

function submit() {
  const q = current.value
  if (!q || q.submitted) return
  let correct = 0
  q.entry.blanks.forEach((blank, i) => {
    const userInput = q.blanks[i].userInput.trim()
    const ok = userInput.toLowerCase() === blank.answer.toLowerCase()
    q.blanks[i].isCorrect = ok
    if (ok) correct++
  })
  q.correctCount = correct
  q.submitted = true
}

/** Move to the next card, or wait for generation, or finish. */
function tryAdvance() {
  if (currentIndex.value + 1 < questions.value.length) {
    currentIndex.value += 1
    awaitingNext.value = false
    nextTick(() => focusFirstBlank())
  } else if (generationDone.value) {
    finishQuiz()
  } else {
    awaitingNext.value = true // wait; onResults/finally will re-call tryAdvance
  }
}

function next() {
  const q = current.value
  if (!q || !q.submitted) return
  tryAdvance()
}

function onEnter(e: KeyboardEvent) {
  e.preventDefault()
  const q = current.value
  if (!q) return
  if (!q.submitted) {
    if (q.blanks.every(b => b.userInput.trim().length > 0)) submit()
  } else {
    next()
  }
}

function endQuiz() { router.push({ name: 'declension-article' }) }

function finishQuiz() {
  finished.value = true
  awaitingNext.value = false
  if (historySaved.value) return
  historySaved.value = true
  const finishedAt = Date.now()
  const blanksAvg = totalBlanks.value / Math.max(1, questions.value.length)
  saveQuizRun({
    type: 'decl-article-ai',
    startedAt: new Date(startedAt.value).toISOString(),
    finishedAt: new Date(finishedAt).toISOString(),
    durationMs: finishedAt - startedAt.value,
    count: totalBlanks.value,
    correct: correctBlanks.value,
    meta: {
      declAIDifficulty: difficulty.value,
      declAIBlanksCount: Math.round(blanksAvg * 10) / 10
    }
  })
}

// If we were waiting and generation delivered more (or finished), advance.
watch([questions, generationDone], () => { if (awaitingNext.value) tryAdvance() }, { deep: true })

const resultPagination = usePagination(() => questions.value, 25, 'decl-article-ai-result')
</script>

<template>
  <div v-if="!ready" class="page loading-state"><div class="micro-mark">Generating the first sentence…</div></div>

  <div v-else-if="error" class="page">
    <div class="alert alert-danger"><span class="alert-label">Error</span>{{ error }}</div>
    <button class="btn btn-ghost" type="button" @click="endQuiz">← Back to setup</button>
  </div>

  <div v-else-if="finished" class="page result-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Auswertung · Artikel (KI)</div>
        <div class="result-score">{{ correctBlanks }}<span class="denom"> / {{ totalBlanks }}</span></div>
        <p class="section-subtitle">
          {{ totalBlanks }} blanks across {{ total }} AI-generated sentences ·
          {{ difficulty }}.
        </p>
        <p v-if="total < expected" class="section-subtitle">
          Generated {{ total }} of {{ expected }} — some sentences failed to generate.
        </p>
      </div>
      <div class="result-actions">
        <button class="btn btn-ghost" type="button" @click="endQuiz">Setup another</button>
        <button class="btn btn-accent" type="button" @click="endQuiz">
          Start another quiz <span aria-hidden="true">→</span>
        </button>
      </div>
    </header>

    <div class="verb-result-summary">
      <div class="vrs-cell is-correct">
        <div class="vrs-num">{{ correctBlanks }}</div>
        <div class="vrs-label">Richtig · correct</div>
      </div>
      <div class="vrs-cell is-wrong">
        <div class="vrs-num">{{ wrongBlanks }}</div>
        <div class="vrs-label">Falsch · missed</div>
      </div>
      <div class="vrs-cell">
        <div class="vrs-num">{{ pctScore }}<span class="vrs-pct-suffix">%</span></div>
        <div class="vrs-label">Quote · score</div>
      </div>
    </div>

    <Pagination :pagination="resultPagination" label="sentences" :hide-page-size-below="25" />

    <div class="verb-result-list">
      <div v-for="(q, i) in resultPagination.slice.value" :key="i"
        class="verb-result-card"
        :class="q.correctCount === q.blanks.length ? 'is-correct' : 'is-wrong'">
        <div class="verb-result-num"># {{ String(resultPagination.start.value + i + 1).padStart(2, '0') }}</div>
        <div class="verb-result-prompt">
          <div class="vrp-german">{{ q.entry.sentence }}</div>
          <div class="vrp-meta">
            <span>{{ q.correctCount }} / {{ q.blanks.length }} blanks</span>
          </div>
          <div class="ai-result-gloss">{{ q.entry.gloss }}</div>
        </div>
        <div class="verb-result-answers">
          <div v-for="(b, bi) in q.blanks" :key="bi" class="verb-result-line">
            <span class="vrl-label">{{ CASE_LABEL_DE[q.entry.blanks[bi].case] }}</span>
            <span class="vrl-value">
              <span
                v-if="b.userInput"
                class="vr-stamp"
                :class="b.isCorrect ? 'vr-stamp-right' : 'vr-stamp-wrong'"
              >{{ b.userInput }}</span>
              <span v-else class="vr-stamp vr-stamp-empty">—</span>
              <template v-if="!b.isCorrect">
                <span class="vr-stamp vr-stamp-right">{{ q.entry.blanks[bi].answer }}</span>
              </template>
            </span>
          </div>
        </div>
        <div class="verb-result-mark">{{ q.correctCount === q.blanks.length ? '✓' : '✗' }}</div>
      </div>
    </div>
  </div>

  <div v-else-if="current" class="page">
    <div class="quiz-card ai-quiz-card">
      <div class="quiz-meta">
        <span class="quiz-counter">Satz {{ currentIndex + 1 }} · von {{ total }}</span>
        <button class="btn btn-quiet" type="button" @click="endQuiz">End quiz</button>
      </div>

      <div v-if="awaitingNext" class="prompt-card"><div class="micro-mark">Preparing next sentence…</div></div>

      <template v-else>
        <div class="ai-prompt-meta">
          <span class="ai-prompt-difficulty">{{ difficulty }}</span>
          <span class="ai-prompt-blanks">{{ current.entry.blanks.length }} blanks</span>
        </div>

        <div class="prompt-card ai-prompt-card">
          <div class="ai-sentence" @keydown.enter="onEnter">
            <template v-for="(part, idx) in templateParts(current.entry.template)" :key="idx">
              <span>{{ part }}</span>
              <input
                v-if="idx < current.entry.blanks.length"
                class="ai-blank-input"
                :class="current.submitted ? (current.blanks[idx].isCorrect ? 'ai-blank-right' : 'ai-blank-wrong') : ''"
                type="text"
                v-model="current.blanks[idx].userInput"
                :readonly="current.submitted"
                autocomplete="off"
                spellcheck="false"
                :placeholder="`#${idx + 1}`"
              />
            </template>
          </div>
          <div class="ai-gloss">{{ current.entry.gloss }}</div>
        </div>

        <div v-if="current.submitted" class="ai-rationale-list">
          <div v-for="(b, bi) in current.entry.blanks" :key="bi" class="ai-rationale-line">
            <span class="ai-rl-num">#{{ bi + 1 }}</span>
            <span
              class="ai-rl-icon"
              :class="current.blanks[bi].isCorrect ? 'ai-rl-ok' : 'ai-rl-bad'"
            >{{ current.blanks[bi].isCorrect ? '✓' : '✗' }}</span>
            <span class="ai-rl-text">
              <strong>{{ b.answer }}</strong> — {{ b.rationale }}
            </span>
          </div>
        </div>

        <div class="ai-actions">
          <button
            v-if="!current.submitted"
            type="button"
            class="btn btn-accent"
            @click="submit"
            :disabled="current.blanks.some(b => !b.userInput.trim())"
          >Submit</button>
          <button
            v-else
            type="button"
            class="btn btn-accent"
            @click="next"
          >{{ (isLastGenerated && generationDone) ? 'Finish quiz' : 'Next' }} <span aria-hidden="true">→</span></button>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.loading-state { text-align: center; padding-top: 120px; }
.result-page { max-width: 880px; }
.result-actions { display: flex; gap: 12px; flex-wrap: wrap; }
.vrs-pct-suffix { font-size: 18px; color: var(--mute); margin-left: 2px; }

.ai-quiz-card { max-width: 760px; margin: 0 auto; }

.ai-prompt-meta {
  display: flex;
  gap: 18px;
  justify-content: center;
  margin: 8px 0 16px;
}
.ai-prompt-difficulty,
.ai-prompt-blanks {
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--mute);
}
.ai-prompt-difficulty { color: var(--accent); }

.ai-prompt-card {
  padding: 28px 24px 24px;
  text-align: left;
}

.ai-sentence {
  font-family: var(--font-display);
  font-weight: 500;
  font-size: var(--decl-prompt-size, 32px);
  line-height: 1.6;
  color: var(--ink);
  word-spacing: 0.05em;
}
.ai-sentence > span { display: inline; }

.ai-blank-input {
  display: inline-block;
  min-width: 90px;
  width: auto;
  border: 0;
  border-bottom: 2px solid var(--rule);
  font-family: var(--font-display);
  font-weight: 500;
  font-size: inherit;
  color: var(--accent);
  padding: 2px 8px;
  margin: 0 2px;
  background: transparent;
  text-align: center;
  vertical-align: baseline;
  outline: none;
  transition: border-color .15s, color .15s;
}
.ai-blank-input:focus { border-bottom-color: var(--accent); }
.ai-blank-input::placeholder { color: var(--mute); font-style: italic; font-weight: 400; }
.ai-blank-input.ai-blank-right { color: var(--success); border-bottom-color: var(--success); }
.ai-blank-input.ai-blank-wrong { color: var(--danger); border-bottom-color: var(--danger); }

.ai-gloss {
  margin-top: 18px;
  font-family: var(--font-body);
  font-style: italic;
  font-size: 16px;
  color: var(--ink-soft);
}

.ai-result-gloss {
  margin-top: 4px;
  font-family: var(--font-body);
  font-style: italic;
  font-size: 13px;
  color: var(--ink-soft);
}

.ai-rationale-list {
  margin: 20px 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 18px;
  background: var(--paper-deep);
  border-radius: 4px;
  border-left: 3px solid var(--accent);
}
.ai-rationale-line {
  display: flex;
  align-items: baseline;
  gap: 10px;
  font-size: 14.5px;
  line-height: 1.5;
}
.ai-rl-num {
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.18em;
  color: var(--mute);
  text-transform: uppercase;
  flex: 0 0 26px;
}
.ai-rl-icon {
  font-weight: 700;
  flex: 0 0 16px;
}
.ai-rl-ok { color: var(--success); }
.ai-rl-bad { color: var(--danger); }
.ai-rl-text strong {
  font-family: var(--font-display);
  font-size: 16px;
  color: var(--accent);
}

.ai-actions {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 720px) {
  .ai-sentence { font-size: clamp(20px, 6vw, 28px); line-height: 1.7; }
  .ai-blank-input { min-width: 70px; padding: 2px 6px; }
}
</style>
