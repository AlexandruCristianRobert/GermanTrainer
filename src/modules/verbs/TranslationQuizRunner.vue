<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useVerbs } from '../../composables/useVerbs'
import { useTranslationQuiz } from '../../composables/useVerbQuiz'
import { VERB_LEVELS, VERB_TYPES, VERB_CASES, type Verb, type VerbLevel, type VerbType, type VerbCase } from '../../data/verbs'

interface Marginalia { label: string; quote: string; body: string }

const TRANS_MARGINALIA: Marginalia[] = [
  {
    label: 'NOTIZ',
    quote: 'The infinitive carries no person.',
    body: 'German infinitives end in -en (sometimes -n). When you translate them, the English answer can be the bare verb or the "to-" form — both are accepted.'
  },
  {
    label: 'BEACHTE',
    quote: '"wissen" vs. "kennen" — two ways to know.',
    body: 'Use wissen for facts (Ich weiß die Antwort). Use kennen for people, places, or things you\'re familiar with (Ich kenne Berlin). English collapses them; German doesn\'t.'
  },
  {
    label: 'TIPP',
    quote: 'Separable verbs hide their main meaning in the prefix.',
    body: 'aufstehen = auf (up) + stehen (to stand). einkaufen = ein (in) + kaufen (to buy). Learn the prefixes and the rest unfolds.'
  },
  {
    label: 'GESCHICHTE',
    quote: 'Modal verbs come without "to".',
    body: 'können, müssen, dürfen, sollen, wollen, mögen — six modal verbs, each pairing with a bare infinitive: "Ich kann schwimmen", not "Ich kann zu schwimmen".'
  }
]

function typeTagClass(t: string): string {
  if (t === 'irregular') return 'tag-clay'
  if (t === 'separable') return 'tag-cobalt'
  if (t === 'modal') return 'tag-ochre'
  if (t === 'mixed') return 'tag-accent'
  return ''
}
function caseTagClass(c: string): string {
  if (c === 'dative' || c === 'dative+accusative') return 'tag-clay'
  if (c === 'accusative') return 'tag-cobalt'
  if (c === 'reflexive') return 'tag-accent'
  if (c === 'genitive') return 'tag-ochre'
  return ''
}

const route = useRoute()
const router = useRouter()
const { sample } = useVerbs()

const loading = ref(true)
const error = ref<string | null>(null)
let quiz: ReturnType<typeof useTranslationQuiz> | null = null
const ready = ref(false)

const input = ref('')
const submitted = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)
const nextBtnRef = ref<HTMLButtonElement | null>(null)
const margIdx = ref(Math.floor(Math.random() * TRANS_MARGINALIA.length))

function csvFilter<T extends string>(raw: unknown, allowed: readonly T[]): T[] {
  if (typeof raw !== 'string' || raw.length === 0) return [...allowed]
  const set = new Set<string>(allowed)
  return raw.split(',').map(s => s.trim()).filter((x): x is T => set.has(x))
}

onMounted(() => {
  const count = Math.max(1, parseInt((route.query.count as string) ?? '10', 10) || 10)
  const f = {
    levels: csvFilter<VerbLevel>(route.query.levels, VERB_LEVELS),
    types: csvFilter<VerbType>(route.query.types, VERB_TYPES),
    cases: csvFilter<VerbCase>(route.query.cases, VERB_CASES)
  }
  try {
    const verbs: Verb[] = sample(count, f)
    if (verbs.length === 0) {
      error.value = 'No verbs match the selected filters.'
    } else {
      quiz = useTranslationQuiz(verbs)
      ready.value = true
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load.'
  } finally {
    loading.value = false
    nextTick(() => inputRef.value?.focus())
  }
})

const current = computed(() => (ready.value, quiz?.current.value ?? null))
const finished = computed(() => (ready.value, quiz?.finished.value ?? false))
const total = computed(() => (ready.value, quiz?.total.value ?? 0))
const currentIndex = computed(() => (ready.value, quiz?.currentIndex.value ?? 0))
const questions = computed(() => (ready.value, quiz?.questions.value ?? []))
const score = computed(() => (ready.value, quiz?.score.value ?? 0))

const isCorrect = computed(() => current.value?.isCorrect === true)

const pips = computed(() => {
  const out: string[] = []
  for (let n = 0; n < total.value; n++) {
    if (n < currentIndex.value) {
      out.push(questions.value[n].isCorrect ? 'done' : 'wrong')
    } else if (n === currentIndex.value && submitted.value) {
      out.push(isCorrect.value ? 'done' : 'wrong')
    } else if (n === currentIndex.value) {
      out.push('current')
    } else {
      out.push('')
    }
  }
  return out
})

function submit(e?: Event) {
  e?.preventDefault?.()
  if (!quiz || submitted.value || !input.value.trim()) return
  quiz.submit(input.value)
  submitted.value = true
  nextTick(() => nextBtnRef.value?.focus())
}

function next() {
  if (!quiz) return
  margIdx.value = (margIdx.value + 1) % TRANS_MARGINALIA.length
  quiz.advance()
  submitted.value = false
  input.value = ''
  nextTick(() => inputRef.value?.focus())
}

watch(() => current.value, () => nextTick(() => inputRef.value?.focus()))

function restart() { router.push({ name: 'verbs-translation' }) }

const marg = computed(() => TRANS_MARGINALIA[margIdx.value])

const recap = computed(() => {
  return questions.value.map(q => ({
    german: q.verb.german,
    expected: q.verb.english,
    userAnswer: q.userAnswer ?? '',
    isCorrect: q.isCorrect === true,
    level: q.verb.level,
    type: q.verb.type
  }))
})
</script>

<template>
  <div v-if="loading" class="page loading-state"><div class="micro-mark">Loading…</div></div>
  <div v-else-if="error" class="page">
    <div class="alert alert-danger">
      <span class="alert-label">Error</span>{{ error }}
    </div>
    <button class="btn btn-ghost" @click="restart">← Back to setup</button>
  </div>
  <div v-else-if="finished && ready" class="page result-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Auswertung · Übersetzung</div>
        <div class="result-score">
          {{ score }}<span class="denom"> / {{ total }}</span>
        </div>
        <p class="section-subtitle">
          {{ score / Math.max(total, 1) >= 0.8
            ? 'Stark. Most of these verbs are second nature now.'
            : score / Math.max(total, 1) >= 0.5
              ? 'Solid. A few translations to revisit.'
              : 'Worth another pass — translations live in the long-term memory pile.' }}
        </p>
      </div>
      <div class="result-actions">
        <button class="btn btn-ghost" @click="router.push({ name: 'verbs' })">← Verben</button>
        <button class="btn btn-accent" @click="restart">Start another quiz <span aria-hidden="true">→</span></button>
      </div>
    </header>

    <div class="result-list">
      <div v-for="(r, i) in recap" :key="i" class="result-row">
        <div class="german">
          {{ r.german }}
          <div class="german-meta">{{ r.level }} · {{ r.type }}</div>
        </div>
        <div class="answers">
          your answer: <strong :style="r.isCorrect ? 'color: var(--success)' : 'color: var(--danger)'">{{ r.userAnswer || '—' }}</strong>
          <span v-if="!r.isCorrect"> · expected: <strong>{{ r.expected }}</strong></span>
        </div>
        <div>
          <span v-if="r.isCorrect" class="tag tag-success">✓ Correct</span>
          <span v-else class="tag tag-danger">✗ Missed</span>
        </div>
      </div>
    </div>
  </div>
  <div v-else-if="current" class="page">
    <div class="quiz-stage">
      <div>
        <div class="quiz-meta">
          <span class="quiz-counter">Frage {{ currentIndex + 1 }} · von {{ total }}</span>
          <button class="btn btn-quiet" type="button" @click="restart">End quiz</button>
        </div>

        <div class="quiz-progress-bar">
          <div v-for="(cls, i) in pips" :key="i" class="pip" :class="cls" />
        </div>

        <div class="prompt-card">
          <div class="prompt-chips">
            <span class="tag">{{ current.verb.level }}</span>
            <span class="tag" :class="typeTagClass(current.verb.type)">{{ current.verb.type }}</span>
            <span class="tag" :class="caseTagClass(current.verb.case)">{{ current.verb.case }}</span>
          </div>
          <div class="prompt-german">{{ current.verb.german }}</div>
          <div
            class="prompt-english"
            :style="{ opacity: submitted ? 1 : 0, transition: 'opacity 0.3s' }"
          >{{ submitted ? current.verb.english : ' ' }}</div>
        </div>

        <form class="translation-input-wrap" @submit="submit">
          <input
            ref="inputRef"
            class="input"
            type="text"
            placeholder="English (to is optional)"
            v-model="input"
            :readonly="submitted"
            autocomplete="off"
            spellcheck="false"
            :style="submitted ? {
              color: isCorrect ? 'var(--success)' : 'var(--danger)',
              borderBottomColor: isCorrect ? 'var(--success)' : 'var(--danger)'
            } : undefined"
          />
          <button v-if="!submitted" class="btn btn-accent" type="submit" :disabled="!input.trim()">
            Submit <span aria-hidden="true">→</span>
          </button>
        </form>

        <div class="feedback-line" :class="submitted ? (isCorrect ? 'correct' : 'wrong') : ''">
          <template v-if="!submitted"><span class="feedback-prompt">Type the English meaning. Press Enter to submit.</span></template>
          <template v-else-if="isCorrect">✓ Richtig.</template>
          <template v-else>✗ Korrekt — <strong>{{ current.verb.english }}</strong></template>
        </div>

        <div class="quiz-actions">
          <span class="micro-mark">Press <span class="kbd">Enter</span> to {{ submitted ? 'advance' : 'submit' }}</span>
          <button
            v-if="submitted"
            ref="nextBtnRef"
            class="btn btn-accent"
            type="button"
            @click="next"
            @keyup.enter="next"
          >
            {{ currentIndex + 1 === total ? 'Finish quiz' : 'Next' }} <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>

      <aside class="marginalia">
        <div class="marg-section">
          <div class="marg-label">{{ marg.label }}</div>
          <p class="marg-quote">{{ marg.quote }}</p>
          <p class="marg-body">{{ marg.body }}</p>
        </div>

        <div class="marg-section">
          <div class="marg-label">Score so far</div>
          <p class="score-line">
            {{ questions.slice(0, currentIndex).filter(q => q.isCorrect === true).length }}<span class="score-denom"> / {{ currentIndex }}</span>
          </p>
          <p class="score-sub">answered · {{ total - currentIndex - (submitted ? 1 : 0) }} remaining</p>
        </div>

        <div class="marg-section">
          <div class="marg-label">Legend</div>
          <div class="legend">
            <div><span class="tag tag-cobalt">accusative</span> <em>direct object</em></div>
            <div><span class="tag tag-clay">dative</span> <em>indirect object</em></div>
            <div><span class="tag tag-ochre">genitive</span> <em>possessive</em></div>
            <div><span class="tag tag-accent">reflexive</span> <em>sich-</em></div>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.loading-state { text-align: center; padding-top: 120px; }

.prompt-chips {
  position: absolute;
  top: 16px;
  left: 0;
  display: flex;
  gap: 6px;
}

.feedback-prompt {
  color: var(--mute);
  font-style: italic;
}

.score-line {
  margin: 0;
  font-family: var(--font-display);
  font-size: 32px;
  font-weight: 500;
  letter-spacing: -0.01em;
}
.score-denom { color: var(--mute); }
.score-sub {
  font-size: 12px;
  font-family: var(--font-mono);
  color: var(--mute);
  margin: 4px 0 0 0;
  letter-spacing: 0.06em;
}

.legend {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
}
.marg-body { margin: 0; }

.result-page { max-width: 880px; }
.result-actions { display: flex; gap: 12px; flex-wrap: wrap; }

.german-meta {
  font-family: var(--font-body);
  font-style: italic;
  font-size: 13px;
  color: var(--mute);
  font-weight: 400;
  margin-top: 2px;
}

.tag-success { background: var(--success-tint); color: var(--success); }
.tag-danger { background: var(--danger-tint); color: var(--danger); }

@media (max-width: 720px) {
  .result-actions { flex-direction: column; align-items: stretch; }
  .result-actions .btn { justify-content: center; }
}
</style>
