<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { DA_COMPOUND_PREPOSITIONS, NO_COMPOUND_PREPOSITIONS } from '../../data/daCompounds'

const STORAGE_KEY = 'dacFormationSetup'
const router = useRouter()

const traps = ref(true)

type CountPreset = 10 | 15 | 20 | 'all'
const preset = ref<CountPreset>(10)

interface Stored {
  traps?: boolean
  preset?: CountPreset
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const s = JSON.parse(raw) as Stored
    if (typeof s.traps === 'boolean') traps.value = s.traps
    if (s.preset !== undefined) preset.value = s.preset
  } catch { /* ignore */ }
}

function save() {
  try {
    const payload: Stored = { traps: traps.value, preset: preset.value }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch { /* ignore */ }
}

onMounted(load)
watch([traps, preset], save)

const availableItems = computed(() =>
  traps.value
    ? DA_COMPOUND_PREPOSITIONS.length + NO_COMPOUND_PREPOSITIONS.length
    : DA_COMPOUND_PREPOSITIONS.length
)

const effectiveCount = computed(() =>
  preset.value === 'all' ? availableItems.value : Math.min(preset.value, availableItems.value)
)

function start() {
  router.push({
    name: 'dacompounds-formation-run',
    query: {
      count: String(effectiveCount.value),
      traps: traps.value ? '1' : '0',
    }
  })
}
</script>

<template>
  <div class="page setup-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Modul · Pronominaladverbien · Bildung</div>
        <h1 class="section-title">da- or dar-?<em>.</em></h1>
        <p class="section-subtitle">
          Speed round: for each preposition, decide whether it takes da-, dar-, or forms no
          compound at all. Includes the trap prepositions (*darohne) when the toggle is on.
        </p>
      </div>
    </header>

    <div class="field">
      <div class="field-label">Include no-compound traps</div>
      <div class="segmented">
        <button :class="{ active: traps }" @click="traps = true">On</button>
        <button :class="{ active: !traps }" @click="traps = false">Off</button>
      </div>
      <p class="micro-mark grading-hint">
        {{ traps
          ? 'Mixes in the eight prepositions that never form a da-compound (ohne, seit, außer …) — the answer for those is "no compound".'
          : 'Only the 19 compoundable prepositions — every answer is da- or dar-.' }}
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

    <div class="setup-actions">
      <button class="btn btn-ghost" type="button" @click="router.push({ name: 'dacompounds' })">← Back</button>
      <button class="btn btn-accent" type="button" @click="start">
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
