<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { filterAdjectiveEndings } from '../../composables/useDeclension'
import {
  DECL_LEVELS, DECL_CASES, DECL_INFLECTIONS, DECL_GENDERS,
  type DeclLevel, type DeclCase, type Inflection, type DeclGender
} from '../../data/declension'

const STORAGE_KEY = 'declAdjectiveSetup'
const router = useRouter()

const levels = ref<DeclLevel[]>([...DECL_LEVELS])
const cases = ref<DeclCase[]>([...DECL_CASES])
const inflections = ref<Inflection[]>([...DECL_INFLECTIONS])
const genders = ref<DeclGender[]>([...DECL_GENDERS])
type CountPreset = 10 | 15 | 20 | 'all' | 'custom'
const count = ref<CountPreset>(10)
const customCount = ref(15)

interface Stored {
  levels?: DeclLevel[]
  cases?: DeclCase[]
  inflections?: Inflection[]
  genders?: DeclGender[]
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
      inflections: [...inflections.value],
      genders: [...genders.value],
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
  if (Array.isArray(s.inflections)) inflections.value = s.inflections.filter(i => (DECL_INFLECTIONS as readonly string[]).includes(i))
  if (Array.isArray(s.genders)) genders.value = s.genders.filter(g => (DECL_GENDERS as readonly string[]).includes(g))
  if (s.count !== undefined) count.value = s.count
  if (typeof s.customCount === 'number' && s.customCount > 0) customCount.value = s.customCount
})
watch([levels, cases, inflections, genders, count, customCount], saveStored, { deep: true })

const available = computed(() => filterAdjectiveEndings({
  levels: levels.value,
  cases: cases.value,
  inflections: inflections.value,
  genders: genders.value
}).length)

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
    name: 'declension-adj-run',
    query: {
      count: String(effective.value),
      levels: levels.value.join(','),
      inflections: inflections.value.join(','),
      cases: cases.value.join(','),
      genders: genders.value.join(',')
    }
  })
}

function back() { router.push({ name: 'declension' }) }
</script>

<template>
  <div class="page setup-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Kapitel V · Adjektivendungen · Einrichtung</div>
        <h1 class="section-title">Setup<em>.</em></h1>
        <p class="section-subtitle">
          One sentence per screen. Type the full inflected adjective form.
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
        <div class="field-label">Inflection · {{ inflections.length }} of {{ DECL_INFLECTIONS.length }}</div>
        <div class="field-actions">
          <button class="btn btn-quiet" type="button" @click="inflections = [...DECL_INFLECTIONS]">All</button>
          <button class="btn btn-quiet" type="button" @click="inflections = []">None</button>
        </div>
      </div>
      <div class="chip-row">
        <button
          v-for="i in DECL_INFLECTIONS" :key="i"
          class="chip"
          :class="{ selected: inflections.includes(i) }"
          @click="inflections = toggle(inflections, i)"
        >{{ i }}</button>
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
      <div class="field-row">
        <div class="field-label">Gender · {{ genders.length }} of {{ DECL_GENDERS.length }}</div>
        <div class="field-actions">
          <button class="btn btn-quiet" type="button" @click="genders = [...DECL_GENDERS]">All</button>
          <button class="btn btn-quiet" type="button" @click="genders = []">None</button>
        </div>
      </div>
      <div class="chip-row">
        <button
          v-for="g in DECL_GENDERS" :key="g"
          class="chip"
          :class="{ selected: genders.includes(g) }"
          @click="genders = toggle(genders, g)"
        >{{ g }}</button>
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
      <span class="alert-label">Acceptance</span>
      Type the FULL inflected adjective — not just the ending. Whitespace and case are ignored.
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
