<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { PREPOSITIONS } from '../../data/prepositions'

const STORAGE_KEY = 'prepTwoWaySetup'
const router = useRouter()

type CountPreset = 10 | 15 | 20 | 'all' | 'custom'
const count = ref<CountPreset>(10)
const customCount = ref(15)

interface Stored { count?: CountPreset; customCount?: number }

function loadStored(): Stored | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return null
    return p as Stored
  } catch { return null }
}
function saveStored(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      count: count.value,
      customCount: customCount.value
    } satisfies Stored))
  } catch { /* ignore */ }
}

onMounted(() => {
  const s = loadStored()
  if (!s) return
  if (s.count !== undefined) count.value = s.count
  if (typeof s.customCount === 'number' && s.customCount > 0) customCount.value = s.customCount
})
watch([count, customCount], saveStored, { deep: true })

const available = computed(() =>
  PREPOSITIONS.filter(p => p.case === 'two-way').reduce((sum, p) => sum + p.examples.length, 0)
)
const effective = computed(() => {
  if (count.value === 'all') return available.value
  if (count.value === 'custom') return Math.min(customCount.value, available.value)
  return Math.min(count.value, available.value)
})

function start() {
  if (available.value === 0) return
  router.push({
    name: 'prepositions-twoway-run',
    query: { count: String(effective.value) }
  })
}
function back() { router.push({ name: 'prepositions' }) }
</script>

<template>
  <div class="page setup-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Kapitel IV · Wechsel · Einrichtung</div>
        <h1 class="section-title">Setup<em>.</em></h1>
        <p class="section-subtitle">
          For the nine Wechselpräpositionen (<em>an · auf · hinter · in · neben · über · unter · vor · zwischen</em>),
          decide whether the sentence uses accusative (Wohin? motion) or dative (Wo? location).
        </p>
      </div>
    </header>

    <div class="field">
      <div class="field-label">Number of sentences</div>
      <div class="field-row count-row">
        <div class="segmented">
          <button :class="{ active: count === 10 }" @click="count = 10">10</button>
          <button :class="{ active: count === 15 }" @click="count = 15">15</button>
          <button :class="{ active: count === 20 }" @click="count = 20">20</button>
          <button :class="{ active: count === 'all' }" @click="count = 'all'">All · {{ available }}</button>
          <button :class="{ active: count === 'custom' }" @click="count = 'custom'">Custom</button>
        </div>
        <input
          v-if="count === 'custom'"
          class="input custom-count"
          type="number"
          :min="1"
          :max="available || 1"
          v-model.number="customCount"
        />
        <span class="micro-mark count-avail">{{ available }} examples available</span>
      </div>
    </div>

    <div class="alert alert-info">
      <span class="alert-label">Rule</span>
      Wechselpräpositionen take <strong>accusative</strong> when there's motion toward a destination
      (answers <em>Wohin?</em> — "Ich gehe <strong>in den</strong> Park"), and <strong>dative</strong>
      when describing a location (answers <em>Wo?</em> — "Ich bin <strong>in dem</strong> Park").
    </div>

    <div class="setup-actions">
      <button class="btn btn-ghost" type="button" @click="back">← Back</button>
      <button class="btn btn-accent" type="button" :disabled="available === 0" @click="start">
        Start quiz · {{ effective }} sentences <span aria-hidden="true">→</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.setup-page { max-width: 720px; }
.field-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px; gap: 12px; flex-wrap: wrap; }
.count-row { align-items: center; gap: 12px; }
.custom-count { width: 80px; font-size: 17px; padding: 4px 0; }
.count-avail { margin-left: auto; }
.setup-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 40px; gap: 16px; }
@media (max-width: 720px) {
  .setup-actions { flex-direction: column-reverse; align-items: stretch; }
  .setup-actions .btn { justify-content: center; }
}
</style>
