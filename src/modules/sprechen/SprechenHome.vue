<script setup lang="ts">
// Sprechen hub — four bands: masthead, the two exam parts, shared rows,
// Ausbeute + recent Runs. Teil 1 (Vortrag) is NOT built; its panel renders for
// the design's two-panel composition but is inert (spec decision 3).
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { loadHistory } from '../../composables/useQuizHistory'
import { countsByKind, openCorrections } from '../../composables/useSprechenArchive'
import { lifetimeCounts } from '../../composables/useRedemittelYield'
import { SPRECHEN_TOPICS } from '../../data/sprechenTopics'
import { doneTopicTitles } from '../../composables/useSprechenTopics'
import { SPRECHEN_REDEMITTEL } from '../../data/sprechenRedemittel'
import SprYield from '../../components/sprechen/SprYield.vue'
import SprCriterionBars, { type CriterionScore } from '../../components/sprechen/SprCriterionBars.vue'

const router = useRouter()
function go(name: string) { router.push({ name }) }

const runs = computed(() => loadHistory().filter(h => h.type === 'sprechen-teil2'))

/** Latest run per Modality — not best, not mean (spec decision 12). */
function latestCriteria(modality: 'typed' | 'spoken'): CriterionScore[] | null {
  const hit = runs.value.find(r => (r.meta.sprechenModality ?? 'typed') === modality)
  const cs = hit?.meta.sprechenCriteria
  return Array.isArray(cs) && cs.length > 0 ? (cs as CriterionScore[]) : null
}
const typedCriteria = computed(() => latestCriteria('typed'))
const spokenCriteria = computed(() => latestCriteria('spoken'))

const lifetimeUsedIds = computed(() => Object.keys(lifetimeCounts()))
const usedCount = computed(() => lifetimeUsedIds.value.length)

// doneTopicTitles() already performs exactly this computation and is the
// same function pickRandomTopic() uses to prefer undiscussed Topics — reuse it
// so the hub's count and the picker can never disagree.
const openTopics = computed(() => {
  const done = doneTopicTitles()
  return SPRECHEN_TOPICS.filter(t => !done.has(t.titleDe)).length
})
const lastScore = computed(() => runs.value[0]?.meta.sprechenScore ?? null)

// Live archive counts — a nice-to-have, never a blocker. THREE states, kept
// distinguishable on purpose: `null` alone would make a failed read look
// identical to a still-loading one, so the row would read "wird geladen"
// forever.
const archive = ref<{ total: number; open: number } | null>(null)
const archiveState = ref<'loading' | 'ready' | 'failed'>('loading')
onMounted(async () => {
  try {
    const [counts, open] = await Promise.all([countsByKind(), openCorrections()])
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

const recents = computed(() =>
  runs.value.slice(0, 6).map(r => ({
    id: r.id,
    date: new Date(r.startedAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
    topic: r.meta.topicTitle ?? '—',
    score: r.meta.sprechenScore ?? r.correct,
    praedikat: r.meta.sprechenPraedikat ?? '—',
    sub: [
      `${r.meta.learnerTurns ?? '?'} Beiträge`,
      (r.meta.sprechenModality ?? 'typed') === 'spoken' ? 'gesprochen' : 'getippt',
      `${(r.meta.sprechenRedemittel as string[] | undefined)?.length ?? 0} Redemittel benutzt`
    ].join(' · ')
  }))
)

// Task 13 appends the Korrekturdrill row here, once its route exists.
const rows = [
  {
    n: 'I', route: 'sprechen-cheatsheet', title: 'Redemittel',
    de: 'Spickzettel · Teil 2',
    desc: `${SPRECHEN_REDEMITTEL.length} Wendungen für die Diskussion, nach Gesprächszug geordnet, mit dem Bauplan eines Beitrags.`
  },
  {
    n: 'II', route: 'sprechen-archive', title: 'Fehlerarchiv',
    de: 'Wiederkehrende Fehler',
    desc: 'Deine eigenen falschen Stellen aus den Diskussionen, nach Fehlerart sortiert. Das Gespräch selbst wird verworfen — diese Sätze nicht.'
  }
]

function metaFor(route: string): string[] {
  if (route === 'sprechen-cheatsheet') {
    return [`${SPRECHEN_REDEMITTEL.length} Wendungen`, `${usedCount.value} davon benutzt`]
  }
  if (archiveState.value === 'loading') return ['Archiv wird geladen']
  if (archiveState.value === 'failed' || !archive.value) return ['Archiv nicht lesbar']
  if (archive.value.total === 0) return ['Noch nichts archiviert']
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
          Die mündliche B2-Prüfung. Teil 2 ist eine Diskussion gegen einen KI-Partner,
          der nicht locker lässt — getippt oder gesprochen. Aussprache bleibt draußen;
          bewertet werden Argumentation, Redemittel, Strukturen und Reaktion.
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
        <div class="spr-lbl">Letzte Werte · getippt / gesprochen</div>
        <SprCriterionBars :typed="typedCriteria" :spoken="spokenCriteria" />
      </div>
    </div>

    <!-- 02 · The two exam parts -->
    <div class="spr-parts">
      <button class="spr-part dead" type="button" disabled>
        <div class="spr-part-h">
          <span class="spr-part-n">Teil 1</span>
          <span class="spr-lbl">allein, ca. 4 Minuten</span>
        </div>
        <div class="spr-part-t">Vortrag</div>
        <p class="spr-part-claim">
          Ein Aufgabenblatt, fünf Punkte, vier Minuten Rede — danach eine Nachfrage.
        </p>
        <p class="spr-part-d">
          Du wählst zwischen zwei Themen, planst die Gliederung und hältst den Vortrag
          Abschnitt für Abschnitt. Bewertet wird, ob alle fünf Punkte tragen.
        </p>
        <!-- Inside the button, so a screen reader announces it as part of the
             button's content. aria-describedby would be redundant here and is
             inconsistently honoured on disabled controls. -->
        <span class="spr-part-soon">In Vorbereitung</span>
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
            <b>{{ lastScore === null ? 'noch keine' : `zuletzt ${lastScore}` }}</b>
            <span>{{ lastScore === null ? 'Diskussion' : '/ 100' }}</span>
          </div>
          <div><b>{{ runs.length }} Diskussionen</b><span>bisher</span></div>
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
        <h2 class="spr-block-t">Redemittel-Ausbeute</h2>
        <span class="spr-block-n">lokal gezählt · ohne KI · zählt nie in die Note</span>
      </div>
      <p class="spr-sub spr-sub-tight">
        Was du in Diskussionen tatsächlich benutzt hast — über alle Runs hinweg. Ein Move
        ohne Treffer ist genau der, zu dem der Runner dich künftig schubst.
      </p>
      <SprYield :used-ids="lifetimeUsedIds"
        note="Noch nie benutzt — der Runner wird dich darauf schubsen." />
    </section>

    <!-- 04b · Recent Runs -->
    <section v-if="recents.length > 0" class="spr-block">
      <div class="spr-block-h">
        <h2 class="spr-block-t">Letzte Diskussionen</h2>
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
