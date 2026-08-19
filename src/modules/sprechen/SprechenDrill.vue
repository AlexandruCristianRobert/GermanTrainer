<script setup lang="ts">
// Korrekturdrill (CONTEXT.md → "Correction drill"). Replays the learner's own
// Archived corrections and asks them to rewrite just the marked wording.
//
// Grading is DETERMINISTIC — foldGerman plus punctuation stripping, no AI, so
// it works offline (ADR-0007). A miss is not punitive: the reveal teaches, and
// the item stays open and returns in a later session.
//
// Every attempt appends a CorrectionEvent — mandatory, because ADR-0012
// derives drilled-ness from that table rather than a boolean on the row. The
// session ALSO saves one Run (ADR-0013), which is why one drilled correction
// leaves two records.
//
// Wiedervorlage (ADR-0025): a solved item returns after 3/10/30 days until it
// survives four spaced retrievals.
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { drillQueue, recordDrillResult } from '../../composables/useSprechenArchive'
import { saveQuizRun } from '../../composables/useQuizHistory'
import { foldGerman } from '../../composables/drillGrading'
import type { QueuedCorrection } from '../../composables/useSprechenArchive'
import type { SprechenErrorTag } from '../../composables/useQuizHistory'

const KIND_LABEL: Record<SprechenErrorTag, string> = {
  grammar: 'Grammatik', 'word-order': 'Wortstellung', vocabulary: 'Wortschatz',
  spelling: 'Rechtschreibung', register: 'Register'
}

const router = useRouter()
const items = ref<QueuedCorrection[]>([])
const loading = ref(true)
const index = ref(0)
const answer = ref('')
const verdict = ref<'correct' | 'wrong' | null>(null)
const firstTryCorrect = ref(0)
const attempted = ref(0)
const startedAt = Date.now()
const finished = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)
const nextBtnRef = ref<HTMLButtonElement | null>(null)

onMounted(async () => {
  try {
    items.value = await drillQueue(20)
  } catch {
    items.value = []
  }
  loading.value = false
  if (items.value.length > 0) nextTick(() => inputRef.value?.focus())
})

const current = computed(() => items.value[index.value] ?? null)

/** Tally of the error kinds served so far, for the Run's meta. */
const servedKinds = computed(() => {
  const counts: Partial<Record<SprechenErrorTag, number>> = {}
  for (const c of items.value.slice(0, attempted.value)) {
    counts[c.kind] = (counts[c.kind] ?? 0) + 1
  }
  return counts
})

/** Split the context on the wrong span so it can be marked inline. */
const parts = computed(() => {
  const c = current.value
  if (!c) return null
  const at = c.context.indexOf(c.quote)
  if (at < 0) return { before: '', hit: c.quote, after: '' }
  return {
    before: c.context.slice(0, at),
    hit: c.quote,
    after: c.context.slice(at + c.quote.length)
  }
})

function normalize(s: string): string {
  return foldGerman(s.replace(/[.,;:!?…„"']/g, '').replace(/\s+/g, ' ').trim().toLowerCase())
}

async function check() {
  const c = current.value
  if (!c || verdict.value !== null || !answer.value.trim()) return
  const ok = normalize(answer.value) === normalize(c.suggested)
  verdict.value = ok ? 'correct' : 'wrong'
  attempted.value += 1
  if (ok) firstTryCorrect.value += 1
  nextTick(() => nextBtnRef.value?.focus())
  // Non-fatal: a lost event costs the learner a drilled mark, nothing more.
  try { await recordDrillResult(c.id, ok) } catch { /* ignore */ }
}

function next() {
  answer.value = ''
  verdict.value = null
  if (index.value + 1 >= items.value.length) { finish(); return }
  index.value += 1
  nextTick(() => inputRef.value?.focus())
}

function finish() {
  finished.value = true
  const at = Date.now()
  saveQuizRun({
    type: 'sprechen-drill',
    startedAt: new Date(startedAt).toISOString(),
    finishedAt: new Date(at).toISOString(),
    durationMs: at - startedAt,
    count: attempted.value,
    // First-try only: an item missed here stays open and returns in a LATER
    // session, which is a different Run (ADR-0013).
    correct: firstTryCorrect.value,
    // Which error kinds this sitting actually served — Task 12 declared this
    // field, so write it rather than leaving it dead.
    meta: { sprechenDrilledKinds: servedKinds.value }
  })
}
</script>

<template>
  <div class="page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Sprechen · Fehlerarchiv</div>
        <h1 class="section-title">Korrekturdrill<em>.</em></h1>
        <p class="section-subtitle">
          Deine eigenen markierten Stellen, eine nach der anderen. Du tippst nur die
          Korrektur — nicht den ganzen Satz.
        </p>
      </div>
    </header>

    <p v-if="loading" class="loading-state">Archiv wird geladen …</p>

    <div v-else-if="items.length === 0" class="alert alert-info">
      <span class="alert-label">Nichts offen oder fällig</span>
      Es gibt gerade keine offenen oder fälligen Korrekturen. Führe eine
      Diskussion — markierte Fehler landen automatisch hier, und Nachgeübtes
      kommt nach 3, 10 und 30 Tagen wieder.
    </div>

    <div v-else-if="finished" class="spr-remed">
      <div class="spr-block-h">
        <h2 class="spr-block-t">Durch.</h2>
        <span class="spr-block-n">{{ firstTryCorrect }} von {{ attempted }} beim ersten Versuch</span>
      </div>
      <p class="spr-sub">
        Was du verfehlt hast, ist wieder offen; was du geschafft hast, kommt
        zur Wiedervorlage zurück.
      </p>
      <div class="setup-actions">
        <button class="btn btn-ghost" type="button"
          @click="router.push({ name: 'sprechen-archive' })">← Fehlerarchiv</button>
      </div>
    </div>

    <div v-else-if="current && parts" class="spr-remed">
      <div class="micro-mark">
        {{ index + 1 }} / {{ items.length }} ·
        {{ KIND_LABEL[current.kind] }} ·
        {{ current.topicTitle }}
        <template v-if="current.schedule.status === 'faellig'">
          · <span class="wv-badge">fällig · {{ current.schedule.streak + 1 }}. Wiederholung</span>
        </template>
      </div>

      <p class="spr-remed-ctx">
        {{ parts.before }}<span class="hit">{{ parts.hit }}</span>{{ parts.after }}
      </p>

      <input class="spr-remed-in" ref="inputRef" v-model="answer" :readonly="verdict !== null"
        placeholder="Wie muss die markierte Stelle heißen?"
        @keydown.enter.prevent="verdict === null ? check() : next()" />

      <div v-if="verdict === null" class="drill-advance">
        <button class="btn btn-accent" type="button" :disabled="!answer.trim()" @click="check">
          Prüfen
        </button>
      </div>

      <div v-else class="drill-feedback">
        <p class="feedback-line" :class="verdict === 'correct' ? 'correct' : 'wrong'">
          {{ verdict === 'correct' ? 'Richtig.' : 'Noch nicht.' }}
        </p>
        <div class="spr-mkcard">
          <div class="spr-mk-l">
            <span class="spr-mk-k">Du</span>
            <span class="spr-mk-wrong">{{ current.quote }}</span>
          </div>
          <div class="spr-mk-l">
            <span class="spr-mk-k">Besser</span>
            <span class="spr-mk-right">{{ current.suggested }}</span>
          </div>
          <p class="spr-mk-r">{{ current.reasonDe }}</p>
        </div>
        <button class="btn btn-accent drill-advance" ref="nextBtnRef" type="button" @click="next">
          {{ index + 1 >= items.length ? 'Abschließen' : 'Weiter' }}
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>

    <div class="setup-actions">
      <button class="btn btn-ghost" type="button"
        @click="router.push({ name: 'sprechen' })">← Sprechen</button>
    </div>
  </div>
</template>

<style scoped>
.wv-badge { color: var(--accent); }
</style>
