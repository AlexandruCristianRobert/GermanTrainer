<script setup lang="ts">
// N-Deklination setup — same shape as the dative module's FreeSetup.vue. No
// separate module Home: this is the landing page for route 'ndekl'.
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  filterNDeklItems, NDEKL_KINDS, NDEKL_KIND_LABEL, NDEKL_LEVELS,
  type NDeklLevel,
} from '../../data/nDeklination'

const STORAGE_KEY = 'ndeklSetup'
const router = useRouter()

const levels = ref<NDeklLevel[]>([...NDEKL_LEVELS])
const kinds = ref<string[]>([...NDEKL_KINDS])

type CountPreset = 10 | 15 | 20 | 'all'
const preset = ref<CountPreset>(10)

interface Stored {
  levels?: NDeklLevel[]
  kinds?: string[]
  preset?: CountPreset
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const s = JSON.parse(raw) as Stored
    if (s.levels) levels.value = s.levels.filter(l => (NDEKL_LEVELS as readonly string[]).includes(l))
    if (s.kinds) kinds.value = s.kinds.filter(k => (NDEKL_KINDS as readonly string[]).includes(k))
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
  filterNDeklItems({ levels: levels.value, kinds: kinds.value }).length
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
    name: 'ndekl-run',
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
        <div class="breadcrumb">Kapitel XVI · N-Deklination</div>
        <h1 class="section-title">N-Deklination<em>.</em></h1>
        <p class="section-subtitle">
          den Kollegen, dem Studenten, des Namens — a closed class of masculine nouns that
          carry -(e)n in every case but one. Type the form, or decide whether the noun
          belongs to the class at all.
        </p>
      </div>
    </header>

    <div class="field">
      <div class="field-row">
        <div class="field-label">Level · {{ levels.length }} of {{ NDEKL_LEVELS.length }}</div>
        <div class="field-actions">
          <button class="btn btn-quiet" type="button" @click="levels = [...NDEKL_LEVELS]">All</button>
          <button class="btn btn-quiet" type="button" @click="levels = []">None</button>
        </div>
      </div>
      <div class="chip-row">
        <button
          v-for="l in NDEKL_LEVELS" :key="l"
          class="chip" :class="{ selected: levels.includes(l) }"
          @click="levels = toggle(levels, l)"
        >{{ l }}</button>
      </div>
    </div>

    <div class="field">
      <div class="field-row">
        <div class="field-label">Aufgabe · {{ kinds.length }} of {{ NDEKL_KINDS.length }}</div>
        <div class="field-actions">
          <button class="btn btn-quiet" type="button" @click="kinds = [...NDEKL_KINDS]">All</button>
          <button class="btn btn-quiet" type="button" @click="kinds = []">None</button>
        </div>
      </div>
      <div class="chip-row">
        <button
          v-for="k in NDEKL_KINDS" :key="k"
          class="chip" :class="{ selected: kinds.includes(k) }"
          @click="kinds = toggle(kinds, k)"
        >{{ NDEKL_KIND_LABEL[k] }}</button>
      </div>
    </div>

    <!-- Both traps in one place: the rule's single exception (Nominativ Singular)
         and the -ns pair, plus what the classify card actually means by "stark". -->
    <div class="alert alert-info nd-explainer">
      <span class="alert-label">How it works</span>
      <p>
        <strong>Weak masculines</strong> (die N-Deklination) take <strong>-(e)n</strong> in
        <em>every</em> case except the Nominativ Singular. So: der Kollege, but
        <em>den</em> Kollege<strong>n</strong>, <em>dem</em> Kollege<strong>n</strong>,
        <em>des</em> Kollege<strong>n</strong> — and no -s in the genitive, which is the
        ending learners reach for first. The class is closed: mostly -e persons
        (Kollege, Zeuge, Junge, Löwe) and the stressed foreign suffixes
        -ent, -ant, -ist, -at, -graf, -loge, -soph (Student, Praktikant, Polizist,
        Soldat, Fotograf, Biologe, Philosoph), plus Herr, Nachbar, Bauer, Mensch, Held.
      </p>
      <p>
        <strong>Two irregulars</strong> break the pattern in the genitive:
        <em>der Name → des Namens</em> and <em>das Herz → des Herzens</em>. Herz has a
        second quirk — its accusative stays bare: <em>das Herz</em>.
      </p>
      <p>
        <strong>Form tippen</strong> — the sentence shows the case, the bracket shows the
        lemma; you type just the noun form. ·
        <strong>Schwach oder stark?</strong> — the noun is already inflected in the
        sentence; decide whether it belongs to the class. <em>stark (endungslos)</em> means
        an ordinary masculine that keeps its bare form through the whole singular
        (den Lehrer, dem Arzt, den Wagen) — those are exactly the ones that get
        over-inflected once the -n rule sinks in.
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
.nd-explainer p { margin: 0 0 8px; }
.nd-explainer p:last-child { margin-bottom: 0; }
</style>
