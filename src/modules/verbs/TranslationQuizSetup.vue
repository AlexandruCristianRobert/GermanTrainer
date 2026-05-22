<script setup lang="ts">
import { computed, ref } from 'vue'
import { NSpace, NRadioGroup, NRadio, NCheckboxGroup, NCheckbox, NButton, NInputNumber, NAlert } from 'naive-ui'
import { useRouter } from 'vue-router'
import { useVerbs } from '../../composables/useVerbs'
import { VERB_LEVELS, VERB_TYPES, VERB_CASES, type VerbLevel, type VerbType, type VerbCase } from '../../data/verbs'

const router = useRouter()
const { filter } = useVerbs()

const levels = ref<VerbLevel[]>([...VERB_LEVELS])
const types = ref<VerbType[]>([...VERB_TYPES])
const cases = ref<VerbCase[]>([...VERB_CASES])
const preset = ref<10 | 15 | 20 | 'all' | 'custom'>(10)
const customCount = ref(10)

const available = computed(() => filter({ levels: levels.value, types: types.value, cases: cases.value }).length)
const requested = computed<number>(() => {
  if (preset.value === 'all') return available.value
  if (preset.value === 'custom') return customCount.value
  return preset.value
})
const effective = computed(() => Math.min(requested.value, available.value))

function start() {
  router.push({
    name: 'verbs-translation-run',
    query: {
      count: String(effective.value),
      levels: levels.value.join(','),
      types: types.value.join(','),
      cases: cases.value.join(',')
    }
  })
}
</script>

<template>
  <n-space vertical size="large" style="max-width: 520px">
    <h2>Translation quiz setup</h2>

    <div>
      <p><strong>Levels</strong></p>
      <n-checkbox-group v-model:value="levels">
        <n-space><n-checkbox v-for="l in VERB_LEVELS" :key="l" :value="l" :label="l" /></n-space>
      </n-checkbox-group>
    </div>

    <div>
      <p><strong>Types</strong></p>
      <n-checkbox-group v-model:value="types">
        <n-space :wrap="true"><n-checkbox v-for="t in VERB_TYPES" :key="t" :value="t" :label="t" /></n-space>
      </n-checkbox-group>
    </div>

    <div>
      <p><strong>Cases</strong></p>
      <n-checkbox-group v-model:value="cases">
        <n-space :wrap="true"><n-checkbox v-for="c in VERB_CASES" :key="c" :value="c" :label="c" /></n-space>
      </n-checkbox-group>
    </div>

    <div>
      <p><strong>Number of verbs</strong></p>
      <n-radio-group v-model:value="preset">
        <n-radio :value="10">10</n-radio>
        <n-radio :value="15">15</n-radio>
        <n-radio :value="20">20</n-radio>
        <n-radio value="all">All ({{ available }})</n-radio>
        <n-radio value="custom">Custom</n-radio>
      </n-radio-group>
      <n-input-number
        v-if="preset === 'custom'"
        v-model:value="customCount"
        :min="1" :max="available || 1"
        style="margin-top: 8px; width: 100%"
      />
    </div>

    <n-alert v-if="available === 0" type="warning">No verbs match the selected filters.</n-alert>

    <n-button type="primary" :disabled="available === 0" @click="start">Start quiz</n-button>
  </n-space>
</template>
