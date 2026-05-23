<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  buildExportJson,
  applyImport,
  readSummary,
  clearAllUserData,
  type ExportSummaryRow,
  type ImportResult
} from '../../composables/useUserData'

const summary = ref<ExportSummaryRow[]>(readSummary())
const copyFlash = ref(false)
const downloadFlash = ref(false)

const importing = ref(false)
const importText = ref('')
const importError = ref<string | null>(null)
const importResult = ref<ImportResult | null>(null)

function refreshSummary() {
  summary.value = readSummary()
}

const grouped = computed<Record<string, ExportSummaryRow[]>>(() => {
  const out: Record<string, ExportSummaryRow[]> = {}
  for (const row of summary.value) {
    if (!out[row.group]) out[row.group] = []
    out[row.group].push(row)
  }
  return out
})

const presentCount = computed(() => summary.value.filter(s => s.present).length)

function copyToClipboard() {
  const txt = buildExportJson()
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(txt).then(() => {
      copyFlash.value = true
      setTimeout(() => { copyFlash.value = false }, 1800)
    })
  }
}

function downloadJson() {
  const txt = buildExportJson()
  const blob = new Blob([txt], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const stamp = new Date().toISOString().slice(0, 10)
  a.download = `german-trainer-data-${stamp}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  downloadFlash.value = true
  setTimeout(() => { downloadFlash.value = false }, 1800)
}

function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    importText.value = String(reader.result ?? '')
    importing.value = true
    importError.value = null
    importResult.value = null
  }
  reader.readAsText(file)
  input.value = ''
}

function tryImport() {
  try {
    const parsed = JSON.parse(importText.value)
    const result = applyImport(parsed)
    importResult.value = result
    importError.value = null
    refreshSummary()
  } catch (err) {
    importError.value = err instanceof Error ? err.message : 'Invalid JSON'
    importResult.value = null
  }
}

function onClearAll() {
  if (!window.confirm('Delete ALL local data: theme, sizes, palette, quiz setup memory, and quiz history? This cannot be undone.')) return
  clearAllUserData()
  refreshSummary()
}
</script>

<template>
  <section>
    <div class="alert alert-info">
      <span class="alert-label">What this is</span>
      A backup file for everything this app stores in your browser:
      theme, prompt sizes, palette overrides, the filters you last picked
      in each quiz, and the full quiz history. <em>Your Gemini API key is
      stored separately and is never included in the export.</em>
    </div>

    <h3 class="data-heading">Currently stored<em>.</em></h3>
    <p class="data-blurb">
      {{ presentCount }} of {{ summary.length }} known keys present in this browser.
    </p>

    <div class="data-summary">
      <div v-for="(rows, group) in grouped" :key="group" class="data-summary-group">
        <div class="data-summary-group-label">{{ group }}</div>
        <table class="data-summary-table">
          <tbody>
            <tr v-for="row in rows" :key="row.key" :class="{ absent: !row.present }">
              <td class="data-summary-label">{{ row.label }}</td>
              <td class="data-summary-key"><code>{{ row.key }}</code></td>
              <td class="data-summary-detail">{{ row.detail }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <hr class="settings-divider" />

    <!-- ── Export ────────────────────────────────────────────── -->
    <h3 class="data-heading">Export<em>.</em></h3>
    <p class="data-blurb">
      Download a JSON file or copy the contents to your clipboard.
      Either form imports back identically.
    </p>
    <div class="data-actions">
      <button type="button" class="btn btn-accent" @click="downloadJson">
        Download JSON <span aria-hidden="true">↓</span>
      </button>
      <button type="button" class="btn btn-ghost" @click="copyToClipboard">
        Copy to clipboard
      </button>
      <span v-if="downloadFlash" class="data-flash">✓ File downloaded.</span>
      <span v-if="copyFlash" class="data-flash">✓ Copied to clipboard.</span>
    </div>

    <hr class="settings-divider" />

    <!-- ── Import ────────────────────────────────────────────── -->
    <h3 class="data-heading">Import<em>.</em></h3>
    <p class="data-blurb">
      Paste an exported JSON below, or upload a file. Unknown keys are skipped.
      Existing values are overwritten when an imported value is present.
    </p>

    <div class="data-actions">
      <label class="btn btn-ghost data-file-btn">
        Upload .json file…
        <input type="file" accept="application/json,.json" @change="onFile" />
      </label>
      <button type="button" class="btn btn-quiet" @click="importing = !importing">
        {{ importing ? 'Close paste box' : 'Paste JSON…' }}
      </button>
    </div>

    <div v-if="importing" class="data-import-box">
      <textarea
        v-model="importText"
        class="palette-json-input"
        rows="10"
        placeholder='{ "schema": 1, "data": { "theme": "dark", "gt:testVerbSize": 30 } }'
        @input="importError = null"
      />
      <div v-if="importError" class="alert alert-danger import-feedback">
        <span class="alert-label">Parse error</span>
        {{ importError }}
      </div>
      <div v-if="importResult" class="alert alert-info import-feedback">
        <span class="alert-label">Done</span>
        Imported {{ importResult.imported.length }}
        <template v-if="importResult.imported.length === 1">key</template>
        <template v-else>keys</template>.
        <template v-if="importResult.skipped.length > 0">
          Skipped {{ importResult.skipped.length }}
          ({{ importResult.skipped.map(s => s.key).join(', ') }}).
        </template>
        Reload the page if you don't see a change reflected immediately.
      </div>
      <button type="button" class="btn btn-accent import-apply" @click="tryImport">
        Apply import
      </button>
    </div>

    <hr class="settings-divider" />

    <!-- ── Reset ─────────────────────────────────────────────── -->
    <h3 class="data-heading">Reset<em>.</em></h3>
    <p class="data-blurb">
      Wipe everything on this device — settings, palette, quiz setup memory,
      and quiz history. Your Gemini API key (stored separately in IndexedDB)
      is not touched.
    </p>
    <div class="data-actions">
      <button type="button" class="btn btn-ghost btn-danger" @click="onClearAll">
        Clear all local data
      </button>
    </div>
  </section>
</template>

<style scoped>
.data-heading {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 22px;
  margin: 0 0 4px 0;
  color: var(--ink);
}
.data-heading em {
  color: var(--accent);
  font-style: italic;
  font-weight: 400;
}
.data-blurb {
  font-family: var(--font-body);
  font-style: italic;
  font-size: 14px;
  color: var(--ink-soft);
  margin: 0 0 18px 0;
  max-width: 600px;
}

.data-summary {
  display: flex;
  flex-direction: column;
  gap: 18px;
  margin-top: 12px;
  margin-bottom: 24px;
}
.data-summary-group-label {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--mute);
  margin-bottom: 6px;
  padding-bottom: 6px;
  border-bottom: 1px dotted var(--hairline);
}
.data-summary-table { width: 100%; border-collapse: collapse; }
.data-summary-table td {
  padding: 6px 8px 6px 0;
  vertical-align: top;
  font-size: 14px;
}
.data-summary-table tr.absent {
  color: var(--mute);
}
.data-summary-table tr.absent .data-summary-detail { font-style: italic; }
.data-summary-label {
  font-family: var(--font-body);
  font-weight: 500;
  width: 30%;
}
.data-summary-key {
  width: 30%;
}
.data-summary-key code {
  font-family: var(--font-mono);
  font-size: 11.5px;
  color: var(--ink-soft);
}
.data-summary-detail {
  font-family: var(--font-mono);
  font-size: 11.5px;
  color: var(--ink-soft);
}

.data-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}
.data-flash {
  font-family: var(--font-display);
  font-style: italic;
  color: var(--success);
  font-size: 14px;
}

.data-file-btn { position: relative; cursor: pointer; }
.data-file-btn input[type="file"] {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.data-import-box {
  margin-top: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.import-feedback { margin: 0; }
.import-apply { align-self: flex-start; }
</style>
