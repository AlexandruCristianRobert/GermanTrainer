<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useSettings } from '../../composables/useSettings'
import { generateAdjectiveSentences } from '../../composables/useClaude'
import { resolveAiClient, localClaudeAvailable, probeLocalClaude } from '../../composables/localClaude'

const { settings, load, save } = useSettings()

const showKey = ref(false)
const testState = ref<'idle' | 'testing' | 'ok' | 'error'>('idle')
const testError = ref('')
const savedFlash = ref(false)

onMounted(async () => {
  await load()
  await probeLocalClaude({ force: true })
})

async function onSave() {
  await save()
  savedFlash.value = true
  setTimeout(() => { savedFlash.value = false }, 2000)
}

async function recheckLocal() { await probeLocalClaude({ force: true }) }

async function onTest() {
  if (settings.value.aiProvider === 'gemini' && !settings.value.geminiApiKey.trim()) return
  testState.value = 'testing'
  testError.value = ''
  try {
    const client = resolveAiClient(settings.value)
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
    <div class="field">
      <div class="field-label">AI provider</div>
      <div class="segmented">
        <button :class="{ active: settings.aiProvider === 'gemini' }" @click="settings.aiProvider = 'gemini'">Gemini (API key)</button>
        <button :class="{ active: settings.aiProvider === 'local-claude' }" @click="settings.aiProvider = 'local-claude'">Local Claude (dev)</button>
      </div>
    </div>

    <template v-if="settings.aiProvider === 'local-claude'">
      <div v-if="localClaudeAvailable" class="alert alert-info">
        <span class="alert-label">Local endpoint detected</span>
        Generation runs through your Claude Code login on this machine — no API key needed.
        Works only while the app runs via <code>npm run dev</code>.
      </div>
      <div v-else class="alert alert-warning">
        <span class="alert-label">Not reachable</span>
        No local endpoint. This only works when you run the app with <code>npm run dev</code> and have the
        <code>claude</code> CLI logged in; the deployed site can't use it.
        <button type="button" class="btn btn-quiet" @click="recheckLocal">Re-check</button>
      </div>

      <div class="field">
        <label class="field-label" for="lc-model">Claude model</label>
        <select id="lc-model" class="select" v-model="settings.localClaudeModel">
          <option value="haiku">haiku — fastest</option>
          <option value="sonnet">sonnet — balanced</option>
          <option value="opus">opus — most capable</option>
        </select>
      </div>

      <div class="field">
        <label class="field-label" for="lc-effort">Effort — faster vs. more thorough</label>
        <select id="lc-effort" class="select" v-model="settings.localClaudeEffort">
          <option value="low">low — fastest</option>
          <option value="medium">medium</option>
          <option value="high">high</option>
          <option value="xhigh">xhigh</option>
          <option value="max">max — slowest, most thorough</option>
        </select>
      </div>
    </template>

    <template v-if="settings.aiProvider === 'gemini'">
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
    </template>

    <div class="settings-actions">
      <button type="button" class="btn btn-accent" @click="onSave">Save</button>
      <button
        type="button"
        class="btn btn-ghost"
        :disabled="(settings.aiProvider === 'gemini' && !settings.geminiApiKey.trim()) || (settings.aiProvider === 'local-claude' && !localClaudeAvailable) || testState === 'testing'"
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
