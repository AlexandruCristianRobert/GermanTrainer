<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  SPRECHEN_RESULT_KEY, type SprechenMistake, type SprechenResultStash
} from '../../composables/useSprechenGrader'
import { summarizeFluency, type DiscussionTurn } from '../../data/sprechen'

const router = useRouter()
const data = ref<SprechenResultStash | null>(null)
const error = ref<string | null>(null)
const lang = ref<'de' | 'en'>('de')
const selected = ref<SprechenMistake | null>(null)

const SETUP_KEY = 'sprechenTeil2Setup'

onMounted(() => {
  try {
    const raw = sessionStorage.getItem(SPRECHEN_RESULT_KEY)
    if (!raw) {
      error.value = 'No analysis here — results are shown once, right after a discussion. Past scores live in History.'
      return
    }
    data.value = JSON.parse(raw) as SprechenResultStash
    const setup = JSON.parse(localStorage.getItem(SETUP_KEY) ?? '{}') as { lang?: 'de' | 'en' }
    if (setup.lang === 'en' || setup.lang === 'de') lang.value = setup.lang
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load result.'
  }
})

function setLang(l: 'de' | 'en') {
  lang.value = l
  try {
    const prev = JSON.parse(localStorage.getItem(SETUP_KEY) ?? '{}') as Record<string, unknown>
    localStorage.setItem(SETUP_KEY, JSON.stringify({ ...prev, lang: l }))
  } catch { /* ignore */ }
}

const learnerTurnIndexes = computed(() => {
  if (!data.value) return new Map<number, number>()
  // Map absolute turn index -> learner-turn index (what mistakes reference).
  const map = new Map<number, number>()
  let li = 0
  data.value.turns.forEach((t, abs) => { if (t.role === 'learner') map.set(abs, li++) })
  return map
})

interface Seg { text: string; mistake?: SprechenMistake }

function segmentTurn(text: string, mistakes: SprechenMistake[]): Seg[] {
  const sorted = [...mistakes].sort((a, b) => a.spanStart - b.spanStart)
  const segs: Seg[] = []
  let pos = 0
  for (const m of sorted) {
    if (m.spanStart < pos) continue                        // overlap — first wins
    if (m.spanStart > pos) segs.push({ text: text.slice(pos, m.spanStart) })
    segs.push({ text: text.slice(m.spanStart, m.spanEnd), mistake: m })
    pos = m.spanEnd
  }
  if (pos < text.length) segs.push({ text: text.slice(pos) })
  return segs
}

function mistakesForLearnerTurn(li: number): SprechenMistake[] {
  return data.value?.result.mistakes.filter(m => m.turnIndex === li) ?? []
}

const mistakeCounts = computed(() => {
  const counts = new Map<string, number>()
  for (const m of data.value?.result.mistakes ?? []) {
    counts.set(m.kind, (counts.get(m.kind) ?? 0) + 1)
  }
  return [...counts.entries()]
})

const learnerTurnsTotal = computed(() =>
  data.value ? data.value.turns.filter(t => t.role === 'learner').length : 0
)

// Present only for a spoken Discussion — the typed test carries no speech data,
// so this whole block simply doesn't render.
const fluency = computed(() =>
  data.value ? summarizeFluency(data.value.turns) : null
)

/** Below this the recognizer was guessing; worth showing, never worth grading. */
const SHAKY_CONFIDENCE = 0.7

function shakySpans(turn: DiscussionTurn): string[] {
  return (turn.spans ?? [])
    .filter(s => s.confidence > 0 && s.confidence < SHAKY_CONFIDENCE)
    .map(s => s.text)
}

function seconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)} s`
}

const KIND_LABEL: Record<string, string> = {
  grammar: 'Grammatik', 'word-order': 'Wortstellung', vocabulary: 'Wortschatz',
  spelling: 'Rechtschreibung', register: 'Register'
}

function newRun() { router.push({ name: 'sprechen-teil2' }) }
function home() { router.push({ name: 'sprechen' }) }
</script>

<template>
  <div v-if="error" class="page">
    <div class="alert alert-info"><span class="alert-label">Hinweis</span>{{ error }}</div>
    <button class="btn btn-ghost" type="button" @click="home">← Sprechen</button>
  </div>

  <div v-else-if="data" class="page result-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Auswertung · Sprechen Teil 2</div>
        <div class="result-score">{{ data.result.totalScore }}<span class="denom"> / 100</span></div>
        <div class="praedikat-stamp" :class="data.result.passes ? 'praedikat-pass' : 'praedikat-fail'">
          {{ data.result.praedikat }}
        </div>
        <p class="section-subtitle">„{{ data.topic.titleDe }}" · {{ learnerTurnsTotal }} Beiträge
          <template v-if="data.kiTippCount > 0"> · {{ data.kiTippCount }} KI-Tipp{{ data.kiTippCount === 1 ? '' : 's' }} verwendet</template>
        </p>
      </div>
      <div class="result-actions">
        <div class="segmented lang-toggle">
          <button type="button" :class="{ active: lang === 'de' }" @click="setLang('de')">DE</button>
          <button type="button" :class="{ active: lang === 'en' }" @click="setLang('en')">EN</button>
        </div>
        <button class="btn btn-ghost" type="button" @click="home">Sprechen</button>
        <button class="btn btn-accent" type="button" @click="newRun">Neue Diskussion <span aria-hidden="true">→</span></button>
      </div>
    </header>

    <div class="alert alert-info">
      <span class="alert-label">Bewertungsumfang</span>
      Getippte Übung: <strong>Aussprache wird nicht bewertet</strong> — vier Kriterien à 25 Punkte,
      Bestehensgrenze 60. Diese Auswertung ist nur hier sichtbar; im Verlauf bleibt die
      Zusammenfassung, im Fehlerarchiv deine markierten Sätze.
    </div>
    <div v-if="learnerTurnsTotal < 3" class="alert alert-warning">
      <span class="alert-label">Wenig Material</span>
      Die Diskussion wurde früh beendet — die Bewertung beruht auf sehr wenig Text.
    </div>

    <h3 class="block-heading">Kriterien</h3>
    <table class="data-table criteria-table">
      <thead><tr><th>Kriterium</th><th>Punkte</th><th>Begründung</th></tr></thead>
      <tbody>
        <tr v-for="c in data.result.criteria" :key="c.key">
          <td>{{ c.labelDe }}</td>
          <td class="crit-score">{{ c.score }} / {{ c.maxPoints }}</td>
          <td>{{ lang === 'de' ? c.justificationDe : c.justificationEn }}</td>
        </tr>
      </tbody>
    </table>

    <template v-if="fluency">
      <h3 class="block-heading">Sprechdaten <span class="bh-note">gemessen, nicht geschätzt</span></h3>
      <div class="fluency-grid">
        <div class="fl-item">
          <div class="fl-num">{{ fluency.wordsPerMinute }}</div>
          <div class="fl-label">Wörter pro Minute<br />über {{ fluency.turns }} Beiträge</div>
        </div>
        <div class="fl-item">
          <div class="fl-num">{{ seconds(fluency.avgReactionMs) }}</div>
          <div class="fl-label">Reaktionszeit<br />bis du zu sprechen anfängst</div>
        </div>
        <div class="fl-item">
          <div class="fl-num">{{ seconds(fluency.totalSpokenMs) }}</div>
          <div class="fl-label">Sprechzeit<br />insgesamt</div>
        </div>
        <div class="fl-item">
          <div class="fl-num">{{ fluency.pauses }}</div>
          <div class="fl-label">lange Pausen<br />mitten im Beitrag</div>
        </div>
      </div>
      <p class="fl-note">
        Aussprache wird weiterhin nicht bewertet — dafür bräuchte es deine Stimme,
        und die verlässt dieses Gerät nie. Tempo, Reaktion und Pausen fließen in
        <em>Kohärenz &amp; Flüssigkeit</em> ein.
      </p>
    </template>

    <h3 class="block-heading">Gespräch · deine Fehler markiert</h3>
    <div class="marked-transcript">
      <div v-for="(t, abs) in data.turns" :key="abs"
        class="mt-turn" :class="t.role === 'learner' ? 'mt-learner' : 'mt-partner'">
        <div class="mt-role">{{ t.role === 'learner' ? 'Du' : 'Partner' }}</div>
        <div class="mt-text">
          <template v-if="t.role === 'partner'">{{ t.textDe }}</template>
          <template v-else>
            <template v-for="(seg, si) in segmentTurn(t.textDe, mistakesForLearnerTurn(learnerTurnIndexes.get(abs) ?? -1))" :key="si">
              <button v-if="seg.mistake" type="button" class="mt-mistake"
                :class="{ selected: selected === seg.mistake }"
                @click="selected = selected === seg.mistake ? null : seg.mistake">{{ seg.text }}</button>
              <span v-else>{{ seg.text }}</span>
            </template>
          </template>
        </div>
        <p v-if="t.role === 'learner' && shakySpans(t).length > 0" class="shaky">
          Erkennung unsicher:
          <span v-for="(s, si) in shakySpans(t)" :key="si">„{{ s }}"<span v-if="si < shakySpans(t).length - 1"> · </span></span>
        </p>
      </div>
    </div>

    <div v-if="selected" class="mistake-card">
      <div class="mk-head">
        <span class="tag tag-accent">{{ KIND_LABEL[selected.kind] ?? selected.kind }}</span>
      </div>
      <div class="mk-line"><span class="mk-label">Du</span><span class="mk-wrong">{{ selected.quote }}</span></div>
      <div class="mk-line"><span class="mk-label">Besser</span><span class="mk-right">{{ selected.suggested }}</span></div>
      <p class="mk-reason">{{ lang === 'de' ? selected.reasonDe : selected.reasonEn }}</p>
    </div>

    <div class="chip-row mistake-counts">
      <span v-for="[kind, n] in mistakeCounts" :key="kind" class="chip">{{ KIND_LABEL[kind] ?? kind }} · {{ n }}</span>
      <span v-if="mistakeCounts.length === 0" class="chip">Keine markierten Fehler ✓</span>
    </div>

    <div class="sw-grid">
      <section>
        <h3 class="block-heading">Stärken</h3>
        <ul class="sw-list"><li v-for="(s, i) in data.result.strengths" :key="i">{{ lang === 'de' ? s.de : s.en }}</li></ul>
      </section>
      <section>
        <h3 class="block-heading">Schwächen</h3>
        <ul class="sw-list"><li v-for="(w, i) in data.result.weaknesses" :key="i">{{ lang === 'de' ? w.de : w.en }}</li></ul>
      </section>
    </div>

    <h3 class="block-heading">Gesamturteil</h3>
    <p class="overall">{{ lang === 'de' ? data.result.overallDe : data.result.overallEn }}</p>
  </div>

  <div v-else class="page loading-state"><div class="micro-mark">Loading…</div></div>
</template>

<style scoped>
.loading-state { text-align: center; padding-top: 120px; }
.result-page { max-width: 880px; }
.result-actions { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
.praedikat-stamp {
  display: inline-block; margin-top: 6px; padding: 4px 12px; border-radius: 3px;
  font-family: var(--font-mono); font-size: 12px; letter-spacing: 0.22em; text-transform: uppercase;
}
.praedikat-pass { background: color-mix(in srgb, var(--success) 16%, transparent); color: var(--success); }
.praedikat-fail { background: color-mix(in srgb, var(--danger) 16%, transparent); color: var(--danger); }
.block-heading {
  font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.22em;
  text-transform: uppercase; color: var(--mute); margin: 32px 0 12px;
}
.criteria-table .crit-score { font-variant-numeric: tabular-nums; white-space: nowrap; }
.marked-transcript { display: flex; flex-direction: column; gap: 14px; }
.mt-turn { max-width: 85%; }
.mt-partner { align-self: flex-start; }
.mt-learner { align-self: flex-end; }
.mt-role {
  font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.2em;
  text-transform: uppercase; color: var(--mute); margin-bottom: 3px;
}
.mt-learner .mt-role { text-align: right; }
.mt-text {
  display: inline-block; padding: 10px 14px; border-radius: 6px;
  font-size: 15.5px; line-height: 1.6;
  background: var(--paper-deep); border: 1px solid var(--hairline);
}
.mt-learner .mt-text { background: var(--accent-tint); border-color: transparent; }
.mt-mistake {
  display: inline; padding: 0 1px; margin: 0; border: 0; cursor: pointer;
  font: inherit; color: var(--danger); background: color-mix(in srgb, var(--danger) 12%, transparent);
  border-bottom: 2px solid var(--danger); border-radius: 2px;
}
.mt-mistake.selected { background: color-mix(in srgb, var(--danger) 26%, transparent); }
.mistake-card {
  margin: 18px 0; padding: 14px 18px; background: var(--paper-deep);
  border-left: 3px solid var(--danger); border-radius: 4px;
  display: flex; flex-direction: column; gap: 8px;
}
.mk-line { display: flex; gap: 12px; align-items: baseline; }
.mk-label {
  font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.18em;
  text-transform: uppercase; color: var(--mute); flex: 0 0 52px;
}
.mk-wrong { color: var(--danger); text-decoration: line-through; }
.mk-right { color: var(--success); font-family: var(--font-display); }
.mk-reason { margin: 2px 0 0; font-size: 14px; line-height: 1.55; }
.mistake-counts { margin: 18px 0; }
.bh-note { letter-spacing: 0.14em; opacity: 0.7; margin-left: 10px; }
.fluency-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 20px; }
.fl-item { padding: 14px 16px; background: var(--paper-deep); border-radius: 4px; }
.fl-num {
  font-family: var(--font-display); font-size: 30px; line-height: 1.1;
  font-variant-numeric: tabular-nums;
}
.fl-label {
  margin-top: 6px; font-family: var(--font-mono); font-size: 10px;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--mute); line-height: 1.6;
}
.fl-note { margin: 16px 0 0; font-size: 13.5px; line-height: 1.6; color: var(--ink-soft); max-width: 620px; }
.shaky {
  margin: 4px 0 0; font-size: 12px; font-style: italic; color: var(--mute);
  text-align: right;
}
.mt-partner .shaky { text-align: left; }
.sw-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
.sw-list { margin: 0; padding-left: 18px; font-size: 14.5px; line-height: 1.7; }
.overall { font-size: 15.5px; line-height: 1.65; max-width: 640px; }
@media (max-width: 640px) {
  .sw-grid { grid-template-columns: 1fr; }
  .mt-turn { max-width: 100%; }
}
</style>
