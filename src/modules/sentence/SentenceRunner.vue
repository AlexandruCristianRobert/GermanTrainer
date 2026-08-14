<script setup lang="ts">
// Sentence module (Kapitel XII) — packed-sentence runner.
// Transposes SnaRunner from docs/design_handoff_sentence_module/sentence-a.jsx
// (Variant A · „Das Register") onto the real usePackedSentenceQuiz data model.
// Structural model: src/modules/verbs/VerbSentenceRunner.vue (stash load +
// error state, progressive generation wiring, phase machine, spoken modality,
// window-level onKey, historySaved guard) — this file mirrors that shape and
// only differs where the grill decisions (CONTEXT.md → "Run", "Word hint")
// require it: hybrid hint reveal, per-item grading, all-or-nothing scoring,
// and practice rounds that are never recorded.
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { shuffle } from '../../data/pool'
import { CONN_PLACEMENT, isPair } from '../../data/connectors'
import { checkSentence, type Direction } from '../../composables/useSentenceQuiz'
import {
  generatePackedBatch, gradePackedAnswer, gradePackedMeaning, localCheckPackedCard,
  verdictOf, buildPackedSegments, buildPackedMetaItems, aggregateOutcomes, rektShort,
  prepCaseShort, dacSolution, PACKED_CATS, pendingPluralWrites,
  type PackedCardSpec, type PackedItemSpec, type PackedCategory, type PackedCounts,
  type GeneratedPackedCard, type PackedVerdict, type CardOutcome, type PackedHintBadge
} from '../../composables/usePackedSentenceQuiz'
import { planRampBatches, generateProgressively } from '../../composables/useProgressiveGenerator'
import { saveQuizRun } from '../../composables/useQuizHistory'
import { useNouns } from '../../composables/useNouns'
import { useSettings } from '../../composables/useSettings'
import { resolveAiClient } from '../../composables/localClaude'
import { useSpeechRecognizer } from '../../composables/useSpeechRecognizer'
import { useSpeechVoice } from '../../composables/useSpeechVoice'
import { useToast } from '../../composables/useToast'
import { useSound } from '../../composables/useSound'
import { useDailyDomainGoal } from '../../composables/useDailyDomainGoal'
import SentenceResult from './SentenceResult.vue'

const STASH_KEY = 'gt:lastPackedSentenceQuiz'
const router = useRouter()
const { settings, load: loadSettings } = useSettings()
const { setPlural } = useNouns()
const toast = useToast()
const sound = useSound()
const dailyGoal = useDailyDomainGoal()
const recognizer = useSpeechRecognizer('de-DE')
const voice = useSpeechVoice()
let chimed = false

interface StashMeta {
  counts: PackedCounts
  verbLevels: string[]; verbTypes: string[]; verbCases: string[]
  nounGroups: string[]; prepCases: string[]
  connFamilies: string[]; connWords: string[]
  domains: string[]
}
interface Stash {
  specs: PackedCardSpec[]
  direction: Direction
  modality?: 'typed' | 'spoken'
  wordHints?: boolean
  level?: string
  meta?: StashMeta
}

const CAT_META: Record<PackedCategory, { color: string }> = {
  verb: { color: 'var(--sage)' },
  noun: { color: 'var(--cobalt)' },
  prep: { color: 'var(--ochre)' },
  dac: { color: 'var(--clay)' },
  conn: { color: 'var(--ink-soft)' }
}

const SN_VERDICT: Record<PackedVerdict, string> = { ok: 'Richtig', part: 'Teils richtig', no: 'Daneben' }

const error = ref<string | null>(null)
const expected = ref(0)                    // requested card count for the main round
const deck = ref<GeneratedPackedCard[]>([])
const generationDone = ref(false)
const direction = ref<Direction>('en-de')
const level = ref('B1/B2')
const wordHints = ref(true)
const metaInfo = ref<StashMeta | undefined>(undefined)

const startedAt = ref(0)
const historySaved = ref(false)
const practice = ref(false)
const mainOutcomes = ref<CardOutcome[]>([])   // frozen once the main round finishes
const retryModalOpen = ref(false)

const index = ref(0)
const userInput = ref('')
const phase = ref<'input' | 'checking' | 'graded'>('input')
const finished = ref(false)
const awaitingNext = ref(false)
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const nextBtnRef = ref<HTMLButtonElement | null>(null)

const outcomes = ref<Map<number, CardOutcome>>(new Map())

// Fixed for the run, from the stash — see VerbSentenceRunner's identical comment.
const spoken = ref(false)
/** True from the start of endAndSubmit() until it resolves — see VerbSentenceRunner. */
const ending = ref(false)

const lit = ref<string | null>(null)
const revealedKeys = ref<Set<string>>(new Set())

const total = computed(() => expected.value)
const current = computed<GeneratedPackedCard | null>(() => deck.value[index.value] ?? null)
const currentOutcome = computed<CardOutcome | null>(() => outcomes.value.get(index.value) ?? null)
const isLastOfRound = computed(() => index.value + 1 >= deck.value.length && generationDone.value)
const showStream = computed(() => !current.value || awaitingNext.value)
const shortfall = computed(() => !practice.value && generationDone.value && deck.value.length > 0 && deck.value.length < expected.value)
const wrongMainCount = computed(() => mainOutcomes.value.filter(o => o.verdict !== 'ok').length)

// TTS is EN→DE only (the German reference is what gets read aloud) and needs
// a German voice, same bar Sprechen/VerbSentenceRunner apply.
const canHear = computed(() => voice.supported && voice.voices.value.length > 0 && direction.value === 'en-de')

const sourceSizeClass = computed(() => {
  const s = current.value?.sents ?? 1
  return s >= 3 ? 's4' : s === 2 ? 's2' : 's1'
})

const composerRows = computed(() => {
  const c = current.value
  if (!c) return 2
  return direction.value === 'de-en' || c.sents === 1 ? 2 : c.sents
})

/** Card counts by category, German copy, connector NEVER named — grill
 *  decision, see manifest strip spec. */
function manifestParts(card: GeneratedPackedCard): string[] {
  const n: PackedCounts = { verb: 0, noun: 0, prep: 0, dac: 0, conn: 0 }
  for (const it of card.items) n[it.cat]++
  const parts: string[] = []
  if (n.verb) parts.push(`${n.verb} ${n.verb === 1 ? 'Verb' : 'Verben'}`)
  if (n.noun) parts.push(`${n.noun} Nomen`)
  if (n.prep) parts.push(`${n.prep} ${n.prep === 1 ? 'Präposition' : 'Präpositionen'}`)
  if (n.dac) parts.push(`${n.dac} ${n.dac === 1 ? 'da-Kompositum' : 'da-Komposita'}`)
  if (n.conn) parts.push(n.conn === 1 ? '1 Konnektor' : `${n.conn} Konnektoren`)
  return parts
}
const manifestPartsList = computed(() => current.value ? manifestParts(current.value) : [])
const domainLabel = computed(() => current.value?.domain?.label ?? null)

// Full reveal (CONTEXT.md → "Word hint"): every span carries a German popover
// — drilled items with case/word-order info, incidental nouns with their
// article. DE→EN shows the plain German source with no spans at all — there
// is nothing to hint at.
const segments = computed(() => {
  const c = current.value
  if (!c) return []
  if (direction.value === 'de-en') return [{ text: c.german }]
  if (!wordHints.value) return [{ text: c.english }]
  return buildPackedSegments(c.english, c)
})

function isPairKey(key: string): boolean {
  const it = current.value?.items.find(i => i.key === key)
  return !!(it?.cat === 'conn' && it.conn && isPair(it.conn))
}

function toggleRevealed(key: string) {
  const next = new Set(revealedKeys.value)
  if (next.has(key)) next.delete(key); else next.add(key)
  revealedKeys.value = next
}

/** Keeps a span's popover inside the viewport (body clips overflow-x): when
 *  its natural centered position pokes past an edge, shift it back via
 *  --pop-dx. Measured while still invisible — visibility:hidden keeps layout. */
function clampPop(e: Event) {
  const host = e.currentTarget as HTMLElement | null
  const pop = host?.querySelector<HTMLElement>('.sn-pop')
  if (!pop) return
  pop.style.removeProperty('--pop-dx')
  const r = pop.getBoundingClientRect()
  if (r.width === 0) return
  const inset = 8
  let dx = 0
  if (r.left < inset) dx = inset - r.left
  else if (r.right > window.innerWidth - inset) dx = window.innerWidth - inset - r.right
  if (dx !== 0) pop.style.setProperty('--pop-dx', `${dx}px`)
}

function litSpan(key: string, e: Event) {
  lit.value = key
  clampPop(e)
}

function revealSpan(key: string, e: Event) {
  toggleRevealed(key)
  clampPop(e)
}

function pipClass(i: number): string {
  const o = outcomes.value.get(i)
  if (o) return o.verdict === 'ok' ? 'done' : o.verdict === 'part' ? 'part' : 'wrong'
  return i === index.value ? 'current' : ''
}

/** German solution text for one item — verb infinitive, noun with article,
 *  preposition + governed case, the da-compound with the collocation it comes
 *  from, or the connector ("… " display form for a pair). What a connector
 *  does to the clause rides along as badges, not here. */
function itemSolution(it: PackedItemSpec): string {
  if (it.cat === 'verb' && it.verb) return it.verb.german
  if (it.cat === 'noun' && it.noun) return `${it.noun.article} ${it.noun.german}`
  if (it.cat === 'prep' && it.prep) return `${it.prep.german} + ${prepCaseShort(it.prep.case)}`
  if (it.cat === 'dac' && it.colloc) return dacSolution(it.colloc)
  if (it.cat === 'conn' && it.conn) return it.conn.display
  return ''
}

/** Clause + position badges for a connector item in the graded list; a pair
 *  names each part, since its two halves can place differently. */
function connBadges(it: PackedItemSpec): PackedHintBadge[] {
  if (it.cat !== 'conn' || !it.conn) return []
  const named = isPair(it.conn)
  return it.conn.parts.flatMap(p => {
    const pl = CONN_PLACEMENT[p.behavior]
    return [
      { text: named ? `${p.text}: ${pl.clause}` : pl.clause, tone: pl.clause === 'NZ' ? 'nz' : 'hz' } as PackedHintBadge,
      { text: `Pos. ${pl.position}`, tone: 'pos' } as PackedHintBadge
    ]
  })
}

function rektBadge(it: PackedItemSpec): string | null {
  if (it.cat !== 'verb' || !it.verb) return null
  const short = rektShort(it.verb.case)
  return short ? `${it.verb.german} + ${short}` : null
}

function spanTextFor(key: string): string {
  const c = current.value
  if (!c) return ''
  return c.spans.filter(s => s.key === key).map(s => s.en).join(' … ')
}

function itemOk(key: string): boolean {
  return currentOutcome.value?.items?.find(r => r.key === key)?.correct ?? false
}
function itemTags(key: string): string[] {
  const r = currentOutcome.value?.items?.find(r => r.key === key)
  if (!r || r.correct) return []
  return r.tags ?? []
}
function okCountOf(o: CardOutcome): number {
  return o.items ? o.items.filter(r => r.correct).length : 0
}
function verdictColor(v: PackedVerdict): string {
  return v === 'ok' ? 'var(--success)' : v === 'part' ? 'var(--ochre)' : 'var(--danger)'
}

onMounted(async () => {
  await loadSettings()
  let stash: Stash | null = null
  try {
    const raw = sessionStorage.getItem(STASH_KEY)
    if (!raw) { error.value = 'Keine Runde in dieser Sitzung. Zurück zur Einrichtung.'; return }
    stash = JSON.parse(raw) as Stash
  } catch (e) { error.value = e instanceof Error ? e.message : 'Laden fehlgeschlagen.'; return }
  if (!stash || !Array.isArray(stash.specs) || stash.specs.length === 0) { error.value = 'Keine Kartenwünsche in dieser Sitzung.'; return }

  expected.value = stash.specs.length
  direction.value = stash.direction === 'de-en' ? 'de-en' : 'en-de'
  level.value = stash.level ?? 'B1/B2'
  wordHints.value = direction.value === 'en-de' && stash.wordHints !== false
  metaInfo.value = stash.meta
  // A stash that says 'spoken' still falls back to typed when the browser has
  // no SpeechRecognition, or the direction is DE→EN (setup never offers it
  // there) — the runner does not trust the stash blindly.
  spoken.value = stash.modality === 'spoken' && recognizer.supported && direction.value === 'en-de'
  window.addEventListener('keydown', onKey)
  startedAt.value = Date.now()

  const client = resolveAiClient(settings.value)
  // Packed cards are heavy — a smaller ramp than the verb-sentence [1,2,5]/10.
  const batches = planRampBatches(stash.specs, [1, 2], 3)
  generateProgressively<PackedCardSpec, GeneratedPackedCard>({
    batches,
    runBatch: async (batch) => {
      const res = await generatePackedBatch(client, { model: settings.value.model, specs: batch, level: level.value, maxRetries: 1 })
      return res.cards
    },
    onResults: (cards) => {
      // Read off the raw `cards` before they enter deck and turn reactive —
      // a Vue proxy is not structured-cloneable and Dexie rejects it silently
      // (see useVortrag's `plain()`). Fire-and-forget: a failed cache write
      // must never break a card.
      for (const c of cards) {
        for (const w of pendingPluralWrites(c)) setPlural(w.german, w.plural).catch(() => {})
      }
      for (const c of cards) deck.value.push(c)
      if (!chimed && deck.value.length > 0) { chimed = true; sound.playReady() }
      if (awaitingNext.value) tryAdvance()
      nextTick(() => { if (!spoken.value && deck.value.length === cards.length) textareaRef.value?.focus() })
    },
    concurrency: 4
  }).finally(() => {
    generationDone.value = true
    if (deck.value.length === 0) error.value = 'Das Modell hat keine brauchbaren Karten geliefert. Zurück zur Einrichtung und nochmal versuchen.'
    if (awaitingNext.value) tryAdvance()
  })
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  recognizer.abort()
  voice.cancel()
})

// Denied is terminal for voice — see VerbSentenceRunner's identical watch.
watch(recognizer.error, err => {
  if (err?.kind !== 'denied') return
  spoken.value = false
  toast.error('Kein Mikrofonzugriff', {
    description: 'Der Rest des Tests läuft jetzt getippt weiter — deine bisherigen Antworten bleiben erhalten.'
  })
  nextTick(() => textareaRef.value?.focus())
})

async function submit() {
  if (!current.value || phase.value !== 'input') return
  if (userInput.value.trim().length === 0) return
  const i = index.value
  const card = current.value
  phase.value = 'checking'

  let items: CardOutcome['items'] = null
  let verdict: PackedVerdict
  let tip: string | undefined
  let offline = false

  if (direction.value === 'en-de') {
    try {
      const grade = await gradePackedAnswer(resolveAiClient(settings.value), {
        model: settings.value.model, card, userAnswer: userInput.value, spoken: spoken.value
      })
      items = grade.items
      tip = grade.tip
    } catch {
      items = localCheckPackedCard(userInput.value, card)
      tip = undefined
      offline = true
      toast.info('Offline bewertet', { description: 'KI-Bewertung nicht erreichbar — lokale Prüfung per Wortabgleich, ohne Coaching-Tipp.' })
    }
    verdict = verdictOf(items)
  } else {
    try {
      const g = await gradePackedMeaning(resolveAiClient(settings.value), { model: settings.value.model, card, userAnswer: userInput.value })
      verdict = g.correct ? 'ok' : 'no'
      tip = g.tip
    } catch {
      verdict = checkSentence(userInput.value, card.english) ? 'ok' : 'no'
      tip = undefined
      offline = true
    }
    items = null
  }

  const entry: CardOutcome = { card, answer: userInput.value, verdict, items, tip, offline }
  outcomes.value.set(i, entry)
  outcomes.value = new Map(outcomes.value)
  phase.value = 'graded'
  // Daily Fachgebiet goal: every graded Fachgebiet card counts — both
  // directions, main AND practice rounds (effort, not proficiency). Quiz
  // HISTORY stays untouched (recordHistoryOnce/saveQuizRun below).
  if (card.domain) dailyGoal.recordCard()
  nextTick(() => nextBtnRef.value?.focus())
}

/** Record the main round exactly once (historySaved stays true for the rest
 *  of the component's life — practice rounds never call this). */
function recordHistoryOnce() {
  if (historySaved.value) return
  historySaved.value = true
  const cards = deck.value
  const list = cards.map((_, i) => outcomes.value.get(i)!).filter((o): o is CardOutcome => !!o)
  mainOutcomes.value = list
  const resultsByIndex = new Map(cards.map((c, i) => [c.index, list[i]?.items ?? []]))
  const metaItems = direction.value === 'en-de'
    ? buildPackedMetaItems(cards, resultsByIndex)
    : { verbSentenceItems: [], sentenceItems: [], dacSentenceItems: [], packedConnItems: [] }
  const agg = aggregateOutcomes(list)
  const packedItemsOk = PACKED_CATS.reduce((s, c) => s + agg.cat[c].ok, 0)
  const packedItemsTotal = PACKED_CATS.reduce((s, c) => s + agg.cat[c].n, 0)
  const finishedAt = Date.now()
  saveQuizRun({
    type: 'sentence-packed',
    startedAt: new Date(startedAt.value).toISOString(),
    finishedAt: new Date(finishedAt).toISOString(),
    durationMs: finishedAt - startedAt.value,
    count: cards.length,
    correct: list.filter(o => o.verdict === 'ok').length,
    meta: {
      packedCounts: metaInfo.value?.counts,
      packedDirection: direction.value,
      packedModality: spoken.value ? 'spoken' : 'typed',
      packedHints: wordHints.value,
      packedDomains: metaInfo.value?.domains?.length ? metaInfo.value.domains : undefined,
      packedItemsOk,
      packedItemsTotal,
      ...metaItems,
      verbSentenceLevels: metaInfo.value?.verbLevels,
      verbSentenceTypes: metaInfo.value?.verbTypes,
      verbSentenceCases: metaInfo.value?.verbCases,
      sentenceGroups: metaInfo.value?.nounGroups
    }
  })
}

/** The current round (main or practice) just ran out of cards. Main rounds
 *  record once, then either open the retry modal (something was wrong) or go
 *  straight to the result. Practice rounds never record and always go
 *  straight to the result, showing the frozen main-round outcomes. */
function finishRound() {
  voice.cancel()
  if (!practice.value) {
    recordHistoryOnce()
    if (wrongMainCount.value > 0) { retryModalOpen.value = true; return }
  }
  finished.value = true
}

function tryAdvance() {
  voice.cancel() // a half-spoken card must never bleed into the next one
  if (index.value + 1 < deck.value.length) {
    index.value++
    userInput.value = ''
    phase.value = 'input'
    awaitingNext.value = false
    revealedKeys.value = new Set()
    lit.value = null
    nextTick(() => { if (!spoken.value) textareaRef.value?.focus() })
  } else if (generationDone.value) {
    finishRound()
  } else {
    awaitingNext.value = true // wait; onResults/finally will re-call tryAdvance
  }
}

function next() {
  if (phase.value !== 'graded') return
  tryAdvance()
}

function grow(e: Event) {
  const el = e.target as HTMLTextAreaElement
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

// Chat convention: Enter submits, Shift+Enter is the newline a multi-sentence
// card needs. Ctrl/Cmd+Enter still submits — it falls through the same path
// since shiftKey is false. isComposing is guarded so an IME candidate-commit
// Enter does not submit.
function onComposerKey(e: KeyboardEvent) {
  if (e.key !== 'Enter' || e.isComposing || e.shiftKey) return
  e.preventDefault()
  void submit()
}

/** Replays the German reference — never the learner's own answer. */
function hearReference() {
  if (phase.value !== 'graded' || !current.value || !canHear.value) return
  voice.cancel()
  void voice.speak(current.value.german)
}

/** One window-level handler for Space and Enter, evaluated in this exact
 *  order — see VerbSentenceRunner.onKey for the full rationale. */
function onKey(e: KeyboardEvent) {
  if (e.code !== 'Space' && e.code !== 'Enter') return
  if (e.repeat) return
  const el = e.target as HTMLElement | null
  if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return
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
 *  wrong answer — nothing is graded, the learner stays on the card. */
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

/** Starts a practice round on the given cards — used by both the retry modal
 *  ("Fehler üben") and the result view's @practice. Never recorded: the
 *  historySaved guard is never reset. */
function startPractice(cards: GeneratedPackedCard[]) {
  if (cards.length === 0) return
  voice.cancel()
  retryModalOpen.value = false
  deck.value = shuffle(cards)
  outcomes.value = new Map()
  practice.value = true
  generationDone.value = true
  expected.value = deck.value.length
  index.value = 0
  userInput.value = ''
  phase.value = 'input'
  finished.value = false
  awaitingNext.value = false
  revealedKeys.value = new Set()
  lit.value = null
  nextTick(() => { if (!spoken.value) textareaRef.value?.focus() })
}

function retryWrong() {
  startPractice(mainOutcomes.value.filter(o => o.verdict !== 'ok').map(o => o.card))
}

function goToResult() {
  retryModalOpen.value = false
  finished.value = true
}

/** Quiet "end round" button: main round goes back to setup, a practice round
 *  goes to the result — it has nothing of its own to lose (CONTEXT.md → "Run"). */
function endRound() {
  voice.cancel()
  if (practice.value) finished.value = true
  else router.push({ name: 'sentence' })
}

// If we were waiting and generation finished with nothing more, finish.
watch([deck, generationDone], () => { if (awaitingNext.value) tryAdvance() }, { deep: true })
</script>

<template>
  <div v-if="error" class="page">
    <div class="alert alert-danger"><span class="alert-label">Fehler</span>{{ error }}</div>
    <button class="btn btn-ghost" type="button" @click="router.push({ name: 'sentence' })">← Zurück zur Einrichtung</button>
  </div>

  <div v-else-if="finished" class="page">
    <SentenceResult :history="mainOutcomes" :direction="direction" @restart="router.push({ name: 'sentence' })" @practice="startPractice" />
  </div>

  <div v-else-if="retryModalOpen" class="sn-modal-back">
    <div class="sn-modal" role="dialog" aria-modal="true">
      <div class="micro-mark" style="margin-bottom: 12px">Runde beendet</div>
      <h3 class="sn-modal-t">{{ wrongMainCount }} {{ wrongMainCount === 1 ? 'Karte ging' : 'Karten gingen' }} daneben<em>.</em></h3>
      <p class="sn-modal-p">Eine Übungsrunde wiederholt nur diese Karten — sie wird nicht gewertet.</p>
      <div class="sn-modal-a">
        <button class="btn btn-ghost" type="button" @click="goToResult">Zur Auswertung</button>
        <button class="btn btn-accent" type="button" @click="retryWrong">Fehler üben · {{ wrongMainCount }} {{ wrongMainCount === 1 ? 'Karte' : 'Karten' }} →</button>
      </div>
    </div>
  </div>

  <div v-else class="page">
    <div class="sna-run">
      <div class="quiz-meta">
        <span class="quiz-counter">Karte {{ index + 1 }} · von {{ total }}<template v-if="practice"> — Übungsrunde, wird nicht gewertet</template></span>
        <button class="btn btn-quiet" type="button" @click="endRound">Runde beenden</button>
      </div>

      <div class="quiz-progress-bar sn-pips">
        <span v-for="i in total" :key="i" class="pip" :class="pipClass(i - 1)"></span>
      </div>

      <div v-if="shortfall" class="alert alert-warning">
        <span class="alert-label">Engpass</span>
        Nur {{ deck.length }} von {{ expected }} Karten konnten generiert werden — der Pool gab nicht mehr her.
      </div>

      <div v-if="showStream" class="sn-stream">
        <div class="sn-stream-t">{{ deck.length === 0 ? 'Karte wird geschrieben' : 'Nächste Karte wird geschrieben' }}</div>
        <div class="sn-stream-b"><i></i><i></i><i></i></div>
      </div>

      <template v-else-if="current">
        <div v-if="direction === 'en-de' && phase !== 'graded'" class="sna-manifest">
          <span class="m-l">Gesucht</span>
          <span v-if="domainLabel" class="micro-mark">{{ domainLabel }}</span>
          <template v-for="(p, i) in manifestPartsList" :key="i">
            <span class="m-p">{{ p }}</span>
            <span v-if="i < manifestPartsList.length - 1" class="m-s">·</span>
          </template>
          <span v-if="current.sents >= 3" class="m-s" style="margin-left: auto; font-style: italic">Kurztext · {{ current.sents }} Sätze</span>
        </div>
        <div v-if="direction === 'de-en' && phase !== 'graded'" style="height: 20px"></div>

        <div v-if="phase !== 'graded'" class="sn-src" :class="sourceSizeClass" @mouseleave="lit = null">
          <template v-for="(seg, i) in segments" :key="i">
            <span
              v-if="seg.item"
              class="sn-i"
              :data-cat="seg.item.cat"
              :class="{ lit: lit === seg.item.key, 'has-pop': !!seg.item.hint, revealed: revealedKeys.has(seg.item.key), extra: !!seg.item.extra }"
              :tabindex="seg.item.hint ? 0 : undefined"
              @mouseenter="litSpan(seg.item.key, $event)"
              @focusin="clampPop($event)"
              @click="seg.item.hint && revealSpan(seg.item.key, $event)"
              @keydown.enter.prevent="seg.item.hint && revealSpan(seg.item.key, $event)"
              @keydown.space.prevent="seg.item.hint && revealSpan(seg.item.key, $event)"
            >{{ seg.text }}<sup v-if="isPairKey(seg.item.key)" class="sn-pairmark">¹</sup><span v-if="seg.item.hint" class="sn-pop"><span v-for="(l, li) in seg.item.hint" :key="li" class="sn-pop-l"><span class="sn-pop-w">{{ l.text }}</span><span v-if="l.badges" class="sn-pop-b"><span v-for="b in l.badges" :key="b.text" class="sn-badge" :class="b.tone">{{ b.text }}</span></span><span v-if="l.note" class="sn-pop-n">{{ l.note }}</span></span></span></span>
            <template v-else>{{ seg.text }}</template>
          </template>
        </div>

        <div v-if="phase === 'input' || phase === 'checking'" class="sna-answer">
          <template v-if="phase === 'checking'">
            <div class="sn-ta" style="color: var(--mute)">{{ userInput }}</div>
            <div class="sn-foot"><span class="sn-stream-t" style="font-style: normal">KI bewertet</span></div>
          </template>
          <template v-else-if="spoken">
            <div class="sn-rec">
              <button type="button" class="sn-rec-btn" :class="{ live: recognizer.listening.value || ending }" @click="toggleMic">{{ (recognizer.listening.value || ending) ? '■' : '●' }}</button>
              <div class="sn-rec-t">
                <template v-if="recognizer.listening.value">Aufnahme läuft … Leertaste beendet und reicht automatisch ein.</template>
                <template v-else-if="userInput">Transkript: „{{ userInput }}"</template>
                <template v-else>Leertaste oder Knopf: Aufnahme starten. Sprich die ganze Übersetzung — auch mehrere Sätze.</template>
              </div>
            </div>
          </template>
          <template v-else>
            <textarea
              ref="textareaRef" class="sn-ta" :rows="composerRows"
              :placeholder="direction === 'de-en' ? 'Deine englische Übersetzung …' : 'Deine deutsche Übersetzung — gern mehrere Sätze …'"
              v-model="userInput" @input="grow" @keydown="onComposerKey"
            ></textarea>
            <div class="sn-foot">
              <span class="sn-kbd"><span class="kbd">Enter</span> reicht ein · <span class="kbd">Umschalt</span>+<span class="kbd">Enter</span> = neue Zeile</span>
              <button class="btn btn-accent" type="button" :disabled="!userInput.trim()" @click="submit">Einreichen →</button>
            </div>
          </template>
        </div>

        <div v-if="phase === 'graded' && currentOutcome">
          <div class="sna-sticky">
            <div class="sna-rev-h compact">
              <span class="sn-verdict" :class="'v-' + currentOutcome.verdict">
                {{ SN_VERDICT[currentOutcome.verdict] }}<template v-if="currentOutcome.items"> · {{ okCountOf(currentOutcome) }} / {{ currentOutcome.items.length }} Items</template>
              </span>
              <span v-if="currentOutcome.offline" class="sn-off" title="KI-Bewertung fehlgeschlagen — lokale Prüfung">offline bewertet</span>
              <span v-if="direction === 'en-de'" style="margin-left: auto">
                <button class="sn-tts" type="button" title="Anhören" @click="hearReference">▶ Anhören</button>
              </span>
            </div>
            <div class="sna-st-r"><span class="sna-st-l">Quelle</span><span class="sna-st-t">{{ direction === 'de-en' ? current.german : current.english }}</span></div>
            <div class="sna-st-r"><span class="sna-st-l">Du</span><span class="sna-st-t you" :style="{ color: verdictColor(currentOutcome.verdict) }">{{ currentOutcome.answer }}</span></div>
            <div class="sna-st-r"><span class="sna-st-l">Referenz</span><span class="sna-st-t ref">{{ direction === 'de-en' ? current.english : current.german }}</span></div>
          </div>

          <p v-if="!currentOutcome.offline" class="sna-tip">{{ currentOutcome.tip }}</p>
          <p v-else class="sna-tip">KI-Bewertung nicht erreichbar — lokale Prüfung per Wortabgleich, ohne Coaching-Tipp.</p>
          <p v-if="direction === 'de-en'" class="grading-hint">Nur Bedeutungs-Bewertung — keine Fehler-Tags in DE → EN.</p>

          <div v-if="currentOutcome.items" class="sna-list">
            <div v-for="it in current.items" :key="it.key" class="sna-row compact">
              <span class="sn-check" :class="itemOk(it.key) ? 'ok' : 'no'">{{ itemOk(it.key) ? '✓' : '✗' }}</span>
              <span class="r-dot" :style="{ background: CAT_META[it.cat].color }"></span>
              <span class="r-en">{{ spanTextFor(it.key) }}</span>
              <span class="r-sol">{{ itemSolution(it) }}</span>
              <span class="r-meta">
                <span v-if="rektBadge(it)" class="sn-rekt">{{ rektBadge(it) }}</span>
                <span v-for="b in connBadges(it)" :key="b.text" class="sn-badge" :class="b.tone">{{ b.text }}</span>
                <span v-if="!itemOk(it.key) && itemTags(it.key).length" class="sn-tags">
                  <span v-for="t in itemTags(it.key)" :key="t" class="sn-tag">{{ t }}</span>
                </span>
              </span>
            </div>
          </div>

          <div class="quiz-actions">
            <span class="micro-mark"><span class="kbd">Enter</span> — weiter</span>
            <button ref="nextBtnRef" type="button" class="btn btn-accent" @click="next">{{ isLastOfRound ? 'Runde abschließen' : 'Nächste Karte' }} <span aria-hidden="true">→</span></button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
