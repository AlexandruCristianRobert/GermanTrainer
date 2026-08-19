<script setup lang="ts">
// Relativsätze setup — structurally the dative module's FreeSetup.vue: level and
// kind chips persisted to localStorage, count preset handed to the runner via
// the query string. This module has no separate Home page, so this IS the
// landing page for route 'relativ'.
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  filterRelativItems, RELATIV_KINDS, RELATIV_KIND_LABEL, RELATIV_LEVELS,
  type RelativLevel,
} from '../../data/relativItems'

const STORAGE_KEY = 'relativSetup'
const router = useRouter()

const levels = ref<RelativLevel[]>([...RELATIV_LEVELS])
const kinds = ref<string[]>([...RELATIV_KINDS])

type CountPreset = 10 | 15 | 20 | 'all'
const preset = ref<CountPreset>(10)

interface Stored {
  levels?: RelativLevel[]
  kinds?: string[]
  preset?: CountPreset
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const s = JSON.parse(raw) as Stored
    if (s.levels) levels.value = s.levels.filter(l => (RELATIV_LEVELS as readonly string[]).includes(l))
    if (s.kinds) kinds.value = s.kinds.filter(k => (RELATIV_KINDS as readonly string[]).includes(k))
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
  filterRelativItems({ levels: levels.value, kinds: kinds.value }).length
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
    name: 'relativ-run',
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
        <div class="breadcrumb">Kapitel XV · Relativsätze</div>
        <h1 class="section-title">Relativsätze<em>.</em></h1>
        <p class="section-subtitle">
          Der Mann, ___ ich das Paket gegeben habe — the antecedent gives you gender and
          number, the role inside the relative clause gives you the case. Two questions,
          one pronoun.
        </p>
      </div>
    </header>

    <div class="field">
      <div class="field-row">
        <div class="field-label">Level · {{ levels.length }} of {{ RELATIV_LEVELS.length }}</div>
        <div class="field-actions">
          <button class="btn btn-quiet" type="button" @click="levels = [...RELATIV_LEVELS]">All</button>
          <button class="btn btn-quiet" type="button" @click="levels = []">None</button>
        </div>
      </div>
      <div class="chip-row">
        <button
          v-for="l in RELATIV_LEVELS" :key="l"
          class="chip" :class="{ selected: levels.includes(l) }"
          @click="levels = toggle(levels, l)"
        >{{ l }}</button>
      </div>
    </div>

    <div class="field">
      <div class="field-row">
        <div class="field-label">Aufgabe · {{ kinds.length }} of {{ RELATIV_KINDS.length }}</div>
        <div class="field-actions">
          <button class="btn btn-quiet" type="button" @click="kinds = [...RELATIV_KINDS]">All</button>
          <button class="btn btn-quiet" type="button" @click="kinds = []">None</button>
        </div>
      </div>
      <div class="chip-row">
        <button
          v-for="k in RELATIV_KINDS" :key="k"
          class="chip" :class="{ selected: kinds.includes(k) }"
          @click="kinds = toggle(kinds, k)"
        >{{ RELATIV_KIND_LABEL[k] }}</button>
      </div>
    </div>

    <!-- The drill is only mechanical once both probes are explicit: the pronoun's
         FORM comes from two different places, and learners who miss that pick the
         antecedent's own case instead. -->
    <div class="alert alert-info rel-explainer">
      <span class="alert-label">How it works</span>
      <p>
        A relative pronoun answers <strong>two</strong> questions at once, and they have
        different sources. <em>Gender and number</em> come from the antecedent — the noun
        in front of the comma. <em>Case</em> comes from the pronoun's own role
        <em>inside the relative clause</em>, never from the antecedent's case.
      </p>
      <p>
        So run two probes in your head. First: „Der Mann“ — maskulin Singular. Second:
        what is he doing in the clause? Subject → <em>der</em>. Accusative object →
        <em>den</em>. Dative object, including the dative verbs
        (helfen, vertrauen, begegnen) → <em>dem</em>. Plural dative → <em>denen</em>.
      </p>
      <p>
        <strong>Pronomen wählen</strong> — the plain case pick. ·
        <strong>dessen / deren</strong> — a genitive attribute on the noun that follows:
        <em>dessen</em> for maskulin/neutrum Singular, <em>deren</em> for feminin and all
        plurals („Der Autor, <em>dessen</em> Roman …“). ·
        <strong>Präposition + Pronomen</strong> — the preposition stays in the sentence and
        governs the case, so „mit ___ ich arbeite“ needs the dative form.
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
      <button class="btn btn-ghost" type="button" @click="router.push({ name: 'home' })">← Back</button>
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
.rel-explainer p { margin: 0 0 8px; }
.rel-explainer p:last-child { margin-bottom: 0; }
</style>
