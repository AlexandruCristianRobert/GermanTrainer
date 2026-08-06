<script setup lang="ts">
// Sentence module — Setup surface (Kapitel XII), transposed from SnaSetup in
// docs/design_handoff_sentence_module/sentence-a.jsx (Variant A · "Das
// Register") onto the app's real data pools. One card, five categories —
// verbs, nouns, prepositions, da-compounds, connectors — sharing a single
// per-card item budget (usePackedSentenceQuiz.PACKED_BUDGET).
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useVerbs } from '../../composables/useVerbs'
import { useNouns } from '../../composables/useNouns'
import { useSettings } from '../../composables/useSettings'
import { useToast } from '../../composables/useToast'
import { isSpeechRecognitionSupported } from '../../composables/useSpeechRecognizer'
import {
  VERB_LEVELS, VERB_TYPES, VERB_CASES, migrateVerbLevels,
  type VerbLevel, type VerbType, type VerbCase
} from '../../data/verbs'
import { PREPOSITIONS, PREPOSITION_CASES, type PrepCase } from '../../data/prepositions'
import { COLLOCATIONS } from '../../data/collocations'
import { CONNECTORS, CONN_FAMILIES, connectorsForFamilies, type ConnFamilyId } from '../../data/connectors'
import { NOUN_GROUPS, type NounGroup } from '../../db/types'
import { nounToRef, type Direction } from '../../composables/useSentenceQuiz'
import { levelLabel } from '../../composables/useVerbSentenceQuiz'
import {
  PACKED_CATS, PACKED_MAX, PACKED_BUDGET, PACKED_WARN_AT,
  packedTotal, packedVerbToRef, buildPackedSpecs,
  type PackedCategory, type PackedCounts, type PackedPools
} from '../../composables/usePackedSentenceQuiz'

const STORAGE_KEY = 'sentenceSetup'
const STASH_KEY = 'gt:lastPackedSentenceQuiz'
const router = useRouter()

const { filter } = useVerbs()
const { sampleByGroups, countsByGroup } = useNouns()
const { settings, canUseAi, load: loadSettings } = useSettings()
const toast = useToast()

// Static for the lifetime of the page — the browser either has
// SpeechRecognition or it doesn't.
const micSupported = isSpeechRecognitionSupported()

const CAT_META: Record<PackedCategory, { de: string; color: string; letter: string }> = {
  verb: { de: 'Verben', color: 'var(--sage)', letter: 'V' },
  noun: { de: 'Nomen', color: 'var(--cobalt)', letter: 'N' },
  prep: { de: 'Präpositionen', color: 'var(--ochre)', letter: 'P' },
  dac: { de: 'Da-Komposita', color: 'var(--clay)', letter: 'D' },
  conn: { de: 'Konnektoren', color: 'var(--ink-soft)', letter: 'K' }
}

const PREP_CASE_CHIPS: { id: PrepCase; label: string }[] = [
  { id: 'accusative', label: 'mit Akkusativ' },
  { id: 'dative', label: 'mit Dativ' },
  { id: 'two-way', label: 'Wechselpräpositionen' },
  { id: 'genitive', label: 'mit Genitiv' }
]

// ── State ──
const counts = ref<PackedCounts>({ verb: 2, noun: 2, prep: 1, dac: 1, conn: 1 })
const vLevels = ref<VerbLevel[]>(['A2', 'B1'])
const vTypes = ref<VerbType[]>([...VERB_TYPES])
const vCases = ref<VerbCase[]>([...VERB_CASES])
const nGroups = ref<NounGroup[]>([])
const pCases = ref<PrepCase[]>([...PREPOSITION_CASES])
const kFams = ref<ConnFamilyId[]>(['adversativ', 'kausal', 'konzessiv'])
const kDetail = ref(false)
const kWords = ref<Set<string>>(new Set())
const open = ref<PackedCategory | null>(null)
const direction = ref<Direction>('en-de')
const modality = ref<'typed' | 'spoken'>('typed')
const wordHints = ref(true)
type CardPreset = 3 | 5 | 8 | 'custom'
const preset = ref<CardPreset>(5)
const custom = ref(6)

const nounCounts = ref<Record<NounGroup, number>>(
  Object.fromEntries(NOUN_GROUPS.map(g => [g, 0])) as Record<NounGroup, number>
)

// ── Persistence ──
interface Stored {
  counts?: PackedCounts
  vLevels?: VerbLevel[]; vTypes?: VerbType[]; vCases?: VerbCase[]
  nGroups?: NounGroup[]; pCases?: PrepCase[]
  kFams?: ConnFamilyId[]; kDetail?: boolean; kWords?: string[]
  direction?: Direction; modality?: 'typed' | 'spoken'; wordHints?: boolean
  preset?: CardPreset; custom?: number
}
function loadStored(): Stored | null {
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) as Stored : null } catch { return null }
}
function saveStored(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      counts: counts.value,
      vLevels: [...vLevels.value], vTypes: [...vTypes.value], vCases: [...vCases.value],
      nGroups: [...nGroups.value], pCases: [...pCases.value],
      kFams: [...kFams.value], kDetail: kDetail.value, kWords: [...kWords.value],
      direction: direction.value, modality: modality.value, wordHints: wordHints.value,
      preset: preset.value, custom: custom.value
    } satisfies Stored))
  } catch { /* ignore */ }
}

onMounted(async () => {
  await loadSettings()
  nounCounts.value = await countsByGroup()
  const s = loadStored()
  if (s) {
    if (s.counts) counts.value = { ...counts.value, ...s.counts }
    if (Array.isArray(s.vLevels)) vLevels.value = migrateVerbLevels(s.vLevels)
    if (Array.isArray(s.vTypes)) vTypes.value = s.vTypes.filter(t => (VERB_TYPES as readonly string[]).includes(t))
    if (Array.isArray(s.vCases)) vCases.value = s.vCases.filter(c => (VERB_CASES as readonly string[]).includes(c))
    if (Array.isArray(s.nGroups)) nGroups.value = s.nGroups.filter(g => (NOUN_GROUPS as readonly string[]).includes(g))
    if (Array.isArray(s.pCases)) pCases.value = s.pCases.filter(c => (PREPOSITION_CASES as readonly string[]).includes(c))
    if (Array.isArray(s.kFams)) kFams.value = s.kFams.filter(f => CONN_FAMILIES.some(cf => cf.id === f))
    if (typeof s.kDetail === 'boolean') kDetail.value = s.kDetail
    if (Array.isArray(s.kWords)) kWords.value = new Set(s.kWords)
    if (s.direction === 'en-de' || s.direction === 'de-en') direction.value = s.direction
    if (s.modality === 'typed' || s.modality === 'spoken') modality.value = s.modality
    if (typeof s.wordHints === 'boolean') wordHints.value = s.wordHints
    if (s.preset !== undefined) preset.value = s.preset
    if (typeof s.custom === 'number' && s.custom > 0) custom.value = s.custom
  }
  if (nGroups.value.length === 0) nGroups.value = NOUN_GROUPS.filter(g => (nounCounts.value[g] ?? 0) > 0)

  // A stored preference for Gesprochen can predate this browser session — never
  // leave the learner stuck on an unselectable modality.
  if (modality.value === 'spoken' && !micSupported) {
    modality.value = 'typed'
    toast.info('Gesprochen ist in diesem Browser nicht verfügbar', {
      description: 'Auf Getippt umgeschaltet — das läuft überall.'
    })
  }
})
watch([counts, vLevels, vTypes, vCases, nGroups, pCases, kFams, kDetail, kWords, direction, modality, wordHints, preset, custom], saveStored, { deep: true })

// ── Budget + meter ──
const total = computed(() => packedTotal(counts.value))
const meterClass = computed(() => (total.value === 0 ? 'empty' : total.value >= PACKED_WARN_AT ? 'warn' : ''))
const meterCells = computed<(PackedCategory | undefined)[]>(() => {
  const cells: PackedCategory[] = []
  for (const c of PACKED_CATS) { for (let i = 0; i < counts.value[c]; i++) cells.push(c) }
  return Array.from({ length: PACKED_BUDGET }, (_, i) => cells[i])
})
const meterCaption = computed(() => {
  const t = total.value
  if (t === 0) return 'Leer — wähle mindestens ein Item'
  if (t >= PACKED_WARN_AT) return `${t} / 8 — Karten werden zu Kurztexten (3–4 Sätze) gedehnt`
  return `${t} / 8 Items pro Karte`
})

function countOptions(max: number): number[] {
  return Array.from({ length: max + 1 }, (_, i) => i)
}
function countDisabled(cat: PackedCategory, o: number): boolean {
  const value = counts.value[cat]
  return o > value && total.value - value + o > PACKED_BUDGET
}
function setCount(cat: PackedCategory, v: number): void {
  counts.value = { ...counts.value, [cat]: v }
}
function toggleOpen(cat: PackedCategory): void {
  open.value = open.value === cat ? null : cat
}

function toggle<T>(set: T[], v: T): T[] {
  const i = set.indexOf(v); return i >= 0 ? set.filter((_, j) => j !== i) : [...set, v]
}

// ── Verb pool ──
const availableVerbs = computed(() =>
  filter({ levels: vLevels.value, types: vTypes.value, cases: vCases.value }).length
)
const verbSummary = computed(() =>
  `${vLevels.value.length > 0 ? vLevels.value.join(' ') : '—'} · ${vTypes.value.length}/${VERB_TYPES.length} Typen · Rektion ${vCases.value.length}/${VERB_CASES.length} · ${availableVerbs.value} im Pool`
)

// ── Noun pool ──
const availableNounGroups = computed(() => NOUN_GROUPS.filter(g => (nounCounts.value[g] ?? 0) > 0))
const nounSummary = computed(() => `${nGroups.value.length}/${availableNounGroups.value.length} Themengruppen`)

// ── Preposition pool ──
const prepPool = computed(() => PREPOSITIONS.filter(p => pCases.value.includes(p.case)))
const prepSummary = computed(() => `${pCases.value.length}/${PREPOSITION_CASES.length} Kasusgruppen`)

// ── Connector pool ──
const connPool = computed(() =>
  kDetail.value
    ? CONNECTORS.filter(c => kWords.value.has(`${c.family}:${c.id}`))
    : connectorsForFamilies([...kFams.value])
)
const connSummary = computed(() =>
  kDetail.value ? `${kWords.value.size} Wörter (detailliert)` : `${kFams.value.length}/${CONN_FAMILIES.length} Familien`
)
function famWordKey(f: ConnFamilyId, id: string): string { return `${f}:${id}` }
function toggleWord(f: ConnFamilyId, id: string): void {
  const s = new Set(kWords.value)
  const k = famWordKey(f, id)
  if (s.has(k)) s.delete(k); else s.add(k)
  kWords.value = s
}
function enterDetail(): void {
  if (!kDetail.value) {
    const s = new Set<string>()
    for (const f of CONN_FAMILIES) {
      if (kFams.value.includes(f.id)) {
        for (const c of connectorsForFamilies([f.id])) s.add(famWordKey(f.id, c.id))
      }
    }
    kWords.value = s
  }
  kDetail.value = !kDetail.value
}

// ── Empty-pool guards ──
const emptyPool = computed(() => ({
  verb: counts.value.verb > 0 && (vLevels.value.length === 0 || vTypes.value.length === 0 || vCases.value.length === 0),
  noun: counts.value.noun > 0 && nGroups.value.length === 0,
  prep: counts.value.prep > 0 && pCases.value.length === 0,
  dac: false,
  conn: counts.value.conn > 0 && (kDetail.value ? kWords.value.size === 0 : kFams.value.length === 0)
}))
const anyEmpty = computed(() => PACKED_CATS.some(c => emptyPool.value[c]))

const canStart = computed(() => canUseAi.value && total.value > 0 && !anyEmpty.value)
const cards = computed(() => (preset.value === 'custom' ? Math.max(1, Math.min(12, custom.value || 1)) : preset.value))

// ── Run options ──
function selectModality(m: 'typed' | 'spoken'): void {
  if (m === 'spoken' && !micSupported) return
  modality.value = m
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

  const pools: PackedPools = {
    verbs: filter({ levels: vLevels.value, types: vTypes.value, cases: vCases.value }).map(packedVerbToRef),
    nouns: (await sampleByGroups([...nGroups.value], 100000)).map(nounToRef),
    preps: prepPool.value.map(p => ({ id: p.id, german: p.german, english: p.english, case: p.case })),
    collocs: COLLOCATIONS.map(c => ({ id: c.id, word: c.word, english: c.english, preposition: c.preposition, case: c.case })),
    conns: connPool.value
  }
  const specs = buildPackedSpecs(pools, counts.value, cards.value)

  // Belt-and-suspenders: the segment can't be selected without a mic and we
  // fall back on mount, but never let a stale ref value start an
  // unsupported spoken run.
  const effectiveModality: 'typed' | 'spoken' = modality.value === 'spoken' && !micSupported ? 'typed' : modality.value

  sessionStorage.setItem(STASH_KEY, JSON.stringify({
    specs,
    direction: direction.value,
    modality: direction.value === 'de-en' ? 'typed' : effectiveModality,
    wordHints: direction.value === 'en-de' && wordHints.value,
    level: levelLabel(vLevels.value),
    meta: {
      counts: counts.value,
      verbLevels: vLevels.value, verbTypes: vTypes.value, verbCases: vCases.value,
      nounGroups: nGroups.value, prepCases: pCases.value,
      connFamilies: kFams.value, connWords: [...kWords.value]
    }
  }))
  router.push({ name: 'sentence-run' })
}

function back() { router.push({ name: 'home' }) }
</script>

<template>
  <div class="page">
    <div class="sna-wrap">
      <header class="section-header">
        <div>
          <div class="breadcrumb">Kapitel XII · Satz · Einrichtung</div>
          <h1 class="section-title">Setup<em>.</em></h1>
          <p class="section-subtitle">
            Eine Karte, alle Kategorien: die KI schreibt einen Satz, der jedes bestellte Item
            enthält — normalerweise 1–2 Sätze, bei voller Packung ein Kurztext. Jede Karte
            zieht frische Wörter.
          </p>
        </div>
      </header>

      <div class="sna-meter" :class="meterClass">
        <div class="sna-cells">
          <span v-for="(cell, i) in meterCells" :key="i" class="sna-cell" :class="{ f: !!cell }"
            :style="cell ? { background: CAT_META[cell].color, borderColor: CAT_META[cell].color } : undefined">{{ cell ? CAT_META[cell].letter : '' }}</span>
        </div>
        <div class="sna-meter-t">{{ meterCaption }}</div>
      </div>

      <div v-if="!canUseAi" class="alert alert-warning">
        <span class="alert-label">AI access needed</span>
        Set a Gemini API key, or pick <em>Local Claude (dev)</em>, in Settings.
      </div>

      <!-- Verb block -->
      <div class="sna-block">
        <div class="sna-block-h">
          <span :style="{ width: '10px', height: '10px', borderRadius: '50%', background: CAT_META.verb.color, flex: 'none' }"></span>
          <span class="sna-name">{{ CAT_META.verb.de }}<span class="de">pro Karte</span></span>
          <span class="sna-count">
            <div class="segmented sna-count-seg">
              <button v-for="o in countOptions(PACKED_MAX.verb)" :key="o" type="button"
                :class="{ active: counts.verb === o }" :disabled="countDisabled('verb', o)"
                @click="setCount('verb', o)">{{ o }}</button>
            </div>
          </span>
        </div>
        <div class="sna-sum">
          <span class="sna-sum-t">{{ verbSummary }}</span>
          <button class="sna-flt" type="button" @click="toggleOpen('verb')">{{ open === 'verb' ? 'Filter schließen' : 'Filter' }}</button>
        </div>
        <div v-if="open === 'verb'" class="sna-filters">
          <div class="field">
            <div class="field-row">
              <div class="field-label">Niveau</div>
              <div class="field-actions">
                <button class="btn btn-quiet" type="button" @click="vLevels = [...VERB_LEVELS]">All</button>
                <button class="btn btn-quiet" type="button" @click="vLevels = []">None</button>
              </div>
            </div>
            <div class="chip-row">
              <button v-for="l in VERB_LEVELS" :key="l" class="chip" :class="{ selected: vLevels.includes(l) }" type="button" @click="vLevels = toggle(vLevels, l)">{{ l }}</button>
            </div>
          </div>
          <div class="field">
            <div class="field-row">
              <div class="field-label">Typ</div>
              <div class="field-actions">
                <button class="btn btn-quiet" type="button" @click="vTypes = [...VERB_TYPES]">All</button>
                <button class="btn btn-quiet" type="button" @click="vTypes = []">None</button>
              </div>
            </div>
            <div class="chip-row">
              <button v-for="t in VERB_TYPES" :key="t" class="chip" :class="{ selected: vTypes.includes(t) }" type="button" @click="vTypes = toggle(vTypes, t)">{{ t }}</button>
            </div>
          </div>
          <div class="field">
            <div class="field-row">
              <div class="field-label">Rektion · Objektkasus</div>
              <div class="field-actions">
                <button class="btn btn-quiet" type="button" @click="vCases = [...VERB_CASES]">All</button>
                <button class="btn btn-quiet" type="button" @click="vCases = []">None</button>
              </div>
            </div>
            <div class="chip-row">
              <button v-for="c in VERB_CASES" :key="c" class="chip" :class="{ selected: vCases.includes(c) }" type="button" @click="vCases = toggle(vCases, c)">{{ c }}</button>
            </div>
            <p class="grading-hint">„Verb + Dativ" gezielt üben: nur Dativ anwählen.</p>
          </div>
        </div>
        <div v-if="emptyPool.verb" class="alert alert-warning"><span class="alert-label">Leerer Pool</span>Verben stehen auf {{ counts.verb }}, aber kein Verb passt zu den Filtern.</div>
      </div>

      <!-- Noun block -->
      <div class="sna-block">
        <div class="sna-block-h">
          <span :style="{ width: '10px', height: '10px', borderRadius: '50%', background: CAT_META.noun.color, flex: 'none' }"></span>
          <span class="sna-name">{{ CAT_META.noun.de }}<span class="de">pro Karte</span></span>
          <span class="sna-count">
            <div class="segmented sna-count-seg">
              <button v-for="o in countOptions(PACKED_MAX.noun)" :key="o" type="button"
                :class="{ active: counts.noun === o }" :disabled="countDisabled('noun', o)"
                @click="setCount('noun', o)">{{ o }}</button>
            </div>
          </span>
        </div>
        <div class="sna-sum">
          <span class="sna-sum-t">{{ nounSummary }}</span>
          <button class="sna-flt" type="button" @click="toggleOpen('noun')">{{ open === 'noun' ? 'Filter schließen' : 'Filter' }}</button>
        </div>
        <div v-if="open === 'noun'" class="sna-filters">
          <div class="field">
            <div class="field-row">
              <div class="field-label">Themen</div>
              <div class="field-actions">
                <button class="btn btn-quiet" type="button" @click="nGroups = availableNounGroups">All</button>
                <button class="btn btn-quiet" type="button" @click="nGroups = []">None</button>
              </div>
            </div>
            <div class="chip-row">
              <button v-for="g in NOUN_GROUPS" :key="g" class="chip" :class="{ selected: nGroups.includes(g) }"
                :disabled="(nounCounts[g] ?? 0) === 0" type="button" @click="nGroups = toggle(nGroups, g)">
                <span>{{ g }}</span><span class="chip-count">{{ nounCounts[g] ?? 0 }}</span>
              </button>
            </div>
          </div>
        </div>
        <div v-if="emptyPool.noun" class="alert alert-warning"><span class="alert-label">Leerer Pool</span>Nomen stehen auf {{ counts.noun }}, aber keine Themengruppe ist gewählt.</div>
      </div>

      <!-- Preposition block -->
      <div class="sna-block">
        <div class="sna-block-h">
          <span :style="{ width: '10px', height: '10px', borderRadius: '50%', background: CAT_META.prep.color, flex: 'none' }"></span>
          <span class="sna-name">{{ CAT_META.prep.de }}<span class="de">pro Karte</span></span>
          <span class="sna-count">
            <div class="segmented sna-count-seg">
              <button v-for="o in countOptions(PACKED_MAX.prep)" :key="o" type="button"
                :class="{ active: counts.prep === o }" :disabled="countDisabled('prep', o)"
                @click="setCount('prep', o)">{{ o }}</button>
            </div>
          </span>
        </div>
        <div class="sna-sum">
          <span class="sna-sum-t">{{ prepSummary }}</span>
          <button class="sna-flt" type="button" @click="toggleOpen('prep')">{{ open === 'prep' ? 'Filter schließen' : 'Filter' }}</button>
        </div>
        <div v-if="open === 'prep'" class="sna-filters">
          <div class="field">
            <div class="field-row">
              <div class="field-label">Kasusgruppe</div>
              <div class="field-actions">
                <button class="btn btn-quiet" type="button" @click="pCases = [...PREPOSITION_CASES]">All</button>
                <button class="btn btn-quiet" type="button" @click="pCases = []">None</button>
              </div>
            </div>
            <div class="chip-row">
              <button v-for="pc in PREP_CASE_CHIPS" :key="pc.id" class="chip" :class="{ selected: pCases.includes(pc.id) }" type="button" @click="pCases = toggle(pCases, pc.id)">
                {{ pc.label }}<span class="chip-count">{{ PREPOSITIONS.filter(p => p.case === pc.id).length }}</span>
              </button>
            </div>
          </div>
        </div>
        <div v-if="emptyPool.prep" class="alert alert-warning"><span class="alert-label">Leerer Pool</span>Präpositionen stehen auf {{ counts.prep }}, aber keine Kasusgruppe ist gewählt.</div>
      </div>

      <!-- Da-compound block (filterless) -->
      <div class="sna-block">
        <div class="sna-block-h">
          <span :style="{ width: '10px', height: '10px', borderRadius: '50%', background: CAT_META.dac.color, flex: 'none' }"></span>
          <span class="sna-name">{{ CAT_META.dac.de }}<span class="de">pro Karte</span></span>
          <span class="sna-count">
            <div class="segmented sna-count-seg">
              <button v-for="o in countOptions(PACKED_MAX.dac)" :key="o" type="button"
                :class="{ active: counts.dac === o }" :disabled="countDisabled('dac', o)"
                @click="setCount('dac', o)">{{ o }}</button>
            </div>
          </span>
        </div>
        <div class="sna-sum">
          <span class="sna-sum-t">feste Kollokationsliste — keine Filter in v1</span>
        </div>
      </div>

      <!-- Connector block -->
      <div class="sna-block">
        <div class="sna-block-h">
          <span :style="{ width: '10px', height: '10px', borderRadius: '50%', background: CAT_META.conn.color, flex: 'none' }"></span>
          <span class="sna-name">{{ CAT_META.conn.de }}<span class="de">pro Karte</span></span>
          <span class="sna-count">
            <div class="segmented sna-count-seg">
              <button v-for="o in countOptions(PACKED_MAX.conn)" :key="o" type="button"
                :class="{ active: counts.conn === o }" :disabled="countDisabled('conn', o)"
                @click="setCount('conn', o)">{{ o }}</button>
            </div>
          </span>
        </div>
        <div class="sna-sum">
          <span class="sna-sum-t">{{ connSummary }}</span>
          <button class="sna-flt" type="button" @click="toggleOpen('conn')">{{ open === 'conn' ? 'Filter schließen' : 'Filter' }}</button>
        </div>
        <div v-if="open === 'conn'" class="sna-filters">
          <div class="field">
            <div class="field-row">
              <div class="field-label">Bedeutungsfamilien</div>
              <span class="field-actions">
                <button class="btn btn-quiet" type="button" @click="enterDetail">{{ kDetail ? '← Familien' : 'Detailliert' }}</button>
              </span>
            </div>
            <div v-if="!kDetail" class="chip-row">
              <button v-for="f in CONN_FAMILIES" :key="f.id" class="chip" :class="{ selected: kFams.includes(f.id) }" type="button" @click="kFams = toggle(kFams, f.id)">
                {{ f.label }}<span class="chip-count">{{ connectorsForFamilies([f.id]).length }}</span>
              </button>
            </div>
            <div v-if="kDetail" class="sna-fam-words">
              <div v-for="f in CONN_FAMILIES.filter(f => kFams.includes(f.id))" :key="f.id">
                <div class="fam-l">{{ f.label }} · {{ f.de }}</div>
                <div class="chip-row">
                  <button v-for="c in connectorsForFamilies([f.id])" :key="c.id" class="chip" :class="{ selected: kWords.has(famWordKey(f.id, c.id)) }" type="button" @click="toggleWord(f.id, c.id)">{{ c.display }}</button>
                </div>
              </div>
              <p v-if="kFams.length === 0" class="grading-hint">Erst Familien wählen — dann hier einzelne Wörter abwählen.</p>
            </div>
            <p class="grading-hint">Familie gewählt = alle Wörter der Familie im Topf. Zweiteilige Paare (sowohl … als auch) zählen als ein Item.</p>
          </div>
        </div>
        <div v-if="emptyPool.conn" class="alert alert-warning"><span class="alert-label">Leerer Pool</span>Konnektoren stehen auf {{ counts.conn }}, aber kein Wort ist gewählt.</div>
      </div>

      <div class="sna-opts">
        <div class="field">
          <div class="field-label">Richtung</div>
          <div class="segmented">
            <button type="button" :class="{ active: direction === 'en-de' }" @click="direction = 'en-de'">EN → DE</button>
            <button type="button" :class="{ active: direction === 'de-en' }" @click="direction = 'de-en'">DE → EN</button>
          </div>
          <p class="grading-hint">{{ direction === 'de-en'
            ? 'DE → EN: nur Bedeutungs-Bewertung — keine Fehler-Tags, keine Wort-Markierungen.'
            : 'EN → DE: volle Bewertung mit Fehler-Tags pro Item.' }}</p>
        </div>

        <div v-if="direction === 'en-de'" class="field">
          <div class="field-label">Modalität</div>
          <div class="segmented">
            <button type="button" :class="{ active: modality === 'typed' }" @click="modality = 'typed'">Getippt</button>
            <button type="button" :class="{ active: modality === 'spoken' }" :disabled="!micSupported" @click="selectModality('spoken')">Gesprochen</button>
          </div>
          <p v-if="!micSupported" class="grading-hint">Gesprochen erfordert Mikrofonzugriff — in diesem Browser nicht verfügbar.</p>
        </div>

        <div v-if="direction === 'en-de'" class="field">
          <div class="field-label">Wort-Hinweise</div>
          <div class="segmented">
            <button type="button" :class="{ active: wordHints }" @click="wordHints = true">An</button>
            <button type="button" :class="{ active: !wordHints }" @click="wordHints = false">Aus</button>
          </div>
          <p class="grading-hint">Markiert die abgefragten Wörter im englischen Satz.</p>
        </div>

        <div class="field">
          <div class="field-label">Anzahl Karten</div>
          <div class="field-row count-row">
            <div class="segmented">
              <button v-for="p in [3, 5, 8]" :key="p" type="button" :class="{ active: preset === p }" @click="preset = (p as CardPreset)">{{ p }}</button>
              <button type="button" :class="{ active: preset === 'custom' }" @click="preset = 'custom'">Custom</button>
            </div>
            <input v-if="preset === 'custom'" class="input custom-count" type="number" :min="1" :max="12" v-model.number="custom" />
            <span class="micro-mark count-avail">1 Karte ≈ {{ Math.max(total, 1) }} bewertete Items</span>
          </div>
        </div>
      </div>

      <div class="setup-actions">
        <button class="btn btn-ghost" type="button" @click="back">← Zurück</button>
        <button class="btn btn-accent" type="button" :disabled="!canStart" @click="start">
          Start · {{ cards }} {{ cards === 1 ? 'Karte' : 'Karten' }} <span aria-hidden="true">→</span>
        </button>
      </div>
      <p v-if="total === 0" class="grading-hint" style="text-align: right">Wähle mindestens ein Item pro Karte.</p>
    </div>
  </div>
</template>
