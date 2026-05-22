<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { NSpace, NCheckboxGroup, NCheckbox, NRadioGroup, NRadio, NButton, NInputNumber, NAlert, NTag, NDivider } from 'naive-ui'
import { useRouter } from 'vue-router'
import { useVerbs } from '../../composables/useVerbs'
import {
  VERB_LEVELS, VERB_TYPES, VERB_CASES,
  VERB_TENSES, TENSE_LABELS, TENSE_LEVEL, PASSIVE_TENSE_SET,
  type VerbLevel, type VerbType, type VerbCase, type VerbTense, type TenseCEFR
} from '../../data/verbs'

const STORAGE_KEY = 'verbConjQuiz'
const router = useRouter()
const { filter } = useVerbs()

const levels = ref<VerbLevel[]>([...VERB_LEVELS])
const types  = ref<VerbType[]>([...VERB_TYPES])
const cases  = ref<VerbCase[]>([...VERB_CASES])
const tenses = ref<VerbTense[]>(['praesens'])
const preset = ref<10 | 15 | 20 | 'all' | 'custom'>(10)
const customCount = ref(10)

interface Stored {
  levels?: VerbLevel[]; types?: VerbType[]; cases?: VerbCase[]; tenses?: VerbTense[]
  preset?: 10 | 15 | 20 | 'all' | 'custom'; customCount?: number
}
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const s = JSON.parse(raw) as Stored
    if (s.levels) levels.value = s.levels.filter(l => (VERB_LEVELS as readonly string[]).includes(l))
    if (s.types) types.value = s.types.filter(t => (VERB_TYPES as readonly string[]).includes(t))
    if (s.cases) cases.value = s.cases.filter(c => (VERB_CASES as readonly string[]).includes(c))
    if (s.tenses) tenses.value = s.tenses.filter(t => (VERB_TENSES as readonly string[]).includes(t))
    if (s.preset !== undefined) preset.value = s.preset
    if (s.customCount !== undefined) customCount.value = s.customCount
  } catch { /* ignore */ }
}
function save() {
  try {
    const payload: Stored = { levels: levels.value, types: types.value, cases: cases.value, tenses: tenses.value, preset: preset.value, customCount: customCount.value }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch { /* ignore */ }
}
onMounted(load)
watch([levels, types, cases, tenses, preset, customCount], save, { deep: true })

const filteredVerbs = computed(() => filter({ levels: levels.value, types: types.value, cases: cases.value }))
const availableVerbs = computed(() => filteredVerbs.value.length)
const passiveSupported = computed(() => filteredVerbs.value.some(v => v.case === 'accusative' || v.case === 'dative+accusative'))

const requested = computed<number>(() => {
  if (preset.value === 'all') return availableVerbs.value
  if (preset.value === 'custom') return customCount.value
  return preset.value
})
const effectiveVerbs = computed(() => Math.min(requested.value, availableVerbs.value))
const totalQuestions = computed(() => effectiveVerbs.value * tenses.value.length)

const tensesByLevel = computed(() => {
  const groups: Record<TenseCEFR, VerbTense[]> = { A1: [], A2: [], B1: [], B2: [], C1: [] }
  for (const t of VERB_TENSES) groups[TENSE_LEVEL[t]].push(t)
  return groups
})

function tenseDisabled(t: VerbTense): boolean {
  return PASSIVE_TENSE_SET.has(t) && !passiveSupported.value
}

function toggleTense(t: VerbTense) {
  if (tenseDisabled(t)) return
  const i = tenses.value.indexOf(t)
  if (i >= 0) tenses.value.splice(i, 1)
  else tenses.value.push(t)
}

function start() {
  router.push({
    name: 'verbs-conjugation-run',
    query: {
      count: String(effectiveVerbs.value),
      levels: levels.value.join(','),
      types: types.value.join(','),
      cases: cases.value.join(','),
      tenses: tenses.value.join(',')
    }
  })
}
</script>

<template>
  <n-space vertical size="large" style="max-width: 720px">
    <n-space justify="space-between" align="center">
      <h2 style="margin: 0">Conjugation quiz setup</h2>
      <n-button @click="router.push('/verbs/cheatsheet')">Open cheatsheet</n-button>
    </n-space>

    <div>
      <p><strong>Verb filters</strong></p>
      <n-space :wrap="true" size="large">
        <div>
          <p>Level</p>
          <n-checkbox-group v-model:value="levels"><n-space><n-checkbox v-for="l in VERB_LEVELS" :key="l" :value="l" :label="l" /></n-space></n-checkbox-group>
        </div>
        <div>
          <p>Type</p>
          <n-checkbox-group v-model:value="types"><n-space :wrap="true"><n-checkbox v-for="t in VERB_TYPES" :key="t" :value="t" :label="t" /></n-space></n-checkbox-group>
        </div>
        <div>
          <p>Case</p>
          <n-checkbox-group v-model:value="cases"><n-space :wrap="true"><n-checkbox v-for="c in VERB_CASES" :key="c" :value="c" :label="c" /></n-space></n-checkbox-group>
        </div>
      </n-space>
    </div>

    <n-divider />

    <div>
      <p><strong>Tenses</strong></p>
      <n-alert v-if="!passiveSupported" type="info" style="margin-bottom: 8px">
        Passive tenses are disabled — your verb filter has no transitive (accusative) verbs.
      </n-alert>
      <div v-for="level in (['A1','A2','B1','B2','C1'] as const)" :key="level" style="margin-bottom: 12px">
        <p style="font-weight: 600; margin: 6px 0">{{ level }}</p>
        <n-space :wrap="true">
          <label
            v-for="t in tensesByLevel[level]" :key="t"
            class="tense-chip"
            :class="{ disabled: tenseDisabled(t), selected: tenses.includes(t) }"
            @click="toggleTense(t)"
          >
            <input type="checkbox" :checked="tenses.includes(t)" :disabled="tenseDisabled(t)" style="margin-right: 6px" />
            {{ TENSE_LABELS[t] }}
            <n-tag size="small" :bordered="false" style="margin-left: 6px">{{ level }}</n-tag>
          </label>
        </n-space>
      </div>
    </div>

    <n-divider />

    <div>
      <p><strong>Number of verbs</strong></p>
      <n-radio-group v-model:value="preset">
        <n-radio :value="10">10</n-radio>
        <n-radio :value="15">15</n-radio>
        <n-radio :value="20">20</n-radio>
        <n-radio value="all">All ({{ availableVerbs }})</n-radio>
        <n-radio value="custom">Custom</n-radio>
      </n-radio-group>
      <n-input-number
        v-if="preset === 'custom'"
        v-model:value="customCount"
        :min="1" :max="availableVerbs || 1"
        style="margin-top: 8px; width: 100%"
      />
      <p v-if="tenses.length > 0" style="opacity: 0.7; margin-top: 8px">
        ≈ {{ totalQuestions }} questions ({{ effectiveVerbs }} verbs × {{ tenses.length }} tenses)
      </p>
    </div>

    <n-alert v-if="availableVerbs === 0" type="warning">No verbs match the selected filters.</n-alert>
    <n-alert v-else-if="tenses.length === 0" type="warning">Pick at least one tense.</n-alert>

    <n-button
      type="primary"
      :disabled="availableVerbs === 0 || tenses.length === 0"
      @click="start"
    >
      Start quiz
    </n-button>
  </n-space>
</template>

<style scoped>
.tense-chip {
  display: inline-flex; align-items: center;
  padding: 6px 12px; border-radius: 999px;
  border: 1px solid var(--n-divider-color, #d0d0d6);
  cursor: pointer; user-select: none;
}
.tense-chip.selected { border-color: #2080f0; background: rgba(32, 128, 240, 0.08); }
.tense-chip.disabled { opacity: 0.4; cursor: not-allowed; }
</style>
