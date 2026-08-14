<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { filterFreeItems } from '../../composables/useDativeDrill'
import { DATIVE_DRILL_LEVELS, type DativeDrillLevel } from '../../data/dativeExperiencer'

const STORAGE_KEY = 'datFreeSetup'
const router = useRouter()

type FreeKind = 'drop' | 'classify'
const KINDS: FreeKind[] = ['drop', 'classify']
const KIND_LABELS: Record<FreeKind, string> = {
  drop: 'Weglassbar?',
  classify: 'Welche Lesart?',
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
  filterFreeItems({ levels: levels.value, kinds: kinds.value }).length
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
    name: 'dative-free-run',
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
        <div class="breadcrumb">Kapitel XIII · Dativ · Freier Dativ</div>
        <h1 class="section-title">Freier Dativ<em>.</em></h1>
        <p class="section-subtitle">
          Ich trage dir den Koffer — drop the dative and the sentence survives; drop a dative
          verb's object and it collapses. Benefit, possession, or pure emotion: learn the three
          free readings and the test that separates them from real objects.
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
        <div class="field-label">Aufgabe · {{ kinds.length }} of 2</div>
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

    <!-- The drill is opaque without the drop test — spell out both card kinds and
         the three readings right where the Aufgabe chips are chosen. -->
    <div class="alert alert-info fd-explainer">
      <span class="alert-label">How it works</span>
      <p>
        A <strong>free dative</strong> is an extra dative the verb never asked for. The test:
        delete it, and the sentence still stands — „Ich trage <em>dir</em> den Koffer“ works
        without <em>dir</em>. A dative <em>verb’s</em> object can’t do that: „Der Koffer gehört“
        collapses without its dative. Every card shows a sentence, quotes one dative phrase,
        and asks about exactly that phrase.
      </p>
      <p>
        <strong>Weglassbar?</strong> — Delete the quoted phrase in your head. Sentence still
        complete → answer <em>weglassbar</em> (a free dative). Sentence breaks →
        <em>obligatorisch</em> (the verb’s own object).
      </p>
      <p>
        <strong>Welche Lesart?</strong> — Here the quoted dative is already a free one; name
        which of the three readings it has:
        <em>Vorteil (commodi)</em> = for whose benefit it happens („Ich trage dir den Koffer“ ≈ für dich) ·
        <em>Besitz (possessivus)</em> = whose body part or belonging („Wasch dir die Hände“ = deine Hände) ·
        <em>Anteilnahme (ethicus)</em> = only the speaker’s emotional stake, almost always
        mir/dir („Werd mir bloß nicht krank!“).
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

<style scoped>
.fd-explainer p { margin: 0 0 8px; }
.fd-explainer p:last-child { margin-bottom: 0; }
</style>
