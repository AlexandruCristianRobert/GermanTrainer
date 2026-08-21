<script setup lang="ts">
// Task 11 — Wiederholsitzung: the Wortschatz module's core drill loop (see
// CONTEXT.md → "Wiederholsitzung", ADR-0027). The due queue is interleaved
// across all Themenfelder — mixing fields is the point — and every Vokabel is
// served in its current Vokabelstufe's format.
//
// Two invariants this file is built around:
//
//  * ONE outcome per card. Every card gates its own 'answered' behind an
//    internal „Weiter", but a card can still emit twice (a double click on
//    that button), so `commit()` is guarded twice over: `committing` rejects a
//    second emit inside the same item, and the item-identity check rejects a
//    late emit from a card that has already been advanced past. The per-item
//    handler closures in `cardHandlers` are what make that identity check
//    possible — they capture the ServedItem, not the reactive index.
//
//  * The served Stufe, not the stored one, is what the scheduler is told. An
//    Anwendung item served as Abruf offline passes servedStufe 'abruf', and
//    applyOutcome then deliberately withholds promotion (ADR-0027).
//
// Progress rows are plain objects throughout: `items` is a shallowRef, so the
// VokabelProgress objects inside it are never wrapped in a Vue proxy (Dexie's
// structured clone rejects proxies silently — project rule).
import { computed, onMounted, ref, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import { useSettings } from '../../composables/useSettings'
import { resolveAiClient } from '../../composables/localClaude'
import { useToast } from '../../composables/useToast'
import {
  dueVokabeln, saveProgress, allVokabeln, loadExtraSaetze, saveExtraSaetze
} from '../../composables/useWortschatzProgress'
import { buildWiederholQueue, pickErkennenOptions } from '../../composables/wortschatzQueue'
import { applyOutcome, type AnswerOutcome, type VokabelProgress } from '../../composables/wortschatzScheduler'
import { gradeVokabelAnswer } from '../../composables/wortschatzGrading'
import { judgeRescue, gradeAnwendung, generateExtraSaetze } from '../../composables/useWortschatzAi'
import { saveQuizRun } from '../../composables/useQuizHistory'
import {
  STUFEN, STUFE_LABEL, clozeParts, type KontextSatz, type Stufe, type Vokabel
} from '../../data/wortschatz'
import ErkennenCard from './ErkennenCard.vue'
import LueckeCard from './LueckeCard.vue'
import AbrufCard from './AbrufCard.vue'
import AnwendungCard from './AnwendungCard.vue'

/** One sitting never serves more than this many due items. */
const SITTING_CAP = 20
/** Fresh Lücke sentences generated per sitting at most (background enrichment). */
const EXTRA_SAETZE_PER_SITTING = 2
const GRADE_FAILED_FEEDBACK = 'Bewertung fehlgeschlagen — Antwort zählt nicht'

interface AnwendungResult { correct: boolean; feedback: string; korrektur?: string }

/** A due Vokabel prepared for exactly one card render. `p` is the progress row
 *  as it stood when the item was served; `servedStufe` is the format actually
 *  rendered, which is what the scheduler is told. */
interface ServedItem {
  v: Vokabel
  p: VokabelProgress
  servedStufe: Stufe
  satz: KontextSatz | null   // Lücke only — passed through with its blankVariants
  options: string[]          // Erkennen only
}

const router = useRouter()
const { settings, canUseAi, load: loadSettings } = useSettings()
const toast = useToast()

const loading = ref(true)
const error = ref<string | null>(null)
const items = shallowRef<ServedItem[]>([])
const overflow = ref(0)
const index = ref(0)
const finished = ref(false)
const startedAt = ref(0)

const grading = ref(false)
const anwResult = ref<AnwendungResult | null>(null)
const gradeFailed = ref(false)

const answers = shallowRef<Array<{ stufe: Stufe; outcome: AnswerOutcome }>>([])
const skipped = ref(0)
const newlyGefestigt = shallowRef<string[]>([])

let committing = false
let historySaved = false
let extrasGenerated = 0

const total = computed(() => items.value.length)
const current = computed<ServedItem | null>(() => items.value[index.value] ?? null)
const servedBelowStufe = computed(() =>
  current.value !== null && current.value.servedStufe !== current.value.p.stufe
)

const answeredCount = computed(() => answers.value.length)
const richtig = computed(() => answers.value.filter(a => a.outcome === 'correct').length)
const mitHinweis = computed(() => answers.value.filter(a => a.outcome === 'hint').length)
const falsch = computed(() => answers.value.filter(a => a.outcome === 'wrong').length)

/** Per-Stufe breakdown over the rung each item stood on when it was served. */
const breakdown = computed(() =>
  STUFEN
    .map(stufe => {
      const rows = answers.value.filter(a => a.stufe === stufe)
      return {
        stufe,
        total: rows.length,
        correct: rows.filter(a => a.outcome === 'correct').length
      }
    })
    .filter(r => r.total > 0)
)

// ── Session setup ────────────────────────────────────────────────

/**
 * Background enrichment, never awaited: once a learner has cycled through an
 * item's authored Sätze, the Lücke rotation has nothing new to show, so ask
 * the AI for three more and cache them for the NEXT sitting. Capped per
 * sitting and silent on failure — this sitting works fine without it.
 */
function prefetchExtraSaetze(v: Vokabel): void {
  if (!canUseAi.value || extrasGenerated >= EXTRA_SAETZE_PER_SITTING) return
  extrasGenerated++
  void (async () => {
    try {
      const saetze = await generateExtraSaetze(resolveAiClient(settings.value), settings.value.model, v)
      await saveExtraSaetze(v.id, saetze)
    } catch {
      /* enrichment only — a failed generation is not a session error */
    }
  })()
}

async function serve(v: Vokabel, p: VokabelProgress, pool: Vokabel[]): Promise<ServedItem> {
  const base = { v, p, satz: null, options: [] as string[] }
  if (p.stufe === 'erkennen') {
    return { ...base, servedStufe: 'erkennen', options: pickErkennenOptions(v, pool) }
  }
  if (p.stufe === 'luecke') {
    const extras = await loadExtraSaetze(v.id)
    const all = [...v.saetze, ...extras]
    // No sentence to blank out at all (only reachable for a malformed custom
    // item): fall back to Abruf exactly like the offline Anwendung path, so
    // the served Stufe stays honest and promotion stays blocked.
    if (all.length === 0) return { ...base, servedStufe: 'abruf' }
    if (extras.length === 0 && p.fsrs.reps >= v.saetze.length) prefetchExtraSaetze(v)
    return { ...base, servedStufe: 'luecke', satz: all[p.fsrs.reps % all.length] }
  }
  if (p.stufe === 'abruf') return { ...base, servedStufe: 'abruf' }
  return { ...base, servedStufe: canUseAi.value ? 'anwendung' : 'abruf' }
}

async function start(): Promise<void> {
  loading.value = true
  error.value = null
  index.value = 0
  finished.value = false
  answers.value = []
  skipped.value = 0
  newlyGefestigt.value = []
  grading.value = false
  anwResult.value = null
  gradeFailed.value = false
  committing = false
  historySaved = false
  extrasGenerated = 0
  try {
    const queue = buildWiederholQueue(await dueVokabeln(Date.now()))
    overflow.value = Math.max(0, queue.length - SITTING_CAP)
    const pool = await allVokabeln()
    const served: ServedItem[] = []
    for (const entry of queue.slice(0, SITTING_CAP)) {
      served.push(await serve(entry.v, entry.p, pool))
    }
    items.value = served
    startedAt.value = Date.now()
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  // Awaited, not fire-and-forget: canUseAi decides whether an Anwendung item
  // is served as AnwendungCard or falls back to Abruf, so the queue must not
  // be built before the settings are in.
  await loadSettings()
  await start()
})

// ── Answering ────────────────────────────────────────────────────

function expectedFor(item: ServedItem): string {
  if (item.servedStufe === 'luecke' && item.satz !== null) {
    return clozeParts(item.satz.de)?.blank ?? item.v.de
  }
  return item.v.de
}

async function commit(item: ServedItem, outcome: AnswerOutcome): Promise<void> {
  if (committing || finished.value || item !== current.value) return
  committing = true
  const before = item.p
  // Scheduling and persistence share one try: a throw from either (a corrupt
  // FSRS card, a rejected Dexie write) must never leave `committing` wedged —
  // the sitting counts the answer and moves on either way, it just loses the
  // stored progress for this card.
  try {
    const next = applyOutcome(before, outcome, Date.now(), item.servedStufe)
    item.p = next
    await saveProgress(next)
    if (!before.gefestigt && next.gefestigt) {
      newlyGefestigt.value = [...newlyGefestigt.value, item.v.de]
    }
  } catch (err) {
    toast.error('Fortschritt konnte nicht gespeichert werden', {
      description: err instanceof Error ? err.message : String(err)
    })
  }
  // „Beenden" during that write already closed the sitting and recorded the
  // Run: the scheduler write above stands (it is the source of truth), but the
  // session counters must not move after the summary was computed.
  if (finished.value) {
    committing = false
    return
  }
  answers.value = [...answers.value, { stufe: before.stufe, outcome }]
  advance()
}

/** Leaves the item untouched — no outcome, no reschedule (grading failed). */
function skip(): void {
  skipped.value++
  advance()
}

function advance(): void {
  committing = false
  grading.value = false
  anwResult.value = null
  gradeFailed.value = false
  if (index.value + 1 >= items.value.length) finish()
  else index.value++
}

/**
 * Controller-adjudicated rescue (see task brief): a learnedVariant is accepted
 * locally with no AI call at all; otherwise, online only, the AI is asked
 * whether the answer is an acceptable form of THIS Vokabel. Every path
 * resolves exactly once — a thrown or negative verdict is simply "not
 * rescued", never a silent accept.
 */
function onRescueCheck(item: ServedItem, given: string, resolve: (ok: boolean) => void): void {
  const expected = expectedFor(item)
  if (gradeVokabelAnswer(item.v, expected, given, item.p.learnedVariants).correct) {
    resolve(true)
    return
  }
  if (!canUseAi.value) {
    resolve(false)
    return
  }
  void (async () => {
    try {
      const verdict = await judgeRescue(
        resolveAiClient(settings.value), settings.value.model, item.v, expected, given
      )
      if (!verdict.acceptable) {
        resolve(false)
        return
      }
      const accepted = given.trim()
      const learnedVariants = item.p.learnedVariants.includes(accepted)
        ? item.p.learnedVariants
        : [...item.p.learnedVariants, accepted]
      item.p = { ...item.p, learnedVariants }
      await saveProgress(item.p)
      resolve(true)
    } catch {
      resolve(false)
    }
  })()
}

async function onAnwendungSubmit(item: ServedItem, sentence: string): Promise<void> {
  if (item !== current.value || grading.value) return
  grading.value = true
  gradeFailed.value = false
  anwResult.value = null
  try {
    const graded = await gradeAnwendung(
      resolveAiClient(settings.value), settings.value.model, item.v, sentence
    )
    anwResult.value = graded
  } catch {
    // An ungradeable answer must not count against the item: show the honest
    // failure, then skip WITHOUT applying any outcome (task brief, step 4).
    gradeFailed.value = true
    anwResult.value = { correct: false, feedback: GRADE_FAILED_FEEDBACK }
  } finally {
    // Set after anwResult so AnwendungCard reads a settled verdict, not the
    // "grading failed, re-enable the composer" transition.
    grading.value = false
  }
}

function onAnwendungNext(item: ServedItem): void {
  if (item !== current.value) return
  if (gradeFailed.value) {
    skip()
    return
  }
  const graded = anwResult.value
  if (graded === null) return
  void commit(item, graded.correct ? 'correct' : 'wrong')
}

/** Per-item handler closures: they capture the ServedItem, so a late emit from
 *  an already-advanced card is rejected by commit()'s identity check. */
const cardHandlers = computed(() => {
  const item = current.value
  if (item === null) return null
  return {
    answered: (outcome: AnswerOutcome) => { void commit(item, outcome) },
    rescue: (given: string, resolve: (ok: boolean) => void) => { onRescueCheck(item, given, resolve) },
    submit: (sentence: string) => { void onAnwendungSubmit(item, sentence) },
    next: () => { onAnwendungNext(item) }
  }
})

// ── Summary ──────────────────────────────────────────────────────

function finish(): void {
  finished.value = true
  // A sitting where nothing was actually answered (every card skipped by a
  // failed grading pass) is practice, not a Run.
  if (historySaved || answers.value.length === 0) return
  historySaved = true
  const finishedAt = Date.now()
  saveQuizRun({
    type: 'wortschatz-wiederholen',
    startedAt: new Date(startedAt.value).toISOString(),
    finishedAt: new Date(finishedAt).toISOString(),
    durationMs: finishedAt - startedAt.value,
    count: answers.value.length,
    correct: richtig.value,
    meta: {}
  })
}

function goHub(): void {
  router.push({ name: 'wortschatz' })
}
</script>

<template>
  <div v-if="loading" class="page loading-state">
    <div class="micro-mark">Fällige Vokabeln werden geladen…</div>
  </div>

  <div v-else-if="error" class="page">
    <div class="alert alert-danger"><span class="alert-label">Fehler</span>{{ error }}</div>
    <div class="setup-actions">
      <button class="btn btn-ghost" type="button" @click="goHub">← Wortschatz</button>
    </div>
  </div>

  <!-- Nothing due -->
  <div v-else-if="total === 0" class="page" data-testid="wz-empty">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Kapitel · Wortschatz · Wiederholen</div>
        <h1 class="section-title">Nichts fällig<em>.</em></h1>
        <p class="section-subtitle">
          Gerade ist keine Vokabel fällig. Führe im Wortschatz neue Vokabeln ein oder komm
          später zurück.
        </p>
      </div>
    </header>
    <div class="setup-actions">
      <button class="btn btn-accent" type="button" @click="goHub">Zur Übersicht <span aria-hidden="true">→</span></button>
    </div>
  </div>

  <!-- Auswertung -->
  <div v-else-if="finished" class="page result-page" data-testid="wz-summary">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Kapitel · Wortschatz · Wiederholsitzung · Auswertung</div>
        <h1 class="section-title"><span data-testid="wz-score">{{ richtig }} / {{ answeredCount }}</span><em>.</em></h1>
        <p class="section-subtitle">
          {{ falsch }} daneben<template v-if="mitHinweis > 0">, {{ mitHinweis }} mit Hinweis</template>
          <template v-if="skipped > 0"> · {{ skipped }} nicht gewertet</template>
        </p>
      </div>
    </header>

    <p v-if="newlyGefestigt.length > 0" class="wz-gefestigt">
      Gefestigt: {{ newlyGefestigt.join(' · ') }} 🎉
    </p>

    <div class="result-rows">
      <div v-for="row in breakdown" :key="row.stufe" class="card wz-row" data-testid="wz-stufe-row">
        <span class="tag tag-accent">{{ STUFE_LABEL[row.stufe] }}</span>
        <span class="wz-row-score">{{ row.correct }} / {{ row.total }} richtig</span>
      </div>
    </div>

    <p v-if="overflow > 0" class="micro-mark">+{{ overflow }} weitere fällig</p>

    <div class="setup-actions">
      <button class="btn btn-ghost" type="button" @click="goHub">← Wortschatz</button>
      <button class="btn btn-accent" type="button" @click="start">Weiter wiederholen <span aria-hidden="true">→</span></button>
    </div>
  </div>

  <!-- One due Vokabel per step -->
  <div v-else-if="current && cardHandlers" class="page">
    <div class="quiz-card">
      <div class="wz-run-head">
        <span class="quiz-counter" data-testid="wz-counter">{{ index + 1 }} / {{ total }}</span>
        <span class="wz-head-mid">
          <span class="micro-mark" data-testid="wz-feld">{{ current.v.feld }}</span>
          <span class="tag tag-accent" data-testid="wz-stufe">{{ STUFE_LABEL[current.p.stufe] }}</span>
        </span>
        <button class="btn btn-quiet" type="button" @click="finish">Beenden</button>
      </div>
      <p v-if="servedBelowStufe" class="micro-mark wz-served-note">
        Ohne KI: als {{ STUFE_LABEL[current.servedStufe] }} geprüft
      </p>
      <p v-if="overflow > 0" class="micro-mark" data-testid="wz-cap">
        +{{ overflow }} weitere fällig — nach dieser Sitzung
      </p>

      <ErkennenCard
        v-if="current.servedStufe === 'erkennen'"
        :key="`erk-${index}`"
        :vokabel="current.v"
        :options="current.options"
        @answered="cardHandlers.answered"
      />
      <LueckeCard
        v-else-if="current.servedStufe === 'luecke' && current.satz"
        :key="`lue-${index}`"
        :vokabel="current.v"
        :satz="current.satz"
        @answered="cardHandlers.answered"
        @rescue-check="cardHandlers.rescue"
      />
      <AbrufCard
        v-else-if="current.servedStufe === 'abruf'"
        :key="`abr-${index}`"
        :vokabel="current.v"
        @answered="cardHandlers.answered"
        @rescue-check="cardHandlers.rescue"
      />
      <AnwendungCard
        v-else-if="current.servedStufe === 'anwendung'"
        :key="`anw-${index}`"
        :vokabel="current.v"
        :grading="grading"
        :result="anwResult"
        @submit="cardHandlers.submit"
        @next="cardHandlers.next"
      />
    </div>
  </div>
</template>

<style scoped>
.wz-run-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 8px;
}
.wz-head-mid { display: flex; align-items: center; gap: 10px; }
.wz-served-note { margin: 0 0 8px; }
.wz-gefestigt {
  font-family: var(--font-display);
  font-style: italic;
  font-size: 18px;
  color: var(--success);
  margin: 0 0 16px;
}
.wz-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 18px;
}
.wz-row-score { color: var(--ink-soft); font-size: 15px; }
</style>
