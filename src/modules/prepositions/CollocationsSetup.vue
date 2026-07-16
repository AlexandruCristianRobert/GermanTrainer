<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useCollocations } from '../../composables/useCollocations'
import {
  COLLOCATION_LEVELS, COLLOCATION_ROLES,
  type CollocationLevel, type CollocationRole,
} from '../../data/collocations'

const STORAGE_KEY = 'gtCollocations'
const router = useRouter()
const { filter } = useCollocations()

const levels = ref<CollocationLevel[]>(['B1', 'B2'])
const roles  = ref<CollocationRole[]>([...COLLOCATION_ROLES])

type CountPreset = 10 | 15 | 20 | 'all' | 'custom'
const preset = ref<CountPreset>(10)
const customCount = ref(10)
const hints = ref(true)

interface Stored {
  levels?: CollocationLevel[]
  roles?: CollocationRole[]
  preset?: CountPreset
  customCount?: number
  hints?: boolean
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const s = JSON.parse(raw) as Stored
    if (s.levels) levels.value = s.levels.filter(l => (COLLOCATION_LEVELS as readonly string[]).includes(l))
    if (s.roles)  roles.value  = s.roles.filter(r => (COLLOCATION_ROLES as readonly string[]).includes(r))
    if (s.preset !== undefined) preset.value = s.preset
    if (s.customCount !== undefined) customCount.value = s.customCount
    if (typeof s.hints === 'boolean') hints.value = s.hints
  } catch { /* ignore */ }
}

function save() {
  try {
    const payload: Stored = {
      levels: levels.value, roles: roles.value,
      preset: preset.value, customCount: customCount.value,
      hints: hints.value,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch { /* ignore */ }
}

onMounted(load)
watch([levels, roles, preset, customCount, hints], save, { deep: true })

const availableItems = computed(() => filter({ levels: levels.value, roles: roles.value }).length)

const requested = computed<number>(() => {
  if (preset.value === 'all') return availableItems.value
  if (preset.value === 'custom') return customCount.value
  return preset.value
})
const effectiveCount = computed(() => Math.min(requested.value, availableItems.value))

function toggle<T>(set: T[], v: T): T[] {
  const i = set.indexOf(v)
  if (i >= 0) return set.filter((_, j) => j !== i)
  return [...set, v]
}

function start() {
  router.push({
    name: 'prepositions-collocations-run',
    query: {
      count: String(effectiveCount.value),
      levels: levels.value.join(','),
      roles: roles.value.join(','),
      hints: hints.value ? '1' : '0',
    }
  })
}
</script>

<template>
  <div class="page setup-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Kapitel IV · Präpositionen · Feste Präpositionen</div>
        <h1 class="section-title">Fixed prepositions<em>.</em></h1>
        <p class="section-subtitle">
          Filter the collocation pool and pick how many cards to drill.
          For each word, type the preposition it governs and select its case (Akkusativ / Dativ).
        </p>
      </div>
    </header>

    <div class="field">
      <div class="field-row">
        <div class="field-label">Level · {{ levels.length }} of {{ COLLOCATION_LEVELS.length }}</div>
        <div class="field-actions">
          <button class="btn btn-quiet" type="button" @click="levels = [...COLLOCATION_LEVELS]">All</button>
          <button class="btn btn-quiet" type="button" @click="levels = []">None</button>
        </div>
      </div>
      <div class="chip-row">
        <button
          v-for="l in COLLOCATION_LEVELS" :key="l"
          class="chip" :class="{ selected: levels.includes(l) }"
          @click="levels = toggle(levels, l)"
        >{{ l }}</button>
      </div>
    </div>

    <div class="field">
      <div class="field-row">
        <div class="field-label">Word type · {{ roles.length }} of {{ COLLOCATION_ROLES.length }}</div>
        <div class="field-actions">
          <button class="btn btn-quiet" type="button" @click="roles = [...COLLOCATION_ROLES]">All</button>
          <button class="btn btn-quiet" type="button" @click="roles = []">None</button>
        </div>
      </div>
      <div class="chip-row">
        <button
          v-for="r in COLLOCATION_ROLES" :key="r"
          class="chip" :class="{ selected: roles.includes(r) }"
          @click="roles = toggle(roles, r)"
        >{{ r }}</button>
      </div>
    </div>

    <div class="field">
      <div class="field-label">Scene hints</div>
      <div class="segmented">
        <button :class="{ active: hints }" @click="hints = true">On</button>
        <button :class="{ active: !hints }" @click="hints = false">Off</button>
      </div>
      <p class="micro-mark grading-hint">
        {{ hints
          ? 'Shows a one-line English scene under each word to set the context before you answer.'
          : 'No scene — just the word and its English gloss.' }}
      </p>
    </div>

    <div class="field">
      <div class="field-label">Number of cards</div>
      <div class="field-row count-row">
        <div class="segmented">
          <button :class="{ active: preset === 10 }" @click="preset = 10">10</button>
          <button :class="{ active: preset === 15 }" @click="preset = 15">15</button>
          <button :class="{ active: preset === 20 }" @click="preset = 20">20</button>
          <button :class="{ active: preset === 'all' }" @click="preset = 'all'">All · {{ availableItems }}</button>
          <button :class="{ active: preset === 'custom' }" @click="preset = 'custom'">Custom</button>
        </div>
        <input
          v-if="preset === 'custom'"
          class="input custom-count"
          type="number"
          :min="1"
          :max="availableItems || 1"
          v-model.number="customCount"
        />
        <span class="micro-mark count-avail">{{ availableItems }} items match</span>
      </div>
    </div>

    <div v-if="availableItems === 0" class="alert alert-warning">
      <span class="alert-label">Warning</span>
      No items match the selected filters.
    </div>

    <div class="setup-actions">
      <button class="btn btn-ghost" type="button" @click="router.push({ name: 'prepositions' })">← Back</button>
      <button
        class="btn btn-accent"
        type="button"
        :disabled="availableItems === 0"
        @click="start"
      >
        Start drill · {{ effectiveCount }} cards <span aria-hidden="true">→</span>
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
.grading-hint { margin: 8px 0 0; }

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
