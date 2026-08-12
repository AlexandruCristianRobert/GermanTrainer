<script setup lang="ts">
//
// Schreiben Teil 1 — Themenwahl. Structural twin of sprechen/Teil1Setup.vue
// (localStorage setup persistence via merge-write, resume banner, generation
// UX) but the exam hands out ONE task sheet here, not a chosen-from-pair —
// CONTEXT.md → "Schreibthema": a forum context sentence, the exam's own
// taskDe instruction, and four topic-flavored Inhaltspunkte. `drawThema()`
// draws that single sheet; a reroll redraws it, and the full pool (seeded +
// custom) stays one click away for a learner who wants to pick directly.
//
// Unlike Sprechen Teil 1, there is no Modality and no Vorbereitungszeit
// choice here — Schreiben is always typed, and Planung (Teil1Prep.vue) is
// never skipped from this screen; it is itself skippable via its own „Ohne
// Plan starten" button. The CTA below always lands on the planning screen.

import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  SCHREIBEN_STASH_KEY, emptySchreibPlan,
  type SchreibHelps, type SchreibenBeitrag, type SchreibenRunStash, type SchreibThemaRef
} from '../../data/schreiben'
import type { Schreibthema } from '../../data/schreibenThemen'
import {
  drawThema, allThemen, doneThemaTitles,
  addCustomThemen, deleteCustomThema, generateThemen
} from '../../composables/useSchreibenThemen'
import { findActiveBeitrag, abandonBeitrag } from '../../composables/useSchreibenBeitrag'
import { resolveAiClient } from '../../composables/localClaude'
import { useSettings } from '../../composables/useSettings'
import { useToast } from '../../composables/useToast'

// NOTE: no `export` here — <script setup> blocks cannot export bindings.
const STORAGE_KEY = 'schreibenTeil1Setup'

interface StoredSetup {
  hintsOn?: boolean
  checklistOn?: boolean
  kiTippOn?: boolean
  timerOn?: boolean
  lang?: 'de' | 'en'
}

const router = useRouter()
const toast = useToast()
const { settings, canUseAi, load: loadSettings } = useSettings()

const hintsOn = ref(true)
const checklistOn = ref(true)
const kiTippOn = ref(true)
const timerOn = ref(true)
const overridePick = ref<string | null>(null)
const browse = ref(false)
const generating = ref(false)
const redrawSeed = ref(0)
const poolVersion = ref(0)
const done = ref<Set<string>>(new Set())
const active = ref<SchreibenBeitrag | null>(null)

/** The single task sheet on offer. Only redrawn on explicit request. */
const drawn = computed<Schreibthema>(() => {
  redrawSeed.value // eslint-disable-line no-unused-expressions
  return drawThema()
})

/** The full pool, for the ledger — recomputed after generate()/delete(). */
const ledgerList = computed<Schreibthema[]>(() => {
  poolVersion.value // eslint-disable-line no-unused-expressions
  return allThemen()
})

/** The drawn sheet, unless the learner picked a different one from the pool. */
const chosen = computed<Schreibthema>(() => {
  if (overridePick.value) {
    const found = ledgerList.value.find(t => t.id === overridePick.value)
    if (found) return found
  }
  return drawn.value
})

function toThemaRef(t: Schreibthema): SchreibThemaRef {
  return {
    id: t.id, titleDe: t.titleDe, forumContextDe: t.forumContextDe,
    taskDe: t.taskDe, inhaltspunkte: t.inhaltspunkte, tags: t.tags
  }
}

onMounted(async () => {
  await loadSettings()
  done.value = doneThemaTitles()
  active.value = (await findActiveBeitrag()) ?? null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const s = JSON.parse(raw) as StoredSetup
      if (typeof s.hintsOn === 'boolean') hintsOn.value = s.hintsOn
      if (typeof s.checklistOn === 'boolean') checklistOn.value = s.checklistOn
      if (typeof s.kiTippOn === 'boolean') kiTippOn.value = s.kiTippOn
      if (typeof s.timerOn === 'boolean') timerOn.value = s.timerOn
    }
  } catch { /* ignore */ }
})

// Merge-write: `lang` (written by the Result screen into this same key) is
// never read or touched here, so spreading `...prev` carries it through
// untouched no matter which of the four help switches just changed.
watch([hintsOn, checklistOn, kiTippOn, timerOn], () => {
  try {
    const prev = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, unknown>
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...prev,
      hintsOn: hintsOn.value,
      checklistOn: checklistOn.value,
      kiTippOn: kiTippOn.value,
      timerOn: timerOn.value
    } satisfies StoredSetup))
  } catch { /* ignore */ }
})

function redraw() {
  redrawSeed.value++
  overridePick.value = null
}

async function generate() {
  if (!canUseAi.value || generating.value) return
  generating.value = true
  try {
    const fresh = await generateThemen(resolveAiClient(settings.value), settings.value.model)
    addCustomThemen(fresh)
    poolVersion.value++
    toast.success(`${fresh.length} neue Schreibthemen im Pool`)
  } catch (err) {
    toast.error('Themengenerierung fehlgeschlagen', {
      description: err instanceof Error ? err.message : String(err)
    })
  } finally {
    generating.value = false
  }
}

function removeCustom(id: string) {
  // If the deleted custom Schreibthema is the one currently drawn, the sheet
  // must not go on showing a topic no longer in the pool — bump the redraw
  // seed so `drawn` (which reruns drawThema() against the now-shrunk pool)
  // picks a replacement.
  const wasDrawn = drawn.value.id === id
  if (overridePick.value === id) overridePick.value = null
  deleteCustomThema(id)
  poolVersion.value++
  if (wasDrawn) redrawSeed.value++
}

function resumeActive() { router.push({ name: 'schreiben-teil1-run' }) }

async function discardActive() {
  if (!active.value) return
  await abandonBeitrag(active.value.id)
  active.value = null
}

function start() {
  const t = chosen.value
  const helps: SchreibHelps = {
    hints: hintsOn.value,
    checklist: checklistOn.value,
    kiTipp: kiTippOn.value && canUseAi.value,
    timer: timerOn.value
  }
  const stash: SchreibenRunStash = {
    thema: toThemaRef(t),
    helps,
    plan: emptySchreibPlan(),
    model: settings.value.model
  }
  sessionStorage.setItem(SCHREIBEN_STASH_KEY, JSON.stringify(stash))
  router.push({ name: 'schreiben-teil1-prep' })
}
</script>

<template>
  <div class="page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Schreiben Teil 1 · Etappe 01</div>
        <h1 class="section-title">Themenwahl<em>.</em></h1>
        <p class="section-subtitle">
          Wie in der Prüfung: ein Schreibthema mit Forumskontext, der
          Aufgabenstellung und vier Inhaltspunkten. Mindestens 150 Wörter
          bringst du mit — der Bauplan steht schon auf dem Blatt.
        </p>
      </div>
      <div class="spr-header-meta-wrap">
        <div class="micro-mark spr-header-meta-lbl">Zeitbudget</div>
        <div class="spr-header-meta">50 Minuten</div>
      </div>
    </header>

    <div v-if="!canUseAi" class="alert alert-warning">
      <span class="alert-label">KI-Zugang nötig</span>
      Setze einen Gemini-API-Key, oder wähle <em>Local Claude (dev)</em>, in
      <router-link :to="{ name: 'settings' }">Einstellungen</router-link> —
      sonst lässt sich kein Forumsbeitrag bewerten.
    </div>

    <div v-if="active" class="alert alert-info">
      <span class="alert-label">Forumsbeitrag fortsetzen?</span>
      Ein unfertiger Forumsbeitrag zu „{{ active.thema.titleDe }}" existiert.
      <div class="resume-actions">
        <button class="btn btn-accent" type="button" @click="resumeActive">Fortsetzen →</button>
        <button class="btn btn-danger" type="button" @click="discardActive">Verwerfen</button>
      </div>
    </div>

    <div class="spr-setup">
      <div>
        <div class="spr-sheet-wrap">
          <div class="spr-sheet sch-sheet-static">
            <div class="spr-sheet-h">
              <span class="spr-sheet-letter">Schreibthema</span>
              <span class="spr-sheet-flags">
                <span v-if="done.has(chosen.titleDe)" class="spr-flag done">✓ geschrieben</span>
                <span v-if="chosen.source === 'custom'" class="spr-flag cache">generiert</span>
              </span>
            </div>
            <div class="spr-sheet-t">{{ chosen.titleDe }}</div>
            <p class="sch-sheet-forum">{{ chosen.forumContextDe }}</p>
            <p class="spr-sheet-task">{{ chosen.taskDe }}</p>
            <ol class="spr-sheet-glied sch-inhaltspunkte">
              <li v-for="(p, i) in chosen.inhaltspunkte" :key="i">{{ p }}</li>
            </ol>
            <div class="spr-sheet-f">
              <span class="spr-titem-tags">{{ chosen.tags.join(' · ') }}</span>
            </div>
          </div>
        </div>

        <div class="spr-ab-ctl">
          <button class="btn btn-quiet" type="button" @click="redraw">Neu ziehen</button>
          <button class="btn btn-quiet" type="button" @click="browse = !browse">
            {{ browse ? 'Liste schließen' : `Alle ${ledgerList.length} Themen` }}
          </button>
          <button class="btn btn-quiet" type="button" :disabled="!canUseAi || generating" @click="generate">
            {{ generating ? 'Generiere…' : 'Neue Themen generieren (KI)' }}
          </button>
        </div>
        <p class="ai-cost-note">1 Call</p>

        <div v-if="browse" class="spr-tlist spr-tlist-spaced">
          <div v-for="(t, i) in ledgerList" :key="t.id" class="spr-tlist-row">
            <button type="button" class="spr-titem" :class="{ sel: t.id === chosen.id, done: done.has(t.titleDe) }"
              @click="overridePick = t.id">
              <span class="spr-titem-mark">
                {{ t.id === chosen.id ? '●' : done.has(t.titleDe) ? '✓' : String(i + 1).padStart(2, '0') }}
              </span>
              <span class="spr-titem-main">
                <span class="spr-titem-t">
                  {{ t.titleDe }}
                  <span class="spr-titem-tags">{{ t.tags.join(' · ') }}</span>
                </span>
                <span class="spr-titem-s spr-titem-block">{{ t.taskDe }}</span>
              </span>
              <span class="spr-titem-r">
                <span v-if="done.has(t.titleDe)" class="spr-flag done">✓ geschrieben</span>
                <span v-if="t.source === 'custom'" class="spr-flag cache">generiert</span>
              </span>
            </button>
            <button v-if="t.source === 'custom'" type="button" class="btn btn-quiet"
              @click="removeCustom(t.id)">Löschen</button>
          </div>
        </div>
      </div>

      <aside class="spr-card">
        <div class="spr-card-h">
          <span class="spr-lbl">Aufgabenblatt</span>
          <span class="spr-lbl">B2 · Teil 1</span>
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
                Redemittel-Drawer und Argumentenspeicher beim Schreiben — kostenlos.
              </span>
            </div>

            <div class="spr-fld">
              <span class="spr-fld-l">Checkliste</span>
              <div class="segmented">
                <button type="button" :class="{ active: checklistOn }" @click="checklistOn = true">An</button>
                <button type="button" :class="{ active: !checklistOn }" @click="checklistOn = false">Aus</button>
              </div>
              <span class="spr-fld-note">
                Zeigt Wortzähler und welche Inhaltspunkte du schon angesprochen hast.
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
                Zeigt die verbleibende Zeit vom 50-Minuten-Budget — rein informativ.
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

.spr-sheet-wrap { display: flex; flex-direction: column; margin-top: 34px; }

/* The sheet is presentational, not a selectable option (there is only one on
   offer) — kill the button affordances .spr-sheet carries by default. */
.sch-sheet-static { cursor: default; width: 100%; }
.sch-sheet-static:hover { background: var(--paper-card); }

.sch-sheet-forum { font-size: 14px; line-height: 1.5; color: var(--mute); margin: 10px 0 0; font-style: italic; }

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
