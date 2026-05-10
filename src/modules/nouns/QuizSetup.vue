<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  NRadioGroup, NRadio, NSpace, NButton, NInputNumber, NAlert, NCheckboxGroup, NCheckbox,
  useMessage
} from 'naive-ui'
import { useRouter } from 'vue-router'
import { useNouns } from '../../composables/useNouns'
import { NOUN_GROUPS, type NounGroup } from '../../db/types'

const STORAGE_KEY = 'nounQuizGroups'

const { countsByGroup } = useNouns()
const router = useRouter()
const message = useMessage()

const counts = ref<Record<NounGroup, number>>(
  Object.fromEntries(NOUN_GROUPS.map(g => [g, 0])) as Record<NounGroup, number>
)
const selectedGroups = ref<NounGroup[]>([])
const mode = ref<'gender' | 'translation'>('gender')
const preset = ref<10 | 15 | 20 | 'custom'>(10)
const customCount = ref(10)

function loadSelectedGroups(): NounGroup[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    const known = new Set<string>(NOUN_GROUPS)
    return parsed.filter((g): g is NounGroup => typeof g === 'string' && known.has(g))
  } catch {
    return null
  }
}

function saveSelectedGroups(groups: NounGroup[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(groups))
  } catch {
    // ignore quota / disabled storage
  }
}

onMounted(async () => {
  counts.value = await countsByGroup()
  const stored = loadSelectedGroups()
  if (stored && stored.length > 0) {
    selectedGroups.value = stored
  } else {
    selectedGroups.value = NOUN_GROUPS.filter(g => counts.value[g] > 0)
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
  selectedGroups.value = NOUN_GROUPS.filter(g => counts.value[g] > 0)
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
    message.error('No nouns in the selected groups.')
    return
  }
  router.push({
    name: 'nouns-quiz-run',
    query: {
      mode: mode.value,
      count: String(effective.value),
      groups: selectedGroups.value.join(',')
    }
  })
}
</script>

<template>
  <n-space vertical size="large" style="max-width: 480px">
    <h2>Noun quiz setup</h2>
    <n-alert v-if="totalAvailable === 0 && selectedGroups.length > 0" type="warning">
      No nouns in the selected groups. Pick a different group or add nouns in Manage nouns.
    </n-alert>
    <div>
      <p>Groups</p>
      <n-checkbox-group v-model:value="selectedGroups">
        <n-space vertical size="small">
          <n-checkbox
            v-for="g in NOUN_GROUPS"
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
      <p>Mode</p>
      <n-radio-group v-model:value="mode">
        <n-radio value="gender">Gender (der/die/das)</n-radio>
        <n-radio value="translation">English translation</n-radio>
      </n-radio-group>
    </div>
    <div>
      <p>Number of questions</p>
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
      Only {{ totalAvailable }} nouns available in selected groups — quizzing all of them.
    </n-alert>
    <n-button
      type="primary"
      :disabled="selectedGroups.length === 0 || totalAvailable === 0"
      @click="start"
    >
      Start quiz
    </n-button>
  </n-space>
</template>
