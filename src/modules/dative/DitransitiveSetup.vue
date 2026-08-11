<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { filterDitransitiveItems } from '../../composables/useDativeDrill'
import { DATIVE_DRILL_LEVELS, type DativeDrillLevel } from '../../data/dativeExperiencer'
import type { DitransitiveItem } from '../../data/dativeDitransitive'

const STORAGE_KEY = 'datDitransSetup'
const router = useRouter()

type GapRole = DitransitiveItem['gapRole']
const ROLES: GapRole[] = ['dative', 'accusative']
const ROLE_LABELS: Record<GapRole, string> = {
  dative: 'Dativ-Lücke',
  accusative: 'Akkusativ-Lücke',
}

const levels = ref<DativeDrillLevel[]>(['A2', 'B1'])
const roles = ref<string[]>([...ROLES])

type CountPreset = 10 | 15 | 20 | 'all'
const preset = ref<CountPreset>(10)

interface Stored {
  levels?: DativeDrillLevel[]
  roles?: string[]
  preset?: CountPreset
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const s = JSON.parse(raw) as Stored
    if (s.levels) levels.value = s.levels.filter(l => (DATIVE_DRILL_LEVELS as readonly string[]).includes(l))
    if (s.roles) roles.value = s.roles.filter(r => (ROLES as readonly string[]).includes(r))
    if (s.preset !== undefined) preset.value = s.preset
  } catch { /* ignore */ }
}

function save() {
  try {
    const payload: Stored = { levels: levels.value, roles: roles.value, preset: preset.value }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch { /* ignore */ }
}

onMounted(load)
watch([levels, roles, preset], save, { deep: true })

const availableItems = computed(() =>
  filterDitransitiveItems({ levels: levels.value, roles: roles.value }).length
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
    name: 'dative-ditransitive-run',
    query: {
      count: String(effectiveCount.value),
      levels: levels.value.join(','),
      roles: roles.value.join(','),
    },
  })
}
</script>

<template>
  <div class="page setup-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Kapitel XIII · Dativ · Welches Objekt?</div>
        <h1 class="section-title">Welches Objekt?<em>.</em></h1>
        <p class="section-subtitle">
          <em>Ich schenke dem Bruder das Buch</em> — the person is dative, the thing
          accusative. Pick the article that fits the gapped object.
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
        <div class="field-label">Lücke · {{ roles.length }} of {{ ROLES.length }}</div>
        <div class="field-actions">
          <button class="btn btn-quiet" type="button" @click="roles = [...ROLES]">All</button>
          <button class="btn btn-quiet" type="button" @click="roles = []">None</button>
        </div>
      </div>
      <div class="chip-row">
        <button
          v-for="r in ROLES" :key="r"
          class="chip" :class="{ selected: roles.includes(r) }"
          @click="roles = toggle(roles, r)"
        >{{ ROLE_LABELS[r] }}</button>
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
