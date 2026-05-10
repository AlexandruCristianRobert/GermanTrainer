<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  NRadioGroup, NRadio, NSpace, NButton, NInputNumber, NAlert, NCheckboxGroup, NCheckbox,
  useMessage
} from 'naive-ui'
import { useRouter } from 'vue-router'
import { useAdjectives } from '../../composables/useAdjectives'
import { useSettings } from '../../composables/useSettings'
import { ADJECTIVE_GROUPS, type AdjectiveGroup } from '../../db/types'

const STORAGE_KEY = 'adjectiveQuizGroups'

const { countsByGroup } = useAdjectives()
const { hasApiKey, load: loadSettings } = useSettings()
const router = useRouter()
const message = useMessage()

const counts = ref<Record<AdjectiveGroup, number>>(
  Object.fromEntries(ADJECTIVE_GROUPS.map(g => [g, 0])) as Record<AdjectiveGroup, number>
)
const selectedGroups = ref<AdjectiveGroup[]>([])
const preset = ref<10 | 15 | 20 | 'custom'>(10)
const customCount = ref(10)

function loadSelectedGroups(): AdjectiveGroup[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    const known = new Set<string>(ADJECTIVE_GROUPS)
    return parsed.filter((g): g is AdjectiveGroup => typeof g === 'string' && known.has(g))
  } catch {
    return null
  }
}

function saveSelectedGroups(groups: AdjectiveGroup[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(groups))
  } catch {
    // ignore
  }
}

onMounted(async () => {
  counts.value = await countsByGroup()
  await loadSettings()
  const stored = loadSelectedGroups()
  if (stored && stored.length > 0) {
    selectedGroups.value = stored
  } else {
    selectedGroups.value = ADJECTIVE_GROUPS.filter(g => counts.value[g] > 0)
  }
})

watch(selectedGroups, value => {
  saveSelectedGroups([...value])
}, { deep: true })

const totalAvailable = computed(() =>
  selectedGroups.value.reduce((sum, g) => sum + (counts.value[g] ?? 0), 0)
)
const requested = computed(() => (preset.value === 'custom' ? customCount.value : preset.value))
const effective = computed(() => Math.min(requested.value, totalAvailable.value))

function selectAll() {
  selectedGroups.value = ADJECTIVE_GROUPS.filter(g => counts.value[g] > 0)
}

function selectNone() {
  selectedGroups.value = []
}

function start() {
  if (selectedGroups.value.length === 0) {
    message.error('Select at least one group.')
    return
  }
  if (totalAvailable.value === 0) {
    message.error('No adjectives in the selected groups.')
    return
  }
  router.push({
    name: 'adjectives-quiz-run',
    query: {
      count: String(effective.value),
      groups: selectedGroups.value.join(',')
    }
  })
}
</script>

<template>
  <n-space vertical size="large" style="max-width: 480px">
    <h2>Adjective quiz setup</h2>
    <n-alert v-if="totalAvailable === 0 && selectedGroups.length > 0" type="warning">
      No adjectives in the selected groups. Pick a different group or add adjectives in Manage adjectives.
    </n-alert>
    <n-alert v-if="!hasApiKey" type="warning">
      Set your Anthropic API key in <router-link to="/settings">Settings</router-link> first.
    </n-alert>
    <div>
      <p>Groups</p>
      <n-checkbox-group v-model:value="selectedGroups">
        <n-space vertical size="small">
          <n-checkbox
            v-for="g in ADJECTIVE_GROUPS"
            :key="g"
            :value="g"
            :label="`${g} (${counts[g] ?? 0})`"
            :disabled="(counts[g] ?? 0) === 0"
          />
        </n-space>
      </n-checkbox-group>
      <n-space :wrap="true" style="margin-top: 8px">
        <n-button size="small" @click="selectAll">All</n-button>
        <n-button size="small" @click="selectNone">None</n-button>
      </n-space>
      <n-alert
        v-if="selectedGroups.length === 0"
        type="warning"
        style="margin-top: 8px"
      >
        Select at least one group.
      </n-alert>
    </div>
    <div>
      <p>Number of sentences</p>
      <n-radio-group v-model:value="preset">
        <n-radio :value="10">10</n-radio>
        <n-radio :value="15">15</n-radio>
        <n-radio :value="20">20</n-radio>
        <n-radio value="custom">Custom</n-radio>
      </n-radio-group>
      <n-input-number
        v-if="preset === 'custom'"
        v-model:value="customCount"
        :min="1"
        :max="totalAvailable || 1"
        style="margin-top: 8px; width: 100%"
      />
    </div>
    <n-alert v-if="requested > totalAvailable && totalAvailable > 0" type="info">
      Only {{ totalAvailable }} adjectives available in selected groups — quizzing all of them.
    </n-alert>
    <n-button
      type="primary"
      :disabled="selectedGroups.length === 0 || totalAvailable === 0 || !hasApiKey"
      @click="start"
    >
      Generate sentences and start
    </n-button>
  </n-space>
</template>
