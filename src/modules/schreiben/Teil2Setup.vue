<script setup lang="ts">
//
// Schreiben Teil 2 — Auftragswahl. Structural twin of Teil1Setup.vue
// (localStorage setup persistence via merge-write, resume banner, generation
// UX) but the exam hands out a situational Schreibauftrag here, not a forum
// topic — CONTEXT.md → "Schreibauftrag": a workplace/course situation, the
// Empfänger the Nachricht goes to (name + role — what the Anrede must fit),
// the exam's own taskDe instruction, and four situation-flavored
// Inhaltspunkte. `drawAuftrag()` draws that single sheet; a reroll redraws
// it, and the full pool (seeded + custom) stays one click away.
//
// Divergence from Teil 1: every Auftrag carries exactly one Schreibanlass
// (ADR-0023), so this screen adds a session-only Anlass filter above the
// draw. Selecting a chip both narrows the pool list AND redraws the sheet —
// `drawn` below reads `selectedAnlass.value` directly, so it is a dependency
// of the computed just like `redrawSeed`.
//
// Unlike Sprechen Teil 1, there is no Modality and no Vorbereitungszeit
// choice here — Schreiben is always typed, and Planung (Teil2Prep.vue) is
// never skipped from this screen; it is itself skippable via its own „Ohne
// Plan starten" button. The CTA below always lands on the planning screen.

import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  NACHRICHT_STASH_KEY,
  type NachrichtHelps, type NachrichtRunStash, type SchreibauftragRef, type SchreibenNachricht
} from '../../data/schreibenNachricht'
import { emptySchreibPlan } from '../../data/schreiben'
import {
  SCHREIB_ANLAESSE, ANLASS_LABEL, type Schreibauftrag, type SchreibAnlass
} from '../../data/schreibenAuftraege'
import { NACHRICHT_MUSTER_TITLE } from '../../data/schreibenMusterNachrichten'
import {
  drawAuftrag, allAuftraege, doneAuftragTitles,
  addCustomAuftraege, deleteCustomAuftrag, generateAuftraege
} from '../../composables/useSchreibenAuftraege'
import { findActiveNachricht, abandonNachricht } from '../../composables/useSchreibenNachricht'
import { resolveAiClient } from '../../composables/localClaude'
import { useSettings } from '../../composables/useSettings'
import { useToast } from '../../composables/useToast'

// NOTE: no `export` here — <script setup> blocks cannot export bindings.
const STORAGE_KEY = 'schreibenTeil2Setup'

interface StoredSetup {
  hintsOn?: boolean
  checklistOn?: boolean
  kiTippOn?: boolean
  timerOn?: boolean
  rahmenOn?: boolean
  radarOn?: boolean
  lang?: 'de' | 'en'
}

const router = useRouter()
const toast = useToast()
const { settings, canUseAi, load: loadSettings } = useSettings()

const hintsOn = ref(true)
const checklistOn = ref(true)
const kiTippOn = ref(true)
const timerOn = ref(true)
const rahmenOn = ref(true)
const radarOn = ref(true)
const selectedAnlass = ref<SchreibAnlass | null>(null) // session-only — never persisted
const overridePick = ref<string | null>(null)
const browse = ref(false)
const generating = ref(false)
const redrawSeed = ref(0)
const poolVersion = ref(0)
const done = ref<Set<string>>(new Set())
const active = ref<SchreibenNachricht | null>(null)

/** The single task sheet on offer. Redrawn on explicit request OR whenever
 *  the Anlass filter changes — `selectedAnlass.value` is read directly, so
 *  it is a reactive dependency of this computed just like `redrawSeed`. */
const drawn = computed<Schreibauftrag>(() => {
  redrawSeed.value // eslint-disable-line no-unused-expressions
  return drawAuftrag(selectedAnlass.value)
})

/** The full pool, Anlass-filtered — for the ledger and the reroll floor alike. */
const ledgerList = computed<Schreibauftrag[]>(() => {
  poolVersion.value // eslint-disable-line no-unused-expressions
  const all = allAuftraege()
  return selectedAnlass.value ? all.filter(a => a.anlass === selectedAnlass.value) : all
})

/** The filtered ledger, grouped by Anlass in the canonical order — a group
 *  is omitted once the filter has emptied it (e.g. a specific Anlass chip
 *  leaves exactly one group standing). */
const groupedLedger = computed<{ anlass: SchreibAnlass; items: Schreibauftrag[] }[]>(() => {
  return SCHREIB_ANLAESSE
    .map(a => ({ anlass: a, items: ledgerList.value.filter(x => x.anlass === a) }))
    .filter(g => g.items.length > 0)
})

/** The drawn sheet, unless the learner picked a different one from the pool. */
const chosen = computed<Schreibauftrag>(() => {
  if (overridePick.value) {
    const found = ledgerList.value.find(a => a.id === overridePick.value)
    if (found) return found
  }
  return drawn.value
})

// Musternachricht deep-link — ALWAYS present, unlike Teil 1's Mustertext
// link: every Schreibauftrag (seeded or custom/AI-generated alike) carries
// exactly one Schreibanlass, and NACHRICHT_MUSTER_TITLE has an entry for
// each of the five — there is no fallback branch to write.
const musterLinkLabel = computed(() => NACHRICHT_MUSTER_TITLE[chosen.value.anlass])
const musterLinkTo = computed(() => ({ name: 'schreiben-muster-teil2', query: { muster: chosen.value.anlass } }))

function toAuftragRef(a: Schreibauftrag): SchreibauftragRef {
  return {
    id: a.id, titleDe: a.titleDe, situationDe: a.situationDe,
    empfaengerName: a.empfaengerName, empfaengerRolleDe: a.empfaengerRolleDe,
    taskDe: a.taskDe, inhaltspunkte: a.inhaltspunkte, anlass: a.anlass
  }
}

onMounted(async () => {
  await loadSettings()
  done.value = doneAuftragTitles()
  active.value = (await findActiveNachricht()) ?? null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const s = JSON.parse(raw) as StoredSetup
      if (typeof s.hintsOn === 'boolean') hintsOn.value = s.hintsOn
      if (typeof s.checklistOn === 'boolean') checklistOn.value = s.checklistOn
      if (typeof s.kiTippOn === 'boolean') kiTippOn.value = s.kiTippOn
      if (typeof s.timerOn === 'boolean') timerOn.value = s.timerOn
      if (typeof s.rahmenOn === 'boolean') rahmenOn.value = s.rahmenOn
      if (typeof s.radarOn === 'boolean') radarOn.value = s.radarOn
    }
  } catch { /* ignore */ }
})

// Merge-write: `lang` (written by the Result screen into this same key) is
// never read or touched here, so spreading `...prev` carries it through
// untouched no matter which of the six help switches just changed.
watch([hintsOn, checklistOn, kiTippOn, timerOn, rahmenOn, radarOn], () => {
  try {
    const prev = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, unknown>
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...prev,
      hintsOn: hintsOn.value,
      checklistOn: checklistOn.value,
      kiTippOn: kiTippOn.value,
      timerOn: timerOn.value,
      rahmenOn: rahmenOn.value,
      radarOn: radarOn.value
    } satisfies StoredSetup))
  } catch { /* ignore */ }
})

function selectAnlass(a: SchreibAnlass | null) {
  selectedAnlass.value = a
  overridePick.value = null
}

function redraw() {
  redrawSeed.value++
  overridePick.value = null
}

async function generate() {
  if (!canUseAi.value || generating.value) return
  generating.value = true
  try {
    const fresh = await generateAuftraege(resolveAiClient(settings.value), settings.value.model)
    addCustomAuftraege(fresh)
    poolVersion.value++
    toast.success(`${fresh.length} neue Schreibaufträge im Pool`)
  } catch (err) {
    toast.error('Auftragsgenerierung fehlgeschlagen', {
      description: err instanceof Error ? err.message : String(err)
    })
  } finally {
    generating.value = false
  }
}

function removeCustom(id: string) {
  // If the deleted custom Schreibauftrag is the one currently drawn, the
  // sheet must not go on showing a task no longer in the pool — bump the
  // redraw seed so `drawn` (which reruns drawAuftrag() against the
  // now-shrunk pool) picks a replacement.
  const wasDrawn = drawn.value.id === id
  if (overridePick.value === id) overridePick.value = null
  deleteCustomAuftrag(id)
  poolVersion.value++
  if (wasDrawn) redrawSeed.value++
}

function resumeActive() { router.push({ name: 'schreiben-teil2-run' }) }

async function discardActive() {
  if (!active.value) return
  await abandonNachricht(active.value.id)
  active.value = null
}

function start() {
  const a = chosen.value
  const helps: NachrichtHelps = {
    hints: hintsOn.value,
    checklist: checklistOn.value,
    kiTipp: kiTippOn.value && canUseAi.value,
    timer: timerOn.value,
    rahmen: rahmenOn.value,
    radar: radarOn.value
  }
  const stash: NachrichtRunStash = {
    auftrag: toAuftragRef(a),
    helps,
    plan: emptySchreibPlan(),
    model: settings.value.model
  }
  sessionStorage.setItem(NACHRICHT_STASH_KEY, JSON.stringify(stash))
  router.push({ name: 'schreiben-teil2-prep' })
}
</script>

<template>
  <div class="page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Schreiben Teil 2 · Etappe 01</div>
        <h1 class="section-title">Auftragswahl<em>.</em></h1>
        <p class="section-subtitle">
          Wie in der Prüfung: ein Schreibauftrag mit Situation, Empfänger,
          der Aufgabenstellung und vier Inhaltspunkten. Mindestens 100 Wörter
          bringst du mit — der Bauplan steht schon auf dem Blatt.
        </p>
      </div>
      <div class="spr-header-meta-wrap">
        <div class="micro-mark spr-header-meta-lbl">Zeitbudget</div>
        <div class="spr-header-meta">25 Minuten</div>
      </div>
    </header>

    <div v-if="!canUseAi" class="alert alert-warning">
      <span class="alert-label">KI-Zugang nötig</span>
      Setze einen Gemini-API-Key, oder wähle <em>Local Claude (dev)</em>, in
      <router-link :to="{ name: 'settings' }">Einstellungen</router-link> —
      sonst lässt sich keine Nachricht bewerten.
    </div>

    <div v-if="active" class="alert alert-info">
      <span class="alert-label">Nachricht fortsetzen?</span>
      Eine unfertige Nachricht zu „{{ active.auftrag.titleDe }}" existiert.
      <div class="resume-actions">
        <button class="btn btn-accent" type="button" @click="resumeActive">Fortsetzen →</button>
        <button class="btn btn-danger" type="button" @click="discardActive">Verwerfen</button>
      </div>
    </div>

    <div class="spr-setup">
      <div>
        <div class="spr-tagrow sch-anlass-filter">
          <button type="button" class="spr-tag" :class="{ on: selectedAnlass === null }"
            @click="selectAnlass(null)">Alle</button>
          <button v-for="a in SCHREIB_ANLAESSE" :key="a" type="button" class="spr-tag"
            :class="{ on: selectedAnlass === a }" @click="selectAnlass(a)">{{ ANLASS_LABEL[a].de }}</button>
        </div>

        <div class="spr-sheet-wrap">
          <div class="spr-sheet sch-sheet-static">
            <div class="spr-sheet-h">
              <span class="spr-sheet-letter">Schreibauftrag</span>
              <span class="spr-sheet-flags">
                <span class="sch-anlass-flag">{{ ANLASS_LABEL[chosen.anlass].de }}</span>
                <span v-if="done.has(chosen.titleDe)" class="spr-flag done">✓ geschrieben</span>
                <span v-if="chosen.source === 'custom'" class="spr-flag cache">generiert</span>
              </span>
            </div>
            <div class="spr-sheet-t">{{ chosen.titleDe }}</div>
            <p class="sch-sheet-situation">{{ chosen.situationDe }}</p>

            <div class="sch-empf-card">
              <span class="sch-empf-lbl">Empfänger</span>
              <span class="sch-empf-name">{{ chosen.empfaengerName }}</span>
              <span class="sch-empf-rolle">{{ chosen.empfaengerRolleDe }}</span>
            </div>

            <p class="spr-sheet-task">{{ chosen.taskDe }}</p>
            <ol class="spr-sheet-glied">
              <li v-for="(p, i) in chosen.inhaltspunkte" :key="i">{{ p }}</li>
            </ol>
            <div class="spr-sheet-f">
              <span class="spr-titem-tags">{{ ANLASS_LABEL[chosen.anlass].en }}</span>
              <router-link class="sch-muster-link" :to="musterLinkTo">
                {{ musterLinkLabel }} <span aria-hidden="true">→</span>
              </router-link>
            </div>
          </div>
        </div>

        <div class="spr-ab-ctl">
          <button class="btn btn-quiet" type="button" @click="redraw">Neu ziehen</button>
          <button class="btn btn-quiet" type="button" @click="browse = !browse">
            {{ browse ? 'Liste schließen' : `Alle ${ledgerList.length} Aufträge` }}
          </button>
          <button class="btn btn-quiet" type="button" :disabled="!canUseAi || generating" @click="generate">
            {{ generating ? 'Generiere…' : 'Neue Aufträge generieren (KI)' }}
          </button>
        </div>
        <p class="ai-cost-note">1 Call</p>

        <div v-if="browse" class="spr-tlist spr-tlist-spaced">
          <template v-for="g in groupedLedger" :key="g.anlass">
            <div class="sch-anlass-group-h">{{ ANLASS_LABEL[g.anlass].de }}</div>
            <div v-for="(a, i) in g.items" :key="a.id" class="spr-tlist-row">
              <button type="button" class="spr-titem" :class="{ sel: a.id === chosen.id, done: done.has(a.titleDe) }"
                @click="overridePick = a.id">
                <span class="spr-titem-mark">
                  {{ a.id === chosen.id ? '●' : done.has(a.titleDe) ? '✓' : String(i + 1).padStart(2, '0') }}
                </span>
                <span class="spr-titem-main">
                  <span class="spr-titem-t">
                    {{ a.titleDe }}
                    <span class="spr-titem-tags">{{ a.empfaengerName }} · {{ a.empfaengerRolleDe }}</span>
                  </span>
                  <span class="spr-titem-s spr-titem-block">{{ a.taskDe }}</span>
                </span>
                <span class="spr-titem-r">
                  <span v-if="done.has(a.titleDe)" class="spr-flag done">✓ geschrieben</span>
                  <span v-if="a.source === 'custom'" class="spr-flag cache">generiert</span>
                </span>
              </button>
              <button v-if="a.source === 'custom'" type="button" class="btn btn-quiet"
                @click="removeCustom(a.id)">Löschen</button>
            </div>
          </template>
        </div>
      </div>

      <aside class="spr-card">
        <div class="spr-card-h">
          <span class="spr-lbl">Aufgabenblatt</span>
          <span class="spr-lbl">B2 · Teil 2</span>
        </div>
        <div class="spr-card-b">
          <div class="spr-card-topic">{{ chosen.titleDe }}</div>
          <p class="spr-card-stmt">{{ chosen.taskDe }}</p>

          <div class="spr-card-f">
            <div class="spr-fld">
              <span class="spr-fld-l">Hinweise</span>
              <div class="segmented">
                <button type="button" :class="{ active: hintsOn }" @click="hintsOn = true">An</button>
                <button type="button" :class="{ active: !hintsOn }" @click="hintsOn = false">Aus</button>
              </div>
              <span class="spr-fld-note">
                Nachrichtenmittel-Drawer und Inhalts-Baukasten beim Schreiben — kostenlos.
              </span>
            </div>

            <div class="spr-fld">
              <span class="spr-fld-l">Checkliste</span>
              <div class="segmented">
                <button type="button" :class="{ active: checklistOn }" @click="checklistOn = true">An</button>
                <button type="button" :class="{ active: !checklistOn }" @click="checklistOn = false">Aus</button>
              </div>
              <span class="spr-fld-note">
                Inhaltspunkt-Dots, Wortzähler und ein Gerüst-Check auf einen Blick.
              </span>
            </div>

            <div class="spr-fld">
              <span class="spr-fld-l">KI-Tipp</span>
              <div class="segmented">
                <button type="button" :disabled="!canUseAi" :class="{ active: kiTippOn }"
                  @click="kiTippOn = true">An</button>
                <button type="button" :disabled="!canUseAi" :class="{ active: !kiTippOn }"
                  @click="kiTippOn = false">Aus</button>
              </div>
              <span class="spr-fld-note">
                Ein Tipp auf Abruf, mitten im Schreiben — kostet einen Call.
              </span>
            </div>

            <div class="spr-fld">
              <span class="spr-fld-l">Timer</span>
              <div class="segmented">
                <button type="button" :class="{ active: timerOn }" @click="timerOn = true">An</button>
                <button type="button" :class="{ active: !timerOn }" @click="timerOn = false">Aus</button>
              </div>
              <span class="spr-fld-note">
                Zeigt die verbleibende Zeit vom 25-Minuten-Budget in vier Phasen: Planen, Schreiben, Prüfen, Überzeit.
              </span>
            </div>

            <div class="spr-fld">
              <span class="spr-fld-l">Rahmen-Gerüst</span>
              <div class="segmented">
                <button type="button" :class="{ active: rahmenOn }" @click="rahmenOn = true">An</button>
                <button type="button" :class="{ active: !rahmenOn }" @click="rahmenOn = false">Aus</button>
              </div>
              <span class="spr-fld-note">
                Betreff, Anrede und Gruß als eigene Felder — werden beim Schreiben zum Fließtext zusammengesetzt.
              </span>
            </div>

            <div class="spr-fld">
              <span class="spr-fld-l">Radar</span>
              <div class="segmented">
                <button type="button" :class="{ active: radarOn }" @click="radarOn = true">An</button>
                <button type="button" :class="{ active: !radarOn }" @click="radarOn = false">Aus</button>
              </div>
              <span class="spr-fld-note">
                Warnt live vor du-Formen und fehlender Höflichkeit, während du schreibst.
              </span>
            </div>
          </div>
        </div>
        <div class="spr-card-go">
          <button class="btn btn-accent btn-meta" :disabled="!canUseAi" @click="start">
            <span class="bm-main">Weiter zur Planung <span aria-hidden="true">→</span></span>
            <span class="bm-sub">{{ chosen.titleDe }} · 4 Inhaltspunkte</span>
          </button>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.spr-header-meta-wrap { text-align: right; }
.spr-header-meta-lbl { margin-bottom: 6px; }
.spr-header-meta { font-family: var(--font-display); font-size: 24px; font-style: italic; }

.sch-anlass-filter { margin-top: 34px; }
.spr-sheet-wrap { display: flex; flex-direction: column; margin-top: 18px; }

/* The sheet is presentational, not a selectable option (there is only one on
   offer) — kill the button affordances .spr-sheet carries by default. */
.sch-sheet-static { cursor: default; width: 100%; }
.sch-sheet-static:hover { background: var(--paper-card); }

.sch-sheet-situation { font-size: 14px; line-height: 1.5; color: var(--mute); margin: 10px 0 0; font-style: italic; }

/* The Anlass badge sits beside the done/generiert flags on the sheet header
   — accent-toned so it reads as the task's occasion, not a status. */
.sch-anlass-flag {
  font-family: var(--font-mono); font-size: 9px; letter-spacing: .16em; text-transform: uppercase;
  padding: 2px 5px 1px; border: 1px solid color-mix(in oklab, var(--accent) 45%, transparent);
  color: var(--accent);
}

/* The Empfänger card: name and role rendered STANDALONE, never spliced into
   a prepositional phrase — empfaengerRolleDe is nominative ("Ihre
   Vorgesetzte"), and gluing it into a sentence like "an Ihre Vorgesetzte"
   would silently need the wrong case for a masculine role ("an Ihren
   Kursleiter"). Two labeled fields side by side avoid the question. */
.sch-empf-card {
  display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap;
  margin: 14px 0 0; padding: 10px 14px;
  background: var(--paper-deep); border-left: 2px solid var(--accent);
}
.sch-empf-lbl { font-family: var(--font-mono); font-size: 9.5px; letter-spacing: .16em; text-transform: uppercase; color: var(--mute); }
.sch-empf-name { font-family: var(--font-display); font-size: 16px; font-weight: 500; letter-spacing: -.01em; }
.sch-empf-rolle { font-size: 13.5px; color: var(--ink-soft); font-style: italic; }

/* Quiet inline link to the Musternachrichten library, sharing .spr-sheet-f's
   existing space-between row with the tags — no button affordance. */
.sch-muster-link { font-size: 12.5px; white-space: nowrap; }

.sch-anlass-group-h {
  font-family: var(--font-mono); font-size: 9.5px; letter-spacing: .18em; text-transform: uppercase;
  color: var(--mute); margin: 22px 0 4px; padding-top: 14px; border-top: 1px dotted var(--hairline);
}
.sch-anlass-group-h:first-child { margin-top: 0; padding-top: 0; border-top: 0; }

.spr-tlist-spaced { margin-top: 26px; }
.spr-tlist-row { display: flex; align-items: center; gap: 10px; }
.spr-tlist-row .spr-titem { flex: 1 1 auto; }
.spr-titem-main { min-width: 0; }
.spr-titem-block { display: block; }

.spr-fld-note { font-size: 12.5px; color: var(--mute); font-style: italic; line-height: 1.5; }
.resume-actions { display: flex; gap: 10px; margin-top: 10px; }

.ai-cost-note {
  margin: 8px 0 0;
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.14em;
  color: var(--mute);
  text-transform: uppercase;
}
</style>
