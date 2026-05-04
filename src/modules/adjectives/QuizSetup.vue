<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { NRadioGroup, NRadio, NSpace, NButton, NInputNumber, NAlert } from 'naive-ui'
import { useRouter } from 'vue-router'
import { useAdjectives } from '../../composables/useAdjectives'
import { useSettings } from '../../composables/useSettings'

const { count } = useAdjectives()
const { hasApiKey, load: loadSettings } = useSettings()
const router = useRouter()

const totalAvailable = ref(0)
const preset = ref<10 | 15 | 20 | 'custom'>(10)
const customCount = ref(10)

onMounted(async () => {
  totalAvailable.value = await count()
  await loadSettings()
})

const requested = computed(() => (preset.value === 'custom' ? customCount.value : preset.value))
const effective = computed(() => Math.min(requested.value, totalAvailable.value))

function start() {
  router.push({ name: 'adjectives-quiz-run', query: { count: String(effective.value) } })
}
</script>

<template>
  <n-space vertical size="large" style="max-width: 480px">
    <h2>Adjective quiz setup</h2>
    <n-alert v-if="totalAvailable === 0" type="warning">
      No adjectives available. Add some first in Manage adjectives.
    </n-alert>
    <n-alert v-if="!hasApiKey" type="warning">
      Set your Anthropic API key in <router-link to="/settings">Settings</router-link> first.
    </n-alert>
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
        :max="totalAvailable"
        style="margin-top: 8px"
      />
    </div>
    <n-alert v-if="requested > totalAvailable" type="info">
      Only {{ totalAvailable }} adjectives available — quizzing all of them.
    </n-alert>
    <n-button
      type="primary"
      :disabled="totalAvailable === 0 || !hasApiKey"
      @click="start"
    >
      Generate sentences and start
    </n-button>
  </n-space>
</template>
