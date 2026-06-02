<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAdjectives } from '../../composables/useAdjectives'
import { useSettings } from '../../composables/useSettings'
import { ADJECTIVE_GROUPS, type AdjectiveGroup } from '../../db/types'

const STORAGE_KEY = 'adjectiveQuizSetup'
const LEGACY_GROUPS_KEY = 'adjectiveQuizGroups'

const { countsByGroup } = useAdjectives()
const { canUseAi, load: loadSettings } = useSettings()
const router = useRouter()

const counts = ref<Record<AdjectiveGroup, number>>(
  Object.fromEntries(ADJECTIVE_GROUPS.map(g => [g, 0])) as Record<AdjectiveGroup, number>
)
const selected = ref<AdjectiveGroup[]>([])
type CountPreset = 10 | 15 | 20 | 'all' | 'custom'
const count = ref<CountPreset>(10)
const customCount = ref(15)

interface Stored {
  groups?: AdjectiveGroup[]
  count?: CountPreset
  customCount?: number
}

function loadStored(): Stored | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const legacy = localStorage.getItem(LEGACY_GROUPS_KEY)
      if (legacy) {
        const arr = JSON.parse(legacy)
        if (Array.isArray(arr)) return { groups: arr as AdjectiveGroup[] }
      }
      return null
    }
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    return parsed as Stored
  } catch { return null }
}
function saveStored(): void {
  try {
    const payload: Stored = {
      groups: [...selected.value],
      count: count.value,
      customCount: customCount.value
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch { /* ignore */ }
}

onMounted(async () => {
  counts.value = await countsByGroup()
  await loadSettings()
  const stored = loadStored()
  const known = new Set<string>(ADJECTIVE_GROUPS)
  if (stored?.groups && Array.isArray(stored.groups)) {
    const filtered = stored.groups.filter((g): g is AdjectiveGroup => typeof g === 'string' && known.has(g))
    selected.value = filtered.length > 0 ? filtered : ADJECTIVE_GROUPS.filter(g => counts.value[g] > 0)
  } else {
    selected.value = ADJECTIVE_GROUPS.filter(g => counts.value[g] > 0)
  }
  if (stored?.count !== undefined) count.value = stored.count
  if (typeof stored?.customCount === 'number' && stored.customCount > 0) customCount.value = stored.customCount
})

watch([selected, count, customCount], saveStored, { deep: true })

const selectedSet = computed(() => new Set(selected.value))

function toggleGroup(g: AdjectiveGroup) {
  if ((counts.value[g] ?? 0) === 0) return
  const i = selected.value.indexOf(g)
  if (i >= 0) selected.value.splice(i, 1)
  else selected.value.push(g)
}
function selectAll() { selected.value = ADJECTIVE_GROUPS.filter(g => counts.value[g] > 0) }
function selectNone() { selected.value = [] }

const totalAvailable = computed(() =>
  selected.value.reduce((sum, g) => sum + (counts.value[g] ?? 0), 0)
)
const effective = computed(() => {
  if (count.value === 'all') return totalAvailable.value
  if (count.value === 'custom') return Math.min(customCount.value, totalAvailable.value)
  return Math.min(count.value, totalAvailable.value)
})

function start() {
  if (selected.value.length === 0 || totalAvailable.value === 0 || !canUseAi.value) return
  router.push({
    name: 'adjectives-quiz-run',
    query: {
      count: String(effective.value),
      groups: selected.value.join(',')
    }
  })
}
</script>

<template>
  <div class="page setup-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Kapitel II · Übung · Einrichtung</div>
        <h1 class="section-title">Setup<em>.</em></h1>
        <p class="section-subtitle">
          Pick groups of adjectives. Gemini generates an example sentence per adjective with one inflected form blanked out — you type the missing word.
        </p>
      </div>
    </header>

    <div v-if="!canUseAi" class="alert alert-warning">
      <span class="alert-label">AI access needed</span>
      Set a Gemini API key, or pick <em>Local Claude (dev)</em>, in <router-link :to="{ name: 'settings' }">Settings</router-link>. Everything else runs offline.
    </div>

    <div class="field">
      <div class="field-row">
        <div class="field-label">Groups · {{ selected.length }} of {{ ADJECTIVE_GROUPS.length }}</div>
        <div class="field-actions">
          <button class="btn btn-quiet" type="button" @click="selectAll">All</button>
          <button class="btn btn-quiet" type="button" @click="selectNone">None</button>
        </div>
      </div>
      <div class="chip-row">
        <button
          v-for="g in ADJECTIVE_GROUPS"
          :key="g"
          class="chip"
          :class="{ selected: selectedSet.has(g) }"
          :disabled="(counts[g] ?? 0) === 0"
          @click="toggleGroup(g)"
        >
          <span>{{ g }}</span>
          <span class="chip-count">{{ counts[g] ?? 0 }}</span>
        </button>
      </div>
    </div>

    <div class="field">
      <div class="field-label">Number of sentences</div>
      <div class="field-row count-row">
        <div class="segmented">
          <button :class="{ active: count === 10 }" @click="count = 10">10</button>
          <button :class="{ active: count === 15 }" @click="count = 15">15</button>
          <button :class="{ active: count === 20 }" @click="count = 20">20</button>
          <button :class="{ active: count === 'all' }" @click="count = 'all'">All · {{ totalAvailable }}</button>
          <button :class="{ active: count === 'custom' }" @click="count = 'custom'">Custom</button>
        </div>
        <input
          v-if="count === 'custom'"
          class="input custom-count"
          type="number"
          :min="1"
          :max="totalAvailable || 1"
          v-model.number="customCount"
        />
        <span class="micro-mark count-avail">{{ totalAvailable }} available</span>
      </div>
    </div>

    <div v-if="selected.length === 0" class="alert alert-warning">
      <span class="alert-label">Warning</span>
      Pick at least one group to begin.
    </div>

    <div class="alert alert-info">
      <span class="alert-label">Acceptance</span>
      You type the <em>inflected</em> form (e.g. "schönen", not "schön"). Whitespace and case are ignored.
    </div>

    <div class="alert alert-warning">
      <span class="alert-label">Heads up</span>
      Gemini takes <strong>1–3 minutes</strong> to return a batch — please don't close the tab while the loader is up.
    </div>

    <div class="setup-actions">
      <button class="btn btn-ghost" type="button" @click="router.push({ name: 'adjectives' })">← Back</button>
      <button
        class="btn btn-accent btn-meta"
        type="button"
        :disabled="selected.length === 0 || totalAvailable === 0 || !canUseAi"
        @click="start"
      >
        <span class="bm-main">Generate &amp; start <span aria-hidden="true">→</span></span>
        <span class="bm-sub">{{ effective }} sentences</span>
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
