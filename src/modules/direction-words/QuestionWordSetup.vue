<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { filterQuestionItems } from '../../composables/useDirectionDrill'
import { DIRECTION_LEVELS, type DirectionLevel } from '../../data/directionWords'

const STORAGE_KEY = 'dwQuestionSetup'
const router = useRouter()

type QuestionMode = 'pick' | 'type'

const levels = ref<DirectionLevel[]>(['A2', 'B1'])
const mode = ref<QuestionMode>('pick')

type CountPreset = 10 | 15 | 20 | 'all'
const preset = ref<CountPreset>(10)

interface Stored {
  levels?: DirectionLevel[]
  mode?: QuestionMode
  preset?: CountPreset
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const s = JSON.parse(raw) as Stored
    if (s.levels) levels.value = s.levels.filter(l => (DIRECTION_LEVELS as readonly string[]).includes(l))
    if (s.mode === 'pick' || s.mode === 'type') mode.value = s.mode
    if (s.preset !== undefined) preset.value = s.preset
  } catch { /* ignore */ }
}

function save() {
  try {
    const payload: Stored = { levels: levels.value, mode: mode.value, preset: preset.value }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch { /* ignore */ }
}

onMounted(load)
watch([levels, mode, preset], save, { deep: true })

const availableItems = computed(() => filterQuestionItems({ levels: levels.value }).length)

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
    name: 'directionwords-questions-run',
    query: {
      count: String(effectiveCount.value),
      levels: levels.value.join(','),
      mode: mode.value,
    },
  })
}
</script>

<template>
  <div class="page setup-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Modul · hin &amp; her · Fragewörter</div>
        <h1 class="section-title">Wo, wohin or woher?<em>.</em></h1>
        <p class="section-subtitle">
          Three ways to ask "where" — <em>wo</em> for a place, <em>wohin</em> for a
          goal, <em>woher</em> for an origin — plus the pointers that answer them
          (<em>dahin, dorthin, hierher, daher</em>) and the spoken splits that move
          <em>hin</em> or <em>her</em> to the end of the sentence (<em>Wo gehst du hin?</em>).
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
      <div class="field-label">Answer mode</div>
      <div class="segmented">
        <button :class="{ active: mode === 'pick' }" @click="mode = 'pick'">Pick</button>
        <button :class="{ active: mode === 'type' }" @click="mode = 'type'">Type</button>
      </div>
      <p class="micro-mark grading-hint">
        {{ mode === 'pick'
          ? 'Pick the correct question word or pointer from the options shown.'
          : 'Type the question word or pointer — dahin and dorthin both count where both fit.' }}
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
