<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useNouns } from '../../composables/useNouns'
import { NOUN_GROUPS, type NounGroup } from '../../db/types'

const STORAGE_KEY = 'nounQuizGroups'

const { countsByGroup } = useNouns()
const router = useRouter()

const counts = ref<Record<NounGroup, number>>(
  Object.fromEntries(NOUN_GROUPS.map(g => [g, 0])) as Record<NounGroup, number>
)
const selected = ref<NounGroup[]>([])
const mode = ref<'gender' | 'translation'>('gender')
type CountPreset = 10 | 15 | 20 | 'all' | 'custom'
const count = ref<CountPreset>(10)
const customCount = ref(15)

function loadStored(): NounGroup[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    const known = new Set<string>(NOUN_GROUPS)
    return parsed.filter((g): g is NounGroup => typeof g === 'string' && known.has(g))
  } catch { return null }
}
function saveStored(groups: NounGroup[]): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(groups)) } catch { /* ignore */ }
}

onMounted(async () => {
  counts.value = await countsByGroup()
  const stored = loadStored()
  selected.value = stored && stored.length > 0
    ? stored
    : NOUN_GROUPS.filter(g => counts.value[g] > 0)
})

watch(selected, v => saveStored([...v]), { deep: true })

const selectedSet = computed(() => new Set(selected.value))

function toggleGroup(g: NounGroup) {
  if ((counts.value[g] ?? 0) === 0) return
  const i = selected.value.indexOf(g)
  if (i >= 0) selected.value.splice(i, 1)
  else selected.value.push(g)
}
function selectAll() {
  selected.value = NOUN_GROUPS.filter(g => counts.value[g] > 0)
}
function selectNone() { selected.value = [] }

const totalAvailable = computed(() =>
  selected.value.reduce((sum, g) => sum + (counts.value[g] ?? 0), 0)
)

const effectiveCount = computed(() => {
  if (count.value === 'all') return totalAvailable.value
  if (count.value === 'custom') return Math.min(customCount.value, totalAvailable.value)
  return Math.min(count.value, totalAvailable.value)
})

const numericPresetExceeds = computed(() =>
  typeof count.value === 'number' && count.value > totalAvailable.value && totalAvailable.value > 0
)

function start() {
  if (selected.value.length === 0 || totalAvailable.value === 0) return
  router.push({
    name: 'nouns-quiz-run',
    query: {
      mode: mode.value,
      count: String(effectiveCount.value),
      groups: selected.value.join(',')
    }
  })
}

function backToLanding() { router.push({ name: 'nouns' }) }
</script>

<template>
  <div class="page setup-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Kapitel I · Übung · Einrichtung</div>
        <h1 class="section-title">Setup<em>.</em></h1>
        <p class="section-subtitle">
          Pick the groups, the mode, and how many questions. Your choices are remembered.
        </p>
      </div>
    </header>

    <div class="field">
      <div class="field-row">
        <div class="field-label">Groups · {{ selected.length }} of {{ NOUN_GROUPS.length }}</div>
        <div class="field-actions">
          <button class="btn btn-quiet" type="button" @click="selectAll">All</button>
          <button class="btn btn-quiet" type="button" @click="selectNone">None</button>
        </div>
      </div>
      <div class="chip-row">
        <button
          v-for="g in NOUN_GROUPS"
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
      <div class="field-label">Mode</div>
      <div class="segmented">
        <button :class="{ active: mode === 'gender' }" @click="mode = 'gender'">Gender · der/die/das</button>
        <button :class="{ active: mode === 'translation' }" @click="mode = 'translation'">English translation</button>
      </div>
    </div>

    <div class="field">
      <div class="field-label">Number of questions</div>
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

    <div v-if="numericPresetExceeds" class="alert alert-info">
      <span class="alert-label">Info</span>
      Only {{ totalAvailable }} nouns available in selected groups — quizzing all of them.
    </div>
    <div v-if="selected.length === 0" class="alert alert-warning">
      <span class="alert-label">Warning</span>
      Pick at least one group to begin.
    </div>

    <div class="setup-actions">
      <button class="btn btn-ghost" type="button" @click="backToLanding">← Back</button>
      <button
        class="btn btn-accent"
        type="button"
        :disabled="selected.length === 0 || totalAvailable === 0"
        @click="start"
      >
        Start quiz · {{ effectiveCount }} questions <span aria-hidden="true">→</span>
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
