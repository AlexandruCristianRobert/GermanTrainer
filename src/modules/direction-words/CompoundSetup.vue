<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { filterCompoundItems } from '../../composables/useDirectionDrill'
import { ADVERB_PAIRS, DIRECTION_LEVELS, hinForm, herForm, type DirectionLevel } from '../../data/directionWords'

const STORAGE_KEY = 'dwCompoundSetup'
const router = useRouter()

const PAIR_ELEMENTS = ADVERB_PAIRS.map(p => p.element)

type CompoundMode = 'pick' | 'type'

const levels = ref<DirectionLevel[]>(['A2', 'B1'])
const pairs = ref<string[]>([...PAIR_ELEMENTS])
const mode = ref<CompoundMode>('pick')

type CountPreset = 10 | 15 | 20 | 'all'
const preset = ref<CountPreset>(10)

interface Stored {
  levels?: DirectionLevel[]
  pairs?: string[]
  mode?: CompoundMode
  preset?: CountPreset
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const s = JSON.parse(raw) as Stored
    if (s.levels) levels.value = s.levels.filter(l => (DIRECTION_LEVELS as readonly string[]).includes(l))
    if (s.pairs) pairs.value = s.pairs.filter(p => PAIR_ELEMENTS.includes(p))
    if (s.mode === 'pick' || s.mode === 'type') mode.value = s.mode
    if (s.preset !== undefined) preset.value = s.preset
  } catch { /* ignore */ }
}

function save() {
  try {
    const payload: Stored = {
      levels: levels.value, pairs: pairs.value, mode: mode.value, preset: preset.value,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch { /* ignore */ }
}

onMounted(load)
watch([levels, pairs, mode, preset], save, { deep: true })

const availableItems = computed(() =>
  filterCompoundItems({ levels: levels.value, pairs: pairs.value }).length
)

const effectiveCount = computed(() =>
  preset.value === 'all' ? availableItems.value : Math.min(preset.value, availableItems.value)
)

function toggle<T>(set: T[], v: T): T[] {
  const i = set.indexOf(v)
  if (i >= 0) return set.filter((_, j) => j !== i)
  return [...set, v]
}

function pairLabel(element: string): string {
  return `${hinForm(element)} / ${herForm(element)}`
}

function start() {
  router.push({
    name: 'directionwords-compounds-run',
    query: {
      count: String(effectiveCount.value),
      levels: levels.value.join(','),
      pairs: pairs.value.join(','),
      mode: mode.value,
    },
  })
}
</script>

<template>
  <div class="page setup-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Modul · hin &amp; her · Die Paare</div>
        <h1 class="section-title">Compound gap-fill<em>.</em></h1>
        <p class="section-subtitle">
          A scene diagram sets the perspective; the sentence needs the full compound —
          <em>hinein</em> or <em>herein</em>, <em>hinauf</em> or <em>herauf</em> — not just
          the bare direction. Pick it from four options, or type it yourself.
        </p>
      </div>
    </header>

    <div class="field">
      <div class="field-row">
        <div class="field-label">Level · {{ levels.length }} of {{ DIRECTION_LEVELS.length }}</div>
        <div class="field-actions">
          <button class="btn btn-quiet" type="button" @click="levels = [...DIRECTION_LEVELS]">All</button>
          <button class="btn btn-quiet" type="button" @click="levels = []">None</button>
        </div>
      </div>
      <div class="chip-row">
        <button
          v-for="l in DIRECTION_LEVELS" :key="l"
          class="chip" :class="{ selected: levels.includes(l) }"
          @click="levels = toggle(levels, l)"
        >{{ l }}</button>
      </div>
    </div>

    <div class="field">
      <div class="field-row">
        <div class="field-label">Pair · {{ pairs.length }} of {{ ADVERB_PAIRS.length }}</div>
        <div class="field-actions">
          <button class="btn btn-quiet" type="button" @click="pairs = [...PAIR_ELEMENTS]">All</button>
          <button class="btn btn-quiet" type="button" @click="pairs = []">None</button>
        </div>
      </div>
      <div class="chip-row">
        <button
          v-for="p in ADVERB_PAIRS" :key="p.element"
          class="chip" :class="{ selected: pairs.includes(p.element) }"
          @click="pairs = toggle(pairs, p.element)"
        >{{ pairLabel(p.element) }}</button>
      </div>
    </div>

    <div class="field">
      <div class="field-label">Answer mode</div>
      <div class="segmented">
        <button :class="{ active: mode === 'pick' }" @click="mode = 'pick'">B1 · choose</button>
        <button :class="{ active: mode === 'type' }" @click="mode = 'type'">B2 · type it</button>
      </div>
      <p class="micro-mark grading-hint">
        {{ mode === 'pick'
          ? 'Pick the correct compound from four options.'
          : 'Folded umlauts accepted (hinueber = hinüber). The spoken short forms (runter) don\'t count here — the drill tests exactly the distinction they erase.' }}
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
        </div>
        <span class="micro-mark count-avail">{{ availableItems }} items match</span>
      </div>
    </div>

    <div v-if="availableItems === 0" class="alert alert-warning">
      <span class="alert-label">Warning</span>
      No items match the selected filters.
    </div>

    <div class="setup-actions">
      <button class="btn btn-ghost" type="button" @click="router.push({ name: 'directionwords' })">← Back</button>
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
