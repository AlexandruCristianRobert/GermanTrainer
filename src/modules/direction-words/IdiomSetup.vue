<script setup lang="ts">
// T9 setup — level chips + card count only; there is nothing else to filter,
// since DIRECTION_IDIOMS is authored standalone (no pool join). Mirrors
// LexicalSetup.vue.
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { filterIdiomItems } from '../../composables/useDwIdiomQuiz'
import { DIRECTION_LEVELS, type DirectionLevel } from '../../data/directionWords'

const STORAGE_KEY = 'dwIdiomSetup'
const router = useRouter()

// The bank carries no A2 content (idioms are B1 and above), so the default opens
// on the two levels that carry the most items.
const levels = ref<DirectionLevel[]>(['B1', 'B2'])

type CountPreset = 10 | 15 | 20 | 'all'
const preset = ref<CountPreset>(10)

interface Stored {
  levels?: DirectionLevel[]
  preset?: CountPreset
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const s = JSON.parse(raw) as Stored
    if (s.levels) levels.value = s.levels.filter(l => (DIRECTION_LEVELS as readonly string[]).includes(l))
    if (s.preset !== undefined) preset.value = s.preset
  } catch { /* ignore */ }
}

function save() {
  try {
    const payload: Stored = { levels: levels.value, preset: preset.value }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch { /* ignore */ }
}

onMounted(load)
watch([levels, preset], save, { deep: true })

// No chips selected means no level filtering at all (createPool treats an empty
// field as "every value"), which is exactly what the runner's csv() default
// produces from an empty levels param — so the count shown here is the count
// drilled either way.
const availableItems = computed(() => filterIdiomItems({ levels: levels.value }).length)

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
    name: 'directionwords-idioms-run',
    query: {
      count: String(effectiveCount.value),
      levels: levels.value.join(','),
    },
  })
}
</script>

<template>
  <div class="page setup-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Modul · hin &amp; her · Redewendungen</div>
        <h1 class="section-title">Idiom gap-fill<em>.</em></h1>
        <p class="section-subtitle">
          <em>hin und her</em> is back and forth; <em>hin und wieder</em> is now and then.
          <em>lange her</em> measures the time since, <em>noch lange hin</em> the time until.
          Fill each gap with the whole idiom — every option on the row is real German,
          just standing in the wrong slot.
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
      <p class="micro-mark grading-hint">
        Every sentence is B1 or above — the level grades how close the near-miss sits, not the vocabulary.
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
        <span class="micro-mark count-avail">{{ availableItems }} sentences match</span>
      </div>
    </div>

    <div v-if="availableItems === 0" class="alert alert-warning">
      <span class="alert-label">Warning</span>
      No sentences match the selected levels.
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
