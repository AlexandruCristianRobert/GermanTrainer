<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { filterTwinItems } from '../../composables/useDativeDrill'
import { DATIVE_DRILL_LEVELS, type DativeDrillLevel } from '../../data/dativeExperiencer'
import { TWIN_PAIRS, type TwinPair } from '../../data/dativeTwins'

const STORAGE_KEY = 'datTwinsSetup'
const router = useRouter()

const PAIR_IDS = TWIN_PAIRS.map(p => p.pairId)

// The bank spans A2–C1 (see dativeTwins.ts), so every level chip starts selected.
const levels = ref<DativeDrillLevel[]>([...DATIVE_DRILL_LEVELS])
const pairs = ref<string[]>([...PAIR_IDS])

type CountPreset = 10 | 15 | 20 | 'all'
const preset = ref<CountPreset>(10)

interface Stored {
  levels?: DativeDrillLevel[]
  pairs?: string[]
  preset?: CountPreset
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const s = JSON.parse(raw) as Stored
    if (s.levels) levels.value = s.levels.filter(l => (DATIVE_DRILL_LEVELS as readonly string[]).includes(l))
    if (s.pairs) pairs.value = s.pairs.filter(p => PAIR_IDS.includes(p))
    if (s.preset !== undefined) preset.value = s.preset
  } catch { /* ignore */ }
}

function save() {
  try {
    const payload: Stored = { levels: levels.value, pairs: pairs.value, preset: preset.value }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch { /* ignore */ }
}

onMounted(load)
watch([levels, pairs, preset], save, { deep: true })

const availableItems = computed(() =>
  filterTwinItems({ levels: levels.value, pairs: pairs.value }).length
)

const effectiveCount = computed(() =>
  preset.value === 'all' ? availableItems.value : Math.min(preset.value, availableItems.value)
)

function toggle<T>(set: T[], v: T): T[] {
  const i = set.indexOf(v)
  if (i >= 0) return set.filter((_, j) => j !== i)
  return [...set, v]
}

// dative | twin, with the two twins that don't split into two verbs spelled
// out specially: glauben is one verb with a case-governed sense split, and
// gehören zu is a particle twin (same verb + zu).
function pairLabel(p: TwinPair): string {
  if (p.twinParticle) return `${p.dativeVerb} | ${p.twin} ${p.twinParticle}`
  if (p.dativeVerb === p.twin) return `${p.dativeVerb} +Dat | +Akk`
  return `${p.dativeVerb} | ${p.twin}`
}

function start() {
  router.push({
    name: 'dative-twins-run',
    query: {
      count: String(effectiveCount.value),
      levels: levels.value.join(','),
      pairs: pairs.value.join(','),
    },
  })
}
</script>

<template>
  <div class="page setup-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Kapitel XIII · Dativ · Zwillingspaare</div>
        <h1 class="section-title">Zwillingspaare<em>.</em></h1>
        <p class="section-subtitle">
          antworten or beantworten? Near-synonyms sit on opposite sides of the case line —
          the object's case (or the auxiliary) tells you which twin the sentence wants.
        </p>
      </div>
    </header>

    <div class="field">
      <div class="field-row">
        <div class="field-label">Level · {{ levels.length }} of {{ DATIVE_DRILL_LEVELS.length }}</div>
        <div class="field-actions">
          <button class="btn btn-quiet" type="button" @click="levels = [...DATIVE_DRILL_LEVELS]">All</button>
          <button class="btn btn-quiet" type="button" @click="levels = []">None</button>
        </div>
      </div>
      <div class="chip-row">
        <button
          v-for="l in DATIVE_DRILL_LEVELS" :key="l"
          class="chip" :class="{ selected: levels.includes(l) }"
          @click="levels = toggle(levels, l)"
        >{{ l }}</button>
      </div>
    </div>

    <div class="field">
      <div class="field-row">
        <div class="field-label">Twin pair · {{ pairs.length }} of {{ TWIN_PAIRS.length }}</div>
        <div class="field-actions">
          <button class="btn btn-quiet" type="button" @click="pairs = [...PAIR_IDS]">All</button>
          <button class="btn btn-quiet" type="button" @click="pairs = []">None</button>
        </div>
      </div>
      <div class="chip-row">
        <button
          v-for="p in TWIN_PAIRS" :key="p.pairId"
          class="chip" :class="{ selected: pairs.includes(p.pairId) }"
          :title="p.contrast"
          @click="pairs = toggle(pairs, p.pairId)"
        >{{ pairLabel(p) }}</button>
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
