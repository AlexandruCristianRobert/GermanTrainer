<script setup lang="ts">
//
// Sprechen Teil 1 — Themenwahl. Mirrors Teil2Setup.vue's shape (micSupported
// detection, modality defence-in-depth, resume banner, effective-modality
// downgrade in start(), localStorage setup persistence) but the exam gives
// TWO task sheets here, not a searchable pool: the learner takes one
// (CONTEXT.md → "Vortragsthema"), and every sheet carries the same five
// Gliederungspunkte — the Bauplan is fixed, only the content differs.
//
// The Füllbarkeits-Check beneath each sheet is a self-assessment aid only —
// component-local state, never persisted anywhere and never gating the CTA.

import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  TEIL1_STASH_KEY, PREP_SECONDS,
  type Modality, type SprechenVortrag, type Teil1RunStash, type VortragHelps
} from '../../data/sprechen'
import { GLIEDERUNGSPUNKTE } from '../../data/sprechenVortragsmittel'
import type { Vortragsthema } from '../../data/sprechenVortragsthemen'
import {
  drawThemaPair, allThemen, doneThemaTitles,
  addCustomThemen, deleteCustomThema, generateThemen
} from '../../composables/useVortragsthemen'
import { findActiveVortrag, abandonVortrag } from '../../composables/useVortrag'
import { emptyPlan } from '../../composables/useVortragCoverage'
// Row markers need to know which Vortragsthemen already have a cached
// argument bank. One Dexie read on mount; a failure just drops the markers.
import { cachedBankIds } from '../../composables/useSprechenArguments'
import { isSpeechRecognitionSupported } from '../../composables/useSpeechRecognizer'
import { resolveAiClient } from '../../composables/localClaude'
import { useSettings } from '../../composables/useSettings'
import { useToast } from '../../composables/useToast'

// NOTE: no `export` here — <script setup> blocks cannot export bindings.
const STORAGE_KEY = 'sprechenTeil1Setup'
const PREP_CHOICES: Array<[number, string]> = [[0, 'Aus'], [180, '3 Min'], [900, '15 Min']]

interface StoredSetup {
  modality?: Modality
  prepSeconds?: number
  hintsOn?: boolean
  checklistOn?: boolean
  kiTippOn?: boolean
  hardLimit?: boolean
}

interface FillCheck { example: boolean; words: boolean; meinung: boolean }

const router = useRouter()
const toast = useToast()
const { settings, canUseAi, load: loadSettings } = useSettings()

// Static for the lifetime of the page — see Teil2Setup.vue. Only spoken
// depends on it; typed must stay usable regardless.
const micSupported = isSpeechRecognitionSupported()

const modality = ref<Modality>('typed')
const prepSeconds = ref<number>(180)
const hintsOn = ref(true)
const checklistOn = ref(true)
const kiTippOn = ref(false)
const hardLimitOn = ref(false)
const pick = ref<string | null>(null)
const browse = ref(false)
const generating = ref(false)
const redrawSeed = ref(0)
const poolVersion = ref(0)
const done = ref<Set<string>>(new Set())
const cachedIds = ref<Set<string>>(new Set())
const active = ref<SprechenVortrag | null>(null)
const fillChecks = ref<Record<string, FillCheck>>({})

/** The two task sheets on offer. Only redrawn on explicit request. */
const pair = computed<[Vortragsthema, Vortragsthema]>(() => {
  redrawSeed.value // eslint-disable-line no-unused-expressions
  return drawThemaPair()
})

/** The full pool, for the ledger — recomputed after generate()/delete(). */
const ledgerList = computed<Vortragsthema[]>(() => {
  poolVersion.value // eslint-disable-line no-unused-expressions
  return allThemen()
})

const picked = computed<Vortragsthema | null>(() =>
  ledgerList.value.find(t => t.id === pick.value) ?? pair.value.find(t => t.id === pick.value) ?? null
)

const modalityWord = computed(() => modality.value === 'spoken' ? 'gesprochen' : 'getippt')

function fillFor(id: string): FillCheck {
  return fillChecks.value[id] ?? { example: false, words: false, meinung: false }
}
function fillCount(id: string): number {
  const f = fillFor(id)
  return (f.example ? 1 : 0) + (f.words ? 1 : 0) + (f.meinung ? 1 : 0)
}
function toggleFill(id: string, key: keyof FillCheck) {
  const current = fillFor(id)
  fillChecks.value = { ...fillChecks.value, [id]: { ...current, [key]: !current[key] } }
}

onMounted(async () => {
  await loadSettings()
  done.value = doneThemaTitles()
  active.value = await findActiveVortrag()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const s = JSON.parse(raw) as StoredSetup
      if (s.modality === 'typed' || s.modality === 'spoken') modality.value = s.modality
      if (typeof s.prepSeconds === 'number' && (PREP_SECONDS as readonly number[]).includes(s.prepSeconds)) {
        prepSeconds.value = s.prepSeconds
      }
      if (typeof s.hintsOn === 'boolean') hintsOn.value = s.hintsOn
      if (typeof s.checklistOn === 'boolean') checklistOn.value = s.checklistOn
      if (typeof s.kiTippOn === 'boolean') kiTippOn.value = s.kiTippOn
      if (typeof s.hardLimit === 'boolean') hardLimitOn.value = s.hardLimit
    }
  } catch { /* ignore */ }

  // A stored preference for Gesprochen can predate this browser session —
  // never leave the learner stuck on an unselectable modality.
  if (modality.value === 'spoken' && !micSupported) {
    modality.value = 'typed'
    toast.info('Gesprochen ist in diesem Browser nicht verfügbar', {
      description: 'Auf Getippt umgeschaltet — das läuft überall.'
    })
  }
})

onMounted(async () => {
  try {
    cachedIds.value = await cachedBankIds()
  } catch {
    cachedIds.value = new Set()
  }
})

watch([modality, prepSeconds, hintsOn, checklistOn, kiTippOn, hardLimitOn], () => {
  try {
    const prev = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, unknown>
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...prev,
      modality: modality.value,
      prepSeconds: prepSeconds.value,
      hintsOn: hintsOn.value,
      checklistOn: checklistOn.value,
      kiTippOn: kiTippOn.value,
      hardLimit: hardLimitOn.value
    } satisfies StoredSetup))
  } catch { /* ignore */ }
})

function selectModality(m: Modality) {
  // The segment is also :disabled in the template; this guard is defense in
  // depth so nothing can ever land the learner on Gesprochen without a mic.
  if (m === 'spoken' && !micSupported) return
  modality.value = m
}

function redraw() {
  redrawSeed.value++
  pick.value = null
}

async function generate() {
  if (!canUseAi.value || generating.value) return
  generating.value = true
  try {
    const fresh = await generateThemen(resolveAiClient(settings.value), settings.value.model)
    addCustomThemen(fresh)
    poolVersion.value++
    toast.success(`${fresh.length} neue Vortragsthemen im Pool`)
  } catch (err) {
    toast.error('Themengenerierung fehlgeschlagen', {
      description: err instanceof Error ? err.message : String(err)
    })
  } finally {
    generating.value = false
  }
}

function removeCustom(id: string) {
  // If the deleted custom Vortragsthema is currently drawn on one of the two
  // sheets, that sheet must not go on showing a topic no longer in the pool
  // — bump the redraw seed so `pair` (which reruns drawThemaPair() against
  // the now-shrunk pool) picks a replacement.
  const wasDrawn = pair.value.some(t => t.id === id)
  deleteCustomThema(id)
  poolVersion.value++
  if (pick.value === id) pick.value = null
  if (wasDrawn) redrawSeed.value++
}

/**
 * F15 — Prüfungsmodus preset. Not a fifth switch: it writes the four
 * existing helps + Vorbereitung 15 Min into the same reactive state the
 * switches below use, and the existing `watch` persists it via the normal
 * merge-write. The switches stay individually visible and editable
 * afterwards — this only sets their starting values.
 */
function applyPruefungsmodus() {
  hintsOn.value = false
  checklistOn.value = false
  kiTippOn.value = false
  hardLimitOn.value = true
  prepSeconds.value = 900
}

function resumeActive() { router.push({ name: 'sprechen-teil1-run' }) }

async function discardActive() {
  if (!active.value) return
  await abandonVortrag(active.value.id)
  active.value = null
}

function start() {
  const t = picked.value
  if (!t) return
  // Belt-and-suspenders: the segment can't be selected without a mic and we
  // fall back on mount, but never let a stale ref value start an
  // unsupported spoken run.
  const effectiveModality: Modality = modality.value === 'spoken' && !micSupported ? 'typed' : modality.value
  const helps: VortragHelps = {
    hints: hintsOn.value,
    checklist: checklistOn.value,
    kiTipp: kiTippOn.value && canUseAi.value,
    // A hard limit models an examiner interrupting, which only exists in
    // real time — it must never render, let alone apply, when typed.
    hardLimit: effectiveModality === 'spoken' && hardLimitOn.value
  }
  const stash: Teil1RunStash = {
    thema: { id: t.id, titleDe: t.titleDe, taskDe: t.taskDe, source: t.source },
    modality: effectiveModality,
    helps,
    prepSeconds: prepSeconds.value,
    plan: emptyPlan(),
    notes: '',
    model: settings.value.model
  }
  sessionStorage.setItem(TEIL1_STASH_KEY, JSON.stringify(stash))
  router.push({ name: prepSeconds.value > 0 ? 'sprechen-teil1-prep' : 'sprechen-teil1-run' })
}
</script>

<template>
  <div class="page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Sprechen Teil 1 · Etappe 01</div>
        <h1 class="section-title">Themenwahl<em>.</em></h1>
        <p class="section-subtitle">
          Wie in der Prüfung: zwei Aufgabenblätter liegen vor dir, du nimmst
          eines. Beide haben dieselben fünf Gliederungspunkte — das Blatt gibt
          den Bauplan vor, den Inhalt bringst du mit.
        </p>
      </div>
      <div class="spr-header-meta-wrap">
        <div class="micro-mark spr-header-meta-lbl">Vortragslänge</div>
        <div class="spr-header-meta">ca. 4 Minuten</div>
      </div>
    </header>

    <div v-if="!canUseAi" class="alert alert-warning">
      <span class="alert-label">KI-Zugang nötig</span>
      Setze einen Gemini-API-Key, oder wähle <em>Local Claude (dev)</em>, in
      <router-link :to="{ name: 'settings' }">Einstellungen</router-link> —
      sonst lässt sich kein Vortrag bewerten.
    </div>

    <div v-if="active" class="alert alert-info">
      <span class="alert-label">Vortrag fortsetzen?</span>
      Ein unfertiger {{ active.modality === 'spoken' ? 'gesprochener' : 'getippter' }}
      Vortrag zu „{{ active.thema.titleDe }}" existiert.
      <div class="resume-actions">
        <button class="btn btn-accent" type="button" @click="resumeActive">Fortsetzen →</button>
        <button class="btn btn-danger" type="button" @click="discardActive">Verwerfen</button>
      </div>
    </div>

    <div class="spr-setup">
      <div>
        <div class="spr-ab">
          <div v-for="(t, i) in pair" :key="t.id" class="spr-sheet-wrap">
            <button type="button" class="spr-sheet" :class="{ sel: pick === t.id }" @click="pick = t.id">
              <div class="spr-sheet-h">
                <span class="spr-sheet-letter">Thema {{ i === 0 ? 'A' : 'B' }}</span>
                <span class="spr-sheet-flags">
                  <span v-if="done.has(t.titleDe)" class="spr-flag done">✓ gehalten</span>
                  <span v-if="cachedIds.has(t.id)" class="spr-flag cache">Argumente im Cache</span>
                  <span v-if="t.source === 'custom'" class="spr-flag cache">generiert</span>
                </span>
              </div>
              <div class="spr-sheet-t">{{ t.titleDe }}</div>
              <p class="spr-sheet-task">{{ t.taskDe }}</p>
              <ol class="spr-sheet-glied">
                <li v-for="p in GLIEDERUNGSPUNKTE" :key="p.key"><b>{{ p.labelDe }}</b>{{ p.hintDe }}</li>
              </ol>
              <div class="spr-sheet-f">
                <span class="spr-titem-tags">{{ t.tags.join(' · ') }}</span>
                <span class="spr-sheet-pick">{{ pick === t.id ? '● gewählt' : 'dieses nehmen' }}</span>
              </div>
            </button>

            <div class="spr-sheet-fill">
              <div class="spr-fill-h">
                <span class="spr-lbl">Füllbarkeits-Check</span>
                <span class="spr-fill-n">{{ fillCount(t.id) }}/3</span>
              </div>
              <div class="spr-fill-chips">
                <button type="button" class="spr-tag" :class="{ on: fillFor(t.id).example }"
                  @click="toggleFill(t.id, 'example')">eigenes Beispiel?</button>
                <button type="button" class="spr-tag" :class="{ on: fillFor(t.id).words }"
                  @click="toggleFill(t.id, 'words')">drei Fachwörter?</button>
                <button type="button" class="spr-tag" :class="{ on: fillFor(t.id).meinung }"
                  @click="toggleFill(t.id, 'meinung')">Meinung?</button>
              </div>
              <p class="spr-fill-note">„Nur für dich — wird nicht gespeichert."</p>
            </div>
          </div>
        </div>

        <div class="spr-ab-ctl">
          <button class="btn btn-quiet" type="button" @click="redraw">Andere zwei Themen ziehen</button>
          <button class="btn btn-quiet" type="button" @click="browse = !browse">
            {{ browse ? 'Liste schließen' : `Alle ${ledgerList.length} Themen` }}
          </button>
          <button class="btn btn-quiet" type="button" :disabled="!canUseAi || generating" @click="generate">
            {{ generating ? 'Generiere…' : '5 neue Themen generieren' }}
          </button>
        </div>
        <p class="ai-cost-note">1 Call</p>

        <div v-if="browse" class="spr-tlist spr-tlist-spaced">
          <div v-for="(t, i) in ledgerList" :key="t.id" class="spr-tlist-row">
            <button type="button" class="spr-titem" :class="{ sel: t.id === pick, done: done.has(t.titleDe) }"
              @click="pick = t.id">
              <span class="spr-titem-mark">
                {{ t.id === pick ? '●' : done.has(t.titleDe) ? '✓' : String(i + 1).padStart(2, '0') }}
              </span>
              <span class="spr-titem-main">
                <span class="spr-titem-t">
                  {{ t.titleDe }}
                  <span class="spr-titem-tags">{{ t.tags.join(' · ') }}</span>
                </span>
                <span class="spr-titem-s spr-titem-block">{{ t.taskDe }}</span>
              </span>
              <span class="spr-titem-r">
                <span v-if="done.has(t.titleDe)" class="spr-flag done">✓ gehalten</span>
                <span v-if="cachedIds.has(t.id)" class="spr-flag cache">Argumente im Cache</span>
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
          <span class="spr-lbl">Prüfungskarte</span>
          <span class="spr-lbl">B2 · Teil 1</span>
        </div>
        <div class="spr-card-b">
          <template v-if="picked">
            <div class="spr-card-topic">{{ picked.titleDe }}</div>
            <p class="spr-card-stmt">{{ picked.taskDe }}</p>
          </template>
          <p v-else class="spr-card-none">
            Noch kein Aufgabenblatt gewählt. Nimm eines der beiden Themen oben — oder aus der ganzen Liste.
          </p>

          <div class="spr-examx">
            <button type="button" class="btn btn-quiet" @click="applyPruefungsmodus">Prüfungsmodus</button>
            <p class="spr-examx-note">
              Wie in der Prüfung: Aufgabenblatt, deine Notizen, vier Minuten — sonst nichts.
            </p>
          </div>

          <div class="spr-card-f">
            <div class="spr-fld">
              <span class="spr-fld-l">Modalität</span>
              <div class="segmented">
                <button type="button" :class="{ active: modality === 'typed' }"
                  @click="selectModality('typed')">Getippt</button>
                <button type="button" :class="{ active: modality === 'spoken' }" :disabled="!micSupported"
                  :title="!micSupported ? 'Dieser Browser kennt keine Spracherkennung.' : undefined"
                  @click="selectModality('spoken')">Gesprochen</button>
              </div>
              <span v-if="!micSupported" class="spr-fld-note">
                Gesprochen ist in diesem Browser nicht verfügbar. Getippt läuft überall.
              </span>
            </div>

            <div class="spr-fld">
              <span class="spr-fld-l">Vorbereitungszeit</span>
              <div class="segmented">
                <button v-for="[v, label] in PREP_CHOICES" :key="v" type="button"
                  :class="{ active: prepSeconds === v }" @click="prepSeconds = v">{{ label }}</button>
              </div>
              <span class="spr-fld-note">
                Gliederung planen, Argumentenspeicher und ein Notizfeld, das im Vortrag sichtbar bleibt.
              </span>
            </div>

            <div class="spr-fld">
              <span class="spr-fld-l">Hilfen</span>
              <div class="segmented">
                <button type="button" :class="{ active: hintsOn }" @click="hintsOn = true">An</button>
                <button type="button" :class="{ active: !hintsOn }" @click="hintsOn = false">Aus</button>
              </div>
              <span class="spr-fld-note">
                Move-Tipp, Redemittel-Schublade und Rettungsleine — kostenlos.
              </span>
            </div>

            <div class="spr-fld">
              <span class="spr-fld-l">Live-Checkliste</span>
              <div class="segmented">
                <button type="button" :class="{ active: checklistOn }" @click="checklistOn = true">An</button>
                <button type="button" :class="{ active: !checklistOn }" @click="checklistOn = false">Aus</button>
              </div>
              <span class="spr-fld-note">
                Zeigt während des Vortrags, welche Gliederungspunkte du schon angesprochen hast.
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
                Ein Tipp auf Abruf, mitten im Vortrag — kostet einen Call.
              </span>
            </div>

            <div v-if="modality === 'spoken'" class="spr-fld">
              <span class="spr-fld-l">Zeitlimit 4:00</span>
              <div class="segmented">
                <button type="button" :class="{ active: hardLimitOn }" @click="hardLimitOn = true">Hart</button>
                <button type="button" :class="{ active: !hardLimitOn }" @click="hardLimitOn = false">Weich</button>
              </div>
              <span class="spr-fld-note">
                Hart bricht bei 4:00 ab, wie eine Prüferin es täte. Weich lässt dich zu Ende sprechen.
              </span>
            </div>
          </div>
        </div>
        <div class="spr-card-go">
          <button class="btn btn-accent btn-meta" :disabled="!picked || !canUseAi" @click="start">
            <span class="bm-main">
              {{ prepSeconds > 0 ? 'Vorbereitung' : 'Vortrag halten' }}
              <span aria-hidden="true">→</span>
            </span>
            <span class="bm-sub">
              {{ picked ? picked.titleDe : 'noch kein Thema' }} ·
              5 Gliederungspunkte · {{ modalityWord }}
            </span>
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

.spr-sheet-wrap { display: flex; flex-direction: column; }

.spr-sheet-fill { margin-top: 14px; padding-top: 14px; border-top: 1px dotted var(--hairline); }
.spr-fill-h { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.spr-fill-n { font-family: var(--font-mono); font-size: 10.5px; color: var(--mute); }
.spr-fill-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
.spr-fill-note { margin: 10px 0 0; font-size: 12px; font-style: italic; color: var(--mute); }

.spr-tlist-spaced { margin-top: 26px; }
.spr-tlist-row { display: flex; align-items: center; gap: 10px; }
.spr-tlist-row .spr-titem { flex: 1 1 auto; }
.spr-titem-main { min-width: 0; }
.spr-titem-block { display: block; }

.spr-fld-note { font-size: 12.5px; color: var(--mute); font-style: italic; line-height: 1.5; }
.resume-actions { display: flex; gap: 10px; margin-top: 10px; }

.spr-examx {
  display: flex; flex-direction: column; align-items: flex-start; gap: 8px;
  margin: 16px 0; padding: 14px; border: 1px dashed var(--hairline); border-radius: 6px;
}
.spr-examx-note { margin: 0; font-size: 12.5px; font-style: italic; color: var(--mute); line-height: 1.5; }

.ai-cost-note {
  margin: 8px 0 0;
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.14em;
  color: var(--mute);
  text-transform: uppercase;
}
</style>
