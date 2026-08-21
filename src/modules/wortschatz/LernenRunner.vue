<script setup lang="ts">
// Wortschatz — Lernsitzung (CONTEXT.md → "Lernsitzung", ADR-0027). One sitting
// introduces up to 7 unseen Vokabeln from ONE chosen Themenfeld (introduction is
// deliberately field-blocked — the field supplies the context) and gives each of
// them its first Erkennen reps:
//
//   1. Intro phase   — IntroCard per item, guess-before-reveal; each 'done'
//                      writes the item's first progress row (newProgress).
//   2. Erkennen phase — two rounds, each a fresh shuffle of the whole Auswahl.
//                      Every answer goes through applyOutcome(…, 'erkennen');
//                      a miss re-queues the item once at the end of its round.
//   3. Auswertung     — introduced count, Erkennen quota, per-item Bilanz.
//
// Two clean Erkennen passes are exactly GATE.erkennen, so an item answered
// right in both rounds leaves the sitting on Stufe Lücke.
//
// The cards own their own „Weiter" (they gate 'done'/'answered' behind it), so
// this runner never renders a continue button of its own — it advances on the
// emit. Scheduler state lives in a plain Map of plain objects, never a
// reactive proxy: saveProgress hands the row straight to Dexie, and Dexie's
// structured clone rejects proxies silently (project rule).
import { computed, onMounted, ref, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  STUFE_LABEL, THEMENFELDER, type Stufe, type Themenfeld, type Vokabel
} from '../../data/wortschatz'
import { readAllProgress, saveProgress, vokabelnByFeld } from '../../composables/useWortschatzProgress'
import { buildLernAuswahl, pickErkennenOptions } from '../../composables/wortschatzQueue'
import { applyOutcome, newProgress, type VokabelProgress } from '../../composables/wortschatzScheduler'
import { saveQuizRun } from '../../composables/useQuizHistory'
import { shuffle } from '../../data/pool'
import IntroCard from './IntroCard.vue'
import ErkennenCard from './ErkennenCard.vue'

const route = useRoute()
const router = useRouter()

/** New Vokabeln per Lernsitzung (CONTEXT.md: 5–8 items). */
const AUSWAHL_GROESSE = 7
/** Erkennen rounds per sitting — exactly GATE.erkennen, so a clean sitting promotes. */
const RUNDEN = 2

type Phase = 'laden' | 'leer' | 'intro' | 'erkennen' | 'fertig'

/** Per-item tally for the Auswertung — display only, never persisted. */
interface Bilanz {
  vokabelId: string
  de: string
  richtig: number
  falsch: number
  stufe: Stufe
}

const phase = ref<Phase>('laden')
const fehler = ref<string | null>(null)
const feld = ref<Themenfeld | null>(null)

// The whole Themenfeld pool — the distractor source for pickErkennenOptions.
const pool = shallowRef<Vokabel[]>([])
const auswahl = shallowRef<Vokabel[]>([])

// Scheduler state: plain objects in a plain Map (see header note).
const progressById = new Map<string, VokabelProgress>()

const introIndex = ref(0)          // intros completed
const rundeNr = ref(1)
const queue = shallowRef<Vokabel[]>([])   // current round's order (grows on a miss)
const qIndex = ref(0)
const optionen = shallowRef<string[]>([])
const requeuedInRunde = new Set<string>()

const antworten = ref(0)           // Erkennen answers given, re-queued reps included
const richtige = ref(0)
const zusatzSchritte = ref(0)      // re-queued reps, added to the step total
const bilanz = ref<Bilanz[]>([])

const startedAtMs = ref(0)
const runGespeichert = ref(false)

const aktuellesIntro = computed<Vokabel | null>(() => auswahl.value[introIndex.value] ?? null)
const aktuell = computed<Vokabel | null>(() => queue.value[qIndex.value] ?? null)

const gesamtSchritte = computed(() => auswahl.value.length * (RUNDEN + 1) + zusatzSchritte.value)
const erledigt = computed(() => introIndex.value + antworten.value)
const schritt = computed(() => Math.min(erledigt.value + 1, Math.max(1, gesamtSchritte.value)))
const pips = computed(() =>
  Array.from({ length: gesamtSchritte.value }, (_, n) =>
    n < erledigt.value ? 'done' : n === erledigt.value ? 'current' : ''
  )
)
const quote = computed(() =>
  antworten.value === 0 ? 0 : Math.round((richtige.value / antworten.value) * 100)
)
const sauber = computed(() => bilanz.value.filter(b => b.falsch === 0).length)

// ── session lifecycle ───────────────────────────────────────────────────────

async function start(): Promise<void> {
  const f = feld.value
  if (!f) return
  phase.value = 'laden'
  fehler.value = null
  try {
    const [items, gespeichert] = await Promise.all([vokabelnByFeld(f), readAllProgress()])
    pool.value = items
    progressById.clear()
    for (const [id, p] of gespeichert) progressById.set(id, p)

    const ungesehen = items.filter(v => !gespeichert.has(v.id))
    const gewaehlt = buildLernAuswahl(ungesehen, AUSWAHL_GROESSE)
    auswahl.value = gewaehlt
    if (gewaehlt.length === 0) {
      phase.value = 'leer'
      return
    }

    introIndex.value = 0
    rundeNr.value = 1
    queue.value = []
    qIndex.value = 0
    optionen.value = []
    requeuedInRunde.clear()
    antworten.value = 0
    richtige.value = 0
    zusatzSchritte.value = 0
    bilanz.value = gewaehlt.map(v => ({
      vokabelId: v.id, de: v.de, richtig: 0, falsch: 0, stufe: 'erkennen' as Stufe
    }))
    startedAtMs.value = Date.now()
    runGespeichert.value = false
    phase.value = 'intro'
  } catch (e) {
    fehler.value = e instanceof Error ? e.message : String(e)
  }
}

onMounted(() => {
  const gewuenscht = typeof route.query.feld === 'string' ? route.query.feld : ''
  const treffer = THEMENFELDER.find(f => f === gewuenscht)
  if (!treffer) {
    void router.replace({ name: 'wortschatz' })
    return
  }
  feld.value = treffer
  void start()
})

// ── intro phase ─────────────────────────────────────────────────────────────

async function onIntroDone(): Promise<void> {
  const v = aktuellesIntro.value
  if (!v) return
  const p = newProgress(v.id, Date.now())
  progressById.set(v.id, p)
  await saveProgress(p)
  introIndex.value++
  if (introIndex.value >= auswahl.value.length) starteErkennen()
}

// ── Erkennen phase ──────────────────────────────────────────────────────────

function setzeOptionen(): void {
  const v = aktuell.value
  optionen.value = v ? pickErkennenOptions(v, pool.value) : []
}

function neueRunde(): void {
  requeuedInRunde.clear()
  queue.value = shuffle(auswahl.value)
  qIndex.value = 0
  setzeOptionen()
}

function starteErkennen(): void {
  rundeNr.value = 1
  neueRunde()
  phase.value = 'erkennen'
}

async function onAnswered(outcome: 'correct' | 'wrong'): Promise<void> {
  const v = aktuell.value
  if (!v) return
  const now = Date.now()
  const vorher = progressById.get(v.id) ?? newProgress(v.id, now)
  const nachher = applyOutcome(vorher, outcome, now, 'erkennen')
  progressById.set(v.id, nachher)
  await saveProgress(nachher)

  antworten.value++
  if (outcome === 'correct') richtige.value++
  const b = bilanz.value.find(e => e.vokabelId === v.id)
  if (b) {
    if (outcome === 'correct') b.richtig++
    else b.falsch++
    b.stufe = nachher.stufe
  }

  // A miss comes back once more before the round ends — never twice, so a
  // shaky item cannot trap the learner in an endless round.
  if (outcome === 'wrong' && !requeuedInRunde.has(v.id)) {
    requeuedInRunde.add(v.id)
    queue.value = [...queue.value, v]
    zusatzSchritte.value++
  }
  weiter()
}

function weiter(): void {
  if (qIndex.value + 1 < queue.value.length) {
    qIndex.value++
    setzeOptionen()
    return
  }
  if (rundeNr.value < RUNDEN) {
    rundeNr.value++
    neueRunde()
    return
  }
  abschliessen()
}

// ── Auswertung ──────────────────────────────────────────────────────────────

function abschliessen(): void {
  phase.value = 'fertig'
  if (runGespeichert.value) return
  runGespeichert.value = true
  const finishedAtMs = Date.now()
  // `count` is the sitting's items and `correct` the items that came through
  // BOTH rounds clean — one Run row per Lernsitzung, on the same
  // correct-out-of-count scale every other Run type uses.
  saveQuizRun({
    type: 'wortschatz-lernen',
    startedAt: new Date(startedAtMs.value).toISOString(),
    finishedAt: new Date(finishedAtMs).toISOString(),
    durationMs: finishedAtMs - startedAtMs.value,
    count: auswahl.value.length,
    correct: sauber.value,
    meta: { wortschatzFeld: feld.value ?? undefined },
  })
}

function zurUebersicht(): void {
  void router.push({ name: 'wortschatz' })
}

function nochmal(): void {
  void start()
}
</script>

<template>
  <div v-if="fehler" class="page">
    <div class="alert alert-danger"><span class="alert-label">Fehler</span>{{ fehler }}</div>
    <button class="btn btn-ghost" type="button" @click="zurUebersicht">← Zur Übersicht</button>
  </div>

  <div v-else-if="phase === 'laden'" class="page loading-state">
    <div class="micro-mark">Lädt…</div>
  </div>

  <!-- Nothing left to introduce in this Themenfeld -->
  <div v-else-if="phase === 'leer'" class="page" data-testid="wz-leer">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Lernsitzung · Wortschatz · {{ feld }}</div>
        <h1 class="section-title">Alles eingeführt<em>.</em></h1>
        <p class="section-subtitle">
          In diesem Themenfeld ist keine neue Vokabel mehr offen — weiter geht es über das Wiederholen.
        </p>
      </div>
      <div class="result-actions">
        <button class="btn btn-accent" type="button" @click="zurUebersicht">
          Zur Übersicht <span aria-hidden="true">→</span>
        </button>
      </div>
    </header>
  </div>

  <!-- Auswertung -->
  <div v-else-if="phase === 'fertig'" class="page result-page" data-testid="wz-summary">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Auswertung · Lernsitzung · {{ feld }}</div>
        <div class="result-score">{{ richtige }} / {{ antworten }} richtig</div>
        <p class="section-subtitle">
          {{ auswahl.length }} {{ auswahl.length === 1 ? 'Vokabel' : 'Vokabeln' }} eingeführt ·
          Erkennen {{ quote }} % · {{ sauber }} ohne Fehler
        </p>
      </div>
      <div class="result-actions">
        <button class="btn btn-ghost" type="button" @click="zurUebersicht">← Zur Übersicht</button>
        <button class="btn btn-accent" type="button" @click="nochmal">
          Nochmal <span aria-hidden="true">→</span>
        </button>
      </div>
    </header>

    <div class="result-list">
      <div v-for="b in bilanz" :key="b.vokabelId" class="result-row drill-result-row" data-testid="wz-bilanz-row">
        <div class="result-word">
          <div class="german">{{ b.de }}</div>
        </div>
        <div class="result-answer">
          <span class="micro-mark">Stufe</span> {{ STUFE_LABEL[b.stufe] }}
        </div>
        <div class="result-verdict">
          <span class="tag" :class="b.falsch === 0 ? 'tag-success' : 'tag-danger'">
            {{ b.falsch === 0 ? '✓' : `✗ ${b.falsch}` }}
          </span>
        </div>
      </div>
    </div>
  </div>

  <!-- Active sitting: intro cards, then the two Erkennen rounds -->
  <div v-else class="page">
    <div class="wz-run">
      <div class="quiz-meta">
        <span class="quiz-counter">Schritt {{ schritt }} / {{ gesamtSchritte }}</span>
        <button class="btn btn-quiet" type="button" @click="zurUebersicht">Lernsitzung beenden</button>
      </div>

      <div class="quiz-progress-bar">
        <div v-for="(cls, n) in pips" :key="n" class="pip" :class="cls" />
      </div>

      <p class="drill-instruction is-centered micro-mark">
        <template v-if="phase === 'intro'">Neue Vokabel · {{ feld }}</template>
        <template v-else>Erkennen · Runde {{ rundeNr }} von {{ RUNDEN }}</template>
      </p>

      <IntroCard
        v-if="phase === 'intro' && aktuellesIntro"
        :key="`intro-${introIndex}`"
        :vokabel="aktuellesIntro"
        @done="onIntroDone"
      />
      <ErkennenCard
        v-else-if="phase === 'erkennen' && aktuell"
        :key="`erkennen-${rundeNr}-${qIndex}`"
        :vokabel="aktuell"
        :options="optionen"
        @answered="onAnswered"
      />
    </div>
  </div>
</template>

<style scoped>
.loading-state { text-align: center; padding-top: 120px; }
.result-page { max-width: 880px; }
.result-actions { display: flex; gap: 12px; flex-wrap: wrap; }
.wz-run { max-width: 640px; margin: 0 auto; }
.drill-result-row { grid-template-columns: 1fr 160px auto; }
@media (max-width: 720px) {
  .drill-result-row { grid-template-columns: 1fr; gap: 4px; }
  .result-actions { flex-direction: column; align-items: stretch; }
  .result-actions .btn { justify-content: center; }
}
</style>
