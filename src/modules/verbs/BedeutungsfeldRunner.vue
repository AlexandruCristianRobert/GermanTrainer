<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useVerbs } from '../../composables/useVerbs'
import { shuffle } from '../../data/pool'
import { buildMeaningFields, checkGermanTranslation, type MeaningField } from '../../composables/useVerbQuiz'
import { saveQuizRun } from '../../composables/useQuizHistory'
import { VERB_LEVELS, VERB_TYPES, VERB_CASES, type Verb, type VerbLevel, type VerbType, type VerbCase } from '../../data/verbs'

interface FieldResult {
  prompt: string
  ok: boolean
  members: Verb[]
}

interface LastOutcome {
  n: number
  ok: boolean
  prompt: string
  members: Verb[]
  hitDe?: string
  typed?: string
  typedMeaning?: string | null
  skipped?: boolean
}

const route = useRoute()
const router = useRouter()
const { filter, all } = useVerbs()

const loading = ref(true)
const error = ref<string | null>(null)
const deck = ref<MeaningField[]>([])
const idx = ref(0)
const input = ref('')
const streak = ref(0)
const results = ref<FieldResult[]>([])
const last = ref<LastOutcome | null>(null)
const flash = ref<'hit' | 'miss' | null>(null)
const startedAt = ref(0)
const inputEl = ref<HTMLInputElement | null>(null)

function csvFilter<T extends string>(raw: unknown, allowed: readonly T[]): T[] {
  if (typeof raw !== 'string' || raw.length === 0) return [...allowed]
  const set = new Set<string>(allowed)
  return raw.split(',').map(s => s.trim()).filter((x): x is T => set.has(x))
}

onMounted(() => {
  if (route.query.retry === '1') {
    // Legacy retry stash from the shared result page — rebuild fields from
    // the stashed verbs instead of sampling fresh ones.
    try {
      const raw = sessionStorage.getItem('gt:verbTranslationRetry')
      const stash = raw ? JSON.parse(raw) as { verbs?: Verb[] } : null
      const verbs = Array.isArray(stash?.verbs) ? stash.verbs : []
      if (verbs.length === 0) {
        error.value = 'Nothing to retry — start a fresh round from setup.'
      } else {
        deck.value = buildMeaningFields(shuffle(verbs), all(), verbs.length)
      }
    } catch {
      error.value = 'Nothing to retry — start a fresh round from setup.'
    }
  } else {
    const count = Math.max(1, parseInt((route.query.count as string) ?? '10', 10) || 10)
    const f = {
      levels: csvFilter<VerbLevel>(route.query.levels, VERB_LEVELS),
      types: csvFilter<VerbType>(route.query.types, VERB_TYPES),
      cases: csvFilter<VerbCase>(route.query.cases, VERB_CASES)
    }
    // Fields are drawn from the whole filtered pool: `count` caps how many
    // meanings get prompted, while synonyms absorb their twins into one field.
    const pool = filter(f)
    if (pool.length === 0) {
      error.value = 'No verbs match the selected filters.'
    } else {
      deck.value = buildMeaningFields(shuffle(pool), all(), count)
    }
  }
  startedAt.value = Date.now()
  loading.value = false
  nextTick(() => inputEl.value?.focus())
})

const finished = computed(() => deck.value.length > 0 && idx.value >= deck.value.length)
const current = computed(() => deck.value[idx.value] ?? null)
const okCount = computed(() => results.value.filter(r => r.ok).length)
const gaps = computed(() => results.value.filter(r => !r.ok))

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

let flashTimer: ReturnType<typeof setTimeout> | undefined
function setFlash(kind: 'hit' | 'miss') {
  flash.value = kind
  if (flashTimer) clearTimeout(flashTimer)
  flashTimer = setTimeout(() => { flash.value = null }, 500)
}
onBeforeUnmount(() => { if (flashTimer) clearTimeout(flashTimer) })

function advance(ok: boolean, extra: Partial<LastOutcome> = {}) {
  const f = deck.value[idx.value]
  if (!f) return
  results.value.push({ prompt: f.prompt, ok, members: f.members })
  streak.value = ok ? streak.value + 1 : 0
  last.value = { n: idx.value + 1, ok, prompt: f.prompt, members: f.members, ...extra }
  idx.value += 1
  input.value = ''
  if (idx.value >= deck.value.length) {
    finishRun()
  } else {
    nextTick(() => inputEl.value?.focus())
  }
}

function submit() {
  const t = input.value.trim()
  if (!t || !current.value) return
  const hit = current.value.members.find(m => checkGermanTranslation(t, m.german))
  if (hit) {
    setFlash('hit')
    advance(true, { hitDe: hit.german })
  } else {
    const known = all().find(v => checkGermanTranslation(t, v.german))
    setFlash('miss')
    advance(false, { typed: t, typedMeaning: known ? known.english : null })
  }
}

function skip() {
  advance(false, { skipped: true })
}

// The prototype doesn't persist runs; the app does — one history entry per
// finished round, counted in fields.
function finishRun() {
  const finishedAt = Date.now()
  const prompted = deck.value.map(f => f.members[0])
  const levels = Array.from(new Set(prompted.map(v => v.level))).sort()
  const types = Array.from(new Set(prompted.map(v => v.type))).sort()
  const cases = Array.from(new Set(prompted.map(v => v.case))).sort()
  saveQuizRun({
    type: 'verb-translation',
    startedAt: new Date(startedAt.value).toISOString(),
    finishedAt: new Date(finishedAt).toISOString(),
    durationMs: finishedAt - startedAt.value,
    count: deck.value.length,
    correct: okCount.value,
    meta: { levels, types, cases, verbDirection: 'en-de' }
  })
}

function endQuiz() { router.push({ name: 'verbs-translation' }) }
function goVerbs() { router.push({ name: 'verbs' }) }
</script>

<template>
  <div v-if="loading" class="page loading-state"><div class="micro-mark">Loading…</div></div>

  <div v-else-if="error" class="page">
    <div class="alert alert-danger">
      <span class="alert-label">Error</span>{{ error }}
    </div>
    <button class="btn btn-ghost" type="button" @click="endQuiz">← Back to setup</button>
  </div>

  <div v-else-if="finished" class="page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Kapitel III · Übersetzen · EN → DE</div>
        <h1 class="section-title">Auswertung<em>.</em></h1>
      </div>
      <div class="result-actions">
        <button class="btn btn-ghost" type="button" @click="goVerbs">← Verben</button>
        <button class="btn btn-accent" type="button" @click="endQuiz">Start another quiz →</button>
      </div>
    </header>

    <div class="spr-verdict vq-verdict-block">
      <div>
        <div class="spr-lbl">Felder getroffen</div>
        <div class="spr-vscore">{{ okCount }}<span class="denom"> / {{ results.length }}</span></div>
        <div class="spr-stamp" :class="okCount >= results.length * 0.6 ? 'pass' : 'fail'">
          {{ okCount === results.length ? 'alle Felder' : okCount + ' Felder' }}
        </div>
        <p class="spr-verdict-note">Ein Feld zählt, sobald du irgendein Verb daraus nennst — genau wie die Bewertung.</p>
      </div>
      <div>
        <div class="spr-lbl vq-gaps-lbl">Verfehlte Felder · {{ gaps.length }}</div>
        <div v-if="gaps.length > 0" class="vq-gaps">
          <div v-for="(r, i) in gaps" :key="i" class="vq-gap">
            <span class="vq-gap-m">{{ r.prompt }}</span>
            <span class="vq-gap-v">{{ r.members.map(m => m.german).join(' · ') }}</span>
          </div>
        </div>
        <p v-else class="spr-overall">Kein Feld verfehlt.</p>
      </div>
    </div>
  </div>

  <div v-else-if="current" class="page vq-run-page">
    <header class="section-header vq-head">
      <div>
        <div class="breadcrumb">Kapitel III · Übersetzen · EN → DE · Bedeutungsfeld</div>
        <h1 class="section-title vq-title">Übersetzung<em>.</em></h1>
      </div>
      <button class="btn btn-quiet" type="button" @click="endQuiz">End quiz</button>
    </header>

    <div class="vq-top">
      <div class="quiz-progress-bar vq-pips">
        <div v-for="(_, i) in deck" :key="i" class="pip" :class="{ current: i < idx }"></div>
      </div>
      <span class="quiz-counter">Feld {{ pad(idx + 1) }} / {{ pad(deck.length) }}</span>
      <span class="chip vq-streak" :class="{ hot: streak >= 3 }">Serie · {{ streak }}</span>
    </div>

    <div class="vq-card" :class="{ hit: flash === 'hit', miss: flash === 'miss' }">
      <div v-if="last" :key="last.n" class="vq-last" :class="last.ok ? 'ok' : 'miss'">
        <div class="vq-last-h">
          <span>Feld {{ pad(last.n) }}</span>
          <span class="vq-last-s">{{ last.ok ? '● richtig' : last.skipped ? '○ aufgedeckt' : '○ falsch' }}</span>
        </div>
        <div class="vq-last-m">{{ last.prompt }}</div>
        <div class="vq-last-v">
          <span
            v-for="m in last.members"
            :key="m.german"
            class="vq-last-verb"
            :class="{ hit: m.german === last.hitDe }"
          >{{ m.german }}</span>
        </div>
        <div v-if="!last.ok && !last.skipped" class="vq-last-n">
          „{{ last.typed }}"
          <template v-if="last.typedMeaning">heißt <em>{{ last.typedMeaning }}</em></template>
          <template v-else>kennt der Pool nicht</template>
        </div>
      </div>

      <div class="spr-lbl">Bedeutung</div>
      <div class="vq-meaning">{{ current.prompt }}</div>
      <p class="vq-sub">{{ current.members.length === 1 ? 'Ein Verb im Pool trägt diese Bedeutung.' : current.members.length + ' Verben im Pool tragen diese Bedeutung — jedes davon zählt.' }}</p>

      <div class="vq-slots">
        <div v-for="(m, i) in current.members" :key="m.german" class="vq-slot">
          <div class="vq-slot-de">?</div>
          <div class="vq-slot-c">Verb {{ i + 1 }}</div>
        </div>
      </div>

      <div class="vq-input-row">
        <input
          ref="inputEl"
          v-model="input"
          class="vq-input"
          type="text"
          placeholder="Deutsches Verb (Infinitiv) …"
          autocomplete="off"
          spellcheck="false"
          @keydown.enter.prevent="submit"
        />
        <button class="btn btn-accent" type="button" :disabled="!input.trim()" @click="submit">Prüfen →</button>
      </div>
      <div class="vq-foot">
        <span class="vq-hint">Enter prüft und zieht sofort das nächste Feld — das Ergebnis erscheint oben rechts.</span>
        <button class="btn btn-quiet" type="button" @click="skip">Aufdecken &amp; weiter</button>
      </div>
    </div>

    <p class="vq-legend">Die Karte oben rechts zeigt das letzte Feld: grün oder rot, mit allen Verben, die gezählt hätten.</p>
  </div>
</template>

<style scoped>
.loading-state { text-align: center; padding-top: 120px; }

.vq-run-page { max-width: 860px; }
.vq-head { margin-bottom: 10px; align-items: baseline; }
.vq-title { font-size: 40px; }

.vq-verdict-block { margin-top: 8px; }
.vq-gaps-lbl { display: block; margin-bottom: 12px; }
.spr-verdict-note { font-size: 13px; color: var(--mute); margin: 14px 0 0; line-height: 1.6; max-width: 220px; }

.result-actions { display: flex; gap: 12px; flex-wrap: wrap; }

@media (max-width: 720px) {
  .result-actions { flex-direction: column; align-items: stretch; }
  .result-actions .btn { justify-content: center; }
}
</style>
