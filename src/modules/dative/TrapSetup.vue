<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { filterTrapItems, DATIVE_FAMILIES, FAMILY_LABELS, type DativeFamily } from '../../composables/useDativeDrill'
import { DATIVE_ITEM_LEVELS, type DativeItemLevel } from '../../data/dativeItems'

const STORAGE_KEY = 'datTrapSetup'
const router = useRouter()

const levels = ref<DativeItemLevel[]>(['A2', 'B1'])
const families = ref<DativeFamily[]>([...DATIVE_FAMILIES])

type CountPreset = 10 | 15 | 20 | 'all'
const preset = ref<CountPreset>(10)

interface Stored {
  levels?: DativeItemLevel[]
  families?: DativeFamily[]
  preset?: CountPreset
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const s = JSON.parse(raw) as Stored
    if (s.levels) levels.value = s.levels.filter(l => (DATIVE_ITEM_LEVELS as readonly string[]).includes(l))
    if (s.families) families.value = s.families.filter(f => (DATIVE_FAMILIES as readonly string[]).includes(f))
    if (s.preset !== undefined) preset.value = s.preset
  } catch { /* ignore */ }
}

function save() {
  try {
    const payload: Stored = { levels: levels.value, families: families.value, preset: preset.value }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch { /* ignore */ }
}

onMounted(load)
watch([levels, families, preset], save, { deep: true })

const availableItems = computed(() =>
  filterTrapItems({ levels: levels.value, families: families.value }).length
)

const effectiveCount = computed(() =>
  preset.value === 'all' ? availableItems.value : Math.min(preset.value, availableItems.value)
)

function toggle<T>(set: T[], v: T): T[] {
  const i = set.indexOf(v)
  if (i >= 0) return set.filter((_, j) => j !== i)
  return [...set, v]
}

function start() {
  router.push({
    name: 'dative-trap-run',
    query: {
      count: String(effectiveCount.value),
      levels: levels.value.join(','),
      families: families.value.join(','),
    },
  })
}
</script>

<template>
  <div class="page setup-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Kapitel XIII · Dativ · Fallen-Karten</div>
        <h1 class="section-title">Trap cards<em>.</em></h1>
        <p class="section-subtitle">
          <em>I help my brother</em> — English takes a plain object, and your hand
          reaches for the accusative. The German verb refuses. Read the English,
          then type the object the dative verb wants.
        </p>
      </div>
    </header>

    <div class="field">
      <div class="field-row">
        <div class="field-label">Level · {{ levels.length }} of {{ DATIVE_ITEM_LEVELS.length }}</div>
        <div class="field-actions">
          <button class="btn btn-quiet" type="button" @click="levels = [...DATIVE_ITEM_LEVELS]">All</button>
          <button class="btn btn-quiet" type="button" @click="levels = []">None</button>
        </div>
      </div>
      <div class="chip-row">
        <button
          v-for="l in DATIVE_ITEM_LEVELS" :key="l"
          class="chip" :class="{ selected: levels.includes(l) }"
          @click="levels = toggle(levels, l)"
        >{{ l }}</button>
      </div>
    </div>

    <div class="field">
      <div class="field-row">
        <div class="field-label">Semantic family · {{ families.length }} of {{ DATIVE_FAMILIES.length }}</div>
        <div class="field-actions">
          <button class="btn btn-quiet" type="button" @click="families = [...DATIVE_FAMILIES]">All</button>
          <button class="btn btn-quiet" type="button" @click="families = []">None</button>
        </div>
      </div>
      <div class="chip-row">
        <button
          v-for="f in DATIVE_FAMILIES" :key="f"
          class="chip" :class="{ selected: families.includes(f) }"
          @click="families = toggle(families, f)"
        >{{ FAMILY_LABELS[f] }}</button>
      </div>
    </div>

    <div class="field">
      <div class="field-label">Number of cards</div>
      <div class="field-row count-row">
        <div class="segmented">
          <button :class="{ active: preset === 10 }" @click="preset = 10">10</button>
          <button :class="{ active: preset === 15 }" @click="preset = 15">15</button>
          <button :class="{ active: preset === 20 }" @click="preset = 20">20</button>
          <button :class="{ active: preset === 'all' }" @click="preset = 'all'">All · {{ availableItems }}</button>
        </div>
        <span class="micro-mark count-avail">{{ availableItems }} items match</span>
      </div>
    </div>

    <div v-if="availableItems === 0" class="alert alert-warning">
      <span class="alert-label">Warning</span>
      No items match the selected filters.
    </div>

    <div class="setup-actions">
      <button class="btn btn-ghost" type="button" @click="router.push({ name: 'dative' })">← Back</button>
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
