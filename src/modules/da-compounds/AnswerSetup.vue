<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useNouns } from '../../composables/useNouns'
import { useSettings } from '../../composables/useSettings'
import { useToast } from '../../composables/useToast'
import { COLLOCATION_LEVELS, COLLOCATION_ROLES, type CollocationLevel, type CollocationRole } from '../../data/collocations'
import { filterCollocations } from '../../composables/useCollocations'
import { SUBSTITUTION_PREPS } from '../../composables/useDaSubstitutionQuiz'
import { NOUN_GROUPS, type NounGroup } from '../../db/types'
import { nounToRef } from '../../composables/useSentenceQuiz'
import { collocToRef, buildDacSpecs, dacLevelLabel } from '../../composables/useDaAnswerQuiz'

const STORAGE_KEY = 'dacAnswerSetup'
const STASH_KEY = 'gt:lastDacAnswerQuiz'
const router = useRouter()

const { sampleByGroups, countsByGroup } = useNouns()
const { settings, canUseAi, load: loadSettings } = useSettings()
const toast = useToast()

const levels = ref<CollocationLevel[]>(['B1', 'B2'])
const roles = ref<CollocationRole[]>([...COLLOCATION_ROLES])
const preps = ref<string[]>([...SUBSTITUTION_PREPS])
const groups = ref<NounGroup[]>([])
const nounsPer = ref<1 | 2 | 'mix'>('mix')
type CountPreset = 10 | 15 | 20 | 25 | 'custom'
const count = ref<CountPreset>(10)
const customCount = ref(15)

const nounCounts = ref<Record<NounGroup, number>>(
  Object.fromEntries(NOUN_GROUPS.map(g => [g, 0])) as Record<NounGroup, number>
)

interface Stored {
  levels?: CollocationLevel[]; roles?: CollocationRole[]; preps?: string[]; groups?: NounGroup[]
  nounsPer?: 1 | 2 | 'mix'; count?: CountPreset; customCount?: number
}
function loadStored(): Stored | null {
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) as Stored : null } catch { return null }
}
function saveStored(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      levels: [...levels.value], roles: [...roles.value], preps: [...preps.value], groups: [...groups.value],
      nounsPer: nounsPer.value,
      count: count.value, customCount: customCount.value
    } satisfies Stored))
  } catch { /* ignore */ }
}

onMounted(async () => {
  await loadSettings()
  nounCounts.value = await countsByGroup()
  const s = loadStored()
  if (s) {
    if (Array.isArray(s.levels)) levels.value = s.levels.filter(l => (COLLOCATION_LEVELS as readonly string[]).includes(l))
    if (Array.isArray(s.roles)) roles.value = s.roles.filter(r => (COLLOCATION_ROLES as readonly string[]).includes(r))
    if (Array.isArray(s.preps)) preps.value = s.preps.filter(p => SUBSTITUTION_PREPS.includes(p))
    if (Array.isArray(s.groups)) groups.value = s.groups.filter(g => (NOUN_GROUPS as readonly string[]).includes(g))
    if (s.nounsPer === 1 || s.nounsPer === 2 || s.nounsPer === 'mix') nounsPer.value = s.nounsPer
    if (s.count !== undefined) count.value = s.count
    if (typeof s.customCount === 'number' && s.customCount > 0) customCount.value = s.customCount
  }
  if (groups.value.length === 0) groups.value = NOUN_GROUPS.filter(g => (nounCounts.value[g] ?? 0) > 0)
})
watch([levels, roles, preps, groups, nounsPer, count, customCount], saveStored, { deep: true })

const availableColloc = computed(() =>
  filterCollocations({ levels: levels.value, roles: roles.value, preps: preps.value }).length
)
const effective = computed(() => count.value === 'custom' ? Math.max(1, customCount.value) : count.value)
const selectedNounTotal = computed(() => groups.value.reduce((sum, g) => sum + (nounCounts.value[g] ?? 0), 0))
const canStart = computed(() =>
  canUseAi.value && availableColloc.value > 0 && selectedNounTotal.value > 0 &&
  levels.value.length > 0 && roles.value.length > 0 && preps.value.length > 0
)

function toggle<T>(set: T[], v: T): T[] {
  const i = set.indexOf(v); return i >= 0 ? set.filter((_, j) => j !== i) : [...set, v]
}

async function start() {
  if (!canUseAi.value) {
    toast.error(
      settings.value.aiProvider === 'local-claude' ? 'Local Claude not reachable' : 'Gemini API key required',
      { description: 'Set your API key (or pick Local Claude) in Settings before generating questions.' }
    )
    return
  }
  if (!canStart.value) return
  const n = effective.value
  const collocPool = filterCollocations({ levels: levels.value, roles: roles.value, preps: preps.value }).map(collocToRef)
  const nounPool = (await sampleByGroups(groups.value, 100000)).map(nounToRef)
  const specs = buildDacSpecs(collocPool, nounPool, n, nounsPer.value)
  sessionStorage.setItem(STASH_KEY, JSON.stringify({
    specs,
    level: dacLevelLabel(levels.value),
    meta: { levels: levels.value, roles: roles.value, preps: preps.value, groups: groups.value, nounsPer: nounsPer.value }
  }))
  router.push({ name: 'dacompounds-answer-run' })
}

function back() { router.push({ name: 'dacompounds' }) }
</script>

<template>
  <div class="page setup-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Modul · Pronominaladverbien · Antworten · Einrichtung</div>
        <h1 class="section-title">Setup<em>.</em></h1>
        <p class="section-subtitle">
          Pick a collocation pool and a noun theme. The AI asks one natural German question per item, built around
          a fixed-preposition collocation and 1–2 nouns — you type a free German answer, and the grader judges both
          whether it answers the question and whether the grammar (preposition, case, compound, word order) holds up.
        </p>
      </div>
    </header>

    <div v-if="!canUseAi" class="alert alert-warning">
      <span class="alert-label">AI access needed</span>
      Set a Gemini API key, or pick <em>Local Claude (dev)</em>, in Settings.
    </div>

    <div class="field">
      <div class="field-row">
        <div class="field-label">Level · {{ levels.length }} of {{ COLLOCATION_LEVELS.length }}</div>
        <div class="field-actions">
          <button class="btn btn-quiet" type="button" @click="levels = [...COLLOCATION_LEVELS]">All</button>
          <button class="btn btn-quiet" type="button" @click="levels = []">None</button>
        </div>
      </div>
      <div class="chip-row">
        <button v-for="l in COLLOCATION_LEVELS" :key="l" class="chip" :class="{ selected: levels.includes(l) }" @click="levels = toggle(levels, l)">{{ l }}</button>
      </div>
    </div>

    <div class="field">
      <div class="field-row">
        <div class="field-label">Word type · {{ roles.length }} of {{ COLLOCATION_ROLES.length }}</div>
        <div class="field-actions">
          <button class="btn btn-quiet" type="button" @click="roles = [...COLLOCATION_ROLES]">All</button>
          <button class="btn btn-quiet" type="button" @click="roles = []">None</button>
        </div>
      </div>
      <div class="chip-row">
        <button v-for="r in COLLOCATION_ROLES" :key="r" class="chip" :class="{ selected: roles.includes(r) }" @click="roles = toggle(roles, r)">{{ r }}</button>
      </div>
    </div>

    <div class="field">
      <div class="field-row">
        <div class="field-label">Preposition · {{ preps.length }} of {{ SUBSTITUTION_PREPS.length }}</div>
        <div class="field-actions">
          <button class="btn btn-quiet" type="button" @click="preps = [...SUBSTITUTION_PREPS]">All</button>
          <button class="btn btn-quiet" type="button" @click="preps = []">None</button>
        </div>
      </div>
      <div class="chip-row">
        <button v-for="p in SUBSTITUTION_PREPS" :key="p" class="chip" :class="{ selected: preps.includes(p) }" @click="preps = toggle(preps, p)">{{ p }}</button>
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
        <button v-for="g in NOUN_GROUPS" :key="g" class="chip" :class="{ selected: groups.includes(g) }" :disabled="(nounCounts[g] ?? 0) === 0" @click="groups = toggle(groups, g)">
          <span>{{ g }}</span><span class="chip-count">{{ nounCounts[g] ?? 0 }}</span>
        </button>
      </div>
    </div>

    <div class="field">
      <div class="field-label">Nouns per question</div>
      <div class="segmented">
        <button :class="{ active: nounsPer === 1 }" @click="nounsPer = 1">1</button>
        <button :class="{ active: nounsPer === 2 }" @click="nounsPer = 2">2</button>
        <button :class="{ active: nounsPer === 'mix' }" @click="nounsPer = 'mix'">1–2 (mixed)</button>
      </div>
    </div>

    <div class="field">
      <div class="field-label">Number of questions</div>
      <div class="field-row count-row">
        <div class="segmented">
          <button :class="{ active: count === 10 }" @click="count = 10">10</button>
          <button :class="{ active: count === 15 }" @click="count = 15">15</button>
          <button :class="{ active: count === 20 }" @click="count = 20">20</button>
          <button :class="{ active: count === 25 }" @click="count = 25">25</button>
          <button :class="{ active: count === 'custom' }" @click="count = 'custom'">Custom</button>
        </div>
        <input v-if="count === 'custom'" class="input custom-count" type="number" :min="1" :max="50" v-model.number="customCount" />
        <span class="micro-mark count-avail">{{ availableColloc }} collocations in pool</span>
      </div>
    </div>

    <div v-if="availableColloc === 0" class="alert alert-warning"><span class="alert-label">Warning</span>No collocations match the selected filters.</div>
    <div v-else-if="selectedNounTotal === 0" class="alert alert-warning"><span class="alert-label">Warning</span>Select at least one theme group that has nouns.</div>

    <div class="alert alert-info">
      <span class="alert-label">How this drill works</span>
      We sample {{ effective }} question spec{{ effective === 1 ? '' : 's' }} — each one drilled collocation plus
      1–2 theme nouns — then the AI writes one natural German question per item, one batch at a time. The quiz
      opens on the first question and the rest stream in as you go. Type your answer in German; a correct answer
      may use the da-compound in the Mittelfeld, fronted, or a full noun phrase — all accepted equally, as long as
      it actually answers the question and the grammar holds up.
    </div>

    <div class="setup-actions">
      <button class="btn btn-ghost" type="button" @click="back">← Back</button>
      <button class="btn btn-accent" type="button" :disabled="!canStart" @click="start">
        Start · {{ effective }} question{{ effective === 1 ? '' : 's' }} <span aria-hidden="true">→</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.setup-page { max-width: 720px; }
.field-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px; gap: 12px; flex-wrap: wrap; }
.field-actions { display: flex; gap: 4px; }
.count-row { align-items: center; gap: 12px; }
.custom-count { width: 80px; font-size: 17px; padding: 4px 0; }
.count-avail { margin-left: auto; }
.chip-count { margin-left: 6px; font-family: var(--font-mono); font-size: 11px; opacity: 0.6; }
.setup-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 40px; gap: 16px; }
@media (max-width: 720px) { .setup-actions { flex-direction: column-reverse; align-items: stretch; } .setup-actions .btn { justify-content: center; } }
</style>
