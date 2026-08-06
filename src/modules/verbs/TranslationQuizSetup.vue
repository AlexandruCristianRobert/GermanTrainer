<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useVerbs } from '../../composables/useVerbs'
import type { TranslationDirection } from '../../composables/useVerbQuiz'
import { VERB_LEVELS, VERB_TYPES, VERB_CASES, migrateVerbLevels, type VerbLevel, type VerbType, type VerbCase } from '../../data/verbs'

const STORAGE_KEY = 'verbTransSetup'

const router = useRouter()
const { filter } = useVerbs()

const levels = ref<VerbLevel[]>([...VERB_LEVELS])
const types = ref<VerbType[]>([...VERB_TYPES])
const cases = ref<VerbCase[]>([...VERB_CASES])
const direction = ref<TranslationDirection>('en-de')
type CountPreset = 10 | 15 | 20 | 'all' | 'custom'
const count = ref<CountPreset>(10)
const customCount = ref(15)
type Variant = 'bedeutungsfeld' | 'praezise'
const variant = ref<Variant>('bedeutungsfeld')

interface Stored {
  levels?: VerbLevel[]
  types?: VerbType[]
  cases?: VerbCase[]
  direction?: TranslationDirection
  count?: CountPreset
  customCount?: number
  variant?: Variant
}

function loadStored(): Stored | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    return parsed as Stored
  } catch { return null }
}
function saveStored(): void {
  try {
    const payload: Stored = {
      levels: [...levels.value],
      types: [...types.value],
      cases: [...cases.value],
      direction: direction.value,
      count: count.value,
      customCount: customCount.value,
      variant: variant.value
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch { /* ignore */ }
}

onMounted(() => {
  const s = loadStored()
  if (!s) return
  if (Array.isArray(s.levels)) levels.value = migrateVerbLevels(s.levels)
  if (Array.isArray(s.types)) types.value = s.types.filter(t => (VERB_TYPES as readonly string[]).includes(t))
  if (Array.isArray(s.cases)) cases.value = s.cases.filter(c => (VERB_CASES as readonly string[]).includes(c))
  if (s.direction === 'de-en' || s.direction === 'en-de') direction.value = s.direction
  if (s.count !== undefined) count.value = s.count
  if (typeof s.customCount === 'number' && s.customCount > 0) customCount.value = s.customCount
  if (s.variant === 'praezise' || s.variant === 'bedeutungsfeld') variant.value = s.variant
})

watch([levels, types, cases, direction, count, customCount, variant], saveStored, { deep: true })

const available = computed(() => filter({ levels: levels.value, types: types.value, cases: cases.value }).length)
const effective = computed(() => {
  if (count.value === 'all') return available.value
  if (count.value === 'custom') return Math.min(customCount.value, available.value)
  return Math.min(count.value, available.value)
})

function toggle<T>(set: T[], v: T): T[] {
  const i = set.indexOf(v)
  if (i >= 0) return set.filter((_, j) => j !== i)
  return [...set, v]
}

function start() {
  if (available.value === 0) return
  router.push({
    name: 'verbs-translation-run',
    query: {
      count: String(effective.value),
      levels: levels.value.join(','),
      types: types.value.join(','),
      cases: cases.value.join(','),
      direction: direction.value,
      variant: variant.value
    }
  })
}

function back() { router.push({ name: 'verbs' }) }
</script>

<template>
  <div class="page setup-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Kapitel III · Übersetzen · Einrichtung</div>
        <h1 class="section-title">Setup<em>.</em></h1>
        <p class="section-subtitle">
          Filter the verb pool by level, type, and case. Then pick how many to drill.
        </p>
      </div>
    </header>

    <div class="field">
      <div class="field-label">Richtung</div>
      <div class="direction-row">
        <div class="segmented">
          <button :class="{ active: direction === 'en-de' }" @click="direction = 'en-de'">EN → DE</button>
          <button :class="{ active: direction === 'de-en' }" @click="direction = 'de-en'">DE → EN · Blatt</button>
        </div>
        <span class="micro-mark">{{ direction === 'en-de' ? 'Bedeutung → Verb' : 'das klassische Übungsblatt' }}</span>
      </div>
    </div>

    <div v-if="direction === 'en-de'" class="field">
      <div class="field-label">Variante</div>
      <div class="direction-row">
        <div class="segmented">
          <button :class="{ active: variant === 'bedeutungsfeld' }" @click="variant = 'bedeutungsfeld'">Bedeutungsfeld</button>
          <button :class="{ active: variant === 'praezise' }" @click="variant = 'praezise'">Präzise</button>
        </div>
        <span class="micro-mark">{{ variant === 'praezise' ? 'die Situation verlangt ihr genaues Verb' : 'eine Bedeutung, alle ihre Verben' }}</span>
      </div>
    </div>

    <div class="field">
      <div class="field-row">
        <div class="field-label">Level · {{ levels.length }} of {{ VERB_LEVELS.length }}</div>
        <div class="field-actions">
          <button class="btn btn-quiet" type="button" @click="levels = [...VERB_LEVELS]">All</button>
          <button class="btn btn-quiet" type="button" @click="levels = []">None</button>
        </div>
      </div>
      <div class="chip-row">
        <button
          v-for="l in VERB_LEVELS" :key="l"
          class="chip"
          :class="{ selected: levels.includes(l) }"
          @click="levels = toggle(levels, l)"
        >{{ l }}</button>
      </div>
    </div>

    <div class="field">
      <div class="field-row">
        <div class="field-label">Type · {{ types.length }} of {{ VERB_TYPES.length }}</div>
        <div class="field-actions">
          <button class="btn btn-quiet" type="button" @click="types = [...VERB_TYPES]">All</button>
          <button class="btn btn-quiet" type="button" @click="types = []">None</button>
        </div>
      </div>
      <div class="chip-row">
        <button
          v-for="t in VERB_TYPES" :key="t"
          class="chip"
          :class="{ selected: types.includes(t) }"
          @click="types = toggle(types, t)"
        >{{ t }}</button>
      </div>
    </div>

    <div class="field">
      <div class="field-row">
        <div class="field-label">Object case · {{ cases.length }} of {{ VERB_CASES.length }}</div>
        <div class="field-actions">
          <button class="btn btn-quiet" type="button" @click="cases = [...VERB_CASES]">All</button>
          <button class="btn btn-quiet" type="button" @click="cases = []">None</button>
        </div>
      </div>
      <div class="chip-row">
        <button
          v-for="c in VERB_CASES" :key="c"
          class="chip"
          :class="{ selected: cases.includes(c) }"
          @click="cases = toggle(cases, c)"
        >{{ c }}</button>
      </div>
    </div>

    <div class="field">
      <div class="field-label">Number of verbs</div>
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
        <span class="micro-mark count-avail">{{ available }} verbs match</span>
      </div>
    </div>

    <div v-if="available === 0" class="alert alert-warning">
      <span class="alert-label">Warning</span>
      No verbs match the selected filters. Widen them to begin.
    </div>

    <div class="alert alert-info">
      <span class="alert-label">Acceptance</span>
      <template v-if="direction === 'de-en'">
        Answers ignore case &amp; whitespace. A leading "to" is optional. Slash-separated alternatives are all accepted — e.g. "to go / to walk" matches either.
      </template>
      <template v-else-if="variant === 'praezise'">
        Die Bedeutung kommt mit ihrer Situation — nur das Verb, das genau dazu passt, zählt; seine Geschwister aus anderen Situationen nicht. Passen mehrere Verben gleichermaßen, zählt jedes. Ein Verb mit mehreren Lesarten bringt mehrere Karten mit — das Deck kann also etwas größer sein als die gewählte Verbenzahl.
      </template>
      <template v-else>
        Gezeigt wird die Bedeutung — jedes deutsche Verb, das sie trägt, zählt. Bei reflexiven Verben ist „sich" optional. Wer mehr Verben desselben Feldes kennt, sammelt sie als Bonus.
      </template>
    </div>

    <div class="setup-actions">
      <button class="btn btn-ghost" type="button" @click="back">← Back</button>
      <button
        class="btn btn-accent btn-meta"
        type="button"
        :disabled="available === 0"
        @click="start"
      >
        <span class="bm-main">Start quiz <span aria-hidden="true">→</span></span>
        <span class="bm-sub">{{ effective }} {{ direction === 'de-en' ? 'verbs' : variant === 'praezise' ? 'Verben · Präzise' : 'Bedeutungsfelder' }}</span>
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
.direction-row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.custom-count { width: 80px; font-size: 17px; padding: 4px 0; }
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
