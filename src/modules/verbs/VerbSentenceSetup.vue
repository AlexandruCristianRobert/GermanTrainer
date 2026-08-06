<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useVerbs } from '../../composables/useVerbs'
import { useNouns } from '../../composables/useNouns'
import { useSettings } from '../../composables/useSettings'
import { useToast } from '../../composables/useToast'
import { isSpeechRecognitionSupported } from '../../composables/useSpeechRecognizer'
import {
  VERB_LEVELS, VERB_TYPES, VERB_CASES,
  VERB_TENSES, TENSE_LABELS, TENSE_LEVEL, PASSIVE_TENSE_SET, migrateVerbLevels, verbLevelToCefr,
  type VerbLevel, type VerbType, type VerbCase, type VerbTense, type TenseCEFR
} from '../../data/verbs'
import { NOUN_GROUPS, type NounGroup } from '../../db/types'
import { nounToRef } from '../../composables/useSentenceQuiz'
import { verbToRef, buildVerbSpecs, levelLabel, type WordsPer } from '../../composables/useVerbSentenceQuiz'

const STORAGE_KEY = 'verbSentenceSetup'
const STASH_KEY = 'gt:lastVerbSentenceQuiz'
const router = useRouter()

const { filter } = useVerbs()
const { sampleByGroups, countsByGroup } = useNouns()
const { settings, canUseAi, load: loadSettings } = useSettings()
const toast = useToast()

// Static for the lifetime of the page — the browser either has
// SpeechRecognition or it doesn't. Only SPOKEN depends on it; TYPED must
// stay usable regardless.
const micSupported = isSpeechRecognitionSupported()

const levels = ref<VerbLevel[]>([...VERB_LEVELS])
const types = ref<VerbType[]>([...VERB_TYPES])
const cases = ref<VerbCase[]>([...VERB_CASES])
const groups = ref<NounGroup[]>([])
const verbsPer = ref<WordsPer>('mix')
const nounsPer = ref<WordsPer>('mix')
const modality = ref<'typed' | 'spoken'>('typed')
const wordHints = ref(true)
type CountPreset = 10 | 15 | 20 | 25 | 'custom'
const count = ref<CountPreset>(10)
const customCount = ref(15)

const nounCounts = ref<Record<NounGroup, number>>(
  Object.fromEntries(NOUN_GROUPS.map(g => [g, 0])) as Record<NounGroup, number>
)

const CEFR_ORDER: TenseCEFR[] = ['A1', 'A2', 'B1', 'B2', 'C1']

/** Default Zeitformen for a level selection: every form at or below the
 *  highest selected CEFR band (B1 cap when no level is selected, matching
 *  levelLabel's 'A2–B1' fallback band). */
function defaultTensesFor(lvls: readonly VerbLevel[]): VerbTense[] {
  const cap = lvls.length === 0
    ? CEFR_ORDER.indexOf('B1')
    : Math.max(0, Math.max(...lvls.map(l => CEFR_ORDER.indexOf(verbLevelToCefr(l) as TenseCEFR))))
  return VERB_TENSES.filter(t => CEFR_ORDER.indexOf(TENSE_LEVEL[t]) <= cap)
}

/** null until the learner first touches a tense chip / All / None — until
 *  then the selection FOLLOWS the level choice; after that it is pinned and
 *  persisted (spec: "level-following default"). */
const customTenses = ref<VerbTense[] | null>(null)
const selectedTenses = computed<VerbTense[]>(() => customTenses.value ?? defaultTensesFor(levels.value))

const filteredVerbs = computed(() => filter({ levels: levels.value, types: types.value, cases: cases.value }))
const passiveSupported = computed(() =>
  filteredVerbs.value.some(v => v.case === 'accusative' || v.case === 'dative+accusative')
)
/** What actually starts the run: passive forms drop out when unsupported. */
const effectiveTenses = computed<VerbTense[]>(() =>
  passiveSupported.value ? selectedTenses.value : selectedTenses.value.filter(t => !PASSIVE_TENSE_SET.has(t))
)

const tensesByLevel = computed(() => {
  const g: Record<TenseCEFR, VerbTense[]> = { A1: [], A2: [], B1: [], B2: [], C1: [] }
  for (const t of VERB_TENSES) g[TENSE_LEVEL[t]].push(t)
  return g
})
function tenseDisabled(t: VerbTense): boolean {
  return PASSIVE_TENSE_SET.has(t) && !passiveSupported.value
}
function toggleTense(t: VerbTense) {
  if (tenseDisabled(t)) return
  const base = selectedTenses.value
  customTenses.value = base.includes(t) ? base.filter(x => x !== t) : [...base, t]
}

interface Stored {
  levels?: VerbLevel[]; types?: VerbType[]; cases?: VerbCase[]; groups?: NounGroup[]
  verbsPer?: WordsPer; nounsPer?: WordsPer; modality?: 'typed' | 'spoken'; wordHints?: boolean
  count?: CountPreset; customCount?: number; tenses?: VerbTense[]
}
function loadStored(): Stored | null {
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) as Stored : null } catch { return null }
}
function saveStored(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      levels: [...levels.value], types: [...types.value], cases: [...cases.value], groups: [...groups.value],
      verbsPer: verbsPer.value, nounsPer: nounsPer.value, modality: modality.value, wordHints: wordHints.value,
      count: count.value, customCount: customCount.value,
      ...(customTenses.value !== null ? { tenses: [...customTenses.value] } : {})
    } satisfies Stored))
  } catch { /* ignore */ }
}

onMounted(async () => {
  await loadSettings()
  nounCounts.value = await countsByGroup()
  const s = loadStored()
  if (s) {
    if (Array.isArray(s.levels)) levels.value = migrateVerbLevels(s.levels)
    if (Array.isArray(s.types)) types.value = s.types.filter(t => (VERB_TYPES as readonly string[]).includes(t))
    if (Array.isArray(s.cases)) cases.value = s.cases.filter(c => (VERB_CASES as readonly string[]).includes(c))
    if (Array.isArray(s.groups)) groups.value = s.groups.filter(g => (NOUN_GROUPS as readonly string[]).includes(g))
    if (s.verbsPer === 1 || s.verbsPer === 2 || s.verbsPer === 'mix') verbsPer.value = s.verbsPer
    if (s.nounsPer === 1 || s.nounsPer === 2 || s.nounsPer === 'mix') nounsPer.value = s.nounsPer
    if (s.modality === 'typed' || s.modality === 'spoken') modality.value = s.modality
    if (typeof s.wordHints === 'boolean') wordHints.value = s.wordHints
    if (s.count !== undefined) count.value = s.count
    if (typeof s.customCount === 'number' && s.customCount > 0) customCount.value = s.customCount
    if (Array.isArray(s.tenses)) customTenses.value = s.tenses.filter((t): t is VerbTense => (VERB_TENSES as readonly string[]).includes(t))
  }
  if (groups.value.length === 0) groups.value = NOUN_GROUPS.filter(g => (nounCounts.value[g] ?? 0) > 0)

  // A stored preference for Gesprochen can predate this browser session — never
  // leave the learner stuck on an unselectable modality.
  if (modality.value === 'spoken' && !micSupported) {
    modality.value = 'typed'
    toast.info('Gesprochen ist in diesem Browser nicht verfügbar', {
      description: 'Auf Getippt umgeschaltet — das läuft überall.'
    })
  }
})
watch([levels, types, cases, groups, verbsPer, nounsPer, modality, wordHints, count, customCount, customTenses], saveStored, { deep: true })

function selectModality(m: 'typed' | 'spoken') {
  // The segment is also :disabled in the template; this guard is defense in
  // depth so nothing can ever land the learner on Gesprochen without a mic.
  if (m === 'spoken' && !micSupported) return
  modality.value = m
}

const availableVerbs = computed(() => filteredVerbs.value.length)
const effective = computed(() => count.value === 'custom' ? Math.max(1, customCount.value) : count.value)
const selectedNounTotal = computed(() => groups.value.reduce((sum, g) => sum + (nounCounts.value[g] ?? 0), 0))
const canStart = computed(() =>
  canUseAi.value && availableVerbs.value > 0 && selectedNounTotal.value > 0 && levels.value.length > 0 && types.value.length > 0 && cases.value.length > 0 && effectiveTenses.value.length > 0
)

function toggle<T>(set: T[], v: T): T[] {
  const i = set.indexOf(v); return i >= 0 ? set.filter((_, j) => j !== i) : [...set, v]
}

async function start() {
  if (!canUseAi.value) {
    toast.error(
      settings.value.aiProvider === 'local-claude' ? 'Local Claude not reachable' : 'Gemini API key required',
      { description: 'Set your API key (or pick Local Claude) in Settings before generating sentences.' }
    )
    return
  }
  if (!canStart.value) return
  const n = effective.value
  const verbPool = filteredVerbs.value.map(verbToRef)
  const nounPool = (await sampleByGroups(groups.value, 100000)).map(nounToRef)
  const specs = buildVerbSpecs(verbPool, nounPool, n, verbsPer.value, nounsPer.value, Math.random, effectiveTenses.value)
  // Belt-and-suspenders: the segment can't be selected without a mic and we
  // fall back on mount, but never let a stale ref value start an
  // unsupported spoken run.
  const effectiveModality: 'typed' | 'spoken' = modality.value === 'spoken' && !micSupported ? 'typed' : modality.value
  sessionStorage.setItem(STASH_KEY, JSON.stringify({
    specs,
    runType: 'verb-sentence',
    level: levelLabel(levels.value),
    modality: effectiveModality,
    wordHints: wordHints.value,
    meta: { levels: levels.value, types: types.value, cases: cases.value, groups: groups.value, verbsPer: verbsPer.value, nounsPer: nounsPer.value, tenses: effectiveTenses.value }
  }))
  router.push({ name: 'verbs-sentence-run' })
}

function back() { router.push({ name: 'verbs' }) }
</script>

<template>
  <div class="page setup-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Kapitel III · Satzübersetzung · Einrichtung</div>
        <h1 class="section-title">Setup<em>.</em></h1>
        <p class="section-subtitle">
          Pick a verb pool and a noun theme. The AI writes one English+German sentence per item using
          1–2 of your verbs and 1–2 nouns — you read the English and type or speak the German, and the AI grades it.
        </p>
      </div>
    </header>

    <div v-if="!canUseAi" class="alert alert-warning">
      <span class="alert-label">AI access needed</span>
      Set a Gemini API key, or pick <em>Local Claude (dev)</em>, in Settings.
    </div>

    <div class="field">
      <div class="field-row">
        <div class="field-label">Level · {{ levels.length }} of {{ VERB_LEVELS.length }}</div>
        <div class="field-actions">
          <button class="btn btn-quiet" type="button" @click="levels = [...VERB_LEVELS]">All</button>
          <button class="btn btn-quiet" type="button" @click="levels = []">None</button>
        </div>
      </div>
      <div class="chip-row">
        <button v-for="l in VERB_LEVELS" :key="l" class="chip" :class="{ selected: levels.includes(l) }" @click="levels = toggle(levels, l)">{{ l }}</button>
      </div>
    </div>

    <div class="field">
      <div class="field-row">
        <div class="field-label">Type · {{ types.length }} of {{ VERB_TYPES.length }}</div>
        <div class="field-actions">
          <button class="btn btn-quiet" type="button" @click="types = [...VERB_TYPES]">All</button>
          <button class="btn btn-quiet" type="button" @click="types = []">None</button>
        </div>
      </div>
      <div class="chip-row">
        <button v-for="t in VERB_TYPES" :key="t" class="chip" :class="{ selected: types.includes(t) }" @click="types = toggle(types, t)">{{ t }}</button>
      </div>
    </div>

    <div class="field">
      <div class="field-row">
        <div class="field-label">Object case · {{ cases.length }} of {{ VERB_CASES.length }}</div>
        <div class="field-actions">
          <button class="btn btn-quiet" type="button" @click="cases = [...VERB_CASES]">All</button>
          <button class="btn btn-quiet" type="button" @click="cases = []">None</button>
        </div>
      </div>
      <div class="chip-row">
        <button v-for="c in VERB_CASES" :key="c" class="chip" :class="{ selected: cases.includes(c) }" @click="cases = toggle(cases, c)">{{ c }}</button>
      </div>
    </div>

    <div class="field">
      <div class="field-row">
        <div class="field-label">Zeitformen · {{ effectiveTenses.length }} of {{ VERB_TENSES.length }}</div>
        <div class="field-actions">
          <button class="btn btn-quiet" type="button" @click="customTenses = [...VERB_TENSES]">All</button>
          <button class="btn btn-quiet" type="button" @click="customTenses = []">None</button>
        </div>
      </div>
      <div v-if="!passiveSupported" class="alert alert-info passive-hint">
        <span class="alert-label">Info</span>
        Passive tenses are disabled — your verb filter has no transitive (accusative) verbs.
      </div>
      <div v-for="lv in CEFR_ORDER" :key="lv" class="tense-group">
        <div class="tense-group-label">{{ lv }}</div>
        <div class="chip-row">
          <button
            v-for="t in tensesByLevel[lv]" :key="t"
            class="chip tense-chip"
            :class="{ selected: effectiveTenses.includes(t) }"
            :disabled="tenseDisabled(t)"
            @click="toggleTense(t)"
          >
            <span>{{ TENSE_LABELS[t] }}</span>
            <span class="chip-count">{{ TENSE_LEVEL[t] }}</span>
          </button>
        </div>
      </div>
    </div>

    <div class="field">
      <div class="field-row">
        <div class="field-label">Theme · {{ groups.length }} group{{ groups.length === 1 ? '' : 's' }} · {{ selectedNounTotal }} nouns</div>
        <div class="field-actions">
          <button class="btn btn-quiet" type="button" @click="groups = NOUN_GROUPS.filter(g => (nounCounts[g] ?? 0) > 0)">All</button>
          <button class="btn btn-quiet" type="button" @click="groups = []">None</button>
        </div>
      </div>
      <div class="chip-row">
        <button v-for="g in NOUN_GROUPS" :key="g" class="chip" :class="{ selected: groups.includes(g) }" :disabled="(nounCounts[g] ?? 0) === 0" @click="groups = toggle(groups, g)">
          <span>{{ g }}</span><span class="chip-count">{{ nounCounts[g] ?? 0 }}</span>
        </button>
      </div>
    </div>

    <div class="field">
      <div class="field-label">Verbs per sentence</div>
      <div class="segmented">
        <button :class="{ active: verbsPer === 1 }" @click="verbsPer = 1">1</button>
        <button :class="{ active: verbsPer === 2 }" @click="verbsPer = 2">2</button>
        <button :class="{ active: verbsPer === 'mix' }" @click="verbsPer = 'mix'">1–2 (mixed)</button>
      </div>
    </div>

    <div class="field">
      <div class="field-label">Nouns per sentence</div>
      <div class="segmented">
        <button :class="{ active: nounsPer === 1 }" @click="nounsPer = 1">1</button>
        <button :class="{ active: nounsPer === 2 }" @click="nounsPer = 2">2</button>
        <button :class="{ active: nounsPer === 'mix' }" @click="nounsPer = 'mix'">1–2 (mixed)</button>
      </div>
    </div>

    <div class="field">
      <div class="field-label">Modalität</div>
      <div class="segmented">
        <button :class="{ active: modality === 'typed' }" @click="selectModality('typed')">Getippt</button>
        <button :class="{ active: modality === 'spoken' }" :disabled="!micSupported"
          :title="!micSupported ? 'Dieser Browser kennt keine Spracherkennung.' : undefined"
          @click="selectModality('spoken')">Gesprochen</button>
      </div>
      <p class="micro-mark grading-hint">
        {{ modality === 'typed'
          ? 'Getippt: Du schreibst die deutsche Übersetzung und bestätigst mit Enter.'
          : 'Gesprochen: Leertaste startet die Aufnahme, sprich den Satz, Leertaste beendet sie und schickt die Antwort direkt ab — es gibt keinen Bearbeitungsschritt.' }}
        <template v-if="!micSupported"> Dieser Browser kennt keine Spracherkennung — nur Getippt ist verfügbar.</template>
      </p>
    </div>

    <div class="field">
      <div class="field-label">Word hints</div>
      <div class="segmented">
        <button :class="{ active: wordHints }" @click="wordHints = true">On</button>
        <button :class="{ active: !wordHints }" @click="wordHints = false">Off</button>
      </div>
      <p class="micro-mark grading-hint">
        {{ wordHints
          ? 'Highlights every verb and noun in the English prompt — hover or tap a highlight to reveal the German.'
          : 'No highlights — translate the full sentence unaided.' }}
      </p>
    </div>

    <div class="field">
      <div class="field-label">Number of sentences</div>
      <div class="field-row count-row">
        <div class="segmented">
          <button :class="{ active: count === 10 }" @click="count = 10">10</button>
          <button :class="{ active: count === 15 }" @click="count = 15">15</button>
          <button :class="{ active: count === 20 }" @click="count = 20">20</button>
          <button :class="{ active: count === 25 }" @click="count = 25">25</button>
          <button :class="{ active: count === 'custom' }" @click="count = 'custom'">Custom</button>
        </div>
        <input v-if="count === 'custom'" class="input custom-count" type="number" :min="1" :max="50" v-model.number="customCount" />
        <span class="micro-mark count-avail">{{ availableVerbs }} verbs in pool</span>
      </div>
    </div>

    <div v-if="availableVerbs === 0" class="alert alert-warning"><span class="alert-label">Warning</span>No verbs match the selected filters.</div>
    <div v-else-if="selectedNounTotal === 0" class="alert alert-warning"><span class="alert-label">Warning</span>Select at least one theme group that has nouns.</div>
    <div v-else-if="effectiveTenses.length === 0" class="alert alert-warning"><span class="alert-label">Warning</span>Pick at least one Zeitform.</div>

    <div class="alert alert-info">
      <span class="alert-label">How this drill works</span>
      We sample {{ effective }} sentence spec{{ effective === 1 ? '' : 's' }} from your verbs + nouns, then the AI
      writes them one batch at a time. The quiz opens on the first sentence and the rest stream in as you go.
    </div>

    <div class="setup-actions">
      <button class="btn btn-ghost" type="button" @click="back">← Back</button>
      <button class="btn btn-accent" type="button" :disabled="!canStart" @click="start">
        Start · {{ effective }} sentence{{ effective === 1 ? '' : 's' }} <span aria-hidden="true">→</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.setup-page { max-width: 720px; }
.field-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px; gap: 12px; flex-wrap: wrap; }
.field-actions { display: flex; gap: 4px; }
.count-row { align-items: center; gap: 12px; }
.custom-count { width: 80px; font-size: 17px; padding: 4px 0; }
.count-avail { margin-left: auto; }
.grading-hint { margin: 8px 0 0; }
.chip-count { margin-left: 6px; font-family: var(--font-mono); font-size: 11px; opacity: 0.6; }
.passive-hint { margin-top: 0; margin-bottom: 16px; }
.tense-group { margin-bottom: 12px; }
.tense-group-label { font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--mute); margin-bottom: 6px; }
.tense-chip { gap: 8px; }
/* margin-left: 0 cancels this file's local .chip-count spacing so the divider
   sits evenly, matching ConjugationQuizSetup's tense chips. */
.tense-chip .chip-count { border-left: 1px solid var(--hairline); padding-left: 6px; margin-left: 0; }
.setup-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 40px; gap: 16px; }
@media (max-width: 720px) { .setup-actions { flex-direction: column-reverse; align-items: stretch; } .setup-actions .btn { justify-content: center; } }
</style>
