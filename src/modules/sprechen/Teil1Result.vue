<script setup lang="ts">
// Sprechen Teil 1 — the Auswertung. One-time view fed from
// sessionStorage[VORTRAG_RESULT_KEY] (Teil1ResultStash, useVortragGrader.ts).
// See CONTEXT.md → "Vortrag", "Rede", "Nachfrage", "Gliederungspunkt". Markup
// and copy ported from the design source's Spr1Result, adapted where the data
// model differs (see the deviations noted inline below and ADR-0014).
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  VORTRAG_RESULT_KEY, type Teil1ResultStash, type VortragMistake, type Aufwertung
} from '../../composables/useVortragGrader'
import { reAnchor } from '../../composables/useSprechenGrader'
import { SPRECHEN_B2_TEIL1, sprechenDescriptor, sprechenNotes } from '../../data/rubrics'
import {
  GLIEDERUNGSPUNKTE, SPRECHEN_VORTRAGSMITTEL, KONNEKTOREN, VORTRAG_WPM, type GliederungKey
} from '../../data/sprechenVortragsmittel'
import { planSignals } from '../../composables/useVortragCoverage'
import { redezeit } from '../../composables/useVortragTimer'
import { countWords } from '../../composables/useSpeechRecognizer'
import type { HelpKind, Modality } from '../../data/sprechen'
import SprVortragYield from '../../components/sprechen/SprVortragYield.vue'

const router = useRouter()
const data = ref<Teil1ResultStash | null>(null)
const error = ref<string | null>(null)
const lang = ref<'de' | 'en'>('de')
const selected = ref<VortragMistake | null>(null)

const SETUP_KEY = 'sprechenTeil1Setup'

onMounted(() => {
  try {
    const raw = sessionStorage.getItem(VORTRAG_RESULT_KEY)
    if (!raw) {
      error.value =
        'Hier gibt es nichts zu sehen — die Auswertung wird nur einmal angezeigt, ' +
        'direkt nach einem Vortrag. Frühere Werte findest du im Verlauf.'
      return
    }
    data.value = JSON.parse(raw) as Teil1ResultStash
    const setup = JSON.parse(localStorage.getItem(SETUP_KEY) ?? '{}') as { lang?: 'de' | 'en' }
    if (setup.lang === 'en' || setup.lang === 'de') lang.value = setup.lang
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Auswertung konnte nicht geladen werden.'
  }
})

function setLang(l: 'de' | 'en') {
  lang.value = l
  try {
    const prev = JSON.parse(localStorage.getItem(SETUP_KEY) ?? '{}') as Record<string, unknown>
    localStorage.setItem(SETUP_KEY, JSON.stringify({ ...prev, lang: l }))
  } catch { /* ignore */ }
}

// ── Verdict ────────────────────────────────────────────────────────

const modality = computed<Modality>(() => data.value?.modality ?? 'typed')

/** §5.2 pattern, reused from Teil2Result.vue: read the descriptor verbatim via
 *  the shared resolver, never paraphrase it here. */
function descriptorFor(key: string): string {
  const def = SPRECHEN_B2_TEIL1.criteria.find(c => c.key === key)
  return def ? sprechenDescriptor(def, modality.value) : ''
}

const scopeNotes = computed(() => sprechenNotes(SPRECHEN_B2_TEIL1, modality.value))

// ── Header stats ────────────────────────────────────────────────────

const coveredCount = computed(
  () => data.value?.result.coverage.filter(c => c.covered).length ?? 0
)

const redezeitState = computed(() => redezeit({
  words: countWords(data.value?.rede.textDe ?? ''),
  seconds: data.value?.rede.seconds,
  modality: modality.value
}))

// ── SPRECHDATEN (F19) — the delivery evidence "kohaerenz" is partly graded
//    on, shown here so the learner sees what the grader saw. Spoken stashes
//    with a measured Redezeit only — a typed stash never had a clock, and
//    renders none of this. Every division guarded. ──

function clock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

interface Sprechdaten {
  redezeitClock: string
  gesamtdauerClock: string | null
  pausenzeitClock: string | null
  wpm: number
  restarts: number
}

const sprechdaten = computed<Sprechdaten | null>(() => {
  const rede = data.value?.rede
  if (!rede || modality.value !== 'spoken' || typeof rede.seconds !== 'number') return null
  const seconds = rede.seconds
  const minutes = seconds / 60
  const wpm = minutes > 0 ? Math.round(countWords(rede.textDe) / minutes) : 0
  const wallSeconds = rede.wallSeconds
  return {
    redezeitClock: clock(seconds),
    gesamtdauerClock: typeof wallSeconds === 'number' ? clock(wallSeconds) : null,
    pausenzeitClock: typeof wallSeconds === 'number' ? clock(Math.max(0, wallSeconds - seconds)) : null,
    wpm,
    restarts: rede.restarts ?? 0
  }
})

// ── Gliederung coverage — the grader's judgement beside the rail's own
//    keyword signal (ADR-0014). Deliberately NO word bar and NO per-point
//    word count: we do not have per-point word measurements and must not
//    invent them (see the design deviation note in the completion report). ──

interface CoverageRow {
  key: GliederungKey
  n: number
  labelDe: string
  covered: boolean
  note: string
  signalText: string
}

const coverageRows = computed<CoverageRow[]>(() => {
  if (!data.value) return []
  const signals = planSignals(data.value.plan, data.value.rede.textDe)
  const byKey = new Map(signals.map(s => [s.key, s]))
  return GLIEDERUNGSPUNKTE.map(p => {
    const cell = data.value!.result.coverage.find(c => c.key === p.key)
    const sig = byKey.get(p.key)
    const keyword = sig?.keyword ?? ''
    const signalText = keyword.length === 0
      ? 'kein Stichwort geplant'
      : sig?.said
        ? `gesagt: „${keyword}"`
        : `nicht gesagt: „${keyword}"`
    return {
      key: p.key,
      n: p.n,
      labelDe: p.labelDe,
      covered: cell?.covered ?? false,
      note: cell?.note ?? '',
      signalText
    }
  })
})

// ── Vortragsmittel-Ausbeute — the ids the runner already matched, not
//    re-derived here (they are exactly `stash.vortragsmittel`). ──

const yieldIds = computed(() => data.value?.vortragsmittel ?? [])

// ── Konnektoren-Ausbeute (F16) — local counting of the F10 Konnektoren data
//    against the Rede text, grouped by Stellung, cold groups named. Same
//    normalize semantics as useVortragCoverage's, so "said" agrees everywhere
//    on the page. A `wort` with alternatives ("Zum einen / zum anderen") hits
//    if either alternative was said. ──

function normalizeKonnektor(s: string): string {
  return s.replace(/[.,;:!?…]/g, '').replace(/\s+/g, ' ').trim().toLowerCase()
}

interface KonnektorRow { wort: string; hit: boolean }
interface KonnektorGroupRow { labelDe: string; hit: number; total: number; konnektoren: KonnektorRow[] }

const konnektorenYield = computed<KonnektorGroupRow[]>(() => {
  const hay = normalizeKonnektor(data.value?.rede.textDe ?? '')
  return KONNEKTOREN.map(g => {
    const konnektoren = g.konnektoren.map(k => {
      const forms = k.wort.split('/').map(f => normalizeKonnektor(f)).filter(f => f.length > 0)
      const hit = hay.length > 0 && forms.some(f => hay.includes(f))
      return { wort: k.wort, hit }
    })
    return {
      labelDe: g.labelDe,
      hit: konnektoren.filter(k => k.hit).length,
      total: konnektoren.length,
      konnektoren
    }
  })
})

const konnektorenTotals = computed(() => ({
  hit: konnektorenYield.value.reduce((s, g) => s + g.hit, 0),
  total: konnektorenYield.value.reduce((s, g) => s + g.total, 0)
}))

// ── Marked Rede + Nachfrage, mistake detail card ────────────────────

interface Seg { text: string; mistake?: VortragMistake }

/** §5.3 pattern, reused from Teil2Result.vue: re-anchor every mistake by
 *  searching the CURRENT anchor text — never trust the stored spanStart/
 *  spanEnd, which are only a snapshot from grade time. */
function segmentTurn(text: string, mistakes: VortragMistake[]): Seg[] {
  const anchored = mistakes
    .map(m => ({ m, span: reAnchor(m.quote, text) }))
    .filter(x => x.span.spanStart >= 0)
    .sort((a, b) => a.span.spanStart - b.span.spanStart)

  const segs: Seg[] = []
  let pos = 0
  for (const { m, span } of anchored) {
    if (span.spanStart < pos) continue // overlap — first wins
    if (span.spanStart > pos) segs.push({ text: text.slice(pos, span.spanStart) })
    segs.push({ text: text.slice(span.spanStart, span.spanEnd), mistake: m })
    pos = span.spanEnd
  }
  if (pos < text.length) segs.push({ text: text.slice(pos) })
  return segs
}

function mistakesForPhase(phase: VortragMistake['phase']): VortragMistake[] {
  return data.value?.result.mistakes.filter(m => m.phase === phase) ?? []
}

const redeSegments = computed(
  () => data.value ? segmentTurn(data.value.rede.textDe, mistakesForPhase('rede')) : []
)
const nachfrageSegments = computed(() =>
  data.value?.nachfrage ? segmentTurn(data.value.nachfrage.answerDe, mistakesForPhase('nachfrage')) : []
)

const mistakeCounts = computed(() => {
  const counts = new Map<string, number>()
  for (const m of data.value?.result.mistakes ?? []) {
    counts.set(m.kind, (counts.get(m.kind) ?? 0) + 1)
  }
  return [...counts.entries()]
})

const KIND_LABEL: Record<string, string> = {
  grammar: 'Grammatik', 'word-order': 'Wortstellung', vocabulary: 'Wortschatz',
  spelling: 'Rechtschreibung', register: 'Register'
}

// ── Aufwertungen — never errors, own block, never in mistakeCounts above ──

const aufwertungen = computed<Aufwertung[]>(() => data.value?.result.aufwertungen ?? [])

// ── Hilfe-Protokoll — descriptive only. PUNKT_MOVES/helpLog cannot attribute
//    a help to a Gliederungspunkt (ADR-0014), so this reports per-kind totals
//    plus a minute timeline relative to startedAt instead of per-point tallies. ──

const HELP_KIND_LABEL: Record<HelpKind, string> = {
  drawer: 'Hinweis-Schublade',
  phrase: 'Vortragsmittel eingefügt',
  rettungsleine: 'Rettungsleine',
  nudge: 'Move-Hinweis',
  kitipp: 'KI-Tipp',
  vorsprechen: 'Phrase vorgesprochen',
  stuck: 'Stockung erkannt'      // F6 — genuine stuck-detection, never conflated with Rettungsleine
}
const HELP_KINDS: HelpKind[] = ['drawer', 'phrase', 'rettungsleine', 'nudge', 'kitipp', 'vorsprechen', 'stuck']

// kiTippCount and the four help switches, as set for this run (F19) —
// descriptive, same posture as the Hilfe-Protokoll below.
const helpSwitchLabels = computed(() => {
  const h = data.value?.helps
  if (!h) return []
  return [
    `Hilfen ${h.hints ? 'an' : 'aus'}`,
    `Checkliste ${h.checklist ? 'an' : 'aus'}`,
    `KI-Tipp ${h.kiTipp ? 'an' : 'aus'}`,
    `Zeitlimit ${h.hardLimit ? 'hart' : 'weich'}`
  ]
})

const helpTotals = computed(() => {
  const counts = new Map<HelpKind, number>()
  for (const h of data.value?.helpLog ?? []) counts.set(h.kind, (counts.get(h.kind) ?? 0) + 1)
  return HELP_KINDS
    .map(k => ({ kind: k, label: HELP_KIND_LABEL[k], n: counts.get(k) ?? 0 }))
    .filter(row => row.n > 0)
})

// F6 — bounded to the Rede's own span: `Math.ceil` of the Rede's own
// startedAt→finishedAt duration in minutes. A stray helpLog entry outside
// that span (e.g. a resumed row logged long after) is dropped, not shown
// as a bucket of its own.
const helpByMinute = computed(() => {
  const log = data.value?.helpLog ?? []
  if (!data.value || log.length === 0) return []
  const { startedAt, finishedAt } = data.value
  const totalMinutes = Math.max(0, Math.ceil((finishedAt - startedAt) / 60000))
  if (totalMinutes === 0) return []
  const buckets = new Map<number, number>()
  for (const h of log) {
    const minute = Math.floor((h.at - startedAt) / 60000)
    if (minute < 0 || minute >= totalMinutes) continue
    buckets.set(minute, (buckets.get(minute) ?? 0) + 1)
  }
  return Array.from({ length: totalMinutes }, (_, m) => ({ minute: m, n: buckets.get(m) ?? 0 }))
})

// ── Navigation ───────────────────────────────────────────────────────

function newRun() { router.push({ name: 'sprechen-teil1' }) }
function home() { router.push({ name: 'sprechen' }) }
function openArchive() { router.push({ name: 'sprechen-archive' }) }
function openDrill() { router.push({ name: 'sprechen-drill' }) }
</script>

<template>
  <div v-if="error" class="page">
    <div class="alert alert-info"><span class="alert-label">Hinweis</span>{{ error }}</div>
    <button class="btn btn-ghost" type="button" @click="home">← Sprechen</button>
  </div>

  <div v-else-if="data" class="page result-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Sprechen Teil 1 · Etappe 04</div>
        <h1 class="section-title">Auswertung<em>.</em></h1>
        <p class="section-subtitle">
          „{{ data.thema.titleDe }}" · {{ coveredCount }} von {{ GLIEDERUNGSPUNKTE.length }}
          Gliederungspunkten · {{ redezeitState.clock }} Redezeit ·
          {{ data.nachfrage ? 'Nachfrage beantwortet.' : 'Keine Nachfrage gestellt.' }}
        </p>
      </div>
      <div class="result-actions">
        <div class="segmented lang-toggle">
          <button type="button" :class="{ active: lang === 'de' }" @click="setLang('de')">DE</button>
          <button type="button" :class="{ active: lang === 'en' }" @click="setLang('en')">EN</button>
        </div>
        <button class="btn btn-ghost" type="button" @click="home">Sprechen</button>
        <button class="btn btn-accent" type="button" @click="newRun">Neuer Vortrag <span aria-hidden="true">→</span></button>
      </div>
    </header>

    <div class="spr-verdict">
      <div>
        <div class="spr-lbl">Punkte</div>
        <div class="spr-vscore spr-num">
          {{ data.result.totalScore }}<span class="denom"> / {{ SPRECHEN_B2_TEIL1.totalMax }}</span>
        </div>
        <div class="spr-stamp" :class="data.result.passes ? 'pass' : 'fail'">
          {{ data.result.praedikat }}
        </div>
        <p class="spr-verdict-note">
          {{ scopeNotes }}
          <template v-if="modality === 'typed'">
            Die Redezeit wurde aus der Wortzahl geschätzt, nicht gemessen.
          </template>
          <template v-else-if="data.downgradedAt">
            Das Mikrofon ist mitten im Vortrag ausgefallen — von da an wurde
            getippt, die gemessene Redezeit bleibt trotzdem echt, nicht geschätzt.
          </template>
        </p>
      </div>
      <div class="spr-vgrid">
        <div v-for="c in data.result.criteria" :key="c.key" class="spr-vcrit">
          <div class="spr-vcrit-n">{{ c.labelDe }}</div>
          <div class="spr-vcrit-s spr-num">{{ c.score }}/{{ c.maxPoints }}</div>
          <div class="spr-vcrit-bar">
            <span class="spr-vcrit-fill" :style="{ width: `${(c.score / c.maxPoints) * 100}%` }" />
          </div>
          <p class="spr-vcrit-j">{{ lang === 'de' ? c.justificationDe : c.justificationEn }}</p>
          <p class="spr-vcrit-desc">{{ descriptorFor(c.key) }}</p>
        </div>
      </div>
    </div>

    <section v-if="sprechdaten" class="spr-block">
      <div class="spr-block-h"><h2 class="spr-block-t">SPRECHDATEN</h2></div>
      <div class="chip-row spr-counts">
        <span class="chip">Redezeit (gesprochen) · {{ sprechdaten.redezeitClock }}</span>
        <span v-if="sprechdaten.gesamtdauerClock" class="chip">Gesamtdauer · {{ sprechdaten.gesamtdauerClock }}</span>
        <span v-if="sprechdaten.pausenzeitClock" class="chip">Pausenzeit · {{ sprechdaten.pausenzeitClock }}</span>
        <span class="chip">{{ sprechdaten.wpm }} Wörter/Min · Ziel {{ VORTRAG_WPM }}</span>
        <span class="chip">{{ sprechdaten.restarts }} lange {{ sprechdaten.restarts === 1 ? 'Pause' : 'Pausen' }}</span>
      </div>
      <p class="spr-auf-note">
        Das ist die Grundlage, auf der „Kohärenz" bewertet wurde — Pausenzeit ist
        Denkzeit, die die Prüfung nicht gewähren würde.
      </p>
    </section>

    <section class="spr-block">
      <div class="spr-block-h">
        <h2 class="spr-block-t">Gliederung · abgehakt</h2>
        <span class="spr-block-n">{{ coveredCount }} von {{ GLIEDERUNGSPUNKTE.length }} Punkten</span>
      </div>
      <div class="spr-cov">
        <div v-for="r in coverageRows" :key="r.key" class="spr-cov-row">
          <span class="spr-mx-mark" :class="r.covered ? 'yes' : 'no'">{{ r.covered ? '●' : '○' }}</span>
          <span class="spr-cov-t">{{ String(r.n).padStart(2, '0') }} · {{ r.labelDe }}</span>
          <span class="spr-cov-say">{{ r.signalText }}</span>
          <span class="spr-cov-n">{{ r.note }}</span>
        </div>
      </div>
    </section>

    <section class="spr-block">
      <div class="spr-block-h">
        <h2 class="spr-block-t">Vortragsmittel-Ausbeute</h2>
        <span class="spr-block-n">{{ yieldIds.length }} von {{ SPRECHEN_VORTRAGSMITTEL.length }} · lokal gezählt</span>
      </div>
      <SprVortragYield :used-ids="yieldIds" note="In diesem Vortrag nicht wörtlich verwendet." />
    </section>

    <section class="spr-block">
      <div class="spr-block-h">
        <h2 class="spr-block-t">Konnektoren-Ausbeute</h2>
        <span class="spr-block-n">{{ konnektorenTotals.hit }} von {{ konnektorenTotals.total }} · lokal gezählt</span>
      </div>
      <div class="spr-knt">
        <div v-for="g in konnektorenYield" :key="g.labelDe" class="spr-knt-group">
          <div class="spr-knt-h">
            <span class="spr-knt-t">{{ g.labelDe }}</span>
            <span class="spr-knt-n spr-num">{{ g.hit }}/{{ g.total }}</span>
          </div>
          <div class="spr-knt-words">
            <span v-for="k in g.konnektoren" :key="k.wort" class="spr-knt-w" :class="{ on: k.hit }">{{ k.wort }}</span>
          </div>
          <p v-if="g.hit === 0" class="spr-knt-cold">„‚{{ g.labelDe }}' — nie benutzt.</p>
        </div>
      </div>
    </section>

    <section class="spr-block">
      <div class="spr-block-h"><h2 class="spr-block-t">Vortrag · deine Fehler markiert</h2></div>
      <div class="spr-proto">
        <div class="spr-turn learner">
          <div class="spr-turn-m">Vortrag</div>
          <div class="spr-turn-b">
            <template v-for="(seg, si) in redeSegments" :key="si">
              <button v-if="seg.mistake" type="button" class="spr-mistake"
                :class="{ sel: selected === seg.mistake }"
                @click="selected = selected === seg.mistake ? null : seg.mistake">{{ seg.text }}</button>
              <span v-else>{{ seg.text }}</span>
            </template>
          </div>
        </div>
        <template v-if="data.nachfrage">
          <div class="spr-turn partner">
            <div class="spr-turn-m">Nachfrage</div>
            <div class="spr-turn-b">{{ data.nachfrage.questionDe }}</div>
          </div>
          <div class="spr-turn learner">
            <div class="spr-turn-m">Deine Antwort</div>
            <div class="spr-turn-b">
              <template v-for="(seg, si) in nachfrageSegments" :key="si">
                <button v-if="seg.mistake" type="button" class="spr-mistake"
                  :class="{ sel: selected === seg.mistake }"
                  @click="selected = selected === seg.mistake ? null : seg.mistake">{{ seg.text }}</button>
                <span v-else>{{ seg.text }}</span>
              </template>
            </div>
          </div>
        </template>
      </div>

      <div v-if="selected" class="spr-mkcard">
        <div class="spr-mk-l"><span class="spr-mk-k">Art</span><span class="tag tag-clay">{{ KIND_LABEL[selected.kind] ?? selected.kind }}</span></div>
        <div class="spr-mk-l"><span class="spr-mk-k">Du</span><span class="spr-mk-wrong">{{ selected.quote }}</span></div>
        <div class="spr-mk-l"><span class="spr-mk-k">Besser</span><span class="spr-mk-right">{{ selected.suggested }}</span></div>
        <div class="spr-mk-l"><span class="spr-mk-k">Warum</span><span class="spr-mk-why">{{ lang === 'de' ? selected.reasonDe : selected.reasonEn }}</span></div>
      </div>

      <div class="chip-row spr-counts">
        <span v-for="[kind, n] in mistakeCounts" :key="kind" class="chip">{{ KIND_LABEL[kind] ?? kind }} · {{ n }}</span>
        <span v-if="mistakeCounts.length === 0" class="chip">Keine markierten Fehler ✓</span>
      </div>
    </section>

    <section v-if="aufwertungen.length > 0" class="spr-block spr-auf">
      <div class="spr-block-h">
        <h2 class="spr-block-t">Aufwertungen</h2>
        <span class="spr-block-n">{{ aufwertungen.length }} Stelle{{ aufwertungen.length === 1 ? '' : 'n' }}</span>
      </div>
      <p class="spr-auf-note">Keine Fehler — so klingt es auf B2 besser.</p>
      <div v-for="(a, i) in aufwertungen" :key="i" class="spr-auf-item">
        <div class="spr-mk-l"><span class="spr-mk-k">Du</span><span class="spr-auf-quote">{{ a.quote }}</span></div>
        <div class="spr-mk-l"><span class="spr-mk-k">Besser</span><span class="spr-auf-better">{{ a.better }}</span></div>
        <p class="spr-mk-r">{{ lang === 'de' ? a.whyDe : a.whyEn }}</p>
      </div>
    </section>

    <section class="spr-block">
      <div class="spr-block-h"><h2 class="spr-block-t">Nachfrage</h2></div>
      <p v-if="data.nachfrage" class="spr-overall">
        Die Nachfrage wurde gestellt und beantwortet — deine Antwort ist oben im
        Vortragsprotokoll markiert.
      </p>
      <p v-else class="spr-overall">
        Es wurde keine Nachfrage gestellt. „Erfüllung / Gliederung" wurde dafür
        nicht negativ bewertet.
      </p>
    </section>

    <section class="spr-block">
      <div class="spr-block-h">
        <h2 class="spr-block-t">Hilfe-Protokoll</h2>
        <span class="spr-block-n">{{ data.helpLog.length }} Einträge</span>
      </div>
      <div class="chip-row spr-counts">
        <span class="chip">{{ data.kiTippCount }} KI-Tipp{{ data.kiTippCount === 1 ? '' : 's' }} verwendet</span>
        <span v-for="label in helpSwitchLabels" :key="label" class="chip">{{ label }}</span>
      </div>
      <div class="chip-row spr-counts">
        <span v-for="row in helpTotals" :key="row.kind" class="chip">{{ row.label }} · {{ row.n }}×</span>
        <span v-if="helpTotals.length === 0" class="chip">Keine Hilfe verwendet</span>
      </div>
      <div v-if="helpByMinute.length > 0" class="spr-helpmin">
        <span v-for="b in helpByMinute" :key="b.minute" class="spr-helpmin-b">
          <span class="spr-helpmin-n spr-num">{{ b.n }}</span>
          <span class="spr-helpmin-l">Min {{ b.minute }}</span>
        </span>
      </div>
      <p class="spr-auf-note">
        Dieses Protokoll ist rein beschreibend — es fließt in keine Bewertung ein.
      </p>
    </section>

    <section class="spr-block">
      <div class="spr-block-h"><h2 class="spr-block-t">Stärken &amp; Schwächen</h2></div>
      <div class="spr-sw">
        <section>
          <h3 class="spr-lbl">Stärken</h3>
          <ul class="spr-swlist"><li v-for="(s, i) in data.result.strengths" :key="i">{{ lang === 'de' ? s.de : s.en }}</li></ul>
        </section>
        <section>
          <h3 class="spr-lbl">Schwächen</h3>
          <ul class="spr-swlist"><li v-for="(w, i) in data.result.weaknesses" :key="i">{{ lang === 'de' ? w.de : w.en }}</li></ul>
        </section>
      </div>
    </section>

    <section class="spr-block">
      <div class="spr-block-h"><h2 class="spr-block-t">Gesamturteil</h2></div>
      <p class="spr-overall">{{ lang === 'de' ? data.result.overallDe : data.result.overallEn }}</p>

      <div class="alert alert-info spr-archive-cta">
        <span class="alert-label">Fehlerarchiv</span>
        Vortrag, Diskussion und Forumsbeitrag schreiben ins selbe Archiv — der Korrekturdrill mischt alle drei.
        <div class="spr-archive-actions">
          <button class="btn btn-ghost" type="button" @click="openArchive">Archiv öffnen</button>
          <button class="btn btn-accent" type="button" @click="openDrill">Korrekturdrill starten <span aria-hidden="true">→</span></button>
        </div>
      </div>
    </section>
  </div>

  <div v-else class="page loading-state"><div class="micro-mark">Loading…</div></div>
</template>

<style scoped>
.spr-verdict-note {
  font-size: 13px; color: var(--mute); margin: 14px 0 0; line-height: 1.6; max-width: 220px;
}

/* Coverage row loses the design's word-bar/word-count columns (no per-point
   word measurement — ADR-0014) in favour of one keyword-signal column, so
   the shared 5-column grid from sprechen.css is overridden down to 4 here. */
.spr-cov-row { grid-template-columns: 18px minmax(0, 1fr) minmax(0, 200px) minmax(0, 1.3fr); }
.spr-cov-say { font-family: var(--font-mono); font-size: 11px; color: var(--ink-soft); white-space: nowrap; }

.spr-mk-why { font-size: 14px; line-height: 1.55; }

/* Aufwertungen — styled in clay, never danger, so a B2-typischere suggestion
   never reads as an error. */
.spr-auf-note { margin: 0 0 4px; font-size: 13px; font-style: italic; color: var(--mute); }
.spr-auf-item {
  margin: 14px 0 0; padding: 15px 18px; background: var(--paper-deep);
  border-left: 2px solid var(--clay); display: flex; flex-direction: column; gap: 8px;
}
.spr-auf-quote { color: var(--clay); }
.spr-auf-better { color: var(--success); font-family: var(--font-display); font-size: 17px; }

/* Konnektoren-Ausbeute (F16) — its own classes, not the Vortragsmittel-Yield's
   `.spr-yield`/`.spr-ymove`, so the two blocks' element counts never conflate
   in a test, and because the words themselves (not abstract ticks) are what
   must show as dimmed/lit here. */
.spr-knt { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 22px 30px; margin-top: 20px; }
.spr-knt-group { min-width: 0; }
.spr-knt-h { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; border-bottom: 1px solid var(--hairline); padding-bottom: 6px; }
.spr-knt-t { font-family: var(--font-display); font-size: 15.5px; font-weight: 500; letter-spacing: -0.01em; }
.spr-knt-n { font-family: var(--font-mono); font-size: 10.5px; color: var(--mute); }
.spr-knt-words { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
.spr-knt-w { font-size: 12.5px; padding: 3px 8px; color: var(--mute); background: var(--paper-deep); }
.spr-knt-w.on { color: var(--ink); background: var(--accent); }
.spr-knt-cold { font-size: 12.5px; font-style: italic; color: var(--mute); margin: 9px 0 0; line-height: 1.5; }

.spr-helpmin { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 16px; }
.spr-helpmin-b { display: flex; flex-direction: column; gap: 2px; min-width: 44px; }
.spr-helpmin-n { font-family: var(--font-display); font-size: 20px; font-weight: 500; line-height: 1; }
.spr-helpmin-l {
  font-family: var(--font-mono); font-size: 9px; letter-spacing: 0.14em;
  text-transform: uppercase; color: var(--mute);
}

.spr-archive-cta { margin-top: 24px; }
.spr-archive-actions { margin-top: 10px; display: flex; gap: 10px; flex-wrap: wrap; }

@media (max-width: 1080px) {
  .spr-cov-row {
    grid-template-columns: 18px minmax(0, 1fr) minmax(0, 1fr);
    row-gap: 8px;
  }
  .spr-cov-t { grid-column: 2 / -1; grid-row: 1; }
  .spr-cov-say { grid-column: 2; grid-row: 2; }
  .spr-cov-n { grid-column: 2 / -1; grid-row: 3; }
}
</style>
