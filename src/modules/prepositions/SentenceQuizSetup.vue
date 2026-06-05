<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { filterPrepositions } from '../../composables/usePrepositions'
import { PREPOSITION_CASES, type PrepCase } from '../../data/prepositions'
import { NOUN_GROUPS, type NounGroup } from '../../db/types'
import { useNouns } from '../../composables/useNouns'
import { useSettings } from '../../composables/useSettings'
import { useLoading } from '../../composables/useLoading'
import { useToast } from '../../composables/useToast'
import { resolveAiClient } from '../../composables/localClaude'
import {
  pickPrepositions, buildSpecs, nounToRef, generateSentences,
  type NounsPerSentence, type Direction, type GradingMode
} from '../../composables/useSentenceQuiz'

const STORAGE_KEY = 'prepSentenceSetup'
const STASH_KEY = 'gt:lastPrepSentenceQuiz'
const router = useRouter()

const { sampleByGroups, countsByGroup } = useNouns()
const { settings, canUseAi, load: loadSettings } = useSettings()
const loading = useLoading()
const toast = useToast()

const cases = ref<PrepCase[]>([...PREPOSITION_CASES])
const groups = ref<NounGroup[]>([])
type CountPreset = 10 | 15 | 20 | 25 | 'custom'
const count = ref<CountPreset>(10)
const customCount = ref(15)
const nounsPer = ref<NounsPerSentence>('mix')
const direction = ref<Direction>('en-de')
const gradingMode = ref<GradingMode>('exact')

const nounCounts = ref<Record<NounGroup, number>>(
  Object.fromEntries(NOUN_GROUPS.map(g => [g, 0])) as Record<NounGroup, number>
)
const generating = ref(false)

interface Stored {
  cases?: PrepCase[]
  groups?: NounGroup[]
  count?: CountPreset
  customCount?: number
  nounsPer?: NounsPerSentence
  direction?: Direction
  gradingMode?: GradingMode
}

function loadStored(): Stored | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const p = JSON.parse(raw)
    return p && typeof p === 'object' ? (p as Stored) : null
  } catch { return null }
}
function saveStored(): void {
  try {
    const payload: Stored = {
      cases: [...cases.value], groups: [...groups.value],
      count: count.value, customCount: customCount.value, nounsPer: nounsPer.value,
      direction: direction.value, gradingMode: gradingMode.value
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch { /* ignore */ }
}

onMounted(async () => {
  await loadSettings()
  nounCounts.value = await countsByGroup()

  const s = loadStored()
  if (s) {
    if (Array.isArray(s.cases)) cases.value = s.cases.filter(c => (PREPOSITION_CASES as readonly string[]).includes(c))
    if (Array.isArray(s.groups)) groups.value = s.groups.filter(g => (NOUN_GROUPS as readonly string[]).includes(g))
    if (s.count !== undefined) count.value = s.count
    if (typeof s.customCount === 'number' && s.customCount > 0) customCount.value = s.customCount
    if (s.nounsPer === 1 || s.nounsPer === 2 || s.nounsPer === 'mix') nounsPer.value = s.nounsPer
    if (s.direction === 'en-de' || s.direction === 'de-en') direction.value = s.direction
    if (s.gradingMode === 'ai' || s.gradingMode === 'exact') gradingMode.value = s.gradingMode
  }
  // Default theme: every group that actually has nouns.
  if (groups.value.length === 0) {
    groups.value = NOUN_GROUPS.filter(g => (nounCounts.value[g] ?? 0) > 0)
  }
})
watch([cases, groups, count, customCount, nounsPer, direction, gradingMode], saveStored, { deep: true })

const availablePreps = computed(() => filterPrepositions({ cases: cases.value }).length)
const effective = computed(() => count.value === 'custom' ? Math.max(1, customCount.value) : count.value)
const selectedNounTotal = computed(() => groups.value.reduce((sum, g) => sum + (nounCounts.value[g] ?? 0), 0))

const canStart = computed(() =>
  canUseAi.value && cases.value.length > 0 && availablePreps.value > 0 && selectedNounTotal.value > 0 && !generating.value
)

function toggle<T>(set: T[], v: T): T[] {
  const i = set.indexOf(v)
  return i >= 0 ? set.filter((_, j) => j !== i) : [...set, v]
}

async function start() {
  if (!canUseAi.value) {
    toast.error(
      settings.value.aiProvider === 'local-claude' ? 'Local Claude not reachable' : 'Gemini API key required',
      { description: settings.value.aiProvider === 'local-claude'
          ? 'Run the app with npm run dev, or switch to Gemini in Settings.'
          : 'Set your API key in Settings before generating sentences.' }
    )
    return
  }
  if (!canStart.value) return
  generating.value = true
  try {
    const n = effective.value
    const result = await loading.wrap(
      async () => {
        const client = resolveAiClient(settings.value)
        const nounPool = (await sampleByGroups(groups.value, 100000)).map(nounToRef)
        const pool = filterPrepositions({ cases: cases.value })
        const chosen = pickPrepositions(pool, n)
        const specs = buildSpecs(chosen, nounPool, nounsPer.value)
        return await generateSentences(client, { model: settings.value.model, specs, maxRetries: 2 })
      },
      {
        title: 'Generating sentences',
        subtitle: `Asking Gemini for ${n} preposition sentence${n === 1 ? '' : 's'}. This usually takes 30–90 seconds — please don't close the tab.`
      }
    )
    if (result.sentences.length === 0) {
      toast.error('No sentences generated', { description: `The model returned ${result.rejected} item(s) but none passed validation. Try again or widen the case selection.` })
      return
    }
    if (result.sentences.length < n) {
      toast.info(`Generated ${result.sentences.length} of ${n}`, { description: `${result.rejected} rejected by the validator across ${result.attempts} attempt(s).` })
    } else {
      toast.success(`Generated ${result.sentences.length} sentences`, { description: `${result.attempts} attempt${result.attempts === 1 ? '' : 's'}.` })
    }
    sessionStorage.setItem(STASH_KEY, JSON.stringify({
      sentences: result.sentences,
      cases: cases.value,
      groups: groups.value,
      nounsPer: nounsPer.value,
      direction: direction.value,
      gradingMode: gradingMode.value
    }))
    router.push({ name: 'prepositions-sentence-run' })
  } catch (err) {
    toast.error('Generation failed', { description: err instanceof Error ? err.message : String(err) })
  } finally {
    generating.value = false
  }
}

function back() { router.push({ name: 'prepositions' }) }
</script>

<template>
  <div class="page setup-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Kapitel IV · Satzübersetzung · Einrichtung</div>
        <h1 class="section-title">Setup<em>.</em></h1>
        <p class="section-subtitle">
          Pick the cases to drill and a noun theme. The AI writes one English+German
          sentence per randomly chosen preposition — you read the English and type the German.
        </p>
      </div>
    </header>

    <div v-if="!canUseAi" class="alert alert-warning">
      <span class="alert-label">AI access needed</span>
      Set a Gemini API key, or pick <em>Local Claude (dev)</em>, in Settings.
    </div>

    <div class="field">
      <div class="field-row">
        <div class="field-label">Case · {{ cases.length }} of {{ PREPOSITION_CASES.length }}</div>
        <div class="field-actions">
          <button class="btn btn-quiet" type="button" @click="cases = [...PREPOSITION_CASES]">All</button>
          <button class="btn btn-quiet" type="button" @click="cases = []">None</button>
        </div>
      </div>
      <div class="chip-row">
        <button
          v-for="c in PREPOSITION_CASES" :key="c"
          class="chip"
          :class="{ selected: cases.includes(c) }"
          @click="cases = toggle(cases, c)"
        >{{ c }}</button>
      </div>
    </div>

    <div class="field">
      <div class="field-row">
        <div class="field-label">Theme · {{ groups.length }} group{{ groups.length === 1 ? '' : 's' }} · {{ selectedNounTotal }} nouns</div>
        <div class="field-actions">
          <button class="btn btn-quiet" type="button" @click="groups = NOUN_GROUPS.filter(g => (nounCounts[g] ?? 0) > 0)">All</button>
          <button class="btn btn-quiet" type="button" @click="groups = []">None</button>
        </div>
      </div>
      <div class="chip-row">
        <button
          v-for="g in NOUN_GROUPS" :key="g"
          class="chip"
          :class="{ selected: groups.includes(g) }"
          :disabled="(nounCounts[g] ?? 0) === 0"
          @click="groups = toggle(groups, g)"
        >
          <span>{{ g }}</span>
          <span class="chip-count">{{ nounCounts[g] ?? 0 }}</span>
        </button>
      </div>
    </div>

    <div class="field">
      <div class="field-label">Direction</div>
      <div class="segmented">
        <button :class="{ active: direction === 'en-de' }" @click="direction = 'en-de'">English → German</button>
        <button :class="{ active: direction === 'de-en' }" @click="direction = 'de-en'">German → English</button>
      </div>
    </div>

    <div class="field">
      <div class="field-label">Grading</div>
      <div class="segmented">
        <button :class="{ active: gradingMode === 'ai' }" @click="gradingMode = 'ai'">AI</button>
        <button :class="{ active: gradingMode === 'exact' }" @click="gradingMode = 'exact'">Exact match</button>
      </div>
      <p class="micro-mark grading-hint">
        {{ gradingMode === 'ai'
          ? 'An AI judges each answer, accepts valid alternatives, and gives a tip when you\'re wrong.'
          : 'Your answer must exactly match the reference translation (case, punctuation and spacing are ignored).' }}
      </p>
    </div>

    <div class="field">
      <div class="field-label">Nouns per sentence</div>
      <div class="segmented">
        <button :class="{ active: nounsPer === 1 }" @click="nounsPer = 1">1</button>
        <button :class="{ active: nounsPer === 2 }" @click="nounsPer = 2">2</button>
        <button :class="{ active: nounsPer === 'mix' }" @click="nounsPer = 'mix'">1–2 (mixed)</button>
      </div>
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
        <input
          v-if="count === 'custom'"
          class="input custom-count"
          type="number"
          :min="1"
          :max="50"
          v-model.number="customCount"
        />
        <span class="micro-mark count-avail">{{ availablePreps }} prepositions in pool</span>
      </div>
    </div>

    <div v-if="cases.length === 0" class="alert alert-warning">
      <span class="alert-label">Warning</span>
      Select at least one case.
    </div>
    <div v-else-if="selectedNounTotal === 0" class="alert alert-warning">
      <span class="alert-label">Warning</span>
      Select at least one theme group that has nouns.
    </div>

    <div class="alert alert-info">
      <span class="alert-label">How this drill works</span>
      We pick {{ effective }} preposition{{ effective === 1 ? '' : 's' }} at random (repeating if needed),
      hand each 1–2 nouns from your theme, and the AI writes a sentence pair.
      {{ direction === 'en-de'
        ? 'You\'ll read the English and type the German.'
        : 'You\'ll read the German and type the English.' }}
      {{ gradingMode === 'ai'
        ? 'An AI grades each answer and accepts valid alternatives.'
        : 'Answers are checked by exact match against the reference.' }}
    </div>

    <div class="setup-actions">
      <button class="btn btn-ghost" type="button" @click="back">← Back</button>
      <button
        class="btn btn-accent"
        type="button"
        :disabled="!canStart"
        @click="start"
      >Generate &amp; start · {{ effective }} sentence{{ effective === 1 ? '' : 's' }} <span aria-hidden="true">→</span></button>
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
.grading-hint { margin: 8px 0 0; }
.chip-count {
  margin-left: 6px;
  font-family: var(--font-mono);
  font-size: 11px;
  opacity: 0.6;
}
.link-btn {
  background: none; border: none; padding: 0; cursor: pointer;
  color: var(--accent, currentColor); text-decoration: underline; font: inherit;
}
.setup-actions {
  display: flex; justify-content: space-between; align-items: center;
  margin-top: 40px; gap: 16px;
}
@media (max-width: 720px) {
  .setup-actions { flex-direction: column-reverse; align-items: stretch; }
  .setup-actions .btn { justify-content: center; }
}
</style>
