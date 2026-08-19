<script setup lang="ts">
// Sprechen hub — four bands: masthead, the two exam parts, shared rows,
// Ausbeute + recent Runs. Both Teil 1 (Vortrag) and Teil 2 (Diskussion) are
// live. A single part toggle — persisted in localStorage['sprechenTeil1Setup']
// alongside the setup and result screens' own fields — drives both the
// criterion bars and the Redemittel-Ausbeute, so the two parts are never
// mixed on one scale.
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { loadHistory } from '../../composables/useQuizHistory'
import { countsByKind, openCorrections, dueCorrections } from '../../composables/useSprechenArchive'
import { lifetimeCounts } from '../../composables/useRedemittelYield'
import { redezeit } from '../../composables/useVortragTimer'
import { SPRECHEN_TOPICS } from '../../data/sprechenTopics'
import { doneTopicTitles } from '../../composables/useSprechenTopics'
import { SPRECHEN_VORTRAGSTHEMEN } from '../../data/sprechenVortragsthemen'
import { doneThemaTitles } from '../../composables/useVortragsthemen'
import { SPRECHEN_REDEMITTEL } from '../../data/sprechenRedemittel'
import { SPRECHEN_VORTRAGSMITTEL } from '../../data/sprechenVortragsmittel'
import SprYield from '../../components/sprechen/SprYield.vue'
import SprVortragYield from '../../components/sprechen/SprVortragYield.vue'
import SprCriterionBars, { type CriterionScore } from '../../components/sprechen/SprCriterionBars.vue'
import { SPRECHEN_B2_TEIL1, SPRECHEN_B2_TEIL2 } from '../../data/rubrics'

const router = useRouter()
function go(name: string) { router.push({ name }) }

// The setup screen and the result screen also write to this key — always
// merge, never overwrite (Teil1Setup.vue's watch handler follows the same
// rule for its own fields).
const SETUP_KEY = 'sprechenTeil1Setup'

type HubPart = 'teil1' | 'teil2'

function loadHubPart(): HubPart {
  try {
    const raw = JSON.parse(localStorage.getItem(SETUP_KEY) ?? '{}') as { hubPart?: HubPart }
    return raw.hubPart === 'teil1' ? 'teil1' : 'teil2'
  } catch {
    return 'teil2'
  }
}
const part = ref<HubPart>(loadHubPart())

function selectPart(p: HubPart) {
  part.value = p
  try {
    const prev = JSON.parse(localStorage.getItem(SETUP_KEY) ?? '{}') as Record<string, unknown>
    localStorage.setItem(SETUP_KEY, JSON.stringify({ ...prev, hubPart: p }))
  } catch { /* ignore */ }
}

const allRuns = computed(() => loadHistory())
const teil2Runs = computed(() => allRuns.value.filter(h => h.type === 'sprechen-teil2'))
const teil1Runs = computed(() => allRuns.value.filter(h => h.type === 'sprechen-teil1'))
const sprechenRuns = computed(() =>
  allRuns.value.filter(h => h.type === 'sprechen-teil1' || h.type === 'sprechen-teil2')
)

/** Latest run per Modality — not best, not mean (spec decision 12). */
function latestCriteria(runs: typeof teil2Runs.value, modality: 'typed' | 'spoken'): CriterionScore[] | null {
  const hit = runs.find(r => (r.meta.sprechenModality ?? 'typed') === modality)
  const cs = hit?.meta.sprechenCriteria
  return Array.isArray(cs) && cs.length > 0 ? (cs as CriterionScore[]) : null
}
// The toggle picks which Run set (and therefore which rubric's scores) feeds
// the bars. Teil 2 selected is byte-for-byte today's behaviour.
const barsSource = computed(() => (part.value === 'teil1' ? teil1Runs.value : teil2Runs.value))
const typedCriteria = computed(() => latestCriteria(barsSource.value, 'typed'))
const spokenCriteria = computed(() => latestCriteria(barsSource.value, 'spoken'))
// …and which rubric NAMES those rows. The weights are identical between the two
// parts, but the first criterion is not: Erfüllung / Gliederung in Teil 1,
// Erfüllung / Interaktion in Teil 2. Showing a Teil 1 score under the Teil 2
// label would misname what was measured.
const barsRubric = computed(() => (part.value === 'teil1' ? SPRECHEN_B2_TEIL1 : SPRECHEN_B2_TEIL2))

// Lifetime yield per bank, kept separate: the cheatsheet row below totals
// both, while the Ausbeute block shows only the toggled one.
const teil2UsedIds = computed(() => Object.keys(lifetimeCounts()))
const teil1UsedIds = computed(() => Object.keys(lifetimeCounts(SPRECHEN_VORTRAGSMITTEL)))
const usedCount = computed(() => teil2UsedIds.value.length + teil1UsedIds.value.length)
const yieldUsedIds = computed(() => (part.value === 'teil1' ? teil1UsedIds.value : teil2UsedIds.value))

// doneTopicTitles()/doneThemaTitles() already perform exactly this
// computation and are the same functions pickRandomTopic()/drawThemaPair()
// use to prefer undiscussed Topics/Vortragsthemen — reuse them so the hub's
// counts and the pickers can never disagree.
const openTopics = computed(() => {
  const done = doneTopicTitles()
  return SPRECHEN_TOPICS.filter(t => !done.has(t.titleDe)).length
})
const openThemen = computed(() => {
  const done = doneThemaTitles()
  return SPRECHEN_VORTRAGSTHEMEN.filter(t => !done.has(t.titleDe)).length
})
const lastScoreTeil2 = computed(() => teil2Runs.value[0]?.meta.sprechenScore ?? null)
const lastScoreTeil1 = computed(() => teil1Runs.value[0]?.meta.sprechenScore ?? null)

// Live archive counts — a nice-to-have, never a blocker. THREE states, kept
// distinguishable on purpose: `null` alone would make a failed read look
// identical to a still-loading one, so the row would read "wird geladen"
// forever.
const archive = ref<{ total: number; open: number; due: number } | null>(null)
const archiveState = ref<'loading' | 'ready' | 'failed'>('loading')
onMounted(async () => {
  try {
    const [counts, open, due] = await Promise.all([countsByKind(), openCorrections(), dueCorrections()])
    archive.value = {
      total: Object.values(counts).reduce((a, b) => a + b, 0),
      open: open.length,
      due: due.length
    }
    archiveState.value = 'ready'
  } catch {
    archive.value = null
    archiveState.value = 'failed'
  }
})

/** One date-sorted list over both parts. loadHistory() is already newest
 *  first, and filtering preserves relative order, so no extra sort needed. */
const recents = computed(() =>
  sprechenRuns.value.slice(0, 6).map(r => {
    const isTeil1 = r.type === 'sprechen-teil1'
    const modality = r.meta.sprechenModality ?? 'typed'
    const sub = isTeil1
      ? [
          `${r.meta.sectionsCovered ?? 0}/5 Punkte`,
          modality === 'spoken' ? 'gesprochen' : 'getippt',
          `Redezeit ${redezeit({
            words: r.meta.wordCount ?? 0,
            seconds: r.meta.spokenSeconds,
            modality
          }).clock}`
        ].join(' · ')
      : [
          `${r.meta.learnerTurns ?? '?'} Beiträge`,
          modality === 'spoken' ? 'gesprochen' : 'getippt',
          `${(r.meta.sprechenRedemittel as string[] | undefined)?.length ?? 0} Redemittel benutzt`
        ].join(' · ')
    return {
      id: r.id,
      date: new Date(r.startedAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
      part: isTeil1 ? 'Teil 1' : 'Teil 2',
      topic: r.meta.topicTitle ?? '—',
      score: r.meta.sprechenScore ?? r.correct,
      praedikat: r.meta.sprechenPraedikat ?? '—',
      sub
    }
  })
)

const rows = [
  {
    n: 'I', route: 'sprechen-cheatsheet', title: 'Redemittel',
    de: 'Spickzettel · Teil 1 & Teil 2',
    desc: `${SPRECHEN_REDEMITTEL.length + SPRECHEN_VORTRAGSMITTEL.length} Wendungen für Vortrag und ` +
      'Diskussion, nach Move geordnet, mit dem Bauplan für Rede und Beitrag.'
  },
  {
    n: 'II', route: 'sprechen-archive', title: 'Fehlerarchiv',
    de: 'Wiederkehrende Fehler',
    desc: 'Deine eigenen falschen Stellen aus den Diskussionen, nach Fehlerart sortiert. Das Gespräch selbst wird verworfen — diese Sätze nicht.'
  },
  {
    n: 'III', route: 'sprechen-drill', title: 'Korrekturdrill',
    de: 'Deine Sätze, noch einmal',
    desc: 'Spielt deine eigenen markierten Stellen aus — du tippst nur die Korrektur. Was du richtig hast, gilt als nachgeübt.'
  }
]

function metaFor(route: string): string[] {
  if (route === 'sprechen-cheatsheet') {
    return [`${SPRECHEN_REDEMITTEL.length + SPRECHEN_VORTRAGSMITTEL.length} Wendungen`, `${usedCount.value} davon benutzt`]
  }
  if (archiveState.value === 'loading') return ['Archiv wird geladen']
  if (archiveState.value === 'failed' || !archive.value) return ['Archiv nicht lesbar']
  if (archive.value.total === 0) return ['Noch nichts archiviert']
  if (route === 'sprechen-drill') {
    return [
      `${archive.value.open} offen`,
      `${archive.value.due} fällig`,
      `${archive.value.total - archive.value.open - archive.value.due} nachgeübt`
    ]
  }
  return [`${archive.value.total} Korrekturen`, `${archive.value.open} offen`]
}
</script>

<template>
  <div class="page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Kapitel · Sprechen</div>
        <h1 class="section-title">Sprechen<em>.</em></h1>
        <p class="section-subtitle">
          Die mündliche B2-Prüfung. Teil 1 ist ein Vortrag nach Aufgabenblatt, Teil 2 eine
          Diskussion gegen einen KI-Partner, der nicht locker lässt — beide getippt oder
          gesprochen. Aussprache bleibt draußen; bewertet werden Erfüllung, Redemittel,
          Strukturen und Reaktion.
        </p>
      </div>
      <div class="spr-level">
        <div class="micro-mark">Niveau</div>
        <div class="spr-level-v">B2</div>
      </div>
    </header>

    <!-- 01 · Masthead -->
    <div class="spr-mast">
      <div class="spr-mast-main">
        <div class="spr-lbl">Zwei Teile · dieselben vier Etappen</div>
        <p class="spr-claim">Erst allein sprechen,<br />dann <em>dagegenhalten</em>.</p>
        <p class="spr-claim-note">
          Teil 1 ist ein Vortrag nach Aufgabenblatt, Teil 2 eine Diskussion gegen einen
          Partner. Beide laufen durch dieselben vier Etappen und werden nach derselben
          Skala bewertet.
        </p>
        <div class="spr-flow">
          <div class="spr-stage">
            <div class="spr-stage-n">01</div>
            <div class="spr-stage-t">Themenwahl</div>
            <div class="spr-stage-d">Thema · Modalität<br />Beiträge · Position</div>
          </div>
          <div class="spr-stage">
            <div class="spr-stage-n">02</div>
            <div class="spr-stage-t">Vorbereitung</div>
            <div class="spr-stage-d">Winkel · Wortschatz<br />Notizen</div>
          </div>
          <div class="spr-stage">
            <div class="spr-stage-n">03</div>
            <div class="spr-stage-t">Diskussion</div>
            <div class="spr-stage-d">Was &amp; Wie zur Hand<br />Notizen bleiben sichtbar</div>
          </div>
          <div class="spr-stage">
            <div class="spr-stage-n">04</div>
            <div class="spr-stage-t">Auswertung</div>
            <div class="spr-stage-d">Fehler markiert<br />ins Archiv übernommen</div>
          </div>
        </div>
      </div>
      <div class="spr-mast-side">
        <div class="spr-mast-side-h">
          <div class="spr-lbl">Letzte Werte · getippt / gesprochen</div>
          <div class="segmented spr-part-toggle">
            <button type="button" :class="{ active: part === 'teil1' }" @click="selectPart('teil1')">Teil 1</button>
            <button type="button" :class="{ active: part === 'teil2' }" @click="selectPart('teil2')">Teil 2</button>
          </div>
        </div>
        <SprCriterionBars :typed="typedCriteria" :spoken="spokenCriteria" :rubric="barsRubric" />
      </div>
    </div>

    <!-- 02 · The two exam parts -->
    <div class="spr-parts">
      <button class="spr-part" type="button" @click="go('sprechen-teil1')">
        <div class="spr-part-h">
          <span class="spr-part-n">Teil 1</span>
          <span class="spr-lbl">allein, ca. 4 Minuten</span>
        </div>
        <div class="spr-part-t">Vortrag</div>
        <p class="spr-part-claim">
          Ein Aufgabenblatt, fünf Punkte, vier Minuten Rede — danach eine Nachfrage.
        </p>
        <p class="spr-part-d">
          Du wählst zwischen zwei Themen, planst die Gliederung und hältst den Vortrag am
          Stück. Bewertet wird, ob alle fünf Punkte tragen.
        </p>
        <div class="spr-part-stats">
          <div><b>{{ openThemen }} Themen offen</b><span>von {{ SPRECHEN_VORTRAGSTHEMEN.length }}</span></div>
          <div>
            <b>{{ lastScoreTeil1 === null ? 'noch keine' : `zuletzt ${lastScoreTeil1}` }}</b>
            <span>{{ lastScoreTeil1 === null ? 'Vortrag' : '/ 100' }}</span>
          </div>
          <div><b>{{ teil1Runs.length }} Vorträge</b><span>bisher</span></div>
        </div>
        <div class="spr-part-go">Starten <span aria-hidden="true">→</span></div>
      </button>

      <button class="spr-part" type="button" @click="go('sprechen-teil2')">
        <div class="spr-part-h">
          <span class="spr-part-n">Teil 2</span>
          <span class="spr-lbl">mit KI-Partner, ca. 5 Minuten</span>
        </div>
        <div class="spr-part-t">Diskussion</div>
        <p class="spr-part-claim">
          Eine These, zwei Seiten, sechs Beiträge — der Partner lässt nicht locker.
        </p>
        <p class="spr-part-d">
          Thema wählen, getippt oder gesprochen entscheiden, eine Minute vorbereiten,
          deine Seite verteidigen. Bewertet wird auch, wie du auf den Partner reagierst.
        </p>
        <div class="spr-part-stats">
          <div><b>{{ openTopics }} Themen offen</b><span>von {{ SPRECHEN_TOPICS.length }}</span></div>
          <div>
            <b>{{ lastScoreTeil2 === null ? 'noch keine' : `zuletzt ${lastScoreTeil2}` }}</b>
            <span>{{ lastScoreTeil2 === null ? 'Diskussion' : '/ 100' }}</span>
          </div>
          <div><b>{{ teil2Runs.length }} Diskussionen</b><span>bisher</span></div>
        </div>
        <div class="spr-part-go">Starten <span aria-hidden="true">→</span></div>
      </button>
    </div>

    <!-- 03 · Shared rows -->
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

    <!-- 04 · Ausbeute -->
    <section class="spr-block">
      <div class="spr-block-h">
        <h2 class="spr-block-t">{{ part === 'teil1' ? 'Vortragsmittel-Ausbeute' : 'Redemittel-Ausbeute' }}</h2>
        <span class="spr-block-n">lokal gezählt · ohne KI · zählt nie in die Note</span>
      </div>
      <p class="spr-sub spr-sub-tight">
        Was du {{ part === 'teil1' ? 'in Vorträgen' : 'in Diskussionen' }} tatsächlich benutzt
        hast — über alle Runs hinweg. Ein Move ohne Treffer ist genau der, zu dem der Runner
        dich künftig schubst.
      </p>
      <SprYield v-if="part === 'teil2'" :used-ids="yieldUsedIds"
        note="Noch nie benutzt — der Runner wird dich darauf schubsen." />
      <SprVortragYield v-else :used-ids="yieldUsedIds"
        note="Noch nie benutzt — der Runner wird dich darauf schubsen." />
    </section>

    <!-- 04b · Recent Runs -->
    <section v-if="recents.length > 0" class="spr-block">
      <div class="spr-block-h">
        <h2 class="spr-block-t">Letzte Runs</h2>
        <span class="spr-block-n">Gespräche werden nie gespeichert · nur die Bilanz</span>
      </div>
      <div class="spr-rows">
        <div v-for="r in recents" :key="r.id" class="spr-row spr-row-static">
          <span class="spr-row-n">{{ r.date }}</span>
          <span>
            <span class="spr-row-t spr-row-t-sm">{{ r.topic }}</span>
            <span class="spr-row-d spr-row-block">{{ r.sub }}</span>
          </span>
          <span class="spr-row-meta">
            <span class="spr-row-part">{{ r.part }}</span>
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
.spr-claim { margin-top: 16px; }
.spr-mast-side-h {
  display: flex; align-items: center; justify-content: space-between;
  gap: 10px; margin-bottom: 10px; flex-wrap: wrap;
}
.spr-part-toggle { flex-shrink: 0; }
.spr-rows-shared { margin-top: 44px; }
.spr-row-block { display: block; }
.spr-row-arrow { padding-top: 5px; }
.spr-row-part { color: var(--accent); }
.spr-row-t-sm { font-size: 19px; }
.spr-row-static { cursor: default; }
.spr-row-static:hover { background: transparent; padding-left: 14px; }
.spr-row-static:hover::before { transform: scaleY(0); }
.spr-sub-tight { margin-top: -6px; }
.spr-ok { color: var(--success); font-size: 15px; letter-spacing: 0; }
.spr-bad { color: var(--danger); font-size: 15px; letter-spacing: 0; }
</style>
