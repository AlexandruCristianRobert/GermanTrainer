<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { CASE_RECOGNITION_ENTRIES } from '../../data/case-recognition'
import {
  DECL_LEVELS, DECL_CASES,
  type DeclLevel, type DeclCase
} from '../../data/declension'

const STORAGE_KEY = 'declCRSetup'
const router = useRouter()

const levels = ref<DeclLevel[]>([...DECL_LEVELS])
const cases = ref<DeclCase[]>([...DECL_CASES])
type CountPreset = 10 | 15 | 20 | 'all' | 'custom'
const count = ref<CountPreset>(10)
const customCount = ref(15)

interface Stored {
  levels?: DeclLevel[]
  cases?: DeclCase[]
  count?: CountPreset
  customCount?: number
}

function loadStored(): Stored | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return null
    return p as Stored
  } catch { return null }
}
function saveStored(): void {
  try {
    const payload: Stored = {
      levels: [...levels.value],
      cases: [...cases.value],
      count: count.value,
      customCount: customCount.value
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch { /* ignore */ }
}

onMounted(() => {
  const s = loadStored()
  if (!s) return
  if (Array.isArray(s.levels)) levels.value = s.levels.filter(l => (DECL_LEVELS as readonly string[]).includes(l))
  if (Array.isArray(s.cases)) cases.value = s.cases.filter(c => (DECL_CASES as readonly string[]).includes(c))
  if (s.count !== undefined) count.value = s.count
  if (typeof s.customCount === 'number' && s.customCount > 0) customCount.value = s.customCount
})
watch([levels, cases, count, customCount], saveStored, { deep: true })

const available = computed(() =>
  CASE_RECOGNITION_ENTRIES.filter(e =>
    levels.value.includes(e.level) && cases.value.includes(e.case)
  ).length
)

const effective = computed(() => {
  if (count.value === 'all') return available.value
  if (count.value === 'custom') return Math.min(customCount.value, available.value)
  return Math.min(count.value, available.value)
})

function toggle<T>(set: T[], v: T): T[] {
  const i = set.indexOf(v)
  if (i >= 0) return set.filter((_, j) => j !== i)
  return [...set, v]
}

function start() {
  if (available.value === 0) return
  router.push({
    name: 'declension-cr-run',
    query: {
      count: String(effective.value),
      levels: levels.value.join(','),
      cases: cases.value.join(',')
    }
  })
}

function back() { router.push({ name: 'declension' }) }
</script>

<template>
  <div class="page setup-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Kapitel V · Kasus erkennen · Einrichtung</div>
        <h1 class="section-title">Setup<em>.</em></h1>
        <p class="section-subtitle">
          Read each sentence and identify the case of the highlighted noun phrase.
        </p>
      </div>
    </header>

    <div class="field">
      <div class="field-row">
        <div class="field-label">Level · {{ levels.length }} of {{ DECL_LEVELS.length }}</div>
        <div class="field-actions">
          <button class="btn btn-quiet" type="button" @click="levels = [...DECL_LEVELS]">All</button>
          <button class="btn btn-quiet" type="button" @click="levels = []">None</button>
        </div>
      </div>
      <div class="chip-row">
        <button
          v-for="l in DECL_LEVELS" :key="l"
          class="chip"
          :class="{ selected: levels.includes(l) }"
          @click="levels = toggle(levels, l)"
        >{{ l }}</button>
      </div>
    </div>

    <div class="field">
      <div class="field-row">
        <div class="field-label">Case · {{ cases.length }} of {{ DECL_CASES.length }}</div>
        <div class="field-actions">
          <button class="btn btn-quiet" type="button" @click="cases = [...DECL_CASES]">All</button>
          <button class="btn btn-quiet" type="button" @click="cases = []">None</button>
        </div>
      </div>
      <div class="chip-row">
        <button
          v-for="c in DECL_CASES" :key="c"
          class="chip"
          :class="{ selected: cases.includes(c) }"
          @click="cases = toggle(cases, c)"
        >{{ c }}</button>
      </div>
    </div>

    <div class="field">
      <div class="field-label">Number of sentences</div>
      <div class="field-row count-row">
        <div class="segmented">
          <button :class="{ active: count === 10 }" @click="count = 10">10</button>
          <button :class="{ active: count === 15 }" @click="count = 15">15</button>
          <button :class="{ active: count === 20 }" @click="count = 20">20</button>
          <button :class="{ active: count === 'all' }" @click="count = 'all'">All · {{ available }}</button>
          <button :class="{ active: count === 'custom' }" @click="count = 'custom'">Custom</button>
        </div>
        <input
          v-if="count === 'custom'"
          class="input custom-count"
          type="number"
          :min="1"
          :max="available || 1"
          v-model.number="customCount"
        />
        <span class="micro-mark count-avail">{{ available }} match</span>
      </div>
    </div>

    <div v-if="available === 0" class="alert alert-warning">
      <span class="alert-label">Warning</span>
      No sentences match the selected filters.
    </div>

    <div class="alert alert-info">
      <span class="alert-label">How this drill works</span>
      Read each sentence, identify the case of the highlighted phrase. Press <kbd class="kbd">1</kbd>–<kbd class="kbd">4</kbd> for nom/acc/dat/gen.
    </div>

    <div class="setup-actions">
      <button class="btn btn-ghost" type="button" @click="back">← Back</button>
      <button class="btn btn-accent" type="button" :disabled="available === 0" @click="start">
        Start quiz · {{ effective }} sentences <span aria-hidden="true">→</span>
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
.setup-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 40px; gap: 16px; }
@media (max-width: 720px) {
  .setup-actions { flex-direction: column-reverse; align-items: stretch; }
  .setup-actions .btn { justify-content: center; }
}
</style>
