<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSettings } from '../../composables/useSettings'
import { useToast } from '../../composables/useToast'
import { loadHistory } from '../../composables/useQuizHistory'
import { DATIVE_FAMILIES, FAMILY_LABELS, type DativeFamily } from '../../composables/useDativeDrill'
import { dativeVerbsBy } from '../../data/dativeVerbs'
import { buildDativeSentenceSpecs } from '../../composables/useDativeSentenceQuiz'
import { weakestDativeVerbs } from '../../composables/useDativeStats'

const STORAGE_KEY = 'datSentenceSetup'
const STASH_KEY = 'datSentenceStash'
const router = useRouter()
const route = useRoute()
const { settings, canUseAi, load: loadSettings } = useSettings()
const toast = useToast()

const families = ref<DativeFamily[]>([...DATIVE_FAMILIES])
const focus = ref<'all' | 'weak'>('all')
type CountPreset = 10 | 15 | 20 | 25 | 'custom'
const count = ref<CountPreset>(10)
const customCount = ref(15)

interface Stored {
  families?: DativeFamily[]; focus?: 'all' | 'weak'
  count?: CountPreset; customCount?: number
}
function loadStored(): Stored | null {
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) as Stored : null } catch { return null }
}
function saveStored(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      families: [...families.value], focus: focus.value,
      count: count.value, customCount: customCount.value
    } satisfies Stored))
  } catch { /* ignore */ }
}

const weakVerbs = ref<string[]>([])

onMounted(async () => {
  await loadSettings()
  const s = loadStored()
  if (s) {
    if (Array.isArray(s.families)) families.value = s.families.filter(f => (DATIVE_FAMILIES as readonly string[]).includes(f))
    if (s.focus === 'all' || s.focus === 'weak') focus.value = s.focus
    if (s.count !== undefined) count.value = s.count
    if (typeof s.customCount === 'number' && s.customCount > 0) customCount.value = s.customCount
  }
  if (families.value.length === 0) families.value = [...DATIVE_FAMILIES]
  // Remedial deep link: the hub / stats surfaces can send ?focus=weak.
  if (route.query.focus === 'weak') focus.value = 'weak'
  weakVerbs.value = weakestDativeVerbs(loadHistory())
})
watch([families, focus, count, customCount], saveStored, { deep: true })

const effective = computed(() => count.value === 'custom' ? Math.max(1, customCount.value) : count.value)
const familyPool = computed(() => families.value.flatMap(f => dativeVerbsBy(f)))
const weakPool = computed(() => weakVerbs.value.filter(v => familyPool.value.includes(v)))
/** Weak focus narrows the bag to the weakest verbs; with no recorded misses it falls back to the whole pool. */
const effectiveFocus = computed<'all' | 'weak'>(() => focus.value === 'weak' && weakPool.value.length > 0 ? 'weak' : 'all')
const pool = computed(() => effectiveFocus.value === 'weak' ? weakPool.value : familyPool.value)
const canStart = computed(() => canUseAi.value && families.value.length > 0 && pool.value.length > 0)

function toggle<T>(set: T[], v: T): T[] {
  const i = set.indexOf(v); return i >= 0 ? set.filter((_, j) => j !== i) : [...set, v]
}

function start() {
  if (!canUseAi.value) {
    toast.error(
      settings.value.aiProvider === 'local-claude' ? 'Local Claude not reachable' : 'Gemini API key required',
      { description: 'Set your API key (or pick Local Claude) in Settings before generating sentences.' }
    )
    return
  }
  if (!canStart.value) return
  if (focus.value === 'weak' && weakPool.value.length === 0) {
    toast.info('No weak verbs yet', { description: 'No recorded misses to draw from — drilling the full pool instead.' })
  }
  const specs = buildDativeSentenceSpecs(pool.value, effective.value)
  sessionStorage.setItem(STASH_KEY, JSON.stringify({
    specs,
    families: families.value,
    focus: effectiveFocus.value
  }))
  router.push({ name: 'dative-sentence-run' })
}

function back() { router.push({ name: 'dative' }) }
</script>

<template>
  <div class="page setup-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Kapitel XIII · Dativ · Satzübersetzung · Einrichtung</div>
        <h1 class="section-title">Satzübersetzung<em>.</em></h1>
        <p class="section-subtitle">
          The AI writes English around your dative verbs — help, thank, like, follow —
          and you write the German. The grader names what slipped: case, subject, twin, or order.
        </p>
      </div>
    </header>

    <div v-if="!canUseAi" class="alert alert-warning">
      <span class="alert-label">AI access needed</span>
      Set a Gemini API key, or pick <em>Local Claude (dev)</em>, in Settings.
    </div>

    <div class="field">
      <div class="field-row">
        <div class="field-label">Familie · {{ families.length }} of {{ DATIVE_FAMILIES.length }}</div>
        <div class="field-actions">
          <button class="btn btn-quiet" type="button" @click="families = [...DATIVE_FAMILIES]">All</button>
          <button class="btn btn-quiet" type="button" @click="families = []">None</button>
        </div>
      </div>
      <div class="chip-row">
        <button v-for="f in DATIVE_FAMILIES" :key="f" class="chip" :class="{ selected: families.includes(f) }" @click="families = toggle(families, f)">
          {{ FAMILY_LABELS[f] }}
        </button>
      </div>
    </div>

    <div class="field">
      <div class="field-label">Schwerpunkt</div>
      <div class="segmented">
        <button :class="{ active: focus === 'all' }" @click="focus = 'all'">Alle Verben</button>
        <button :class="{ active: focus === 'weak' }" @click="focus = 'weak'">Schwache Verben</button>
      </div>
      <p v-if="focus === 'weak' && weakPool.length > 0" class="micro-mark grading-hint">
        Drills your recorded misses: {{ weakPool.join(', ') }}
      </p>
      <p v-else-if="focus === 'weak'" class="micro-mark grading-hint">
        No recorded misses yet — the round will draw from the full pool.
      </p>
    </div>

    <div class="field">
      <div class="field-label">Number of sentences</div>
      <div class="field-row count-row">
        <div class="segmented">
          <button :class="{ active: count === 10 }" @click="count = 10">10</button>
          <button :class="{ active: count === 15 }" @click="count = 15">15</button>
          <button :class="{ active: count === 20 }" @click="count = 20">20</button>
          <button :class="{ active: count === 25 }" @click="count = 25">25</button>
          <button :class="{ active: count === 'custom' }" @click="count = 'custom'">Custom</button>
        </div>
        <input v-if="count === 'custom'" class="input custom-count" type="number" :min="1" :max="50" v-model.number="customCount" />
      </div>
    </div>

    <div v-if="families.length === 0" class="alert alert-warning">
      <span class="alert-label">Warning</span>Select at least one semantic family.
    </div>

    <div class="alert alert-info">
      <span class="alert-label">How this drill works</span>
      We sample {{ effective }} spec{{ effective === 1 ? '' : 's' }} — one dative verb each, spread across
      your chosen families — then the AI writes the English sentences one batch at a time. You type the
      German; the AI grades it and tags every slip (case, subject, twin, object order). No word hints:
      choosing the dative verb over its accusative twin is part of the exercise.
    </div>

    <div class="setup-actions">
      <button class="btn btn-ghost" type="button" @click="back">← Back</button>
      <button class="btn btn-accent" type="button" :disabled="!canStart" @click="start">
        Start · {{ effective }} sentence{{ effective === 1 ? '' : 's' }} <span aria-hidden="true">→</span>
      </button>
    </div>
  </div>
</template>
