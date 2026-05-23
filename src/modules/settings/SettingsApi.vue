<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useSettings } from '../../composables/useSettings'
import { makeGeminiClient, generateAdjectiveSentences } from '../../composables/useClaude'

const { settings, load, save } = useSettings()

const showKey = ref(false)
const testState = ref<'idle' | 'testing' | 'ok' | 'error'>('idle')
const testError = ref('')
const savedFlash = ref(false)

onMounted(load)

async function onSave() {
  await save()
  savedFlash.value = true
  setTimeout(() => { savedFlash.value = false }, 2000)
}

async function onTest() {
  if (!settings.value.geminiApiKey.trim()) return
  testState.value = 'testing'
  testError.value = ''
  try {
    const client = makeGeminiClient(settings.value.geminiApiKey)
    await generateAdjectiveSentences(client, {
      model: settings.value.model,
      adjectives: [{ german: 'schön', english: 'beautiful' }]
    })
    testState.value = 'ok'
  } catch (err) {
    testState.value = 'error'
    testError.value = err instanceof Error ? err.message : String(err)
  }
}
</script>

<template>
  <section>
    <div class="alert alert-warning">
      <span class="alert-label">Privacy</span>
      Your API key is stored only in this browser. It is sent directly to Google's Gemini API and to nobody else.
    </div>

    <div class="field">
      <label class="field-label" for="gemini-key">Gemini API key</label>
      <div class="key-row">
        <input
          id="gemini-key"
          class="input key-input"
          :type="showKey ? 'text' : 'password'"
          placeholder="AIzaSy…"
          v-model="settings.geminiApiKey"
          autocomplete="off"
        />
        <button type="button" class="btn btn-quiet" @click="showKey = !showKey">
          {{ showKey ? 'Hide' : 'Show' }}
        </button>
      </div>
    </div>

    <div class="field">
      <label class="field-label" for="gemini-model">Model</label>
      <select id="gemini-model" class="select" v-model="settings.model">
        <option value="gemini-2.5-flash">gemini-2.5-flash — default, free tier</option>
        <option value="gemini-2.5-flash-lite">gemini-2.5-flash-lite — cheapest</option>
        <option value="gemini-2.5-pro">gemini-2.5-pro — most capable</option>
      </select>
    </div>

    <div class="settings-actions">
      <button type="button" class="btn btn-accent" @click="onSave">Save</button>
      <button
        type="button"
        class="btn btn-ghost"
        :disabled="!settings.geminiApiKey.trim() || testState === 'testing'"
        @click="onTest"
      >
        {{ testState === 'testing' ? 'Testing…' : 'Test connection' }}
      </button>
      <span v-if="savedFlash" class="settings-flash flash-success">✓ Saved.</span>
      <span v-if="testState === 'ok'" class="settings-flash flash-success">✓ Reached the model.</span>
    </div>

    <div v-if="testState === 'error'" class="alert alert-danger">
      <span class="alert-label">Test failed</span>
      {{ testError }}
    </div>

    <div class="alert alert-info how-to">
      <span class="alert-label">How to get a key</span>
      <p>
        Sign in at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a>
        and click <em>Create API key</em>. The free tier covers light Adjectives-quiz use comfortably.
      </p>
    </div>
  </section>
</template>

<style scoped>
.key-row {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}
.key-input { flex: 1; }

.settings-actions {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-top: 32px;
  flex-wrap: wrap;
}

.settings-flash {
  font-family: var(--font-display);
  font-style: italic;
  font-size: 15px;
}
.flash-success { color: var(--success); }

.how-to { margin-top: 48px; }
.how-to p { margin: 0; }
</style>
