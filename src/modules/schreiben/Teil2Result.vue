<script setup lang="ts">
// Schreiben Teil 2 — die Auswertung. One-time view fed from
// sessionStorage[NACHRICHT_RESULT_KEY] (NachrichtResultStash,
// useNachrichtGrader.ts). See CONTEXT.md → "Nachricht", "Schreibauftrag",
// "Inhaltspunkt", "Schreibplan", "Nachrichtenmittel", "Schreibanlass".
// Structural twin of Teil1Result.vue (Forumsbeitrag), section for section —
// same ADR-0019 discipline: the graded Nachricht text itself is NEVER stashed
// here (only its derived score/coverage/mistakes/aufwertungen survive), so
// there is no marked transcript to click through. Every mistake and
// Aufwertung gets its own always-visible card, exactly as in Teil 1.
//
// Two divergences from Teil 1, both consequences of the genre (CONTEXT.md →
// "Nachricht", "Schreibanlass"): the header carries an Anlass badge (a
// Nachricht answers exactly one Schreibanlass — ADR-0023), and the actions
// row gains a "Musternachricht ansehen" link into the matching worked example
// for that same Anlass — the post-grade study loop this genre gets that a
// Forumsbeitrag does not (Teil 1 has no per-Anlass model text to point at).
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { NACHRICHT_RESULT_KEY, type NachrichtResultStash, type NachrichtMistake } from '../../composables/useNachrichtGrader'
import type { Aufwertung } from '../../composables/useVortragGrader'
import { SCHREIBEN_B2_TEIL2 } from '../../data/rubrics'
import { NACHRICHT_MOVES, NACHRICHT_MOVE_LABEL, SCHREIBEN_NACHRICHTENMITTEL } from '../../data/schreibenNachrichtenMittel'
import { ANLASS_LABEL } from '../../data/schreibenAuftraege'
import { NACHRICHT_MUSTER_TITLE } from '../../data/schreibenMusterNachrichten'
import type { HelpKind } from '../../data/sprechen'
import SchrNachrichtYield from '../../components/schreiben/SchrNachrichtYield.vue'

const router = useRouter()
const data = ref<NachrichtResultStash | null>(null)
const error = ref<string | null>(null)
const lang = ref<'de' | 'en'>('de')

const SETUP_KEY = 'schreibenTeil2Setup'

onMounted(() => {
  try {
    const raw = sessionStorage.getItem(NACHRICHT_RESULT_KEY)
    if (!raw) {
      error.value =
        'Hier gibt es nichts zu sehen — die Auswertung wird nur einmal angezeigt, ' +
        'direkt nach einer Nachricht. Frühere Werte findest du im Verlauf.'
      return
    }
    data.value = JSON.parse(raw) as NachrichtResultStash
    const setup = JSON.parse(localStorage.getItem(SETUP_KEY) ?? '{}') as { lang?: 'de' | 'en' }
    if (setup.lang === 'en' || setup.lang === 'de') lang.value = setup.lang
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Auswertung konnte nicht geladen werden.'
  }
})

// Task 12's Setup owns `schreibenTeil2Setup` — the same merge-write
// discipline as Teil1Result.vue's setLang(): read whatever is already there,
// touch only `lang`, write the rest back untouched.
function setLang(l: 'de' | 'en') {
  lang.value = l
  try {
    const prev = JSON.parse(localStorage.getItem(SETUP_KEY) ?? '{}') as Record<string, unknown>
    localStorage.setItem(SETUP_KEY, JSON.stringify({ ...prev, lang: l }))
  } catch { /* ignore */ }
}

// ── Verdict ────────────────────────────────────────────────────────

/** Same discipline as Teil1Result.vue's descriptorFor(): the rubric
 *  descriptor is read verbatim through the shared rubric, never paraphrased
 *  here. Schreiben has no Modality, so there is only ever the one (typed)
 *  wording. */
function descriptorFor(key: string): string {
  return SCHREIBEN_B2_TEIL2.criteria.find(c => c.key === key)?.descriptorDe ?? ''
}

// ── Inhaltspunkte coverage — the grader's judgement (data.result.coverage)
//    beside the planned keyword, shown as plain text. The Nachricht text
//    itself is NOT in the stash (ADR-0019), so the keyword is shown only as
//    what was planned, never as a said/unsaid claim re-derived from text that
//    is not here.
//
//    Rendering caveat: a coverage note about the RAHMEN (fehlende Anrede,
//    fehlende Grußformel, fehlender Betreff — see useNachrichtGrader.ts) can
//    land on any one of the four Inhaltspunkte, not necessarily the one it
//    reads as being "about". `note` is rendered here as plain grader
//    commentary per row, exactly like Teil 1's — no UI here assumes the note
//    only ever concerns that row's own content point. ──

interface CoverageRow {
  index: number
  punkt: string
  covered: boolean
  note: string
  keywordText: string
}

const coveredCount = computed(
  () => data.value?.result.coverage.filter(c => c.covered).length ?? 0
)

const coverageRows = computed<CoverageRow[]>(() => {
  if (!data.value) return []
  const planByIndex = new Map(data.value.plan.map(p => [p.index, p.keyword]))
  return data.value.result.coverage.map(c => {
    const keyword = (planByIndex.get(c.index) ?? '').trim()
    return {
      index: c.index,
      punkt: c.punkt,
      covered: c.covered,
      note: c.note,
      keywordText: keyword.length === 0 ? 'kein Stichwort geplant' : `geplant: „${keyword}"`
    }
  })
})

// ── Korrekturen / Aufwertungen — no marked transcript (no Nachricht text in
//    the stash), so every mistake and Aufwertung is its own always-visible
//    card instead of a click-to-reveal span. `register` carries real weight
//    here (du/Sie-Brüche, saloppe Abkürzungen) — same KIND_LABEL map as
//    Teil 1, just actually populated this time. ──

const KIND_LABEL: Record<string, string> = {
  grammar: 'Grammatik', 'word-order': 'Wortstellung', vocabulary: 'Wortschatz',
  spelling: 'Rechtschreibung', register: 'Register'
}

const mistakes = computed<NachrichtMistake[]>(() => data.value?.result.mistakes ?? [])
const aufwertungen = computed<Aufwertung[]>(() => data.value?.result.aufwertungen ?? [])

const mistakeCounts = computed(() => {
  const counts = new Map<string, number>()
  for (const m of mistakes.value) counts.set(m.kind, (counts.get(m.kind) ?? 0) + 1)
  return [...counts.entries()]
})

// ── Nachrichtenmittel-Ausbeute — the ids the runner already matched (exactly
//    `stash.nachrichtenmittel`), plus a per-Move count strip alongside the
//    SchrNachrichtYield ticks, mirroring Teil 1's Schreibmittel-Ausbeute
//    header stat one level more granular. ──

const yieldIds = computed(() => data.value?.nachrichtenmittel ?? [])

interface MoveCountRow { move: string; labelDe: string; hit: number; total: number }

const moveCounts = computed<MoveCountRow[]>(() => {
  const used = yieldIds.value
  return NACHRICHT_MOVES.map(m => {
    const phrases = SCHREIBEN_NACHRICHTENMITTEL.filter(p => p.move === m)
    return {
      move: m,
      labelDe: NACHRICHT_MOVE_LABEL[m].de,
      hit: phrases.filter(p => used.includes(p.id)).length,
      total: phrases.length
    }
  })
})

// ── Hilfe-Protokoll — descriptive only, never scored. Same four kinds and
//    fixed order as Teil 1 (no Rettungsleine/Vorsprechen/Stuck — those are
//    spoken-Vortrag-only signals). Per-minute strip is the identical F6
//    pattern from sprechen/Teil1Result.vue, bounded to startedAt→finishedAt. ──

type SchreibHelpKind = 'drawer' | 'phrase' | 'nudge' | 'kitipp'

const HELP_KIND_LABEL: Record<SchreibHelpKind, string> = {
  drawer: 'Hinweis-Schublade',
  phrase: 'Nachrichtenmittel eingefügt',
  nudge: 'Move-Hinweis',
  kitipp: 'KI-Tipp'
}
const HELP_KINDS: SchreibHelpKind[] = ['drawer', 'phrase', 'nudge', 'kitipp']

const helpTotals = computed(() => {
  const counts = new Map<HelpKind, number>()
  for (const h of data.value?.helpLog ?? []) counts.set(h.kind, (counts.get(h.kind) ?? 0) + 1)
  return HELP_KINDS
    .map(k => ({ kind: k, label: HELP_KIND_LABEL[k], n: counts.get(k) ?? 0 }))
    .filter(row => row.n > 0)
})

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

function newRun() { router.push({ name: 'schreiben-teil2' }) }
function home() { router.push({ name: 'schreiben' }) }
function openArchive() { router.push({ name: 'sprechen-archive' }) }
function openDrill() { router.push({ name: 'sprechen-drill' }) }

/** The post-grade study loop: jump straight to the Musternachricht for the
 *  same Anlass this run just answered. */
function openMuster() {
  if (!data.value) return
  router.push({ name: 'schreiben-muster-teil2', query: { muster: data.value.auftrag.anlass } })
}
</script>

<template>
  <div v-if="error" class="page">
    <div class="alert alert-info"><span class="alert-label">Hinweis</span>{{ error }}</div>
    <button class="btn btn-ghost" type="button" @click="home">← Schreiben</button>
  </div>

  <div v-else-if="data" class="page result-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Schreiben Teil 2 · Nachricht</div>
        <h1 class="section-title">Auswertung<em>.</em></h1>
        <p class="section-subtitle">
          „{{ data.auftrag.titleDe }}" ·
          <span class="tag tag-accent">{{ ANLASS_LABEL[data.auftrag.anlass].de }}</span> ·
          {{ coveredCount }} von {{ data.result.coverage.length }}
          Inhaltspunkten · {{ data.wordCount }} Wörter.
        </p>
      </div>
      <div class="result-actions">
        <div class="segmented lang-toggle">
          <button type="button" :class="{ active: lang === 'de' }" @click="setLang('de')">DE</button>
          <button type="button" :class="{ active: lang === 'en' }" @click="setLang('en')">EN</button>
        </div>
        <button class="btn btn-ghost" type="button" @click="home">Zur Übersicht</button>
        <button class="btn btn-ghost" type="button" @click="openMuster">
          Musternachricht ansehen: „{{ NACHRICHT_MUSTER_TITLE[data.auftrag.anlass] }}"
        </button>
        <button class="btn btn-accent" type="button" @click="newRun">Neue Nachricht <span aria-hidden="true">→</span></button>
      </div>
    </header>

    <div class="spr-verdict">
      <div>
        <div class="spr-lbl">Punkte</div>
        <div class="spr-vscore spr-num">
          {{ data.result.totalScore }}<span class="denom"> / {{ SCHREIBEN_B2_TEIL2.totalMax }}</span>
        </div>
        <div class="spr-stamp" :class="data.result.passes ? 'pass' : 'fail'">
          {{ data.result.praedikat }}
        </div>
        <p class="spr-verdict-note">{{ SCHREIBEN_B2_TEIL2.notes }}</p>
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

    <section class="spr-block">
      <div class="spr-block-h">
        <h2 class="spr-block-t">Inhaltspunkte · abgehakt</h2>
        <span class="spr-block-n">{{ coveredCount }} von {{ data.result.coverage.length }} Punkten</span>
      </div>
      <div class="spr-cov">
        <div v-for="r in coverageRows" :key="r.index" class="spr-cov-row">
          <span class="spr-mx-mark" :class="r.covered ? 'yes' : 'no'">{{ r.covered ? '●' : '○' }}</span>
          <span class="spr-cov-t">{{ String(r.index + 1).padStart(2, '0') }} · {{ r.punkt }}</span>
          <span class="spr-cov-say">{{ r.keywordText }}</span>
          <span class="spr-cov-n">{{ r.note }}</span>
        </div>
      </div>
    </section>

    <section class="spr-block">
      <div class="spr-block-h">
        <h2 class="spr-block-t">Korrekturen</h2>
        <span class="spr-block-n">{{ mistakes.length }} Fehler</span>
      </div>

      <div v-if="mistakes.length === 0" class="chip-row spr-counts">
        <span class="chip">Keine markierten Fehler ✓</span>
      </div>
      <div v-for="(m, i) in mistakes" :key="i" class="spr-mkcard">
        <div class="spr-mk-l"><span class="spr-mk-k">Art</span><span class="tag tag-clay">{{ KIND_LABEL[m.kind] ?? m.kind }}</span></div>
        <div class="spr-mk-l"><span class="spr-mk-k">Du</span><span class="spr-mk-wrong">{{ m.quote }}</span></div>
        <div class="spr-mk-l"><span class="spr-mk-k">Besser</span><span class="spr-mk-right">{{ m.suggested }}</span></div>
        <div class="spr-mk-l"><span class="spr-mk-k">Warum</span><span class="spr-mk-why">{{ lang === 'de' ? m.reasonDe : m.reasonEn }}</span></div>
      </div>

      <div v-if="mistakes.length > 0" class="chip-row spr-counts">
        <span v-for="[kind, n] in mistakeCounts" :key="kind" class="chip">{{ KIND_LABEL[kind] ?? kind }} · {{ n }}</span>
      </div>

      <div class="alert alert-info spr-archive-cta">
        <span class="alert-label">Fehlerarchiv</span>
        Diese Fehler liegen jetzt im Fehlerarchiv — Vortrag, Diskussion, Forumsbeitrag
        und Nachricht schreiben ins selbe Archiv, der Korrekturdrill mischt alle vier.
        <div class="spr-archive-actions">
          <button class="btn btn-ghost" type="button" @click="openArchive">Archiv öffnen</button>
          <button class="btn btn-accent" type="button" @click="openDrill">Korrekturdrill starten <span aria-hidden="true">→</span></button>
        </div>
      </div>
    </section>

    <section v-if="aufwertungen.length > 0" class="spr-block spr-auf">
      <div class="spr-block-h">
        <h2 class="spr-block-t">Aufwertungen</h2>
        <span class="spr-block-n">{{ aufwertungen.length }} Stelle{{ aufwertungen.length === 1 ? '' : 'n' }}</span>
      </div>
      <p class="spr-auf-note">Keine Fehler — war nicht falsch, klingt so aber B2-typischer.</p>
      <div v-for="(a, i) in aufwertungen" :key="i" class="spr-auf-item">
        <div class="spr-mk-l"><span class="spr-mk-k">Du</span><span class="spr-auf-quote">{{ a.quote }}</span></div>
        <div class="spr-mk-l"><span class="spr-mk-k">Besser</span><span class="spr-auf-better">{{ a.better }}</span></div>
        <p class="spr-mk-r">{{ lang === 'de' ? a.whyDe : a.whyEn }}</p>
      </div>
    </section>

    <section class="spr-block">
      <div class="spr-block-h">
        <h2 class="spr-block-t">Nachrichtenmittel-Ausbeute</h2>
        <span class="spr-block-n">{{ yieldIds.length }} von {{ SCHREIBEN_NACHRICHTENMITTEL.length }} · lokal gezählt</span>
      </div>
      <SchrNachrichtYield :used-ids="yieldIds" note="In dieser Nachricht nicht vorgekommen." />
      <div class="chip-row spr-counts">
        <span v-for="r in moveCounts" :key="r.move" class="chip">{{ r.labelDe }} · {{ r.hit }}/{{ r.total }}</span>
      </div>
    </section>

    <section class="spr-block">
      <div class="spr-block-h"><h2 class="spr-block-t">Hilfe-Protokoll</h2></div>
      <div class="chip-row spr-counts">
        <span class="chip">{{ data.kiTippCount }} KI-Tipp{{ data.kiTippCount === 1 ? '' : 's' }} verwendet</span>
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
    </section>
  </div>

  <div v-else class="page loading-state"><div class="micro-mark">Loading…</div></div>
</template>

<style scoped>
.spr-verdict-note {
  font-size: 13px; color: var(--mute); margin: 14px 0 0; line-height: 1.6; max-width: 220px;
}

/* Coverage row loses the design's word-bar/word-count columns and sprechen's
   said/unsaid signal (no Nachricht text in the stash — ADR-0019) in favour of
   one plain "planned keyword" text column, so the shared 5-column grid from
   sprechen.css is overridden down to 4 here — same override Teil1Result.vue
   applies for its own (identical) reason. */
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

.spr-helpmin { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 16px; }
.spr-helpmin-b { display: flex; flex-direction: column; gap: 2px; min-width: 44px; }
.spr-helpmin-n { font-family: var(--font-display); font-size: 20px; font-weight: 500; line-height: 1; }
.spr-helpmin-l {
  font-family: var(--font-mono); font-size: 9px; letter-spacing: 0.14em;
  text-transform: uppercase; color: var(--mute);
}

.spr-archive-cta { margin-top: 20px; }
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
