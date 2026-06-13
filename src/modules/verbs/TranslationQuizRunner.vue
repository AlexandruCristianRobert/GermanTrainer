<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useVerbs } from '../../composables/useVerbs'
import { shuffle } from '../../data/pool'
import { checkTranslation, checkGermanTranslation, type TranslationDirection } from '../../composables/useVerbQuiz'
import { saveQuizRun } from '../../composables/useQuizHistory'
import { VERB_LEVELS, VERB_TYPES, VERB_CASES, type Verb, type VerbLevel, type VerbType, type VerbCase } from '../../data/verbs'
import { getVerbTip } from '../../data/verb-tips'

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
const direction = ref<TranslationDirection>('de-en')
const deck = ref<Verb[]>([])
const answers = ref<string[]>([])
const startedAt = ref<number>(0)
const inputRefs = ref<HTMLInputElement[]>([])
const showTip = ref<boolean[]>([])

function csvFilter<T extends string>(raw: unknown, allowed: readonly T[]): T[] {
  if (typeof raw !== 'string' || raw.length === 0) return [...allowed]
  const set = new Set<string>(allowed)
  return raw.split(',').map(s => s.trim()).filter((x): x is T => set.has(x))
}

function startDeck(verbs: Verb[]) {
  deck.value = verbs
  answers.value = verbs.map(() => '')
  showTip.value = verbs.map(() => false)
  startedAt.value = Date.now()
}

// Retry rounds (?retry=1) replay the verbs the result page stashed instead of
// sampling fresh ones; the direction travels in the stash, not the query.
function loadRetryDeck() {
  try {
    const raw = sessionStorage.getItem('gt:verbTranslationRetry')
    const stash = raw ? JSON.parse(raw) as { verbs?: Verb[]; direction?: TranslationDirection } : null
    const verbs = Array.isArray(stash?.verbs) ? stash.verbs : []
    if (verbs.length === 0) {
      error.value = 'Nothing to retry — start a fresh round from setup.'
      return
    }
    direction.value = stash?.direction === 'en-de' ? 'en-de' : 'de-en'
    startDeck(shuffle(verbs))
  } catch {
    error.value = 'Nothing to retry — start a fresh round from setup.'
  }
}

onMounted(() => {
  if (route.query.retry === '1') {
    loadRetryDeck()
    loading.value = false
    nextTick(() => inputRefs.value[0]?.focus())
    return
  }
  const count = Math.max(1, parseInt((route.query.count as string) ?? '10', 10) || 10)
  direction.value = route.query.direction === 'en-de' ? 'en-de' : 'de-en'
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
      startDeck(verbs)
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load.'
  } finally {
    loading.value = false
    nextTick(() => inputRefs.value[0]?.focus())
  }
})

function setAnswer(i: number, v: string) {
  answers.value[i] = v
}

function toggleTip(i: number) {
  showTip.value[i] = !showTip.value[i]
}

const filledCount = computed(() => answers.value.filter(a => a.trim().length > 0).length)
const total = computed(() => deck.value.length)

function onEnter(e: KeyboardEvent, i: number) {
  e.preventDefault()
  if (i + 1 < deck.value.length) {
    inputRefs.value[i + 1]?.focus()
  } else {
    document.getElementById('submit-all-btn')?.focus()
  }
}

// Center the focused row in the viewport. Fires for Tab navigation and
// for the manual Enter-driven focus moves above.
function onRowFocus(e: FocusEvent) {
  const input = e.target as HTMLInputElement | null
  if (!input) return
  const row = input.closest('.test-row')
  if (!row) return
  const reduce = typeof window !== 'undefined'
    && window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ;(row as HTMLElement).scrollIntoView({
    block: 'center',
    behavior: reduce ? 'auto' : 'smooth'
  })
}

function submitAll() {
  if (filledCount.value === 0) return
  const graded = deck.value.map((verb, i) => ({
    verb,
    input: answers.value[i],
    correct: direction.value === 'en-de'
      ? checkGermanTranslation(answers.value[i], verb.german)
      : checkTranslation(answers.value[i], verb.english)
  }))
  const finishedAt = Date.now()
  const correct = graded.filter(g => g.correct).length

  // History entry
  const levels = Array.from(new Set(deck.value.map(v => v.level))).sort()
  const types = Array.from(new Set(deck.value.map(v => v.type))).sort()
  const cases = Array.from(new Set(deck.value.map(v => v.case))).sort()
  saveQuizRun({
    type: 'verb-translation',
    startedAt: new Date(startedAt.value).toISOString(),
    finishedAt: new Date(finishedAt).toISOString(),
    durationMs: finishedAt - startedAt.value,
    count: total.value,
    correct,
    meta: { levels, types, cases, verbDirection: direction.value }
  })

  // Stash graded result for the result page (sessionStorage so refresh survives within the tab)
  try {
    sessionStorage.setItem('gt:lastVerbTranslation', JSON.stringify({ graded, total: total.value, correct, direction: direction.value }))
  } catch { /* ignore quota */ }
  router.push({ name: 'verbs-translation-result' })
}

function endQuiz() { router.push({ name: 'verbs-translation' }) }
</script>

<template>
  <div v-if="loading" class="page loading-state"><div class="micro-mark">Loading…</div></div>

  <div v-else-if="error" class="page">
    <div class="alert alert-danger">
      <span class="alert-label">Error</span>{{ error }}
    </div>
    <button class="btn btn-ghost" @click="endQuiz">← Back to setup</button>
  </div>

  <div v-else class="page">
    <div class="test-sheet">
      <header class="section-header" style="margin-bottom: 0">
        <div>
          <div class="breadcrumb">Kapitel III · Übersetzen · {{ total }} Verben</div>
          <h1 class="section-title">Übersetzung<em>.</em></h1>
          <p v-if="direction === 'de-en'" class="section-subtitle">
            Type the English meaning of each verb. "to" is optional, and where several meanings are listed any one counts. Press Enter to jump to the next line.
            <em class="hint-aside">Double-click a verb for an English hint that nudges you toward the meaning.</em>
          </p>
          <p v-else class="section-subtitle">
            Type the German infinitive for each meaning. For reflexive verbs "sich" is optional. Press Enter to jump to the next line.
          </p>
        </div>
        <button class="btn btn-quiet" type="button" @click="endQuiz">End quiz</button>
      </header>

      <div class="test-sheet-header">
        <span class="filled-count">
          <strong>{{ filledCount }}</strong> · von {{ total }} ausgefüllt
        </span>
        <div class="quiz-progress-bar test-progress">
          <div
            v-for="(_, i) in deck"
            :key="i"
            class="pip"
            :class="{ current: !!answers[i]?.trim() }"
          />
        </div>
      </div>

      <div class="test-rows">
        <div
          v-for="(verb, i) in deck"
          :key="i"
          class="test-row"
        >
          <div class="test-num">
            <strong>{{ String(i + 1).padStart(2, '0') }}.</strong>
          </div>
          <div class="test-content">
            <div class="test-prompt-row">
              <span
                v-if="direction === 'de-en'"
                class="test-verb"
                :class="{ 'with-tip': showTip[i] }"
                :title="showTip[i] ? 'Double-click to show the verb' : 'Double-click for an English hint'"
                @dblclick="toggleTip(i)"
              >{{ showTip[i] ? getVerbTip(verb.german) : verb.german }}</span>
              <span v-else class="test-verb">{{ verb.english }}</span>
              <span class="test-chips">
                <span class="tag">{{ verb.level }}</span>
                <span class="tag" :class="typeTagClass(verb.type)">{{ verb.type }}</span>
                <span class="tag" :class="caseTagClass(verb.case)">{{ verb.case }}</span>
              </span>
            </div>
            <input
              :ref="(el) => { if (el) inputRefs[i] = el as HTMLInputElement }"
              class="test-input"
              type="text"
              :placeholder="direction === 'en-de' ? 'German infinitive…' : 'English (to is optional)…'"
              :value="answers[i]"
              @input="setAnswer(i, ($event.target as HTMLInputElement).value)"
              @keydown.enter="onEnter($event, i)"
              @focus="onRowFocus($event)"
              autocomplete="off"
              spellcheck="false"
            />
          </div>
        </div>
      </div>

      <div class="test-sheet-footer">
        <span class="filled-count">
          <strong>{{ filledCount }}</strong> filled · {{ total - filledCount }} remaining
        </span>
        <button
          id="submit-all-btn"
          class="btn btn-accent btn-meta"
          type="button"
          :disabled="filledCount === 0"
          @click="submitAll"
        >
          <span class="bm-main">Submit all <span aria-hidden="true">→</span></span>
          <span class="bm-sub">{{ total }} verbs</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.loading-state { text-align: center; padding-top: 120px; }

/* Override the inherited .quiz-progress-bar margin-bottom inside our sticky header */
.test-progress {
  flex: 1;
  max-width: 280px;
  margin: 0 0 0 24px;
}
</style>
