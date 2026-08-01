<script setup lang="ts">
//
// Sprechen · Fehlerarchiv (CONTEXT.md → "Error archive", "Archived correction").
// Every graded Discussion is discarded once it's graded — this screen is what
// survives it: every marked mistake, forever, grouped by Sprechen error tag so
// repetition becomes visible across runs. This is a READ-ONLY view over
// useSprechenArchive.ts, the archive's only door (ADR-0012) — nothing here
// ever imports `db` directly, and nothing here writes to the archive.
//
// Links to the Korrekturdrill (the practice run over these items) but does
// not build it — that is SprechenDrill.vue. This screen only shows what has
// accumulated and, per kind, how much of it has been re-practised.

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
// The unfiltered set of every correction, captured once on the initial load
// (below, `selectedKind` is still null then so `items` IS every correction).
// Reusing it here — rather than a second listCorrections() call — is what
// lets `openByKind` exist without a second archive read.
const allCorrections = ref<ArchivedCorrection[]>([])
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

/** Open (not-yet-drilled) corrections per kind, derived from `allCorrections`
 *  joined against `drilled` — never a second read of either archive table. */
const openByKind = computed<Record<SprechenErrorTag, number>>(() => {
  const out: Record<SprechenErrorTag, number> = {
    grammar: 0, 'word-order': 0, vocabulary: 0, spelling: 0, register: 0
  }
  for (const c of allCorrections.value) {
    if (!drilled.value.has(c.id)) out[c.kind] += 1
  }
  return out
})

const openTotal = computed(() =>
  Object.values(openByKind.value).reduce((a, b) => a + b, 0)
)

/** Five segments, so the strip reads at a glance rather than exactly. */
function drilledSegments(kind: SprechenErrorTag): number {
  const total = counts.value?.[kind] ?? 0
  if (total === 0) return 0
  const done = total - openByKind.value[kind]
  return Math.round((done / total) * 5)
}

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
    // selectedKind is still null here, so this fetches every correction —
    // keep that copy around for openByKind instead of reading again per kind.
    await loadList()
    allCorrections.value = items.value
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
      <div class="spr-kinds">
        <button
          v-for="k in KIND_ORDER" :key="k" type="button" class="spr-kind"
          :class="{ on: selectedKind === k }"
          :disabled="(counts?.[k] ?? 0) === 0"
          @click="toggleKind(k)"
        >
          <div class="spr-kind-n spr-num">{{ counts?.[k] ?? 0 }}</div>
          <div class="spr-kind-t">{{ KIND_LABEL[k] }}</div>
          <div class="spr-kind-b">
            <span v-for="s in 5" :key="s" :class="{ on: s <= drilledSegments(k) }" />
          </div>
        </button>
      </div>

      <section class="spr-block">
        <div class="spr-block-h">
          <h2 class="spr-block-t">Markierte Sätze</h2>
          <span v-if="selectedKind" class="spr-block-n">{{ KIND_LABEL[selectedKind] }} · {{ rows.length }}</span>
        </div>

        <p v-if="rows.length === 0" class="ar-empty-note">Keine Einträge für diesen Filter.</p>

        <ul v-else class="spr-rows">
          <li v-for="r in rows" :key="r.c.id" class="spr-arow">
            <span class="spr-adate spr-num">{{ new Date(r.c.createdAt).toLocaleDateString() }}</span>
            <div class="ar-body">
              <div class="ar-tags">
                <span class="tag tag-accent">{{ KIND_LABEL[r.c.kind] }}</span>
                <span
                  v-if="r.c.modality === 'spoken'" class="tag"
                  title="Aus einer gesprochenen Diskussion — kann eine Fehlhörung der Erkennung sein."
                >gesprochen</span>
                <span class="tag" :class="r.isDrilled ? 'tag-success' : 'tag-ochre'">
                  {{ r.isDrilled ? 'nachgeübt' : 'offen' }}
                </span>
              </div>
              <p class="spr-actx">
                <template v-if="r.hasMatch">{{ r.before }}<span class="hit">{{ r.match }}</span>{{ r.after }}</template>
                <template v-else>{{ r.c.context }}</template>
              </p>
              <p class="spr-acorr">Besser: <b>{{ r.c.suggested }}</b> — {{ r.c.reasonDe }}</p>
            </div>
            <span class="spr-atopic">{{ r.c.topicTitle }}</span>
          </li>
        </ul>
      </section>
    </template>

    <div class="setup-actions">
      <button
        class="btn btn-accent" type="button"
        :disabled="openTotal === 0" @click="router.push({ name: 'sprechen-drill' })"
      >
        Korrekturdrill starten <span aria-hidden="true">→</span>
      </button>
    </div>

    <div class="setup-actions">
      <button class="btn btn-ghost" type="button" @click="router.push({ name: 'sprechen' })">← Sprechen</button>
    </div>
  </div>
</template>

<style scoped>
.archive-page { max-width: 880px; }
.spoken-note { margin: 0 0 20px; }

.ar-empty-note { color: var(--ink-soft); font-style: italic; margin: 12px 0; }

.ar-body { min-width: 0; }
.ar-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
.spr-actx .hit {
  background: color-mix(in srgb, var(--danger) 12%, transparent); color: var(--danger);
  border-bottom: 2px solid var(--danger); border-radius: 2px; padding: 0 1px;
}
</style>
