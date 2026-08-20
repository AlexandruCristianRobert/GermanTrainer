<script setup lang="ts">
//
// Schreiben Teil 1 — der Forumsbeitrag selbst. Structural twin of
// sprechen/Teil1Runner.vue's Rede half: one continuous composer, live meters,
// the same drawer/nudge/KI-Tipp help surfaces, the same runGrading() latch
// discipline — minus everything speech-specific (no Rettungsleine, no
// stuck-detection, no TTS) and minus the Nachfrage phase: a Forumsbeitrag has
// no follow-up exchange, so "Abgeben & bewerten" grades directly.
//
// Boot: a SchreibenRunStash (from Teil1Prep) creates a fresh Beitrag row;
// absent that, an active row is resumed. The text is persisted to Dexie on a
// 1s-debounce while typing — a dead tab never loses more than a second.
//
// The rail's Live-Checkliste lights one dot per Inhaltspunkt from the
// learner's OWN Schreibplan keyword, matched with the same normalized-
// substring rule useVortragCoverage.ts uses for the Vortrag — inlined here
// rather than imported, since a SchreibPlanEntry is indexed by number
// (↔ inhaltspunkte[index]), not by a fixed Gliederungspunkt key.
//
// The word/time meters are informational only. The 50-minute budget is a
// SOFT countdown: past it, the display flips to "+Überzeit" styling — it
// never blocks and never auto-submits. The word floor (SCHREIBEN_MIN_WORDS)
// is enforced the same soft way, via a window.confirm on submit, never a
// disabled button.
//
// KI-Tipp renders whenever helps.kiTipp && canUseAi, independent of the
// helps.hints master switch — it is its own paid help. Its counter/log are
// billed only once the tip text itself has actually been generated, and
// `kiTipp.value` is assigned only after that billing write succeeds — a
// failed increment can never hand back a tip nobody paid for.
//
// The grade pipeline mirrors Teil2Runner's/the Vortrag runner's runGrading()
// exactly: a `runRecorded` guard wraps the one-time writes (Schreibmittel
// yield, the archived corrections, the Run) so a retry after a LATER failure
// (sessionStorage/deleteBeitrag) re-grades but never double-records. The
// result stash write, deleteBeitrag and the navigate happen on every
// successful call — a retry must still be able to leave the screen.
// Aufwertungen are read into the stash and the meta, but NEVER into
// appendCorrections — they are not mistakes.
//
// ADR-0019: the essay text itself is NEVER persisted anywhere but the
// Beitrag row while in progress. The result stash carries only DERIVED
// fields (word count, matched Schreibmittel, the grade) — there is no
// `textDe` on SchreibenResultStash — and the Dexie row is deleted the moment
// a grade succeeds. A `submitted` row resumed after a reload (or a retry
// after a failed grade) waits for a deliberate "Analyse starten"/"Analyse
// erneut versuchen" click instead of auto-firing a paid grade call.

import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { sentenceAround, type HelpKind } from '../../data/sprechen'
import {
  SCHREIBEN_STASH_KEY, SCHREIBEN_MIN_WORDS, SCHREIBEN_TARGET_WORDS, SCHREIBEN_TIME_BUDGET_SECONDS,
  schreibenWordBand, schreibenClock,
  type SchreibenBeitrag, type SchreibenRunStash
} from '../../data/schreiben'
import {
  SCHREIBEN_SCHREIBMITTEL, SCHREIB_MOVES, SCHREIB_MOVE_LABEL, schreibmittelForMove, type SchreibMove
} from '../../data/schreibenMittel'
import { resolveSchreibArgumentBank } from '../../data/schreibenArguments'
import type { ArgumentBank } from '../../data/sprechenArguments'
import { matchRedemittel, pickMoveNudge } from '../../composables/useRedemittelMatch'
import { keywordWritten, normalizeForMatch } from '../../composables/useSchreibplanMatch'
import { bumpRedemittelYield, lifetimeCounts } from '../../composables/useRedemittelYield'
import { loadCachedSchreibBank } from '../../composables/useSchreibenArguments'
import {
  createBeitrag, findActiveBeitrag, saveText, logHelp, incrementKiTipp,
  markSubmitted, abandonBeitrag, deleteBeitrag
} from '../../composables/useSchreibenBeitrag'
import { gradeSchreiben, SCHREIBEN_RESULT_KEY, type SchreibenResultStash } from '../../composables/useSchreibenGrader'
import { generateSchreibenKiTipp } from '../../composables/useSchreibenTipp'
import { countWords } from '../../composables/useSpeechRecognizer'
import { setNachbessernText } from '../../composables/useNachbessern'
import { appendCorrections } from '../../composables/useSprechenArchive'
import { saveQuizRun, type SprechenErrorTag } from '../../composables/useQuizHistory'
import { resolveAiClient } from '../../composables/localClaude'
import { useSettings } from '../../composables/useSettings'
import { useToast } from '../../composables/useToast'

const router = useRouter()
const toast = useToast()
const { settings, canUseAi, load: loadSettings } = useSettings()

const beitrag = ref<SchreibenBeitrag | null>(null)
const error = ref<string | null>(null)
const model = ref('')
const bank = ref<ArgumentBank | null>(null)

const textDraft = ref('')
const textEl = ref<HTMLTextAreaElement | null>(null)

const tab = ref<'wie' | 'was'>('wie')
const move = ref<SchreibMove>('aufgreifen')
const nudgeDismissed = ref(false)
const nudgeLogged = ref(false)

const kiBusy = ref(false)
const kiTipp = ref<string | null>(null)

const sending = ref(false)
const grading = ref(false)
const gradeFailed = ref(false)
/** Latches once the Run + archive + yield have been recorded — a retry after
 *  a LATER failure (sessionStorage/deleteBeitrag) re-grades but must never
 *  double-record. Mirrors the Vortrag/Discussion runners' runRecorded guard. */
const runRecorded = ref(false)

/** Wall-clock seconds since the Beitrag started, display only — never gates
 *  submission (the budget is soft). Ticks once a second while mounted. */
const elapsedSeconds = ref(0)
let elapsedTimer: ReturnType<typeof setInterval> | null = null
let saveTimer: ReturnType<typeof setTimeout> | null = null

// Lifetime Schreibmittel usage, read ONCE at mount — like the Vortrag
// runner's own `lifetime` const, the ·neu marking must not flicker off as
// the learner uses phrases during THIS run.
const lifetime = lifetimeCounts(SCHREIBEN_SCHREIBMITTEL)

/** A `submitted` row (resumed from a reload, or retried after a failed
 *  grade in a past session) waits for a deliberate click instead of
 *  auto-billing a grade call on every visit. */
const awaitingGradeStart = computed(() => beitrag.value?.status === 'submitted' && !grading.value)

/** The plain "still writing" state — the only one where the composer,
 *  nudge and drawer render. */
const writing = computed(() => !grading.value && !gradeFailed.value && !awaitingGradeStart.value)

const words = computed(() => countWords(textDraft.value))
const wordBand = computed(() => schreibenWordBand(words.value))
const overBudget = computed(() => elapsedSeconds.value > SCHREIBEN_TIME_BUDGET_SECONDS)
const timerLabel = computed(() => overBudget.value
  ? `+${schreibenClock(elapsedSeconds.value - SCHREIBEN_TIME_BUDGET_SECONDS)}`
  : schreibenClock(Math.max(0, SCHREIBEN_TIME_BUDGET_SECONDS - elapsedSeconds.value)))

interface InhaltspunktSignal {
  index: number
  punkt: string
  keyword: string
  said: boolean
}

/** One signal per Inhaltspunkt, in task-sheet order. A keywordless entry
 *  renders `said: false` — the rail shows a dash for it, not a false dot. */
const planSignals = computed<InhaltspunktSignal[]>(() => {
  const b = beitrag.value
  if (!b) return []
  const hay = normalizeForMatch(textDraft.value)
  const byIndex = new Map(b.plan.map(p => [p.index, p.keyword ?? '']))
  return b.thema.inhaltspunkte.map((punkt, i) => {
    const keyword = (byIndex.get(i) ?? '').trim()
    return {
      index: i,
      punkt,
      keyword,
      said: keywordWritten(keyword, hay)
    }
  })
})

const usedIds = computed(() =>
  new Set(matchRedemittel([textDraft.value], SCHREIBEN_SCHREIBMITTEL).map(r => r.id))
)

const drawerPhrases = computed(() =>
  schreibmittelForMove(move.value).map(r => ({ ...r, used: usedIds.value.has(r.id) }))
)

const freshMoves = computed(() => {
  const out = new Set<SchreibMove>()
  for (const m of SCHREIB_MOVES) {
    const total = SCHREIBEN_SCHREIBMITTEL
      .filter(r => r.move === m)
      .reduce((sum, r) => sum + (lifetime[r.id] ?? 0), 0)
    if (total === 0) out.add(m)
  }
  return out
})

/** Re-evaluates per ~40 words, not per keystroke: `pickMoveNudge` reads a
 *  FROZEN text snapshot, refreshed only when the 40-word band actually
 *  changes. Same frozen-text pattern as the Vortrag runner's moveNudge. */
const nudgeBand = computed(() => Math.floor(words.value / 40))
const frozenNudgeText = ref('')
let lastNudgeBand = -1
watch(nudgeBand, band => {
  if (band === lastNudgeBand) return
  lastNudgeBand = band
  frozenNudgeText.value = textDraft.value
}, { immediate: true })

const moveNudge = computed(() => {
  if (!beitrag.value?.helps.hints) return null
  if (nudgeDismissed.value) return null
  if (nudgeBand.value < 1) return null
  return pickMoveNudge([frozenNudgeText.value], lifetime, SCHREIBEN_SCHREIBMITTEL, SCHREIB_MOVES)
})

watch(moveNudge, val => {
  if (val && !nudgeLogged.value) {
    nudgeLogged.value = true
    logHelpAsync('nudge')
  }
})

watch(textDraft, val => {
  if (!beitrag.value) return
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    if (!beitrag.value) return
    beitrag.value.textDe = val
    void saveText(beitrag.value.id, val)
  }, 1000)
})

function tickElapsed() {
  if (!beitrag.value) return
  elapsedSeconds.value = Math.floor((Date.now() - beitrag.value.startedAt) / 1000)
}

function logHelpAsync(kind: HelpKind) {
  if (!beitrag.value) return
  const at = Date.now()
  beitrag.value.helpLog = [...beitrag.value.helpLog, { at, kind }]
  void logHelp(beitrag.value.id, kind, at)
}

/** 'drawer' logs genuine consultation only: a tab switch to a DIFFERENT
 *  tab, never a no-op re-tap of the one already open. */
function selectTab(t: 'wie' | 'was') {
  const changed = t !== tab.value
  tab.value = t
  if (changed) logHelpAsync('drawer')
}

function selectMove(m: SchreibMove) {
  const changed = m !== move.value
  move.value = m
  if (changed) logHelpAsync('drawer')
}

/** Inserts the FULL phrase, placeholder intact, at the caret. */
function insertPhrase(phraseDe: string) {
  const el = textEl.value
  const cur = textDraft.value
  if (!el) {
    textDraft.value = cur ? `${cur} ${phraseDe}` : phraseDe
  } else {
    const at = el.selectionStart ?? cur.length
    textDraft.value = `${cur.slice(0, at)}${phraseDe}${cur.slice(at)}`
    requestAnimationFrame(() => { el.focus(); const pos = at + phraseDe.length; el.setSelectionRange(pos, pos) })
  }
  logHelpAsync('phrase')
}

/** The counter/log are billed only once the tip text has actually been
 *  generated: if `incrementKiTipp` throws, `kiTipp.value` is never set, so a
 *  failed bookkeeping write can never hand back a tip that was never
 *  counted (same discipline as the Vortrag runner's fetchKiTipp). */
async function fetchKiTipp() {
  if (!beitrag.value || kiBusy.value) return
  kiBusy.value = true
  try {
    const client = resolveAiClient(settings.value)
    const tip = await generateSchreibenKiTipp(client, model.value, beitrag.value)
    await incrementKiTipp(beitrag.value.id)
    beitrag.value.kiTippCount += 1
    logHelpAsync('kitipp')
    kiTipp.value = tip
  } catch (err) {
    toast.error('KI-Tipp fehlgeschlagen', {
      description: err instanceof Error ? err.message : String(err)
    })
  } finally {
    kiBusy.value = false
  }
}

/** Flushes any pending debounce and persists the text immediately. */
async function commitText(): Promise<void> {
  if (!beitrag.value) return
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null }
  beitrag.value.textDe = textDraft.value
  await saveText(beitrag.value.id, textDraft.value)
}

/** 'Abgeben & bewerten': below the exam floor, a confirmation is required
 *  first — mirrors the Vortrag runner's early-end warning — but it is
 *  advisory only, never a disabled button. */
async function submitBeitrag() {
  if (!beitrag.value || sending.value || grading.value) return
  if (words.value < SCHREIBEN_MIN_WORDS) {
    const warn = `Mit weniger als ${SCHREIBEN_MIN_WORDS} Wörtern ist die Bewertung wenig aussagekräftig. Trotzdem abgeben?`
    if (!window.confirm(warn)) return
  }
  sending.value = true
  try {
    await commitText()
    await markSubmitted(beitrag.value.id)
    beitrag.value.status = 'submitted'
    await runGrading()
  } finally {
    sending.value = false
  }
}

/** A quiet exit: the Beitrag row is deleted and nothing is recorded, exactly
 *  like Setup's own abandon action. Requires a deliberate confirmation. */
async function confirmAbandon() {
  if (!beitrag.value) return
  if (!window.confirm('Forumsbeitrag wirklich verwerfen? Der Fortschritt geht verloren.')) return
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null }
  await abandonBeitrag(beitrag.value.id)
  router.push({ name: 'schreiben-teil1' })
}

function countMistakes(mistakes: readonly { kind: SprechenErrorTag }[]): Partial<Record<SprechenErrorTag, number>> {
  const counts: Partial<Record<SprechenErrorTag, number>> = {}
  for (const m of mistakes) counts[m.kind] = (counts[m.kind] ?? 0) + 1
  return counts
}

async function runGrading() {
  const b = beitrag.value
  if (!b || grading.value) return
  grading.value = true
  gradeFailed.value = false
  try {
    const result = await gradeSchreiben(resolveAiClient(settings.value), model.value, b)
    const finishedAt = Date.now()
    const matched = matchRedemittel([b.textDe], SCHREIBEN_SCHREIBMITTEL).map(p => p.id)

    if (!runRecorded.value) {
      bumpRedemittelYield(matched, finishedAt)
      saveQuizRun({
        type: 'schreiben-teil1',
        startedAt: new Date(b.startedAt).toISOString(),
        finishedAt: new Date(finishedAt).toISOString(),
        durationMs: finishedAt - b.startedAt,
        count: 100,
        correct: result.totalScore,
        meta: {
          topicTitle: b.thema.titleDe,
          sprechenScore: result.totalScore,
          maxScore: 100,
          passes: result.passes,
          sprechenPraedikat: result.praedikat,
          sprechenCriteria: result.criteria.map(c => ({ key: c.key, score: c.score, maxPoints: c.maxPoints })),
          sprechenModality: 'typed',
          sectionsCovered: result.coverage.filter(c => c.covered).length,
          wordCount: countWords(b.textDe),
          sprechenVortragsmittel: matched,
          kiTippCount: b.kiTippCount,
          // SchreibHelps has no `hardLimit` (that concept is spoken-only, on
          // VortragHelps) — Schreiben never has one, so it is always false
          // here, same as a typed Vortrag reusing this same meta cluster.
          sprechenHelps: {
            hints: b.helps.hints, checklist: b.helps.checklist, kiTipp: b.helps.kiTipp, hardLimit: false
          },
          sprechenAufwertungen: result.aufwertungen,
          sprechenMistakeCounts: countMistakes(result.mistakes),
          sprechenStrengths: result.strengths,
          sprechenWeaknesses: result.weaknesses,
          sprechenOverallDe: result.overallDe,
          sprechenOverallEn: result.overallEn
        }
      })
      runRecorded.value = true

      // Deliberately non-fatal, same reasoning as the Vortrag/Discussion
      // runners: the Run above is already recorded, so throwing here would
      // re-record it on retry. Aufwertungen are NEVER included — not mistakes.
      try {
        await appendCorrections(result.mistakes.map(m => ({
          discussionId: b.id,
          topicTitle: b.thema.titleDe,
          modality: 'typed' as const,
          kind: m.kind,
          quote: m.quote,
          suggested: m.suggested,
          reasonDe: m.reasonDe,
          reasonEn: m.reasonEn,
          context: sentenceAround(b.textDe, m.spanStart),
          part: 1 as const,
          module: 'schreiben' as const
        })))
      } catch (err) {
        toast.error('Fehlerarchiv nicht aktualisiert', {
          description: err instanceof Error ? err.message : String(err)
        })
      }
    }

    const stash: SchreibenResultStash = {
      thema: b.thema,
      helps: b.helps,
      plan: b.plan,
      wordCount: countWords(b.textDe),
      kiTippCount: b.kiTippCount,
      helpLog: b.helpLog,
      schreibmittel: matched,
      startedAt: b.startedAt,
      finishedAt,
      result
    }
    sessionStorage.setItem(SCHREIBEN_RESULT_KEY, JSON.stringify(stash))
    await deleteBeitrag(b.id)                        // ADR-0019: the essay dies here
    setNachbessernText(b.textDe)                     // ADR-0024 handoff — feeds only the result page's .txt-Export (Teil 1 has no Nachbessern pass)
    router.push({ name: 'schreiben-teil1-result' })
  } catch (err) {
    gradeFailed.value = true                          // row stays 'submitted'; retry re-grades, latch prevents double-record
    toast.error('Analyse fehlgeschlagen', {
      description: err instanceof Error ? err.message : String(err)
    })
  } finally {
    grading.value = false
  }
}

async function loadBank() {
  if (!beitrag.value) return
  const cached = await loadCachedSchreibBank(beitrag.value.thema.id)
  bank.value = resolveSchreibArgumentBank(
    { id: beitrag.value.thema.id, tags: beitrag.value.thema.tags },
    cached ?? undefined
  ).bank
}

onMounted(async () => {
  await loadSettings()
  model.value = settings.value.model

  const raw = sessionStorage.getItem(SCHREIBEN_STASH_KEY)
  if (raw) {
    sessionStorage.removeItem(SCHREIBEN_STASH_KEY)
    try {
      const s = JSON.parse(raw) as SchreibenRunStash
      if (s.model) model.value = s.model
      beitrag.value = await createBeitrag({ thema: s.thema, helps: s.helps, plan: s.plan })
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to start.'
      return
    }
  } else {
    const active = await findActiveBeitrag()
    if (!active) {
      error.value = 'Kein Forumsbeitrag gefunden. Geh zurück zur Themenwahl.'
      return
    }
    beitrag.value = active
  }

  textDraft.value = beitrag.value.textDe
  tickElapsed()
  elapsedTimer = setInterval(tickElapsed, 1000)
  await loadBank()
})

onUnmounted(() => {
  if (saveTimer) clearTimeout(saveTimer)
  if (elapsedTimer) clearInterval(elapsedTimer)
})

function backToSetup() { router.push({ name: 'schreiben-teil1' }) }
</script>

<template>
  <div v-if="error" class="page">
    <div class="alert alert-danger"><span class="alert-label">Hinweis</span>{{ error }}</div>
    <button class="btn btn-ghost" type="button" @click="backToSetup">← Zur Themenwahl</button>
  </div>

  <div v-else-if="!beitrag" class="page loading-state"><div class="micro-mark">Loading…</div></div>

  <div v-else class="page schreiben-run">
    <header class="run-head">
      <div>
        <div class="breadcrumb">Schreiben Teil 1</div>
        <h1 class="run-thesis">Forumsbeitrag<em>.</em></h1>
      </div>
      <div class="run-meta">
        <span v-if="beitrag.helps.checklist" class="quiz-counter">
          {{ words }} Wörter<template v-if="beitrag.helps.timer"> · <span :class="{ 'timer-over': overBudget }">{{ timerLabel }}</span></template>
        </span>
        <button
          v-if="writing" class="btn btn-quiet" type="button"
          :disabled="grading || sending || words === 0" @click="submitBeitrag"
        >Abgeben &amp; bewerten</button>
        <button
          class="btn btn-ghost run-exit" type="button"
          :disabled="grading" @click="confirmAbandon"
        >Verwerfen</button>
      </div>
    </header>

    <div class="spr-run">
      <aside class="spr-rail">
        <div class="spr-rail-sec">
          <div class="spr-lbl">Aufgabenblatt · {{ beitrag.thema.titleDe }}</div>
          <p class="spr-rail-forum">{{ beitrag.thema.forumContextDe }}</p>
          <p class="spr-rail-stmt">{{ beitrag.thema.taskDe }}</p>
        </div>

        <div v-if="beitrag.helps.checklist" class="spr-rail-sec">
          <div class="spr-lbl">Live-Checkliste</div>
          <div class="spr-steps">
            <div v-for="s in planSignals" :key="s.index" class="spr-step" :class="{ done: s.said }">
              <span class="spr-step-n">{{ String(s.index + 1).padStart(2, '0') }}</span>
              <span>
                <span class="spr-step-t"><span class="spr-step-dot" :class="{ on: s.said }" />{{ s.punkt }}</span>
                <span class="spr-step-m">{{ s.keyword || '—' }}<template v-if="s.said"> · geschrieben</template></span>
              </span>
            </div>
          </div>
        </div>

        <div v-if="beitrag.helps.checklist" class="spr-rail-sec">
          <div class="spr-lbl">{{ words }} Wörter · mindestens {{ SCHREIBEN_MIN_WORDS }}</div>
          <div class="spr-timebar">
            <span :style="{ width: `${Math.min(100, (words / SCHREIBEN_TARGET_WORDS) * 100)}%` }" :class="wordBand === 'under' ? '' : wordBand" />
          </div>
          <div v-if="beitrag.helps.timer" class="spr-timebar-l">
            <span class="spr-num">Ziel {{ SCHREIBEN_TARGET_WORDS }} Wörter</span>
            <span class="spr-num" :class="{ 'timer-over': overBudget }">
              {{ timerLabel }}<template v-if="overBudget"> über dem Budget</template><template v-else> übrig</template>
            </span>
          </div>
        </div>

        <div class="spr-rail-sec">
          <div class="spr-lbl">Schreibmittel · {{ usedIds.size }} / {{ SCHREIBEN_SCHREIBMITTEL.length }}</div>
          <div class="spr-used">
            <span
              v-for="r in SCHREIBEN_SCHREIBMITTEL" :key="r.id" class="spr-used-dot"
              :class="{ on: usedIds.has(r.id) }" :title="r.phraseDe"
            />
          </div>
        </div>
      </aside>

      <div class="spr-run-main">
        <div v-if="grading" class="alert alert-info">
          <span class="alert-label">Auswertung</span>
          Der Forumsbeitrag wird gelesen — Inhaltspunkte geprüft, Fehler markiert, vier Kriterien bewertet. Einen Moment…
        </div>

        <div v-else-if="gradeFailed" class="alert alert-danger">
          <span class="alert-label">Analyse fehlgeschlagen</span>
          Der Forumsbeitrag ist gespeichert und kann erneut ausgewertet werden.
          <div class="nf-actions">
            <button class="btn btn-accent" type="button" @click="runGrading">Analyse erneut versuchen</button>
            <button class="btn btn-ghost" type="button" @click="confirmAbandon">Forumsbeitrag verwerfen</button>
          </div>
        </div>

        <div v-else-if="awaitingGradeStart" class="alert alert-info">
          <span class="alert-label">Bereit zur Auswertung</span>
          Dein Forumsbeitrag ist gespeichert.
          <div class="nf-actions">
            <button class="btn btn-accent" type="button" @click="runGrading">Analyse starten</button>
            <button class="btn btn-ghost" type="button" @click="confirmAbandon">Forumsbeitrag verwerfen</button>
          </div>
        </div>

        <template v-else>
          <div class="spr-composer">
            <textarea
              ref="textEl" v-model="textDraft" autofocus spellcheck="false"
              placeholder="Schreib deinen Forumsbeitrag — ganze Sätze, wie in der Prüfung."
              class="beitrag-textarea"
            />
            <div class="spr-composer-f">
              <span v-if="beitrag.helps.checklist" class="spr-count">{{ words }} Wörter</span>
            </div>
          </div>

          <div v-if="beitrag.helps.kiTipp && canUseAi" class="ki-standalone">
            <button class="btn btn-quiet" type="button" :disabled="kiBusy" @click="fetchKiTipp">
              {{ kiBusy ? '✦ KI-Tipp…' : '✦ KI-Tipp · 1 Call' }}
            </button>
            <p v-if="kiTipp" class="spr-kitipp">{{ kiTipp }}</p>
          </div>

          <template v-if="beitrag.helps.hints">
            <div v-if="moveNudge" class="spr-nudge">
              <span class="spr-nudge-l">Diesmal</span>
              <span class="spr-nudge-t">{{ SCHREIB_MOVE_LABEL[moveNudge].de.toLowerCase() }}</span>
              <button class="spr-nudge-x" type="button" aria-label="Hinweis ausblenden" @click="nudgeDismissed = true">×</button>
            </div>

            <div class="spr-drawer">
              <div class="spr-drawer-h">
                <button class="spr-dtab" :class="{ on: tab === 'wie' }" type="button" @click="selectTab('wie')">
                  Wie<span class="spr-dtab-sub">Schreibmittel</span>
                </button>
                <button class="spr-dtab" :class="{ on: tab === 'was' }" type="button" @click="selectTab('was')">
                  Was<span class="spr-dtab-sub">Argumente</span>
                </button>
              </div>

              <div class="spr-drawer-b">
                <template v-if="tab === 'wie'">
                  <div class="spr-moverow">
                    <button
                      v-for="m in SCHREIB_MOVES" :key="m" type="button" class="spr-move"
                      :class="{ on: move === m, fresh: freshMoves.has(m) }"
                      @click="selectMove(m)"
                    >{{ SCHREIB_MOVE_LABEL[m].de }}</button>
                  </div>
                  <ul class="spr-phrases">
                    <li v-for="p in drawerPhrases" :key="p.id" class="spr-phrase">
                      <button class="spr-phrase-t" :class="{ used: p.used }" type="button" @click="insertPhrase(p.phraseDe)">{{ p.phraseDe }}</button>
                      <span class="spr-phrase-en">{{ p.used ? 'schon benutzt' : p.noteEn }}</span>
                    </li>
                  </ul>
                </template>

                <div v-else class="spr-was">
                  <div class="spr-was-h">Dafür</div>
                  <div v-for="(a, i) in bank?.pro ?? []" :key="`p${i}`" class="spr-was-i">
                    <div class="spr-was-c">{{ a.claim }}</div>
                    <p class="spr-was-w">{{ a.why }}</p>
                  </div>
                  <div class="spr-was-h">Dagegen</div>
                  <div v-for="(a, i) in bank?.contra ?? []" :key="`c${i}`" class="spr-was-i">
                    <div class="spr-was-c">{{ a.claim }}</div>
                    <p class="spr-was-w">{{ a.why }}</p>
                  </div>
                </div>
              </div>
            </div>
          </template>
          <div v-else class="alert alert-info exam-note">Prüfungsbedingungen — ohne Hilfsmittel.</div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.loading-state { text-align: center; padding-top: 120px; }
.schreiben-run { max-width: 1080px; }
.run-head { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 12px; }
.run-thesis { font-family: var(--font-display); font-size: 24px; font-style: italic; line-height: 1.35; margin: 4px 0; }
.run-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; flex: 0 0 auto; }

.spr-rail-forum { font-size: 12.5px; font-style: italic; color: var(--mute); margin: 8px 0 0; }

/* Live-Checkliste's one dot per row — a component-local twin of the shared
   .spr-used-dot, kept separate so it can never be confused (in markup or in
   a query) with the Schreibmittel-yield dots in the same rail. */
.spr-step-dot { display: inline-block; width: 8px; height: 8px; border: 1px solid var(--hairline); margin-right: 8px; vertical-align: middle; }
.spr-step-dot.on { background: var(--accent); border-color: var(--accent); }

.timer-over { color: var(--danger); }

.beitrag-textarea { width: 100%; min-height: 420px; background: transparent; border: 0; padding: 16px 18px; font-family: var(--font-body); font-size: 16.5px; line-height: 1.65; color: var(--ink); resize: vertical; }
.beitrag-textarea:focus { outline: 0; }
.beitrag-textarea::placeholder { color: var(--mute); font-style: italic; }

.ki-standalone { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; margin-top: 16px; }

.exam-note { margin-top: 12px; }

.nf-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 10px; }

@media (max-width: 860px) {
  .run-head { flex-direction: column; }
}
</style>
