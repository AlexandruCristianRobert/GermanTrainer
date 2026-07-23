<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { filterKorrelatItems, KORRELAT_KINDS } from '../../composables/useDaKorrelatQuiz'
import { COLLOCATION_LEVELS, type CollocationLevel } from '../../data/collocations'
import type { KorrelatStatus } from '../../data/daKorrelat'

const STORAGE_KEY = 'dacKorrelatSetup'
const router = useRouter()

const KIND_LABEL: Record<KorrelatStatus, string> = {
  obligatory: 'obligatorisch',
  optional: 'fakultativ',
  excluded: 'ausgeschlossen',
}

const levels = ref<CollocationLevel[]>(['B1', 'B2'])
const kinds  = ref<KorrelatStatus[]>([...KORRELAT_KINDS])

type CountPreset = 10 | 15 | 20 | 'all'
const preset = ref<CountPreset>(10)

interface Stored {
  levels?: CollocationLevel[]
  kinds?: KorrelatStatus[]
  preset?: CountPreset
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const s = JSON.parse(raw) as Stored
    if (s.levels) levels.value = s.levels.filter(l => (COLLOCATION_LEVELS as readonly string[]).includes(l))
    if (s.kinds)  kinds.value  = s.kinds.filter(k => (KORRELAT_KINDS as readonly string[]).includes(k))
    if (s.preset !== undefined) preset.value = s.preset
  } catch { /* ignore */ }
}

function save() {
  try {
    const payload: Stored = { levels: levels.value, kinds: kinds.value, preset: preset.value }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch { /* ignore */ }
}

onMounted(load)
watch([levels, kinds, preset], save, { deep: true })

const availableItems = computed(() =>
  filterKorrelatItems({ levels: levels.value, kinds: kinds.value }).length
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
    name: 'dacompounds-korrelat-run',
    query: {
      count: String(effectiveCount.value),
      levels: levels.value.join(','),
      kinds: kinds.value.join(','),
    }
  })
}
</script>

<template>
  <div class="page setup-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Modul · Pronominaladverbien · Korrelat</div>
        <h1 class="section-title">Korrelat<em>.</em></h1>
        <p class="section-subtitle">
          Before a dass-/ob-/w-/zu-clause, some verbs demand a da-compound
          (bestehen <strong>darauf</strong>, dass …), some make it optional
          (sich <strong>(darüber)</strong> freuen, dass …), and some forbid it
          entirely (wissen, dass … — never *darüber). Pick the compound, or
          "kein Korrelat" when nothing belongs.
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
        <div class="field-label">Status · {{ kinds.length }} of {{ KORRELAT_KINDS.length }}</div>
        <div class="field-actions">
          <button class="btn btn-quiet" type="button" @click="kinds = [...KORRELAT_KINDS]">All</button>
          <button class="btn btn-quiet" type="button" @click="kinds = []">None</button>
        </div>
      </div>
      <div class="chip-row">
        <button
          v-for="k in KORRELAT_KINDS" :key="k"
          class="chip" :class="{ selected: kinds.includes(k) }"
          @click="kinds = toggle(kinds, k)"
        >{{ KIND_LABEL[k] }}</button>
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
      <button class="btn btn-ghost" type="button" @click="router.push({ name: 'dacompounds' })">← Back</button>
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
