<script setup lang="ts">
//
// Verb sentence quiz — ONE runner for both Modalities (CONTEXT.md → "Modality",
// widened by this feature to cover this drill too, not just Sprechen).
// Generation, progressive streaming, hints, grading, retry-wrong and history
// are all shared. The only thing that switches on `spoken` is the composer at
// the bottom of the card — an <input>+Enter for `typed`, a mic button for
// `spoken` — reusing the exact interaction the Sprechen Diskussion
// (Teil2Runner.vue) already teaches: Space starts the turn, Space again ends
// it AND submits. There is no edit step: what the recognizer heard is what
// was answered. During the answer phase Space records then submits; once a
// card is graded, Space instead plays the reference sentence aloud
// (hearReference(), via useSpeechVoice()) and Enter advances — see onKey().
// Playback is available in BOTH Modalities: it is output, not input, so
// unlike the composer above it is not a property of Modality.
//
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { shuffle } from '../../data/pool'
import { buildHintSegments, checkSentence, type HintSegment } from '../../composables/useSentenceQuiz'
import {
  buildVerbHintInputs, gradeVerbAnswer, buildVerbDrillItem, generateVerbSentenceBatch,
  type GeneratedVerbSentence, type VerbSentenceSpec, type VerbSentenceVerdict
} from '../../composables/useVerbSentenceQuiz'
import { buildTenseRecipe } from '../../composables/tenseRecipe'
import { planRampBatches, generateProgressively } from '../../composables/useProgressiveGenerator'
import { saveQuizRun, type QuizHistoryType } from '../../composables/useQuizHistory'
import { useSettings } from '../../composables/useSettings'
import { TENSE_LABELS, type VerbTense } from '../../data/verbs'
import { resolveAiClient } from '../../composables/localClaude'
import { useSpeechRecognizer } from '../../composables/useSpeechRecognizer'
import { useSpeechVoice } from '../../composables/useSpeechVoice'
import { useToast } from '../../composables/useToast'
import { useSound } from '../../composables/useSound'
import RetryModal from '../../components/RetryModal.vue'
import QuizProgress from '../../components/QuizProgress.vue'

const STASH_KEY = 'gt:lastVerbSentenceQuiz'
const router = useRouter()
const { settings, load: loadSettings } = useSettings()
const toast = useToast()
const sound = useSound()
const recognizer = useSpeechRecognizer('de-DE')
const voice = useSpeechVoice()
let chimed = false

interface Stash {
  specs: VerbSentenceSpec[]
  runType?: QuizHistoryType
  level?: string
  wordHints?: boolean
  modality?: 'typed' | 'spoken'
  meta?: { levels: string[]; types: string[]; cases: string[]; groups: string[]; verbsPer: 1 | 2 | 'mix'; nounsPer: 1 | 2 | 'mix'; tenses?: VerbTense[] }
}

const error = ref<string | null>(null)
const expected = ref(0)            // requested N
const deck = ref<GeneratedVerbSentence[]>([])  // arrival order
const generationDone = ref(false)
const runType = ref<QuizHistoryType>('verb-sentence')
const level = ref('A2–B1')
const wordHints = ref(true)
const metaInfo = ref<Stash['meta']>(undefined)

const answers = ref<string[]>([])
const verdicts = ref<Map<number, VerbSentenceVerdict>>(new Map())
const startedAt = ref(0)
const historySaved = ref(false)

const index = ref(0)
const userInput = ref('')
const phase = ref<'input' | 'checking' | 'graded'>('input')
const finished = ref(false)
const awaitingNext = ref(false)    // outran generation
const inputRef = ref<HTMLInputElement | null>(null)
const nextBtnRef = ref<HTMLButtonElement | null>(null)

// Fixed for the run, same as Sprechen's Modality — set once in onMounted from
// the stash, never toggled back on except by the denied-mic fallback below.
const spoken = ref(false)
/** True from the start of endAndSubmit() until it resolves — gates a
 *  re-entrant Space from restarting the recognizer under an in-flight end()
 *  and wiping the buffer that promise is about to resolve from. */
const ending = ref(false)

const ready = computed(() => deck.value.length > 0 || generationDone.value || error.value !== null)
const total = computed(() => expected.value)
const current = computed<GeneratedVerbSentence | null>(() => deck.value[index.value] ?? null)
const currentVerdict = computed(() => verdicts.value.get(index.value) ?? null)
const correctCount = computed(() => { let n = 0; for (const v of verdicts.value.values()) if (v.correct) n++; return n })
const wrongAnswered = computed(() => { let n = 0; for (const v of verdicts.value.values()) if (!v.correct) n++; return n })
const generatedTotal = computed(() => deck.value.length)
const wrongCount = computed(() => generatedTotal.value - correctCount.value)
const allCorrect = computed(() => finished.value && wrongCount.value === 0)
const isLastGenerated = computed(() => index.value + 1 >= deck.value.length)

// Same bar Teil2Setup applies before it offers a spoken run at all: TTS
// support AND at least one German voice. A browser can have speechSynthesis
// but no German voice installed — reading German in an English voice is the
// same failure Sprechen already treats as "no voice available", so playback
// is simply not offered rather than offered broken.
const canHear = computed(() => voice.supported && voice.voices.value.length > 0)

// Spoken composer only — the transcript rendered where the typed <input> was.
const micListening = computed(() => phase.value === 'input' && recognizer.listening.value)
const micPlaceholder = computed(() => phase.value === 'input' && !recognizer.listening.value && userInput.value.trim().length === 0)
const micTranscript = computed(() => {
  if (micListening.value) return recognizer.liveText.value || '…'
  if (userInput.value) return userInput.value
  return phase.value === 'input' ? 'Deutsch…' : ''
})

// Tap-to-toggle reveal, keyed by segment index.
const revealed = ref<Set<number>>(new Set())
function toggleReveal(i: number) {
  const next = new Set(revealed.value); next.has(i) ? next.delete(i) : next.add(i); revealed.value = next
}

// Tense badge, two states. Hover reveals while the pointer is on it; click or
// Alt+R pins it, so touch devices and typists both have a way in. Both reset
// per card (like `revealed` above) — a hint asked for on card 3 must not
// pre-answer card 4.
const recipePinned = ref(false)
const recipeHover = ref(false)
const showRecipe = computed(() => recipePinned.value || recipeHover.value)

const currentRecipe = computed(() => {
  const s = current.value
  if (!s?.tense) return null
  return buildTenseRecipe(s.tense, s.verbs.map(v => v.german))
})

const badgeText = computed(() => {
  const t = current.value?.tense
  if (!t) return ''
  const r = currentRecipe.value
  if (!showRecipe.value || !r) return TENSE_LABELS[t]
  return r.example ? `${r.formula} · ${r.example}` : r.formula
})

const badgeTitle = computed(() =>
  showRecipe.value ? 'Zeitform zeigen (Alt+R)' : 'Bildung zeigen (Alt+R)'
)

function toggleRecipe() {
  if (!current.value?.tense) return
  recipePinned.value = !recipePinned.value
}

const currentSegments = computed<HintSegment[]>(() => {
  const s = current.value
  if (!s) return []
  if (!wordHints.value) return [{ text: s.english }]
  return buildHintSegments(s.english, buildVerbHintInputs(s))
})

function hintClass(kind: string): string { return 'hint-' + kind }

onMounted(async () => {
  await loadSettings()
  let stash: Stash | null = null
  try {
    const raw = sessionStorage.getItem(STASH_KEY)
    if (!raw) { error.value = 'No quiz in this session. Go back to setup.'; return }
    stash = JSON.parse(raw) as Stash
  } catch (e) { error.value = e instanceof Error ? e.message : 'Failed to load.'; return }
  if (!stash || !Array.isArray(stash.specs) || stash.specs.length === 0) { error.value = 'No sentence specs in this session.'; return }

  expected.value = stash.specs.length
  runType.value = stash.runType === 'verb-remedial' ? 'verb-remedial' : 'verb-sentence'
  level.value = stash.level ?? 'A2–B1'
  wordHints.value = stash.wordHints !== false
  metaInfo.value = stash.meta
  // A stash that says 'spoken' still falls back to typed when the browser has
  // no SpeechRecognition — the setup page's mic gate should already prevent
  // this, but the runner does not trust it blindly (spec: "Failure modes").
  spoken.value = stash.modality === 'spoken' && recognizer.supported
  // Bound in BOTH Modalities — a typed run needs Space (hear the reference)
  // and Enter (advance) on its graded cards just as much as a spoken run
  // needs them for recording. Torn down in onUnmounted. Modality is fixed
  // for the run (barring the denied fallback, which flips spoken.value but
  // leaves this listener attached; onKey's own phase/Modality guards make it
  // behave correctly either way).
  window.addEventListener('keydown', onKey)
  startedAt.value = Date.now()
  answers.value = []

  const client = resolveAiClient(settings.value)
  // Ramp 1 → 2 → 5, then batches of 10 (ADR-0008): fast first paints, efficient tail.
  const batches = planRampBatches(stash.specs, [1, 2, 5], 10)
  generateProgressively<VerbSentenceSpec, GeneratedVerbSentence>({
    batches,
    runBatch: async (batch) => {
      const res = await generateVerbSentenceBatch(client, { model: settings.value.model, specs: batch, level: level.value, maxRetries: 1 })
      return res.sentences
    },
    onResults: (sentences) => {
      for (const s of sentences) { deck.value.push(s); answers.value.push('') }
      if (!chimed && deck.value.length > 0) { chimed = true; sound.playReady() }
      if (awaitingNext.value) tryAdvance()
      nextTick(() => { if (!spoken.value && deck.value.length === sentences.length) inputRef.value?.focus() })
    },
    concurrency: 4
  }).finally(() => {
    generationDone.value = true
    if (deck.value.length === 0) error.value = 'The model returned no usable sentences. Go back and try again.'
    if (awaitingNext.value) tryAdvance()
  })
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  recognizer.abort()
  voice.cancel()
})

// Denied is terminal for voice (CONTEXT.md → "Modality"): the run drops to
// the typed composer, a toast explains, and the text input takes focus once
// it exists again. The quiz continues — no answers are lost.
watch(recognizer.error, err => {
  if (err?.kind !== 'denied') return
  spoken.value = false
  toast.error('Kein Mikrofonzugriff', {
    description: 'Der Rest des Tests läuft jetzt getippt weiter — deine bisherigen Antworten bleiben erhalten.'
  })
  nextTick(() => inputRef.value?.focus())
})

async function submit() {
  if (!current.value || phase.value !== 'input') return
  if (userInput.value.trim().length === 0) return
  const i = index.value
  const s = current.value
  phase.value = 'checking'
  let verdict: VerbSentenceVerdict
  try {
    const grade = await gradeVerbAnswer(resolveAiClient(settings.value), {
      model: settings.value.model,
      english: s.english, german: s.german,
      verbsGerman: s.verbs.map(v => v.german), nounsGerman: s.nouns.map(n => n.german),
      userAnswer: userInput.value,
      spoken: spoken.value,
      tense: s.tense
    })
    verdict = { index: i, correct: grade.correct, correction: s.german, tip: grade.tip, tags: grade.tags }
  } catch {
    verdict = { index: i, correct: checkSentence(userInput.value, s.german), correction: s.german }
    toast.info('Graded offline', { description: 'The AI grader was unreachable, so this answer was checked by exact match.' })
  }
  answers.value[i] = userInput.value
  verdicts.value.set(i, verdict)
  verdicts.value = new Map(verdicts.value)
  phase.value = 'graded'
  nextTick(() => nextBtnRef.value?.focus())
}

function finishQuiz() {
  voice.cancel()
  finished.value = true
  awaitingNext.value = false
  if (historySaved.value) return
  historySaved.value = true
  const finishedAt = Date.now()
  const items = deck.value.map((s, i) => buildVerbDrillItem(s, verdicts.value.get(i)?.correct ?? false, verdicts.value.get(i)?.tags))
  saveQuizRun({
    type: runType.value,
    startedAt: new Date(startedAt.value).toISOString(),
    finishedAt: new Date(finishedAt).toISOString(),
    durationMs: finishedAt - startedAt.value,
    count: generatedTotal.value,
    correct: correctCount.value,
    meta: {
      verbSentenceLevels: metaInfo.value?.levels, verbSentenceTypes: metaInfo.value?.types,
      verbSentenceCases: metaInfo.value?.cases, verbSentenceGroups: metaInfo.value?.groups,
      verbsPerSentence: metaInfo.value?.verbsPer, verbSentenceNounsPer: metaInfo.value?.nounsPer,
      verbSentenceHints: wordHints.value, verbSentenceItems: items,
      verbSentenceModality: spoken.value ? 'spoken' : 'typed',
      verbSentenceTenses: metaInfo.value?.tenses
    }
  })
}

/** Move to the next card, or wait for generation, or finish. */
function tryAdvance() {
  voice.cancel() // a half-spoken sentence must never bleed into the next card
  if (index.value + 1 < deck.value.length) {
    index.value++
    userInput.value = ''
    phase.value = 'input'
    awaitingNext.value = false
    revealed.value = new Set()
    recipePinned.value = false
    recipeHover.value = false
    nextTick(() => { if (!spoken.value) inputRef.value?.focus() })
  } else if (generationDone.value) {
    finishQuiz()
  } else {
    awaitingNext.value = true // wait; onResults/finally will re-call tryAdvance
  }
}

function next() {
  if (phase.value !== 'graded') return
  tryAdvance()
}

function onEnter(e: KeyboardEvent) {
  e.preventDefault()
  if (phase.value === 'input') submit()
  else if (phase.value === 'graded') next()
}

/** Replays the reference sentence from the start — never the learner's own
 *  answer, even when it was correct (spec: "What is spoken?"). Cancelling
 *  first means Space always means the same thing however often it is
 *  pressed, so there is no "resume" state to reason about. */
function hearReference() {
  if (phase.value !== 'graded' || !current.value || !canHear.value) return
  voice.cancel()
  void voice.speak(currentVerdict.value?.correction || current.value.german)
}

/** One window-level handler for both keys, evaluated in this exact order
 *  (spec: "Keyboard, precisely"):
 *   1. not Space/Enter, or a key-repeat → ignore
 *   2. focus is in an INPUT/TEXTAREA/contentEditable → ignore, so typing a
 *      space still types a space and the typed composer's own Enter-to-
 *      submit (onEnter, on the <input>) still works
 *   3. an end() is in flight → ignore
 *   4. Space, spoken run, and (phase is 'input' or the recognizer is
 *      listening) → record / end-and-submit, exactly as before this feature
 *   5. Space, phase is 'graded', playback available → speak the reference
 *   6. Enter, phase is 'graded' → next
 *   7. anything else → return WITHOUT preventDefault, so e.g. Space still
 *      activates a focused Next button when playback is unavailable — a
 *      learner who can hear nothing keeps a working keyboard flow rather
 *      than a dead key.
 *  Both handled cases (4/5 and 6) call preventDefault(), which also cancels
 *  the browser's native Space/Enter-activates-the-focused-button. That
 *  matters for Enter specifically: after clicking the Anhören button, focus
 *  sits on *it*, so without this explicit Enter case, Enter would replay the
 *  reference (native button activation) instead of advancing. Owning both
 *  keys at the window makes the mapping independent of what happens to hold
 *  focus. */
function onKey(e: KeyboardEvent) {
  // Alt+R is handled ahead of everything else, including the input guard
  // below: the whole point is to flip the badge without leaving the answer
  // field. Alt (not Shift) because answers are German — Shift+R would swallow
  // the capital R in "Regen". Matched on e.code so non-QWERTY layouts, where
  // Alt+key yields a different e.key, still reach the same physical R.
  if (e.altKey && !e.ctrlKey && !e.metaKey && e.code === 'KeyR') {
    if (!current.value?.tense) return
    e.preventDefault()
    toggleRecipe()
    return
  }
  if (e.code !== 'Space' && e.code !== 'Enter') return
  if (e.repeat) return
  const el = e.target as HTMLElement | null
  if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return
  // A focused tense badge keeps its native Space/Enter activation instead of
  // recording or advancing — returning without preventDefault lets the button
  // toggle itself.
  if (el instanceof Element && el.closest('.tense-badge')) return
  if (ending.value) return
  if (e.code === 'Space' && spoken.value && (phase.value === 'input' || recognizer.listening.value)) {
    e.preventDefault()
    void toggleMic()
    return
  }
  if (e.code === 'Space' && phase.value === 'graded' && canHear.value) {
    e.preventDefault()
    hearReference()
    return
  }
  // Explicit Enter case: after clicking Anhören, focus sits on that button,
  // so without this Enter would replay the reference (native button
  // activation) instead of advancing.
  if (e.code === 'Enter' && phase.value === 'graded') {
    e.preventDefault()
    next()
    return
  }
}

async function toggleMic() {
  if (ending.value) return
  if (recognizer.listening.value) {
    await endAndSubmit()
  } else if (phase.value === 'input' && current.value) {
    recognizer.start()
  }
}

/** Ends the turn and submits whatever the recognizer heard. Empty is not a
 *  wrong answer — nothing is graded, nothing is marked, the learner stays on
 *  the card and tries again. */
async function endAndSubmit() {
  ending.value = true
  try {
    const result = await recognizer.end()
    const text = result.text.trim()
    if (text.length === 0) {
      toast.error('Nichts verstanden', { description: 'Nochmal — Leertaste startet die Aufnahme.' })
      return
    }
    userInput.value = text
    await submit()
  } finally {
    ending.value = false
  }
}

function retryWrong() {
  voice.cancel()
  const wrong = deck.value.filter((_, i) => !verdicts.value.get(i)?.correct)
  if (wrong.length === 0) return
  deck.value = shuffle(wrong)
  answers.value = deck.value.map(() => '')
  verdicts.value = new Map()
  expected.value = deck.value.length
  generationDone.value = true
  index.value = 0; userInput.value = ''; phase.value = 'input'; finished.value = false
  revealed.value = new Set()
  recipePinned.value = false
  recipeHover.value = false
  startedAt.value = Date.now(); historySaved.value = false
  nextTick(() => { if (!spoken.value) inputRef.value?.focus() })
}

function newQuiz() { router.push({ name: 'verbs-sentence' }) }
function endQuiz() { router.push({ name: 'verbs' }) }

// If we were waiting and generation finished with nothing more, finish.
watch([deck, generationDone], () => { if (awaitingNext.value) tryAdvance() }, { deep: true })
</script>

<template>
  <div v-if="!ready" class="page loading-state"><div class="micro-mark">Generating the first sentence…</div></div>

  <div v-else-if="error" class="page">
    <div class="alert alert-danger"><span class="alert-label">Error</span>{{ error }}</div>
    <button class="btn btn-ghost" type="button" @click="newQuiz">← Back to setup</button>
  </div>

  <!-- Result -->
  <div v-else-if="finished" class="page result-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Kapitel III · Satzübersetzung · Auswertung</div>
        <h1 class="section-title">{{ correctCount }} / {{ generatedTotal }}<em>.</em></h1>
        <p v-if="allCorrect" class="section-subtitle">Alles richtig! 🎉</p>
        <p v-else class="section-subtitle">{{ wrongCount }} to fix. Reference translations and notes below.</p>
        <p v-if="generatedTotal < expected" class="section-subtitle">Generated {{ generatedTotal }} of {{ expected }} — some sentences failed to generate.</p>
      </div>
    </header>

    <div class="result-rows">
      <div v-for="(s, i) in deck" :key="i" class="result-row" :class="{ good: verdicts.get(i)?.correct, bad: !verdicts.get(i)?.correct }">
        <div class="rr-head">
          <span class="rr-mark">{{ verdicts.get(i)?.correct ? '✓' : '✗' }}</span>
          <span class="rr-en">{{ s.english }}</span>
          <span class="rr-tags">
            <span v-for="t in verdicts.get(i)?.tags" :key="t" class="tag tag-error">{{ t }}</span>
          </span>
        </div>
        <div class="rr-you" :class="{ 'rr-you-empty': !answers[i]?.trim() }"><span class="rr-label">You</span> {{ answers[i]?.trim() || '— (blank)' }}</div>
        <div v-if="!verdicts.get(i)?.correct" class="rr-ref"><span class="rr-label">Answer</span> {{ verdicts.get(i)?.correction || s.german }}</div>
        <div v-if="!verdicts.get(i)?.correct && verdicts.get(i)?.tip" class="rr-tip"><span class="rr-label">Tip</span> {{ verdicts.get(i)?.tip }}</div>
      </div>
    </div>

    <div class="setup-actions">
      <button class="btn btn-ghost" type="button" @click="endQuiz">← Verbs</button>
      <div class="result-cta">
        <button v-if="wrongCount > 0" class="btn btn-quiet" type="button" @click="retryWrong">Retry {{ wrongCount }} wrong</button>
        <button class="btn btn-accent" type="button" @click="newQuiz">New quiz <span aria-hidden="true">→</span></button>
      </div>
    </div>
    <RetryModal :wrong-count="wrongCount" item-label="sentences" @retry="retryWrong" />
  </div>

  <!-- One sentence per step -->
  <div v-else class="page">
    <div class="quiz-card">
      <div class="quiz-meta">
        <span class="quiz-counter">Satz {{ index + 1 }} · von {{ total }}</span>
        <button class="btn btn-quiet" type="button" @click="endQuiz">End quiz</button>
      </div>

      <QuizProgress class="sentence-progress" :correct="correctCount" :wrong="wrongAnswered" :total="total" :current-index="index" />

      <div v-if="awaitingNext" class="prompt-card"><div class="micro-mark">Preparing next sentence…</div></div>

      <template v-else-if="current">
        <div class="prompt-card">
          <button
            v-if="current.tense"
            type="button"
            class="tense-badge"
            :class="{ flipped: showRecipe }"
            :aria-pressed="recipePinned"
            :title="badgeTitle"
            aria-live="polite"
            @click="toggleRecipe"
            @mouseenter="recipeHover = true"
            @mouseleave="recipeHover = false"
          >{{ badgeText }}</button>
          <div v-if="!wordHints" class="en-sentence">{{ current.english }}</div>
          <div v-else class="en-sentence">
            <template v-for="(seg, i) in currentSegments" :key="i"><span
              v-if="seg.hint"
              class="hint"
              :class="[hintClass(seg.hint.kind), { revealed: revealed.has(i) }]"
              tabindex="0" role="button"
              :aria-label="seg.hint.kind + ' hint: ' + seg.hint.reveal"
              @click="toggleReveal(i)"
              @keydown.enter.prevent="toggleReveal(i)"
              @keydown.space.prevent="toggleReveal(i)"
            >{{ seg.text }}<span class="hint-pop">{{ seg.hint.reveal }}</span></span><template v-else>{{ seg.text }}</template></template>
          </div>
          <div class="en-hint">Translate into German.<template v-if="current.tense"> · Alt+R: Bildung</template></div>
        </div>

        <div v-if="spoken" class="mic-wrap">
          <div v-if="micListening" class="mic-live-badge">● Aufnahme läuft</div>
          <div class="input prep-input mic-transcript" :class="{ 'mic-placeholder': micPlaceholder }"
            :style="phase === 'graded' ? { color: currentVerdict?.correct ? 'var(--success)' : 'var(--danger)', borderBottomColor: currentVerdict?.correct ? 'var(--success)' : 'var(--danger)' } : undefined"
          >{{ micTranscript }}</div>
          <div class="mic-row">
            <template v-if="phase !== 'graded'">
              <button class="btn mic-btn" :class="(recognizer.listening.value || ending) ? 'btn-danger' : 'btn-accent'" type="button"
                :disabled="phase === 'checking'" @click="toggleMic">
                {{ (recognizer.listening.value || ending) ? '■ Antwort abgeben' : '● Sprechen' }}
              </button>
              <span class="mic-hint">{{ (recognizer.listening.value || ending) ? 'Leertaste beendet — und schickt ab.' : 'Leertaste oder Knopf startet die Aufnahme.' }}</span>
            </template>
            <button v-else ref="nextBtnRef" type="button" class="btn btn-accent" @click="next">{{ (isLastGenerated && generationDone) ? 'Finish quiz' : 'Next' }} <span aria-hidden="true">→</span></button>
          </div>
        </div>

        <form v-else class="prep-input-wrap" @submit.prevent="submit">
          <input ref="inputRef" class="input prep-input" type="text" placeholder="Deutsch…" v-model="userInput"
            :readonly="phase !== 'input'" autocomplete="off" spellcheck="false" @keydown.enter="onEnter"
            :style="phase === 'graded' ? { color: currentVerdict?.correct ? 'var(--success)' : 'var(--danger)', borderBottomColor: currentVerdict?.correct ? 'var(--success)' : 'var(--danger)' } : undefined" />
          <button v-if="phase === 'input'" type="submit" class="btn btn-accent" :disabled="userInput.trim().length === 0">Submit</button>
          <button v-else-if="phase === 'checking'" type="button" class="btn btn-accent" disabled>Checking…</button>
          <button v-else ref="nextBtnRef" type="button" class="btn btn-accent" @click="next">{{ (isLastGenerated && generationDone) ? 'Finish quiz' : 'Next' }} <span aria-hidden="true">→</span></button>
        </form>

        <div v-if="phase === 'graded' && currentVerdict" class="prep-feedback">
          <span class="prep-feedback-mark" :class="currentVerdict.correct ? 'prep-feedback-ok' : 'prep-feedback-bad'">{{ currentVerdict.correct ? '✓ Richtig.' : '✗ Nicht ganz.' }}</span>
          <span class="prep-feedback-full">{{ currentVerdict.correction || current.german }}</span>
          <div v-if="canHear" class="hear-row">
            <button class="btn btn-quiet hear-btn" type="button" @click="hearReference">{{ voice.speaking.value ? '● Spricht…' : '🔊 Anhören' }}</button>
            <span class="hear-hint">Leertaste hören · Enter weiter</span>
          </div>
          <span v-if="currentVerdict.tip" class="prep-feedback-tip">💡 {{ currentVerdict.tip }}</span>
          <span v-if="currentVerdict.tags?.length" class="prep-feedback-tags">
            <span v-for="t in currentVerdict.tags" :key="t" class="tag tag-error">{{ t }}</span>
          </span>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.loading-state { text-align: center; padding-top: 120px; }
.quiz-card { max-width: 720px; margin: 0 auto; }
.quiz-meta { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 16px; }
.quiz-counter { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--mute); }
.sentence-progress { margin-bottom: 36px; }
.prompt-card { text-align: center; }
.tense-badge { display: inline-block; max-width: 100%; font-family: var(--font-mono); font-size: 11px; line-height: 1.5; letter-spacing: 0.14em; text-transform: uppercase; color: var(--accent); background: transparent; border: 1px solid currentColor; border-radius: 3px; padding: 2px 8px; margin-bottom: 12px; cursor: pointer; transition: background-color 120ms ease; }
.tense-badge:hover, .tense-badge:focus-visible, .tense-badge.flipped { background-color: var(--accent-tint); }
.en-sentence { font-family: var(--font-display); font-weight: 500; font-size: 30px; line-height: 1.3; letter-spacing: -0.005em; color: var(--ink); }
.en-hint { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--mute); margin-top: 14px; }
.hint { position: relative; cursor: help; text-decoration: underline dotted; text-underline-offset: 4px; border-radius: 2px; padding: 0 1px; transition: background-color 120ms ease; outline: none; }
.hint-verb { text-decoration-color: var(--accent); }
.hint-verb:hover, .hint-verb:focus-visible, .hint-verb.revealed { background-color: var(--accent-tint); }
.hint-noun { text-decoration-color: var(--cobalt); }
.hint-noun:hover, .hint-noun:focus-visible, .hint-noun.revealed { background-color: var(--cobalt-tint); }
.hint-pop { position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%) translateY(-6px); max-width: min(80vw, 260px); white-space: normal; text-align: center; font-family: var(--font-mono); font-size: 13px; line-height: 1.2; padding: 4px 8px; border-radius: 4px; background: var(--paper-card, #fff); color: var(--ink); border: 1px solid var(--rule); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18); pointer-events: none; opacity: 0; visibility: hidden; transition: opacity 120ms ease; z-index: 2; }
.hint:hover .hint-pop, .hint:focus-visible .hint-pop, .hint.revealed .hint-pop { opacity: 1; visibility: visible; }
.prep-input-wrap { display: flex; gap: 12px; align-items: flex-end; margin-top: 36px; }
.prep-input { flex: 1; text-align: center; font-size: 22px; border: 0; border-bottom: 2px solid var(--rule); padding: 8px 0; }
.prep-input:focus { border-bottom-color: var(--accent); outline: none; }
/* Spoken composer — replaces .prep-input-wrap entirely (see VerbSentenceRunner
   header comment). .mic-transcript reuses .prep-input's type so the two
   composers read as the same drill. */
.mic-wrap { margin-top: 36px; text-align: center; }
.mic-live-badge { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--danger); margin-bottom: 8px; }
.mic-transcript { min-height: 1.3em; }
.mic-placeholder { color: var(--mute); font-style: italic; }
.mic-row { display: flex; gap: 14px; align-items: center; justify-content: center; margin-top: 18px; flex-wrap: wrap; }
.mic-btn { min-width: 190px; justify-content: center; }
.mic-hint { color: var(--mute); font-size: 13px; font-style: italic; }
.prep-feedback { margin-top: 18px; text-align: center; display: flex; flex-direction: column; gap: 8px; }
.prep-feedback-mark { font-family: var(--font-display); font-style: italic; font-size: 17px; }
.prep-feedback-ok { color: var(--success); }
.prep-feedback-bad { color: var(--danger); }
.prep-feedback-full { font-family: var(--font-display); font-size: 18px; color: var(--ink); }
.hear-row { display: flex; gap: 14px; align-items: center; justify-content: center; }
.hear-hint { color: var(--mute); font-size: 13px; font-style: italic; }
.prep-feedback-tip { font-size: 14px; color: var(--ink-soft); }
.prep-feedback-tags { margin-top: 4px; display: inline-flex; flex-wrap: wrap; gap: 6px; justify-content: center; }
.tag.tag-error { background: var(--danger-tint); color: var(--danger); }
.result-page { max-width: 880px; }
.result-rows { display: flex; flex-direction: column; gap: 12px; margin: 24px 0; }
.result-row { border: 1px solid var(--rule); border-left: 3px solid var(--rule); border-radius: 3px; padding: 14px 16px; }
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
.rr-label { display: inline-block; min-width: 56px; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--mute); }
.setup-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 32px; gap: 16px; }
.result-cta { display: flex; gap: 12px; }
@media (max-width: 720px) { .en-sentence { font-size: clamp(20px, 6vw, 26px); } .setup-actions { flex-direction: column-reverse; align-items: stretch; } .result-cta { flex-direction: column; } .setup-actions .btn { justify-content: center; } }
</style>
