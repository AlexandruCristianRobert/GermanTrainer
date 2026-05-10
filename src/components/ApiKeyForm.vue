<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  NForm, NFormItem, NInput, NButton, NSelect, NSpace, NAlert, useMessage
} from 'naive-ui'
import { useSettings } from '../composables/useSettings'
import { makeGeminiClient, generateAdjectiveSentences } from '../composables/useClaude'

const { settings, load, save } = useSettings()
const message = useMessage()
const testing = ref(false)
const testResult = ref<'ok' | 'error' | null>(null)
const testError = ref('')

const modelOptions = [
  { label: 'gemini-2.5-flash (default, free tier)', value: 'gemini-2.5-flash' },
  { label: 'gemini-2.5-flash-lite (cheapest)', value: 'gemini-2.5-flash-lite' },
  { label: 'gemini-2.5-pro (more capable)', value: 'gemini-2.5-pro' }
]

onMounted(load)

async function onSave() {
  await save()
  message.success('Settings saved.')
}

async function onTest() {
  testing.value = true
  testResult.value = null
  testError.value = ''
  try {
    const client = makeGeminiClient(settings.value.geminiApiKey)
    await generateAdjectiveSentences(client, {
      model: settings.value.model,
      adjectives: [{ german: 'schön', english: 'beautiful' }]
    })
    testResult.value = 'ok'
  } catch (err) {
    testResult.value = 'error'
    testError.value = err instanceof Error ? err.message : String(err)
  } finally {
    testing.value = false
  }
}
</script>

<template>
  <n-space vertical size="large" style="max-width: 640px">
    <n-form label-placement="top">
      <n-form-item label="Gemini API key">
        <n-input
          v-model:value="settings.geminiApiKey"
          type="password"
          show-password-on="click"
          placeholder="AIza..."
        />
      </n-form-item>
      <n-form-item label="Model">
        <n-select v-model:value="settings.model" :options="modelOptions" />
      </n-form-item>
      <n-space :wrap="true">
        <n-button type="primary" @click="onSave">Save</n-button>
        <n-button :loading="testing" @click="onTest" :disabled="!settings.geminiApiKey">
          Test connection
        </n-button>
      </n-space>
    </n-form>
    <n-alert v-if="testResult === 'ok'" type="success">Connection works.</n-alert>
    <n-alert v-if="testResult === 'error'" type="error" :title="'Test failed'">
      {{ testError }}
    </n-alert>
    <n-alert type="warning" title="Security note">
      Your API key is stored locally in this browser and sent directly to Google.
      Anyone with access to this browser profile can read it. Use only on personal devices.
    </n-alert>
    <n-alert type="info" title="Get a free key">
      Visit
      <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a>,
      sign in, click "Create API key", copy it (starts with <code>AIza</code>), and paste it above.
    </n-alert>
  </n-space>
</template>
