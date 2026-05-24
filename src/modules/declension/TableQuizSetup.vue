<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { filterDeclensionTables } from '../../composables/useDeclension'
import {
  DECL_LEVELS, DECL_DETERMINERS, DECL_GENDERS,
  type DeclLevel, type Determiner, type DeclGender
} from '../../data/declension'

const STORAGE_KEY = 'declTableSetup'
const router = useRouter()

const levels = ref<DeclLevel[]>([...DECL_LEVELS])
const determiners = ref<Determiner[]>([...DECL_DETERMINERS])
const genders = ref<DeclGender[]>([...DECL_GENDERS])
type CountPreset = 10 | 15 | 20 | 'all' | 'custom'
const count = ref<CountPreset>(10)
const customCount = ref(15)

interface Stored {
  levels?: DeclLevel[]
  determiners?: Determiner[]
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
      determiners: [...determiners.value],
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
  if (Array.isArray(s.determiners)) determiners.value = s.determiners.filter(d => (DECL_DETERMINERS as readonly string[]).includes(d))
  if (Array.isArray(s.genders)) genders.value = s.genders.filter(g => (DECL_GENDERS as readonly string[]).includes(g))
  if (s.count !== undefined) count.value = s.count
  if (typeof s.customCount === 'number' && s.customCount > 0) customCount.value = s.customCount
})
watch([levels, determiners, genders, count, customCount], saveStored, { deep: true })

const available = computed(() => filterDeclensionTables({
  levels: levels.value,
  determiners: determiners.value,
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
    name: 'declension-table-run',
    query: {
      count: String(effective.value),
      levels: levels.value.join(','),
      determiners: determiners.value.join(','),
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
        <div class="breadcrumb">Kapitel V · Vier Fälle · Einrichtung</div>
        <h1 class="section-title">Setup<em>.</em></h1>
        <p class="section-subtitle">
          Pick which CEFR levels, determiners and genders to drill, then how many phrases to decline.
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
        <div class="field-label">Determiner · {{ determiners.length }} of {{ DECL_DETERMINERS.length }}</div>
        <div class="field-actions">
          <button class="btn btn-quiet" type="button" @click="determiners = [...DECL_DETERMINERS]">All</button>
          <button class="btn btn-quiet" type="button" @click="determiners = []">None</button>
        </div>
      </div>
      <div class="chip-row">
        <button
          v-for="d in DECL_DETERMINERS" :key="d"
          class="chip"
          :class="{ selected: determiners.includes(d) }"
          @click="determiners = toggle(determiners, d)"
        >{{ d }}</button>
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
      <div class="field-label">Number of phrases</div>
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
      No declension tables match the selected filters.
    </div>

    <div class="alert alert-info">
      <span class="alert-label">How this drill works</span>
      For each phrase, fill in all four cases (nominative · accusative · dative · genitive). Submit each card to grade all four rows at once.
    </div>

    <div class="setup-actions">
      <button class="btn btn-ghost" type="button" @click="back">← Back</button>
      <button
        class="btn btn-accent"
        type="button"
        :disabled="available === 0"
        @click="start"
      >Start quiz · {{ effective }} phrases <span aria-hidden="true">→</span></button>
    </div>
  </div>
</template>

<style scoped>
.setup-page { max-width: 720px; }
.field-row {
  display: flex; justify-content: space-between; align-items: baseline;
  margin-bottom: 10px; gap: 12px; flex-wrap: wrap;
}
.field-actions { display: flex; gap: 4px; }
.count-row { align-items: center; gap: 12px; }
.custom-count { width: 80px; font-size: 17px; padding: 4px 0; }
.count-avail { margin-left: auto; }
.setup-actions {
  display: flex; justify-content: space-between; align-items: center;
  margin-top: 40px; gap: 16px;
}
@media (max-width: 720px) {
  .setup-actions { flex-direction: column-reverse; align-items: stretch; }
  .setup-actions .btn { justify-content: center; }
}
</style>
