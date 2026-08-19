<script setup lang="ts">
//
// Fehlerarchiv (CONTEXT.md → "Error archive", "Archived correction") — one
// shared surface across Sprechen and Schreiben. Every graded Diskussion,
// Vortrag, Forumsbeitrag, and Nachricht is discarded once it's graded — this
// screen is what survives it: every marked mistake, forever, grouped by error
// tag so repetition becomes visible across runs. This is a READ-ONLY view over
// useSprechenArchive.ts, the archive's only door (ADR-0012) — nothing here
// ever imports `db` directly, and nothing here writes to the archive.
//
// Links to the Korrekturdrill (the practice run over these items) but does
// not build it — that is SprechenDrill.vue. This screen only shows what has
// accumulated and, per kind, how much of it has been re-practised.

import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  countsByKind, scheduleByCorrection, listCorrections,
  type ArchivedCorrection, type CorrectionSchedule
} from '../../composables/useSprechenArchive'
import type { SprechenErrorTag } from '../../composables/useQuizHistory'

const router = useRouter()
const route = useRoute()

const loading = ref(true)
const error = ref<string | null>(null)
const counts = ref<Record<SprechenErrorTag, number> | null>(null)
// ADR-0025 (Task 1): corrections absent from this map are offen — see
// statusOf() below. Every offen entry that IS present shares the composable's
// one frozen OFFEN object, so callers must never key on schedule identity.
const schedules = ref<Map<string, CorrectionSchedule>>(new Map())
const items = ref<ArchivedCorrection[]>([])
// The unfiltered set of every correction, fetched explicitly in loadAll() via
// listCorrections({}) — kept separate from `items` (which honors whatever
// selectedKind/selectedModule filter is active, including the route-query
// prefilter) so statusByKind and moduleCounts always see every correction.
const allCorrections = ref<ArchivedCorrection[]>([])
const selectedKind = ref<SprechenErrorTag | null>(null)
// ADR-0020: the archive now holds Schreiben corrections alongside Sprechen
// ones (module ?? 'sprechen' on read, see useSprechenArchive.ts). This chip
// row scopes every read below it, exactly like selectedKind does.
const selectedModule = ref<'sprechen' | 'schreiben' | null>(null)

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

// ADR-0020: counts for the module chip row, derived from `allCorrections`
// (the same unfiltered snapshot statusByKind reuses) so this never triggers a
// second archive read. Every row here is already normalised by
// listCorrections, so `.module` is never undefined.
const moduleCounts = computed<{ sprechen: number; schreiben: number }>(() => {
  const out = { sprechen: 0, schreiben: 0 }
  for (const c of allCorrections.value) {
    if (c.module === 'schreiben') out.schreiben += 1
    else out.sprechen += 1
  }
  return out
})

/** ADR-0025: a correction absent from `schedules` is offen — the composable
 *  never writes an explicit 'offen' entry for those, so this is the one
 *  place that fills the gap in. */
function statusOf(id: string): 'offen' | 'faellig' | 'nachgeuebt' {
  return schedules.value.get(id)?.status ?? 'offen'
}

/** Offen/fällig/nachgeübt counts per kind, derived from `allCorrections`
 *  joined against `schedules` — never a second read of either archive table. */
const statusByKind = computed(() => {
  const zero = () => ({ offen: 0, faellig: 0, nachgeuebt: 0 })
  const out: Record<SprechenErrorTag, { offen: number; faellig: number; nachgeuebt: number }> = {
    grammar: zero(), 'word-order': zero(), vocabulary: zero(), spelling: zero(), register: zero()
  }
  for (const c of allCorrections.value) out[c.kind][statusOf(c.id)] += 1
  return out
})

const openTotal = computed(() =>
  KIND_ORDER.reduce((a, k) => a + statusByKind.value[k].offen, 0)
)
const faelligTotal = computed(() =>
  KIND_ORDER.reduce((a, k) => a + statusByKind.value[k].faellig, 0)
)

/** Five segments, so the strip reads at a glance rather than exactly. Fällig
 *  counts as work asking to be done again, not done — only nachgeuebt fills
 *  the strip. */
function drilledSegments(kind: SprechenErrorTag): number {
  const total = counts.value?.[kind] ?? 0
  if (total === 0) return 0
  const done = statusByKind.value[kind].nachgeuebt
  return Math.round((done / total) * 5)
}

interface ArchiveRow {
  c: ArchivedCorrection
  before: string
  match: string
  after: string
  hasMatch: boolean
  status: 'offen' | 'faellig' | 'nachgeuebt'
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
      status: statusOf(c.id)
    }
  })
)

// Guards against a fast double-click on two tiles racing each other and the
// slower request overwriting the newer one's result.
let loadToken = 0
async function loadList() {
  const token = ++loadToken
  const filter: { kind?: SprechenErrorTag; module?: 'sprechen' | 'schreiben' } = {}
  if (selectedKind.value) filter.kind = selectedKind.value
  if (selectedModule.value) filter.module = selectedModule.value
  const result = await listCorrections(filter)
  if (token === loadToken) items.value = result
}

async function loadAll() {
  loading.value = true
  error.value = null
  try {
    const q = route.query.module
    if (q === 'schreiben' || q === 'sprechen') selectedModule.value = q
    const [c, s, all] = await Promise.all([countsByKind(), scheduleByCorrection(), listCorrections({})])
    counts.value = c
    schedules.value = s
    allCorrections.value = all
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

function selectModule(m: 'sprechen' | 'schreiben' | null) {
  selectedModule.value = m
  loadList().catch(e => {
    error.value = e instanceof Error ? e.message : 'Filter konnte nicht angewendet werden.'
  })
}

// History-aware: arriving here via a link (e.g. from the hub) should return
// there; arriving via a fresh tab/reload has no history to pop, so fall back
// to the Sprechen home instead of leaving the back button stranded.
function goBack() {
  if (window.history.length > 1) router.back()
  else router.push({ name: 'sprechen' })
}

onMounted(loadAll)
</script>

<template>
  <div class="page archive-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Goethe B2 · Fehlerarchiv</div>
        <h1 class="section-title">Fehlerarchiv<em>.</em></h1>
        <p class="section-subtitle">
          Jede bewertete Diskussion, jeder Vortrag, jeder Forumsbeitrag und jede Nachricht wird nach
          der Bewertung verworfen — deine markierten Fehler nicht. Hier stehen sie, sortiert nach
          Fehlerart, damit Wiederholung sichtbar wird.
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
          Nach einer bewerteten Diskussion, einem Vortrag, Forumsbeitrag oder einer Nachricht
          erscheinen deine markierten Fehler hier.
        </p>
        <button class="btn btn-accent" type="button" @click="router.push({ name: 'sprechen-teil2' })">
          Diskussion starten <span aria-hidden="true">→</span>
        </button>
      </div>
    </template>

    <template v-else>
      <div class="spr-kinds spr-modules">
        <button
          type="button" class="spr-mkind" :class="{ on: selectedModule === null }"
          @click="selectModule(null)"
        >
          <div class="spr-mkind-n spr-num">{{ totalCount }}</div>
          <div class="spr-mkind-t">Alle</div>
        </button>
        <button
          type="button" class="spr-mkind" :class="{ on: selectedModule === 'sprechen' }"
          :disabled="moduleCounts.sprechen === 0"
          @click="selectModule('sprechen')"
        >
          <div class="spr-mkind-n spr-num">{{ moduleCounts.sprechen }}</div>
          <div class="spr-mkind-t">Sprechen</div>
        </button>
        <button
          type="button" class="spr-mkind" :class="{ on: selectedModule === 'schreiben' }"
          :disabled="moduleCounts.schreiben === 0"
          @click="selectModule('schreiben')"
        >
          <div class="spr-mkind-n spr-num">{{ moduleCounts.schreiben }}</div>
          <div class="spr-mkind-t">Schreiben</div>
        </button>
      </div>

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
                <span
                  v-if="r.c.module === 'schreiben'" class="tag"
                  title="Aus einem Forumsbeitrag oder einer Nachricht (Schreiben) — Sprechen und Schreiben teilen sich das Fehlerarchiv."
                >Schreiben</span>
                <span class="tag" :class="{
                  'tag-success': r.status === 'nachgeuebt',
                  'tag-ochre': r.status === 'offen',
                  'tag-accent': r.status === 'faellig'
                }">
                  {{ r.status === 'nachgeuebt' ? 'nachgeübt' : r.status === 'faellig' ? 'fällig' : 'offen' }}
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

    <!-- Its own element ABOVE .setup-actions, not inside it: that container is a
         space-between flex row, which would strand this line at the far left on
         desktop and drop it under the button below 720px. Gated on a finished,
         non-empty load so it never flashes "Offen 0 · Fällig 0" while the two
         counts are still zero-initialised. -->
    <p v-if="!loading && !error && totalCount > 0" class="micro-mark ar-queue-note">Offen {{ openTotal }} · Fällig {{ faelligTotal }}</p>

    <div class="setup-actions">
      <button
        class="btn btn-accent" type="button"
        :disabled="openTotal + faelligTotal === 0" @click="router.push({ name: 'sprechen-drill' })"
      >
        Korrekturdrill starten <span aria-hidden="true">→</span>
      </button>
    </div>

    <div class="setup-actions">
      <button class="btn btn-ghost" type="button" @click="goBack">← Zurück</button>
    </div>
  </div>
</template>

<style scoped>
.archive-page { max-width: 880px; }
.spoken-note { margin: 0 0 20px; }

/* ADR-0020: the module chip row sits directly above the kind filter row and
   shares its container (.spr-kinds, from sprechen.css) so the two rows line
   up identically. Its buttons get their own .spr-mkind* rules — a deliberate
   near-duplicate of sprechen.css's .spr-kind* rules, kept distinct on
   purpose so tests/modules/SprechenArchive.test.ts's `.spr-kind` queries
   (which assume exactly 5 elements, one per Sprechen error tag) keep seeing
   only the kind-filter row. */
.spr-modules { margin-top: 32px; }
.spr-modules + .spr-kinds { border-top: 0; margin-top: 0; }

.spr-mkind {
  padding: 18px 18px 20px 0; border-right: 1px dotted var(--hairline);
  background: transparent; border-top: 0; border-bottom: 0; border-left: 0;
  text-align: left; font: inherit; color: inherit; cursor: pointer; transition: background .16s;
}
.spr-mkind:last-child { border-right: 0; }
.spr-mkind:hover { background: var(--accent-wash); }
.spr-mkind:disabled { opacity: .4; cursor: not-allowed; }
.spr-mkind:disabled:hover { background: transparent; }
.spr-mkind.on { background: var(--accent-tint); }
.spr-mkind-n {
  font-family: var(--font-display); font-size: 38px; font-weight: 500;
  letter-spacing: -.02em; line-height: 1; font-variant-numeric: tabular-nums;
}
.spr-mkind-t {
  font-family: var(--font-mono); font-size: 9.5px; letter-spacing: .16em;
  text-transform: uppercase; color: var(--mute); margin-top: 8px;
}

.ar-empty-note { color: var(--ink-soft); font-style: italic; margin: 12px 0; }

/* The Offen · Fällig line reads as a caption for the Korrekturdrill CTA, so it
   takes over .setup-actions' 40px top gap and sits tight above it — rather than
   being a flex child of that space-between row, where it would drift to the far
   left on desktop and slide under the button below 720px. */
.ar-queue-note { margin: 40px 0 0; }
.ar-queue-note + .setup-actions { margin-top: 8px; }

.ar-body { min-width: 0; }
.ar-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
.spr-actx .hit {
  background: color-mix(in srgb, var(--danger) 12%, transparent); color: var(--danger);
  border-bottom: 2px solid var(--danger); border-radius: 2px; padding: 0 1px;
}
</style>
