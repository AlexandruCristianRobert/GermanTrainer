<script setup lang="ts">
//
// Sprechen · Fehlerarchiv (CONTEXT.md → "Error archive", "Archived correction").
// Every graded Discussion is discarded once it's graded — this screen is what
// survives it: every marked mistake, forever, grouped by Sprechen error tag so
// repetition becomes visible across runs. This is a READ-ONLY view over
// useSprechenArchive.ts, the archive's only door (ADR-0012) — nothing here
// ever imports `db` directly, and nothing here writes to the archive.
//
// Does NOT build the Korrekturdrill (the practice run over these items) —
// that is separate work. This screen only shows what has accumulated.

import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  countsByKind, drilledIds, listCorrections, type ArchivedCorrection
} from '../../composables/useSprechenArchive'
import type { SprechenErrorTag } from '../../composables/useQuizHistory'

const router = useRouter()

const loading = ref(true)
const error = ref<string | null>(null)
const counts = ref<Record<SprechenErrorTag, number> | null>(null)
const drilled = ref<Set<string>>(new Set())
const items = ref<ArchivedCorrection[]>([])
const selectedKind = ref<SprechenErrorTag | null>(null)

// Same five tags and the same German labels Teil2Result.vue's KIND_LABEL
// uses for the marked transcript, kept in lockstep on purpose.
const KIND_ORDER: SprechenErrorTag[] = ['grammar', 'word-order', 'vocabulary', 'spelling', 'register']
const KIND_LABEL: Record<SprechenErrorTag, string> = {
  grammar: 'Grammatik',
  'word-order': 'Wortstellung',
  vocabulary: 'Wortschatz',
  spelling: 'Rechtschreibung',
  register: 'Register'
}

const totalCount = computed(() =>
  counts.value ? Object.values(counts.value).reduce((a, b) => a + b, 0) : 0
)

interface ArchiveRow {
  c: ArchivedCorrection
  before: string
  match: string
  after: string
  hasMatch: boolean
  isDrilled: boolean
}

// The repository stores the marked span as plain `quote` text, not
// start/end offsets into `context` (that's a Teil2Result-only shape, from the
// live grading result). A straight indexOf is what's available here — it
// fails open (renders the plain sentence, no highlight) rather than crashing
// when a quote doesn't literally recur in its own context.
const rows = computed<ArchiveRow[]>(() =>
  items.value.map(c => {
    const idx = c.quote ? c.context.indexOf(c.quote) : -1
    const hasMatch = idx !== -1
    return {
      c,
      before: hasMatch ? c.context.slice(0, idx) : '',
      match: hasMatch ? c.context.slice(idx, idx + c.quote.length) : '',
      after: hasMatch ? c.context.slice(idx + c.quote.length) : '',
      hasMatch,
      isDrilled: drilled.value.has(c.id)
    }
  })
)

// Guards against a fast double-click on two tiles racing each other and the
// slower request overwriting the newer one's result.
let loadToken = 0
async function loadList() {
  const token = ++loadToken
  const result = await listCorrections(selectedKind.value ? { kind: selectedKind.value } : {})
  if (token === loadToken) items.value = result
}

async function loadAll() {
  loading.value = true
  error.value = null
  try {
    const [c, d] = await Promise.all([countsByKind(), drilledIds()])
    counts.value = c
    drilled.value = d
    await loadList()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Fehlerarchiv konnte nicht geladen werden.'
  } finally {
    loading.value = false
  }
}

function toggleKind(k: SprechenErrorTag) {
  selectedKind.value = selectedKind.value === k ? null : k
  loadList().catch(e => {
    error.value = e instanceof Error ? e.message : 'Filter konnte nicht angewendet werden.'
  })
}

onMounted(loadAll)
</script>

<template>
  <div class="page archive-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Sprechen · Fehlerarchiv</div>
        <h1 class="section-title">Fehlerarchiv<em>.</em></h1>
        <p class="section-subtitle">
          Jede bewertete Diskussion wird verworfen, sobald sie benotet ist — deine markierten Fehler
          nicht. Hier stehen sie, sortiert nach Fehlerart, damit Wiederholung sichtbar wird.
        </p>
      </div>
    </header>

    <div class="alert alert-info spoken-note">
      <span class="alert-label">Gesprochen · Hinweis</span>
      Einträge aus einer gesprochenen Diskussion sind mit <span class="tag">gesprochen</span> markiert.
      Die Spracherkennung kann Wörter falsch verstehen — was hier markiert ist, ist manchmal ein
      Hörfehler der Erkennung und nicht zwingend ein eigener Fehler.
    </div>

    <div v-if="error" class="alert alert-warning">
      <span class="alert-label">Fehler</span>
      {{ error }}
    </div>

    <div v-else-if="loading" class="loading-state">
      <div class="micro-mark">Loading…</div>
    </div>

    <template v-else-if="totalCount === 0">
      <div class="empty-state">
        <div class="empty-mark">∅</div>
        <h3>Noch nichts archiviert.</h3>
        <p>
          Nach einer bewerteten Diskussion erscheinen deine markierten Fehler hier — sortiert nach
          Fehlerart, damit Wiederholung sichtbar wird.
        </p>
        <button class="btn btn-accent" type="button" @click="router.push({ name: 'sprechen-teil2' })">
          Diskussion starten <span aria-hidden="true">→</span>
        </button>
      </div>
    </template>

    <template v-else>
      <div class="kind-tiles">
        <button
          v-for="k in KIND_ORDER" :key="k" type="button" class="kind-tile"
          :class="{ active: selectedKind === k }"
          :disabled="(counts?.[k] ?? 0) === 0"
          @click="toggleKind(k)"
        >
          <span class="kt-count">{{ counts?.[k] ?? 0 }}</span>
          <span class="kt-label">{{ KIND_LABEL[k] }}</span>
        </button>
      </div>

      <h3 class="block-heading">
        Markierte Sätze
        <span v-if="selectedKind" class="bh-note">{{ KIND_LABEL[selectedKind] }} · {{ rows.length }}</span>
      </h3>

      <p v-if="rows.length === 0" class="ar-empty-note">Keine Einträge für diesen Filter.</p>

      <ul v-else class="archive-list">
        <li v-for="r in rows" :key="r.c.id" class="archive-row">
          <div class="ar-head">
            <span class="ar-date">{{ new Date(r.c.createdAt).toLocaleDateString() }}</span>
            <span class="ar-topic">{{ r.c.topicTitle }}</span>
            <span class="tag tag-accent">{{ KIND_LABEL[r.c.kind] }}</span>
            <span
              v-if="r.c.modality === 'spoken'" class="tag"
              title="Aus einer gesprochenen Diskussion — kann eine Fehlhörung der Erkennung sein."
            >gesprochen</span>
            <span class="tag" :class="r.isDrilled ? 'tag-success' : 'tag-ochre'">
              {{ r.isDrilled ? 'nachgeübt' : 'offen' }}
            </span>
          </div>
          <p class="ar-context">
            <template v-if="r.hasMatch">{{ r.before }}<mark class="ar-mistake">{{ r.match }}</mark>{{ r.after }}</template>
            <template v-else>{{ r.c.context }}</template>
          </p>
          <div class="ar-fix">
            <span class="ar-fix-label">Besser</span>
            <span class="ar-fix-text">{{ r.c.suggested }}</span>
          </div>
          <p class="ar-reason">{{ r.c.reasonDe }}</p>
        </li>
      </ul>
    </template>

    <div class="setup-actions">
      <button class="btn btn-ghost" type="button" @click="router.push({ name: 'sprechen' })">← Sprechen</button>
    </div>
  </div>
</template>

<style scoped>
.archive-page { max-width: 880px; }
.spoken-note { margin: 0 0 20px; }

.block-heading {
  font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.22em;
  text-transform: uppercase; color: var(--mute); margin: 34px 0 12px;
  display: flex; gap: 12px; align-items: baseline;
}
.bh-note { letter-spacing: 0.14em; opacity: 0.75; }

.kind-tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; margin-top: 24px; }
.kind-tile {
  display: flex; flex-direction: column; align-items: flex-start; gap: 4px;
  padding: 14px 16px; background: var(--paper-card); border: 1px solid var(--hairline);
  border-radius: 4px; cursor: pointer; text-align: left; font: inherit;
  transition: border-color .15s, background .15s, transform .15s;
}
.kind-tile:hover:not(:disabled) { border-color: var(--ink-soft); transform: translateY(-1px); }
.kind-tile.active { border-color: var(--accent); background: var(--accent-tint); }
.kind-tile:disabled { opacity: 0.4; cursor: not-allowed; }
.kt-count { font-family: var(--font-display); font-size: 28px; font-weight: 500; line-height: 1; }
.kt-label { font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--mute); }
.kind-tile.active .kt-label { color: var(--accent); }

.ar-empty-note { color: var(--ink-soft); font-style: italic; margin: 12px 0; }

.archive-list { list-style: none; margin: 16px 0 0; padding: 0; display: flex; flex-direction: column; gap: 14px; }
.archive-row {
  background: var(--paper-deep); border-left: 3px solid var(--danger); border-radius: 4px;
  padding: 14px 18px; display: flex; flex-direction: column; gap: 8px;
}
.ar-head { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.ar-date { font-family: var(--font-mono); font-size: 11px; color: var(--mute); font-variant-numeric: tabular-nums; }
.ar-topic { font-family: var(--font-display); font-style: italic; font-size: 15px; color: var(--ink-soft); flex: 1 1 auto; min-width: 0; }
.ar-context { font-size: 15px; line-height: 1.6; margin: 0; }
.ar-mistake {
  background: color-mix(in srgb, var(--danger) 12%, transparent); color: var(--danger);
  border-bottom: 2px solid var(--danger); border-radius: 2px; padding: 0 1px;
}
.ar-fix { font-size: 14.5px; display: flex; gap: 8px; align-items: baseline; }
.ar-fix-label { font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--mute); }
.ar-fix-text { color: var(--success); font-family: var(--font-display); }
.ar-reason { margin: 0; font-size: 13.5px; line-height: 1.55; color: var(--ink-soft); }

@media (max-width: 640px) {
  .kind-tiles { grid-template-columns: repeat(2, 1fr); }
}
</style>
