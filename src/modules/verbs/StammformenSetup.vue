<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useVerbs } from '../../composables/useVerbs'
import {
  VERB_LEVELS, VERB_TYPES, migrateVerbLevels,
  type VerbLevel, type VerbType,
} from '../../data/verbs'

const STORAGE_KEY = 'gtStammformen'
const router = useRouter()
const { filter } = useVerbs()

const levels = ref<VerbLevel[]>(['B1', 'B2.1', 'B2.2'])
const types  = ref<VerbType[]>(['irregular', 'mixed', 'modal'])

type CountPreset = 10 | 15 | 20 | 'all' | 'custom'
const preset = ref<CountPreset>(10)
const customCount = ref(10)

interface Stored {
  levels?: VerbLevel[]
  types?: VerbType[]
  preset?: CountPreset
  customCount?: number
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const s = JSON.parse(raw) as Stored
    if (s.levels) levels.value = migrateVerbLevels(s.levels)
    if (s.types)  types.value  = s.types.filter(t => (VERB_TYPES as readonly string[]).includes(t))
    if (s.preset !== undefined) preset.value = s.preset
    if (s.customCount !== undefined) customCount.value = s.customCount
  } catch { /* ignore */ }
}

function save() {
  try {
    const payload: Stored = {
      levels: levels.value, types: types.value,
      preset: preset.value, customCount: customCount.value,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch { /* ignore */ }
}

onMounted(load)
watch([levels, types, preset, customCount], save, { deep: true })

const availableVerbs = computed(() => filter({ levels: levels.value, types: types.value }).length)

const requested = computed<number>(() => {
  if (preset.value === 'all') return availableVerbs.value
  if (preset.value === 'custom') return customCount.value
  return preset.value
})
const effectiveCount = computed(() => Math.min(requested.value, availableVerbs.value))

function toggle<T>(set: T[], v: T): T[] {
  const i = set.indexOf(v)
  if (i >= 0) return set.filter((_, j) => j !== i)
  return [...set, v]
}

function start() {
  router.push({
    name: 'verbs-stammformen-run',
    query: {
      count: String(effectiveCount.value),
      levels: levels.value.join(','),
      types: types.value.join(','),
    }
  })
}
</script>

<template>
  <div class="page setup-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Kapitel III · Verben · Stammformen</div>
        <h1 class="section-title">Principal parts<em>.</em></h1>
        <p class="section-subtitle">
          Filter the verb pool and pick how many verbs to drill.
          For each verb, recall the 3rd-person singular Präteritum, the Partizip II,
          and the auxiliary (haben/sein).
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
        <button
          v-for="l in VERB_LEVELS" :key="l"
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
        <button
          v-for="t in VERB_TYPES" :key="t"
          class="chip" :class="{ selected: types.includes(t) }"
          @click="types = toggle(types, t)"
        >{{ t }}</button>
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
    </div>

    <div v-if="availableVerbs === 0" class="alert alert-warning">
      <span class="alert-label">Warning</span>
      No verbs match the selected filters.
    </div>

    <div class="setup-actions">
      <button class="btn btn-ghost" type="button" @click="router.push({ name: 'verbs' })">← Back</button>
      <button
        class="btn btn-accent"
        type="button"
        :disabled="availableVerbs === 0"
        @click="start"
      >
        Start drill · {{ effectiveCount }} verbs <span aria-hidden="true">→</span>
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
