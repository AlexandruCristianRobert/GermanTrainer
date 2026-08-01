<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  reAnchor, SPRECHEN_RESULT_KEY, type SprechenMistake, type SprechenResultStash
} from '../../composables/useSprechenGrader'
import { summarizeFluency, type DiscussionTurn } from '../../data/sprechen'
import { matchRedemittel } from '../../composables/useRedemittelMatch'
import { SPRECHEN_B2_TEIL2 } from '../../data/rubrics'
import SprYield from '../../components/sprechen/SprYield.vue'

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

// ── Verdict + Argumentation & Interaktion (Task 10's descriptive extras) ──

const rubricCriteria = SPRECHEN_B2_TEIL2.criteria

/**
 * §5.2: read the descriptor verbatim, never paraphrase it in the component.
 * The rubric carries a spoken variant on `kohaerenz` because a spoken
 * Discussion measures real tempo — pick it when the Modality is spoken.
 */
function descriptorFor(key: string): string {
  const def = rubricCriteria.find(c => c.key === key)
  if (!def) return ''
  return data.value?.modality === 'spoken' && def.descriptorSpokenDe
    ? def.descriptorSpokenDe
    : def.descriptorDe
}

const structure = computed(() => data.value?.result.structure ?? null)
const interaction = computed(() => data.value?.result.interaction ?? null)

/** The matrix's right column: the turn's opening sentence, local, no AI. */
function opener(text: string): string {
  const cut = text.search(/[.?!]/)
  const s = cut < 0 ? text : text.slice(0, cut + 1)
  return s.length > 90 ? `${s.slice(0, 88)}…` : s
}

const withExample = computed(
  () => (structure.value ?? []).filter(s => s.beispiel).length
)

/** Every learner turn's own text, in order — the matrix's opener column and
 *  the per-Discussion Redemittel yield both key off this. */
const learnerTexts = computed(
  () => data.value ? data.value.turns.filter(t => t.role === 'learner').map(t => t.textDe) : []
)

const yieldIds = computed(() => matchRedemittel(learnerTexts.value).map(r => r.id))

// ── Marked transcript, mistake detail, counts (pre-existing, re-clothed) ──

const learnerTurnIndexes = computed(() => {
  if (!data.value) return new Map<number, number>()
  // Map absolute turn index -> learner-turn index (what mistakes reference).
  const map = new Map<number, number>()
  let li = 0
  data.value.turns.forEach((t, abs) => { if (t.role === 'learner') map.set(abs, li++) })
  return map
})

interface Seg { text: string; mistake?: SprechenMistake }

/**
 * §5.3: re-anchor every mistake by searching the CURRENT turn text — never
 * trust the spanStart/spanEnd it happens to carry in the stash. Those were a
 * snapshot from grade time; reAnchor() (exact → case-insensitive → drop) is
 * the same helper the grader's own validator uses.
 */
function segmentTurn(text: string, mistakes: SprechenMistake[]): Seg[] {
  const anchored = mistakes
    .map(m => ({ m, span: reAnchor(m.quote, text) }))
    .filter(x => x.span.spanStart >= 0)
    .sort((a, b) => a.span.spanStart - b.span.spanStart)

  const segs: Seg[] = []
  let pos = 0
  for (const { m, span } of anchored) {
    if (span.spanStart < pos) continue                     // overlap — first wins
    if (span.spanStart > pos) segs.push({ text: text.slice(pos, span.spanStart) })
    segs.push({ text: text.slice(span.spanStart, span.spanEnd), mistake: m })
    pos = span.spanEnd
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

    <div class="spr-verdict">
      <div>
        <div class="spr-vscore spr-num">
          {{ data.result.totalScore }}<span class="denom">/100</span>
        </div>
        <div class="spr-stamp" :class="data.result.passes ? 'pass' : 'fail'">
          {{ data.result.praedikat }}
        </div>
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

    <template v-if="fluency">
      <section class="spr-block">
        <div class="spr-block-h">
          <h2 class="spr-block-t">Sprechdaten</h2>
          <span class="spr-block-n">gemessen, nicht geschätzt</span>
        </div>
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
      </section>
    </template>

    <section v-if="structure" class="spr-block">
      <div class="spr-block-h">
        <h2 class="spr-block-t">Argumentation &amp; Interaktion</h2>
        <span class="spr-block-n">beschreibend · zählt nicht extra in die Note</span>
      </div>
      <div class="spr-matrix">
        <div class="spr-mx-h">Beitrag</div>
        <div class="spr-mx-h">These</div>
        <div class="spr-mx-h">Begründung</div>
        <div class="spr-mx-h">Beispiel</div>
        <div class="spr-mx-h">Reaktion</div>
        <div class="spr-mx-h q">Einstieg</div>
        <template v-for="(s, i) in structure" :key="i">
          <div class="spr-mx-c turn">L{{ i + 1 }}</div>
          <div class="spr-mx-c">
            <span class="spr-mx-mark" :class="s.these ? 'yes' : 'no'">{{ s.these ? '●' : '○' }}</span>
          </div>
          <div class="spr-mx-c">
            <span class="spr-mx-mark" :class="s.begruendung ? 'yes' : 'no'">{{ s.begruendung ? '●' : '○' }}</span>
          </div>
          <div class="spr-mx-c">
            <span class="spr-mx-mark" :class="s.beispiel ? 'yes' : 'no'">{{ s.beispiel ? '●' : '○' }}</span>
          </div>
          <div class="spr-mx-c">
            <span class="spr-mx-mark" :class="s.reacts ? 'yes' : 'no'">{{ s.reacts ? '●' : '○' }}</span>
          </div>
          <div class="spr-mx-c spr-mx-q">{{ opener(learnerTexts[i] ?? '') }}</div>
        </template>
      </div>
      <div class="spr-rate">
        <div class="spr-rate-i">
          <div class="spr-rate-n spr-num">{{ Math.round((interaction?.rate ?? 0) * 100) }} %</div>
          <div class="spr-rate-l">Interaktionsrate</div>
        </div>
        <div class="spr-rate-i">
          <div class="spr-rate-n spr-num">{{ withExample }} / {{ structure.length }}</div>
          <div class="spr-rate-l">Beiträge mit Beispiel</div>
        </div>
        <div class="spr-rate-i">
          <div class="spr-rate-n spr-num">{{ interaction?.askedBack ?? 0 }}</div>
          <div class="spr-rate-l">Rückfragen</div>
        </div>
        <p class="spr-rate-note">
          Argumentation und Interaktion stecken beide im Kriterium
          „Erfüllung / Interaktion". Diese Tabelle zeigt, woran es dort lag —
          sie verteilt selbst keine Punkte.
        </p>
      </div>
    </section>

    <section class="spr-block">
      <div class="spr-block-h">
        <h2 class="spr-block-t">Redemittel-Ausbeute</h2>
        <span class="spr-block-n">{{ yieldIds.length }} von 42 · lokal gezählt</span>
      </div>
      <SprYield :used-ids="yieldIds" note="In dieser Diskussion nicht benutzt." />
    </section>

    <section class="spr-block">
      <div class="spr-block-h"><h2 class="spr-block-t">Gespräch · deine Fehler markiert</h2></div>
      <div class="marked-transcript">
        <div v-for="(t, abs) in data.turns" :key="abs"
          class="mt-turn" :class="t.role === 'learner' ? 'mt-learner' : 'mt-partner'">
          <div class="mt-role">{{ t.role === 'learner' ? 'Du' : 'Partner' }}</div>
          <div class="mt-text">
            <template v-if="t.role === 'partner'">{{ t.textDe }}</template>
            <template v-else>
              <template v-for="(seg, si) in segmentTurn(t.textDe, mistakesForLearnerTurn(learnerTurnIndexes.get(abs) ?? -1))" :key="si">
                <button v-if="seg.mistake" type="button" class="spr-mistake"
                  :class="{ sel: selected === seg.mistake }"
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

      <div v-if="selected" class="spr-mkcard">
        <div class="spr-mk-l"><span class="spr-mk-k">{{ KIND_LABEL[selected.kind] ?? selected.kind }}</span></div>
        <div class="spr-mk-l"><span class="spr-mk-k">Du</span><span class="spr-mk-wrong">{{ selected.quote }}</span></div>
        <div class="spr-mk-l"><span class="spr-mk-k">Besser</span><span class="spr-mk-right">{{ selected.suggested }}</span></div>
        <p class="spr-mk-r">{{ lang === 'de' ? selected.reasonDe : selected.reasonEn }}</p>
      </div>

      <div class="chip-row spr-counts">
        <span v-for="[kind, n] in mistakeCounts" :key="kind" class="chip">{{ KIND_LABEL[kind] ?? kind }} · {{ n }}</span>
        <span v-if="mistakeCounts.length === 0" class="chip">Keine markierten Fehler ✓</span>
      </div>
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
.loading-state { text-align: center; padding-top: 120px; }
.result-page { max-width: 880px; }
.result-actions { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
.marked-transcript { display: flex; flex-direction: column; gap: 14px; margin-top: 4px; }
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
@media (max-width: 640px) {
  .mt-turn { max-width: 100%; }
}
</style>
