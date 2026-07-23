<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useVerbs } from '../../composables/useVerbs'
import {
  VERB_LEVELS, VERB_TYPES, VERB_CASES,
  VERB_TENSES, TENSE_LABELS, TENSE_LEVEL, PASSIVE_TENSE_SET, migrateVerbLevels,
  type VerbLevel, type VerbType, type VerbCase, type VerbTense, type TenseCEFR
} from '../../data/verbs'

const STORAGE_KEY = 'verbConjQuiz'
const router = useRouter()
const { filter } = useVerbs()

const levels = ref<VerbLevel[]>([...VERB_LEVELS])
const types  = ref<VerbType[]>([...VERB_TYPES])
const cases  = ref<VerbCase[]>([...VERB_CASES])
const tenses = ref<VerbTense[]>(['praesens'])

type CountPreset = 10 | 15 | 20 | 'all' | 'custom'
const preset = ref<CountPreset>(10)
const customCount = ref(10)

interface Stored {
  levels?: VerbLevel[]; types?: VerbType[]; cases?: VerbCase[]; tenses?: VerbTense[]
  preset?: CountPreset; customCount?: number
}
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const s = JSON.parse(raw) as Stored
    if (s.levels) levels.value = migrateVerbLevels(s.levels)
    if (s.types) types.value = s.types.filter(t => (VERB_TYPES as readonly string[]).includes(t))
    if (s.cases) cases.value = s.cases.filter(c => (VERB_CASES as readonly string[]).includes(c))
    if (s.tenses) tenses.value = s.tenses.filter(t => (VERB_TENSES as readonly string[]).includes(t))
    if (s.preset !== undefined) preset.value = s.preset
    if (s.customCount !== undefined) customCount.value = s.customCount
  } catch { /* ignore */ }
}
function save() {
  try {
    const payload: Stored = {
      levels: levels.value, types: types.value, cases: cases.value, tenses: tenses.value,
      preset: preset.value, customCount: customCount.value
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch { /* ignore */ }
}
onMounted(load)
watch([levels, types, cases, tenses, preset, customCount], save, { deep: true })

const filteredVerbs = computed(() => filter({ levels: levels.value, types: types.value, cases: cases.value }))
const availableVerbs = computed(() => filteredVerbs.value.length)
const passiveSupported = computed(() =>
  filteredVerbs.value.some(v => v.case === 'accusative' || v.case === 'dative+accusative')
)

const requested = computed<number>(() => {
  if (preset.value === 'all') return availableVerbs.value
  if (preset.value === 'custom') return customCount.value
  return preset.value
})
const effectiveVerbs = computed(() => Math.min(requested.value, availableVerbs.value))
const totalQuestions = computed(() => effectiveVerbs.value * tenses.value.length)

const tensesByLevel = computed(() => {
  const groups: Record<TenseCEFR, VerbTense[]> = { A1: [], A2: [], B1: [], B2: [], C1: [] }
  for (const t of VERB_TENSES) groups[TENSE_LEVEL[t]].push(t)
  return groups
})

function tenseDisabled(t: VerbTense): boolean {
  return PASSIVE_TENSE_SET.has(t) && !passiveSupported.value
}
function toggleTense(t: VerbTense) {
  if (tenseDisabled(t)) return
  const i = tenses.value.indexOf(t)
  if (i >= 0) tenses.value.splice(i, 1)
  else tenses.value.push(t)
}
function toggle<T>(set: T[], v: T): T[] {
  const i = set.indexOf(v)
  if (i >= 0) return set.filter((_, j) => j !== i)
  return [...set, v]
}

function start() {
  router.push({
    name: 'verbs-conjugation-run',
    query: {
      count: String(effectiveVerbs.value),
      levels: levels.value.join(','),
      types: types.value.join(','),
      cases: cases.value.join(','),
      tenses: tenses.value.join(',')
    }
  })
}

const CEFR_ORDER: TenseCEFR[] = ['A1', 'A2', 'B1', 'B2', 'C1']
</script>

<template>
  <div class="page setup-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Kapitel III · Konjugation · Einrichtung</div>
        <h1 class="section-title">Setup<em>.</em></h1>
        <p class="section-subtitle">
          Filter the verb pool, pick which tenses to drill, and how many verbs.
          Each verb you pick is asked once per selected tense.
        </p>
      </div>
      <button class="btn btn-ghost" type="button" @click="router.push({ name: 'verbs-cheatsheet' })">Open cheatsheet</button>
    </header>

    <div class="field">
      <div class="field-row">
        <div class="field-label">Verb level · {{ levels.length }} of {{ VERB_LEVELS.length }}</div>
        <div class="field-actions">
          <button class="btn btn-quiet" type="button" @click="levels = [...VERB_LEVELS]">All</button>
          <button class="btn btn-quiet" type="button" @click="levels = []">None</button>
        </div>
      </div>
      <div class="chip-row">
        <button v-for="l in VERB_LEVELS" :key="l"
          class="chip" :class="{ selected: levels.includes(l) }"
          @click="levels = toggle(levels, l)"
        >{{ l }}</button>
      </div>
    </div>

    <div class="field">
      <div class="field-row">
        <div class="field-label">Verb type · {{ types.length }} of {{ VERB_TYPES.length }}</div>
        <div class="field-actions">
          <button class="btn btn-quiet" type="button" @click="types = [...VERB_TYPES]">All</button>
          <button class="btn btn-quiet" type="button" @click="types = []">None</button>
        </div>
      </div>
      <div class="chip-row">
        <button v-for="t in VERB_TYPES" :key="t"
          class="chip" :class="{ selected: types.includes(t) }"
          @click="types = toggle(types, t)"
        >{{ t }}</button>
      </div>
    </div>

    <div class="field">
      <div class="field-row">
        <div class="field-label">Verb case · {{ cases.length }} of {{ VERB_CASES.length }}</div>
        <div class="field-actions">
          <button class="btn btn-quiet" type="button" @click="cases = [...VERB_CASES]">All</button>
          <button class="btn btn-quiet" type="button" @click="cases = []">None</button>
        </div>
      </div>
      <div class="chip-row">
        <button v-for="c in VERB_CASES" :key="c"
          class="chip" :class="{ selected: cases.includes(c) }"
          @click="cases = toggle(cases, c)"
        >{{ c }}</button>
      </div>
    </div>

    <div class="field">
      <div class="field-label">Tenses · {{ tenses.length }} selected</div>
      <div v-if="!passiveSupported" class="alert alert-info passive-hint">
        <span class="alert-label">Info</span>
        Passive tenses are disabled — your verb filter has no transitive (accusative) verbs.
      </div>
      <div v-for="level in CEFR_ORDER" :key="level" class="tense-group">
        <div class="tense-group-label">{{ level }}</div>
        <div class="chip-row">
          <button
            v-for="t in tensesByLevel[level]" :key="t"
            class="chip tense-chip"
            :class="{ selected: tenses.includes(t) }"
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
      <div class="field-label">Number of verbs</div>
      <div class="field-row count-row">
        <div class="segmented">
          <button :class="{ active: preset === 10 }" @click="preset = 10">10</button>
          <button :class="{ active: preset === 15 }" @click="preset = 15">15</button>
          <button :class="{ active: preset === 20 }" @click="preset = 20">20</button>
          <button :class="{ active: preset === 'all' }" @click="preset = 'all'">All · {{ availableVerbs }}</button>
          <button :class="{ active: preset === 'custom' }" @click="preset = 'custom'">Custom</button>
        </div>
        <input
          v-if="preset === 'custom'"
          class="input custom-count"
          type="number"
          :min="1"
          :max="availableVerbs || 1"
          v-model.number="customCount"
        />
        <span class="micro-mark count-avail">{{ availableVerbs }} verbs match</span>
      </div>
      <p v-if="tenses.length > 0" class="total-q-line">
        ≈ {{ totalQuestions }} questions ({{ effectiveVerbs }} verbs × {{ tenses.length }} tenses)
      </p>
    </div>

    <div v-if="availableVerbs === 0" class="alert alert-warning">
      <span class="alert-label">Warning</span>
      No verbs match the selected filters.
    </div>
    <div v-else-if="tenses.length === 0" class="alert alert-warning">
      <span class="alert-label">Warning</span>
      Pick at least one tense.
    </div>

    <div class="setup-actions">
      <button class="btn btn-ghost" type="button" @click="router.push({ name: 'verbs' })">← Back</button>
      <button
        class="btn btn-accent"
        type="button"
        :disabled="availableVerbs === 0 || tenses.length === 0"
        @click="start"
      >
        Start quiz · {{ totalQuestions }} questions <span aria-hidden="true">→</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.setup-page { max-width: 720px; }

.field-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 10px;
  gap: 12px;
  flex-wrap: wrap;
}
.field-actions { display: flex; gap: 4px; }
.count-row { align-items: center; gap: 12px; }
.custom-count { width: 80px; font-size: 17px; padding: 4px 0; }
.count-avail { margin-left: auto; }

.passive-hint { margin-top: 0; margin-bottom: 16px; }
.tense-group {
  margin-bottom: 12px;
}
.tense-group-label {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--mute);
  margin-bottom: 6px;
}
.tense-chip { gap: 8px; }
.tense-chip .chip-count {
  border-left: 1px solid var(--hairline);
  padding-left: 6px;
}

.total-q-line {
  margin-top: 8px;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.06em;
  color: var(--mute);
}

.setup-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 40px;
  gap: 16px;
}
@media (max-width: 720px) {
  .setup-actions { flex-direction: column-reverse; align-items: stretch; }
  .setup-actions .btn { justify-content: center; }
}
</style>
