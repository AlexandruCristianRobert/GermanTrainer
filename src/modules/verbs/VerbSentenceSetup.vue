<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useVerbs } from '../../composables/useVerbs'
import { useNouns } from '../../composables/useNouns'
import { useSettings } from '../../composables/useSettings'
import { useToast } from '../../composables/useToast'
import { VERB_LEVELS, VERB_TYPES, VERB_CASES, type VerbLevel, type VerbType, type VerbCase } from '../../data/verbs'
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

const levels = ref<VerbLevel[]>([...VERB_LEVELS])
const types = ref<VerbType[]>([...VERB_TYPES])
const cases = ref<VerbCase[]>([...VERB_CASES])
const groups = ref<NounGroup[]>([])
const verbsPer = ref<WordsPer>('mix')
const nounsPer = ref<WordsPer>('mix')
const wordHints = ref(true)
type CountPreset = 10 | 15 | 20 | 25 | 'custom'
const count = ref<CountPreset>(10)
const customCount = ref(15)

const nounCounts = ref<Record<NounGroup, number>>(
  Object.fromEntries(NOUN_GROUPS.map(g => [g, 0])) as Record<NounGroup, number>
)

interface Stored {
  levels?: VerbLevel[]; types?: VerbType[]; cases?: VerbCase[]; groups?: NounGroup[]
  verbsPer?: WordsPer; nounsPer?: WordsPer; wordHints?: boolean; count?: CountPreset; customCount?: number
}
function loadStored(): Stored | null {
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) as Stored : null } catch { return null }
}
function saveStored(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      levels: [...levels.value], types: [...types.value], cases: [...cases.value], groups: [...groups.value],
      verbsPer: verbsPer.value, nounsPer: nounsPer.value, wordHints: wordHints.value,
      count: count.value, customCount: customCount.value
    } satisfies Stored))
  } catch { /* ignore */ }
}

onMounted(async () => {
  await loadSettings()
  nounCounts.value = await countsByGroup()
  const s = loadStored()
  if (s) {
    if (Array.isArray(s.levels)) levels.value = s.levels.filter(l => (VERB_LEVELS as readonly string[]).includes(l))
    if (Array.isArray(s.types)) types.value = s.types.filter(t => (VERB_TYPES as readonly string[]).includes(t))
    if (Array.isArray(s.cases)) cases.value = s.cases.filter(c => (VERB_CASES as readonly string[]).includes(c))
    if (Array.isArray(s.groups)) groups.value = s.groups.filter(g => (NOUN_GROUPS as readonly string[]).includes(g))
    if (s.verbsPer === 1 || s.verbsPer === 2 || s.verbsPer === 'mix') verbsPer.value = s.verbsPer
    if (s.nounsPer === 1 || s.nounsPer === 2 || s.nounsPer === 'mix') nounsPer.value = s.nounsPer
    if (typeof s.wordHints === 'boolean') wordHints.value = s.wordHints
    if (s.count !== undefined) count.value = s.count
    if (typeof s.customCount === 'number' && s.customCount > 0) customCount.value = s.customCount
  }
  if (groups.value.length === 0) groups.value = NOUN_GROUPS.filter(g => (nounCounts.value[g] ?? 0) > 0)
})
watch([levels, types, cases, groups, verbsPer, nounsPer, wordHints, count, customCount], saveStored, { deep: true })

const availableVerbs = computed(() => filter({ levels: levels.value, types: types.value, cases: cases.value }).length)
const effective = computed(() => count.value === 'custom' ? Math.max(1, customCount.value) : count.value)
const selectedNounTotal = computed(() => groups.value.reduce((sum, g) => sum + (nounCounts.value[g] ?? 0), 0))
const canStart = computed(() =>
  canUseAi.value && availableVerbs.value > 0 && selectedNounTotal.value > 0 && levels.value.length > 0 && types.value.length > 0 && cases.value.length > 0
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
  const verbPool = filter({ levels: levels.value, types: types.value, cases: cases.value }).map(verbToRef)
  const nounPool = (await sampleByGroups(groups.value, 100000)).map(nounToRef)
  const specs = buildVerbSpecs(verbPool, nounPool, n, verbsPer.value, nounsPer.value)
  sessionStorage.setItem(STASH_KEY, JSON.stringify({
    specs,
    runType: 'verb-sentence',
    level: levelLabel(levels.value),
    wordHints: wordHints.value,
    meta: { levels: levels.value, types: types.value, cases: cases.value, groups: groups.value, verbsPer: verbsPer.value, nounsPer: nounsPer.value }
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
          1–2 of your verbs and 1–2 nouns — you read the English and type the German, and the AI grades it.
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
.setup-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 40px; gap: 16px; }
@media (max-width: 720px) { .setup-actions { flex-direction: column-reverse; align-items: stretch; } .setup-actions .btn { justify-content: center; } }
</style>
