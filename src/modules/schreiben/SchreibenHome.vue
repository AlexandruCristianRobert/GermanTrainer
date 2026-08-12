<script setup lang="ts">
// Schreiben hub — Goethe B2 exam trainer (CONTEXT.md → "Forumsbeitrag").
// Mirrors SprechenHome.vue's band structure, but single-part: Teil 1
// (Forumsbeitrag) is live, Teil 2 (halbformelle Nachricht) is a visually
// disabled panel, so there is no part toggle here — every band below reads
// straight off 'schreiben-teil1' Runs and the Schreibmittel bank.
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { loadHistory } from '../../composables/useQuizHistory'
import { countsByKind, openCorrections } from '../../composables/useSprechenArchive'
import { lifetimeCounts } from '../../composables/useRedemittelYield'
import { allThemen, doneThemaTitles } from '../../composables/useSchreibenThemen'
import { SCHREIBEN_SCHREIBMITTEL } from '../../data/schreibenMittel'
import { SCHREIBEN_MUSTER } from '../../data/schreibenMuster'
import SchrYield from '../../components/schreiben/SchrYield.vue'
import SprCriterionBars, { type CriterionScore } from '../../components/sprechen/SprCriterionBars.vue'
import { SCHREIBEN_B2_TEIL1 } from '../../data/rubrics'

const router = useRouter()
function go(name: string) { router.push({ name }) }

const allRuns = computed(() => loadHistory())
const schreibenRuns = computed(() => allRuns.value.filter(h => h.type === 'schreiben-teil1'))

/** Newest Run's criteria, not best, not mean — same rule SprechenHome.vue
 *  applies per Modality (there is only one Modality here: typed). */
const latestCriteria = computed<CriterionScore[] | null>(() => {
  const cs = schreibenRuns.value[0]?.meta.sprechenCriteria
  return Array.isArray(cs) && cs.length > 0 ? (cs as CriterionScore[]) : null
})

// doneThemaTitles()/allThemen() already perform exactly this computation and
// are the same functions drawThema() uses to prefer an undone Schreibthema —
// reuse them so the hub's count and the picker can never disagree.
const doneThemen = computed(() => doneThemaTitles().size)
const totalThemen = computed(() => allThemen().length)
const lastScore = computed(() => schreibenRuns.value[0]?.meta.sprechenScore ?? null)

const usedSchreibmittelIds = computed(() => Object.keys(lifetimeCounts(SCHREIBEN_SCHREIBMITTEL)))
const usedSchreibmittelCount = computed(() => usedSchreibmittelIds.value.length)

// Live archive counts, scoped to Schreiben Teil 1 only (part 1, module
// 'schreiben') — a nice-to-have, never a blocker. THREE states, kept
// distinguishable on purpose: `null` alone would make a failed read look
// identical to a still-loading one, so the row would read "wird geladen"
// forever.
const archive = ref<{ total: number; open: number } | null>(null)
const archiveState = ref<'loading' | 'ready' | 'failed'>('loading')
onMounted(async () => {
  try {
    const [counts, open] = await Promise.all([
      countsByKind(1, 'schreiben'),
      openCorrections(undefined, 1, 'schreiben')
    ])
    archive.value = {
      total: Object.values(counts).reduce((a, b) => a + b, 0),
      open: open.length
    }
    archiveState.value = 'ready'
  } catch {
    archive.value = null
    archiveState.value = 'failed'
  }
})

/** Last 5 Forumsbeiträge, newest first — loadHistory() is already sorted, so
 *  filtering preserves order and no extra sort is needed. */
const recents = computed(() =>
  schreibenRuns.value.slice(0, 5).map(r => ({
    id: r.id,
    date: new Date(r.startedAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
    topic: r.meta.topicTitle ?? '—',
    score: r.meta.sprechenScore ?? r.correct,
    praedikat: r.meta.sprechenPraedikat ?? '—'
  }))
)

// Cheatsheet / Fehlerarchiv / Korrekturdrill — the three shared rows below the
// two exam-part tiles, same "rows" idiom as SprechenHome.vue's rows section.
const rows = [
  {
    n: 'I', route: 'schreiben-cheatsheet', title: 'Cheatsheet & Tipps',
    de: 'Schreibmittel · Strategie',
    desc: `${SCHREIBEN_SCHREIBMITTEL.length} Schreibmittel nach Beitragsfunktion geordnet, plus die ` +
      'Tipps zu Aufbau, Zeitbudget, Wortzahl und den vier Bewertungskriterien.'
  },
  {
    n: 'II', route: 'schreiben-muster', title: 'Mustertexte',
    de: 'Fünf Aufgabenmuster, Satz für Satz erklärt',
    desc: 'Ein annotierter Mustertext je Aufgabenmuster: Konnektoren, Schreibmittel-Züge und ' +
      'grammatische Strukturen markiert, jede Stelle mit einer eigenen Begründung.'
  },
  {
    n: 'III', route: 'sprechen-archive', title: 'Fehlerarchiv',
    de: 'Wiederkehrende Fehler',
    desc: 'Deine eigenen falschen Stellen aus den Forumsbeiträgen, nach Fehlerart sortiert. Der Text selbst wird verworfen — diese Sätze nicht.'
  },
  {
    n: 'IV', route: 'sprechen-drill', title: 'Korrekturdrill',
    de: 'Deine Sätze, noch einmal',
    desc: 'Spielt deine eigenen markierten Stellen aus — du tippst nur die Korrektur. Was du richtig hast, gilt als nachgeübt.'
  }
]

function metaFor(route: string): string[] {
  if (route === 'schreiben-cheatsheet') {
    return [`${SCHREIBEN_SCHREIBMITTEL.length} Wendungen`, `${usedSchreibmittelCount.value} davon benutzt`]
  }
  if (route === 'schreiben-muster') {
    return [`${SCHREIBEN_MUSTER.length} Muster`]
  }
  if (archiveState.value === 'loading') return ['Archiv wird geladen']
  if (archiveState.value === 'failed' || !archive.value) return ['Archiv nicht lesbar']
  if (archive.value.total === 0) return ['Noch nichts archiviert']
  if (route === 'sprechen-drill') {
    return [`${archive.value.open} offen`, `${archive.value.total - archive.value.open} nachgeübt`]
  }
  return [`${archive.value.total} Korrekturen`, `${archive.value.open} offen`]
}
</script>

<template>
  <div class="page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Kapitel · Goethe B2 · Schreiben</div>
        <h1 class="section-title">Forumsbeitrag<em>.</em></h1>
        <p class="section-subtitle">
          Teil 1 der schriftlichen B2-Prüfung: ein Schreibthema, vier Inhaltspunkte, mindestens
          150 Wörter. Bewertet werden Erfüllung/Inhalt, Kohärenz &amp; Textaufbau, Wortschatz und
          Strukturen. Der Text wird nach der Bewertung verworfen — was bleibt, sind Korrekturen
          und Ergebnis.
        </p>
      </div>
      <div class="spr-level">
        <div class="micro-mark">Niveau</div>
        <div class="spr-level-v">B2</div>
      </div>
    </header>

    <!-- 01 · The two exam parts -->
    <div class="spr-parts">
      <button class="spr-part" type="button" @click="go('schreiben-teil1')">
        <div class="spr-part-h">
          <span class="spr-part-n">Teil 1</span>
          <span class="spr-lbl">allein, ca. 50 Minuten</span>
        </div>
        <div class="spr-part-t">Forumsbeitrag</div>
        <p class="spr-part-claim">
          Ein Schreibthema, vier Inhaltspunkte, mindestens 150 Wörter.
        </p>
        <p class="spr-part-d">
          Du bekommst ein Aufgabenblatt mit vier Inhaltspunkten, planst deinen Schreibplan und
          schreibst den Forumsbeitrag am Stück. Bewertet wird, ob alle vier Punkte tragen.
        </p>
        <div class="spr-part-stats">
          <div><b>{{ doneThemen }}/{{ totalThemen }}</b><span>Themen bearbeitet</span></div>
          <div>
            <b>{{ lastScore === null ? 'noch keine' : `zuletzt ${lastScore}` }}</b>
            <span>{{ lastScore === null ? 'Bewertung' : '/ 100' }}</span>
          </div>
          <div><b>{{ schreibenRuns.length }} Beiträge</b><span>bisher</span></div>
        </div>
        <div class="spr-part-go">Starten <span aria-hidden="true">→</span></div>
      </button>

      <div class="spr-part dead" aria-disabled="true">
        <div class="spr-part-h">
          <span class="spr-part-n">Teil 2</span>
          <span class="spr-lbl">halbformell</span>
        </div>
        <div class="spr-part-t">Halbformelle Nachricht</div>
        <p class="spr-part-claim">
          Eine halbformelle Nachricht auf eine vorgegebene Situation hin.
        </p>
        <p class="spr-part-d">
          Reagieren auf eine Situation mit passendem Register, Anrede und Schlussformel — dieser
          Teil folgt in einer späteren Version.
        </p>
        <span class="spr-part-soon">folgt</span>
      </div>
    </div>

    <!-- 02 · Shared rows -->
    <div class="spr-rows spr-rows-shared">
      <button v-for="r in rows" :key="r.route" class="spr-row" type="button" @click="go(r.route)">
        <span class="spr-row-n">{{ r.n }}</span>
        <span>
          <span class="spr-row-t">{{ r.title }}<span class="spr-row-de">{{ r.de }}</span></span>
          <span class="spr-row-d spr-row-block">{{ r.desc }}</span>
        </span>
        <span class="spr-row-meta">
          <span v-for="m in metaFor(r.route)" :key="m">{{ m }}</span>
        </span>
        <span class="spr-row-arrow"><span class="drill-arrow">→</span></span>
      </button>
    </div>

    <!-- 03 · Letzte Bewertung -->
    <section class="spr-block">
      <div class="spr-block-h">
        <h2 class="spr-block-t">Letzte Bewertung</h2>
        <span class="spr-block-n">nach der offiziellen Rubrik · getippt</span>
      </div>
      <SprCriterionBars :typed="latestCriteria" :spoken="null" :rubric="SCHREIBEN_B2_TEIL1" />
    </section>

    <!-- 04 · Schreibmittel-Ausbeute -->
    <section class="spr-block">
      <div class="spr-block-h">
        <h2 class="spr-block-t">Schreibmittel-Ausbeute</h2>
        <span class="spr-block-n">lokal gezählt · ohne KI · zählt nie in die Note</span>
      </div>
      <p class="spr-sub spr-sub-tight">
        Was du in Forumsbeiträgen tatsächlich benutzt hast — über alle Runs hinweg. Eine
        Beitragsfunktion ohne Treffer ist genau die, zu der der Runner dich künftig schubst.
      </p>
      <SchrYield :used-ids="usedSchreibmittelIds"
        note="Noch nie benutzt — der Runner wird dich darauf schubsen." />
    </section>

    <!-- 04b · Letzte Beiträge -->
    <section v-if="recents.length > 0" class="spr-block">
      <div class="spr-block-h">
        <h2 class="spr-block-t">Letzte Beiträge</h2>
        <span class="spr-block-n">Texte werden nie gespeichert · nur die Bilanz</span>
      </div>
      <div class="spr-rows">
        <div v-for="r in recents" :key="r.id" class="spr-row spr-row-static">
          <span class="spr-row-n">{{ r.date }}</span>
          <span>
            <span class="spr-row-t spr-row-t-sm">{{ r.topic }}</span>
          </span>
          <span class="spr-row-meta">
            <span class="spr-num" :class="r.score >= 60 ? 'spr-ok' : 'spr-bad'">
              {{ r.score }} / 100
            </span>
            <span>{{ r.praedikat }}</span>
          </span>
          <span class="spr-row-arrow" />
        </div>
      </div>
    </section>

    <div class="setup-actions">
      <button class="btn btn-ghost" type="button" @click="go('home')">← Back</button>
    </div>
  </div>
</template>

<style scoped>
/* Only what the global sheet has no business owning: this page's own
   arrangement. Everything visual lives in src/styles/sprechen.css. */
.spr-level { text-align: right; }
.spr-level-v {
  font-family: var(--font-display); font-size: 24px;
  font-style: italic; letter-spacing: -0.01em; margin-top: 6px;
}
.spr-rows-shared { margin-top: 44px; }
.spr-row-block { display: block; }
.spr-row-arrow { padding-top: 5px; }
.spr-row-t-sm { font-size: 19px; }
.spr-row-static { cursor: default; }
.spr-row-static:hover { background: transparent; padding-left: 14px; }
.spr-row-static:hover::before { transform: scaleY(0); }
.spr-sub-tight { margin-top: -6px; }
.spr-ok { color: var(--success); font-size: 15px; letter-spacing: 0; }
.spr-bad { color: var(--danger); font-size: 15px; letter-spacing: 0; }
</style>
