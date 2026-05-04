<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  NRadioGroup, NRadio, NSpace, NButton, NInputNumber, NAlert, useMessage
} from 'naive-ui'
import { useRouter } from 'vue-router'
import { useNouns } from '../../composables/useNouns'

const { count } = useNouns()
const router = useRouter()
const message = useMessage()

const totalAvailable = ref(0)
const mode = ref<'gender' | 'translation'>('gender')
const preset = ref<10 | 15 | 20 | 'custom'>(10)
const customCount = ref(10)

onMounted(async () => {
  totalAvailable.value = await count()
})

const requested = computed(() => (preset.value === 'custom' ? customCount.value : preset.value))
const effective = computed(() => Math.min(requested.value, totalAvailable.value))

function start() {
  if (totalAvailable.value === 0) {
    message.error('Add some nouns first.')
    return
  }
  router.push({
    name: 'nouns-quiz-run',
    query: { mode: mode.value, count: String(effective.value) }
  })
}
</script>

<template>
  <n-space vertical size="large" style="max-width: 480px">
    <h2>Noun quiz setup</h2>
    <n-alert v-if="totalAvailable === 0" type="warning">
      No nouns available. Add some first in Manage nouns.
    </n-alert>
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
        :max="totalAvailable"
        style="margin-top: 8px"
      />
    </div>
    <n-alert v-if="requested > totalAvailable" type="info">
      Only {{ totalAvailable }} nouns available — quizzing all of them.
    </n-alert>
    <n-button type="primary" :disabled="totalAvailable === 0" @click="start">Start quiz</n-button>
  </n-space>
</template>
