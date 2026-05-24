<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { PRONOUNS, PRONOUN_CATEGORIES, type PronounCategory } from '../../data/pronouns'

const STORAGE_KEY = 'declPronounSetup'
const DATASET_MAX = PRONOUNS.length
const router = useRouter()

const categories = ref<PronounCategory[]>([...PRONOUN_CATEGORIES])
type CountPreset = 10 | 15 | 'all' | 'custom'
const count = ref<CountPreset>(10)
const customCount = ref(15)

interface Stored {
  categories?: PronounCategory[]
  count?: CountPreset
  customCount?: number
}

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
    const payload: Stored = {
      categories: [...categories.value],
      count: count.value,
      customCount: customCount.value
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch { /* ignore */ }
}

onMounted(() => {
  const s = loadStored()
  if (!s) return
  if (Array.isArray(s.categories)) categories.value = s.categories.filter(c => (PRONOUN_CATEGORIES as readonly string[]).includes(c))
  if (s.count !== undefined) count.value = s.count
  if (typeof s.customCount === 'number' && s.customCount > 0) customCount.value = s.customCount
})
watch([categories, count, customCount], saveStored, { deep: true })

const available = computed(() =>
  PRONOUNS.filter(p => categories.value.includes(p.category)).length
)

const effective = computed(() => {
  const cap = Math.min(available.value, DATASET_MAX)
  if (count.value === 'all') return cap
  if (count.value === 'custom') return Math.min(customCount.value, cap)
  return Math.min(count.value, cap)
})

function toggle<T>(set: T[], v: T): T[] {
  const i = set.indexOf(v)
  if (i >= 0) return set.filter((_, j) => j !== i)
  return [...set, v]
}

function start() {
  if (available.value === 0) return
  router.push({
    name: 'declension-pronoun-run',
    query: {
      count: String(effective.value),
      categories: categories.value.join(',')
    }
  })
}

function back() { router.push({ name: 'declension' }) }
</script>

<template>
  <div class="page setup-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Kapitel V · Pronomen · Einrichtung</div>
        <h1 class="section-title">Setup<em>.</em></h1>
        <p class="section-subtitle">
          Pick which pronoun categories to drill, then how many to type.
        </p>
      </div>
    </header>

    <div class="field">
      <div class="field-row">
        <div class="field-label">Category · {{ categories.length }} of {{ PRONOUN_CATEGORIES.length }}</div>
        <div class="field-actions">
          <button class="btn btn-quiet" type="button" @click="categories = [...PRONOUN_CATEGORIES]">All</button>
          <button class="btn btn-quiet" type="button" @click="categories = []">None</button>
        </div>
      </div>
      <div class="chip-row">
        <button
          v-for="c in PRONOUN_CATEGORIES" :key="c"
          class="chip"
          :class="{ selected: categories.includes(c) }"
          @click="categories = toggle(categories, c)"
        >{{ c }}</button>
      </div>
    </div>

    <div class="field">
      <div class="field-label">Number of pronouns</div>
      <div class="field-row count-row">
        <div class="segmented">
          <button :class="{ active: count === 10 }" @click="count = 10">10</button>
          <button :class="{ active: count === 15 }" @click="count = 15">15</button>
          <button :class="{ active: count === 'all' }" @click="count = 'all'">All · {{ available }}</button>
          <button :class="{ active: count === 'custom' }" @click="count = 'custom'">Custom</button>
        </div>
        <input
          v-if="count === 'custom'"
          class="input custom-count"
          type="number"
          :min="1"
          :max="Math.min(available, DATASET_MAX) || 1"
          v-model.number="customCount"
        />
        <span class="micro-mark count-avail">{{ available }} match</span>
      </div>
    </div>

    <div v-if="available === 0" class="alert alert-warning">
      <span class="alert-label">Warning</span>
      No pronouns match the selected categories.
    </div>

    <div class="alert alert-info">
      <span class="alert-label">How this drill works</span>
      Type all four case forms for each pronoun. Reflexive nominative + genitive are skipped (— shown).
    </div>

    <div class="setup-actions">
      <button class="btn btn-ghost" type="button" @click="back">← Back</button>
      <button
        class="btn btn-accent"
        type="button"
        :disabled="available === 0"
        @click="start"
      >Start quiz · {{ effective }} pronouns <span aria-hidden="true">→</span></button>
    </div>
  </div>
</template>

<style scoped>
.setup-page { max-width: 720px; }
.field-row {
  display: flex; justify-content: space-between; align-items: baseline;
  margin-bottom: 10px; gap: 12px; flex-wrap: wrap;
}
.field-actions { display: flex; gap: 4px; }
.count-row { align-items: center; gap: 12px; }
.custom-count { width: 80px; font-size: 17px; padding: 4px 0; }
.count-avail { margin-left: auto; }
.setup-actions {
  display: flex; justify-content: space-between; align-items: center;
  margin-top: 40px; gap: 16px;
}
@media (max-width: 720px) {
  .setup-actions { flex-direction: column-reverse; align-items: stretch; }
  .setup-actions .btn { justify-content: center; }
}
</style>
