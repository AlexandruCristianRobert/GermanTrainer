<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { filterPassiveItems } from '../../composables/useDativeDrill'
import { DATIVE_DRILL_LEVELS, type DativeDrillLevel } from '../../data/dativeExperiencer'
import type { PassiveItem } from '../../data/dativeConsequences'

const STORAGE_KEY = 'datPassiveSetup'
const router = useRouter()

type PassiveKind = PassiveItem['kind']
const KINDS: PassiveKind[] = ['transform', 'agreement', 'es']
const KIND_LABELS: Record<PassiveKind, string> = {
  transform: 'Aktiv → Passiv',
  agreement: 'wird oder werden?',
  es: 'Wohin mit es?',
}

const levels = ref<DativeDrillLevel[]>(['B2', 'C1'])
const kinds = ref<string[]>([...KINDS])

type CountPreset = 10 | 15 | 20 | 'all'
const preset = ref<CountPreset>(10)

interface Stored {
  levels?: DativeDrillLevel[]
  kinds?: string[]
  preset?: CountPreset
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const s = JSON.parse(raw) as Stored
    if (s.levels) levels.value = s.levels.filter(l => (DATIVE_DRILL_LEVELS as readonly string[]).includes(l))
    if (s.kinds) kinds.value = s.kinds.filter(k => (KINDS as readonly string[]).includes(k))
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
  filterPassiveItems({ levels: levels.value, kinds: kinds.value }).length
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
    name: 'dative-passive-run',
    query: {
      count: String(effectiveCount.value),
      levels: levels.value.join(','),
      kinds: kinds.value.join(','),
    },
  })
}
</script>

<template>
  <div class="page setup-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Kapitel XIII · Dativ · Kein persönliches Passiv</div>
        <h1 class="section-title">Kein persönliches Passiv<em>.</em></h1>
        <p class="section-subtitle">
          Mir wird geholfen — never *Ich werde geholfen. With no accusative object nothing
          can become the subject: the dative survives, the verb freezes at third-person
          singular, and the dummy es vanishes the moment anything else takes first position.
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
        <div class="field-label">Aufgabe · {{ kinds.length }} of {{ KINDS.length }}</div>
        <div class="field-actions">
          <button class="btn btn-quiet" type="button" @click="kinds = [...KINDS]">All</button>
          <button class="btn btn-quiet" type="button" @click="kinds = []">None</button>
        </div>
      </div>
      <div class="chip-row">
        <button
          v-for="k in KINDS" :key="k"
          class="chip" :class="{ selected: kinds.includes(k) }"
          @click="kinds = toggle(kinds, k)"
        >{{ KIND_LABELS[k] }}</button>
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
