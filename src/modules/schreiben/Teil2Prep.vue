<script setup lang="ts">
//
// Schreiben Teil 2 — Planung: the Schreibplan planner.
//
// The exam hands the learner a Schreibauftrag with four Inhaltspunkte
// already printed on it; the one thing the learner brings is a single
// keyword per point. Those four keywords ARE the Schreibplan — they ride
// the stash into the runner, where they become the live
// Inhaltspunkt-Checkliste (mirrors Teil1Prep.vue's Schreibplan exactly;
// CONTEXT.md → "Schreibplan").
//
// Unlike Sprechen's Vorbereitung, there is no countdown here — Schreiben's
// only clock is the 25-minute writing budget, tracked in the runner, not
// during planning. The Schreibplan is also explicitly skippable: „Ohne Plan
// starten" clears whatever keywords were typed and moves on regardless.
//
// The Inhalts-Baukasten panel replaces Teil 1's Argumentenspeicher: a
// Schreibauftrag is situational, not argumentative, so it resolves Gründe
// (why the writer is in this situation) and Lösungen (what the Nachricht
// could propose) rather than pro/contra angles — but it reuses the exact
// same two-column-plus-wordstrip layout, since the shape (a numbered idea
// list either side, vocabulary below) fits both genres equally well.
//
// Divergence from Teil 1: the Musternachricht deep-link is ALWAYS present
// here (every Auftrag carries exactly one Schreibanlass, and
// NACHRICHT_MUSTER_TITLE covers all five) — there is no fallback branch to
// the bare library link the way Teil 1's Mustertext cross-link needs one.

import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { emptySchreibPlan, type SchreibPlanEntry } from '../../data/schreiben'
import {
  NACHRICHT_STASH_KEY, NACHRICHT_TARGET_WORDS,
  type NachrichtBaukasten, type NachrichtRunStash
} from '../../data/schreibenNachricht'
import { ANLASS_LABEL, type SchreibAnlass } from '../../data/schreibenAuftraege'
import { NACHRICHT_MUSTER_TITLE } from '../../data/schreibenMusterNachrichten'
import { resolveBaukasten } from '../../data/schreibenBaukasten'
import {
  loadCachedBaukasten, generateBaukasten, saveCachedBaukasten
} from '../../composables/useSchreibenBaukasten'
import { resolveAiClient } from '../../composables/localClaude'
import { useSettings } from '../../composables/useSettings'
import { useToast } from '../../composables/useToast'

const router = useRouter()
const toast = useToast()
const { settings, canUseAi, load: loadSettings } = useSettings()

const stash = ref<NachrichtRunStash | null>(null)
const bank = ref<NachrichtBaukasten | null>(null)
const scope = ref<string>('')
const plan = ref<SchreibPlanEntry[]>(emptySchreibPlan())
const regenerating = ref(false)
let stashDebounce: number | undefined

const filledCount = computed(() => plan.value.filter(p => p.keyword.trim().length > 0).length)

// Musternachricht deep-link — always present (see header comment).
const musterLinkLabel = computed(() => (stash.value ? NACHRICHT_MUSTER_TITLE[stash.value.auftrag.anlass] : ''))
const musterLinkTo = computed(() => ({
  name: 'schreiben-muster-teil2',
  query: stash.value ? { muster: stash.value.auftrag.anlass } : {}
}))

// F11-style keyword hygiene, identical normalisation to Teil 1's prep
// matcher (punctuation stripped, whitespace collapsed, case-folded) so a
// warning here and the runner's own coverage check can never disagree about
// two keywords being "the same". Advisory only — never gates the CTA.
function normalizeKeyword(s: string): string {
  return s.replace(/[.,;:!?…]/g, '').replace(/\s+/g, ' ').trim().toLowerCase()
}

// Blur-gated: a warning is only ever *hygiene-eligible* here; whether it is
// actually shown for a given index is decided below by `touched`/`focused`
// (mirrors Teil1Prep.vue). `requires` records which indices must be touched
// before the warning may appear at all: just the one index for the
// too-short rule, both indices for a pair (duplicate/substring) rule — so a
// duplicate never fires off a single blurred field.
interface RawWarning { msg: string; requires: number[] }

const touched = ref<Set<number>>(new Set())
const focused = ref<number | null>(null)

function markTouched(index: number) {
  focused.value = null
  const next = new Set(touched.value); next.add(index); touched.value = next
}

const keywordWarnings = computed<Partial<Record<number, string>>>(() => {
  const raw: Partial<Record<number, RawWarning>> = {}
  const entries = plan.value
    .map(p => ({ index: p.index, raw: p.keyword.trim(), norm: normalizeKeyword(p.keyword) }))
    .filter(e => e.norm.length > 0)

  for (const e of entries) {
    if (e.norm.length < 4) {
      raw[e.index] = {
        msg: `„${e.raw}" ist kürzer als vier Zeichen — kaum von einem Zufallstreffer im Text zu unterscheiden.`,
        requires: [e.index]
      }
    }
  }

  for (const e of entries) {
    if (e.raw.includes(' ') && raw[e.index] === undefined) {
      raw[e.index] = {
        msg: `„${e.raw}" hat mehrere Wörter — der Haken leuchtet erst, wenn alle im Text stehen.`,
        requires: [e.index]
      }
    }
  }

  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const a = entries[i]
      const b = entries[j]
      let msg: string | null = null
      if (a.norm === b.norm) {
        msg = `„${a.raw}" und „${b.raw}" sind gleich — beide Häkchen leuchten zusammen.`
      } else if (a.norm.includes(b.norm) || b.norm.includes(a.norm)) {
        const [short, long] = a.norm.length < b.norm.length ? [a, b] : [b, a]
        msg = `„${short.raw}" steckt in „${long.raw}" — beide Häkchen leuchten zusammen.`
      }
      if (msg !== null) {
        if (raw[a.index] === undefined) raw[a.index] = { msg, requires: [a.index, b.index] }
        if (raw[b.index] === undefined) raw[b.index] = { msg, requires: [a.index, b.index] }
      }
    }
  }

  const out: Partial<Record<number, string>> = {}
  for (const [key, entry] of Object.entries(raw)) {
    if (!entry) continue
    const index = Number(key)
    const allTouched = entry.requires.every(i => touched.value.has(i))
    if (allTouched && focused.value !== index) out[index] = entry.msg
  }
  return out
})

// The scope note names only two shapes: the answered Auftrag itself (both
// the AI-cached layer and the hand-authored flagship layer resolve to
// "für diesen Auftrag" — the learner does not need to know which one
// answered), or the per-Anlass fallback, named by its Anlass.
const scopeLabel = computed(() => {
  if (scope.value === 'auftrag' || scope.value === 'cached') return 'für diesen Auftrag'
  return `für den Anlass ${ANLASS_LABEL[scope.value as SchreibAnlass].de}`
})

function keywordFor(index: number): string {
  return plan.value.find(p => p.index === index)?.keyword ?? ''
}

function setKeyword(index: number, value: string) {
  const entry = plan.value.find(p => p.index === index)
  if (entry) entry.keyword = value
  else plan.value = [...plan.value, { index, keyword: value }]
}

onMounted(async () => {
  await loadSettings()
  const raw = sessionStorage.getItem(NACHRICHT_STASH_KEY)
  if (!raw) return
  try {
    const s = JSON.parse(raw) as NachrichtRunStash
    stash.value = s
    plan.value = s.plan && s.plan.length > 0 ? s.plan : emptySchreibPlan()

    // A cached AI bank beats the hand-authored flagship one; the per-Anlass
    // bank is the floor — every Schreibauftrag resolves to content with
    // zero AI calls.
    const cached = await loadCachedBaukasten(s.auftrag.id)
    const resolved = resolveBaukasten({ id: s.auftrag.id, anlass: s.auftrag.anlass }, cached ?? undefined)
    bank.value = resolved.bank
    scope.value = resolved.scope
  } catch { /* leave stash null — the guard below renders */ }
})

onUnmounted(() => {
  if (stashDebounce !== undefined) window.clearTimeout(stashDebounce)
})

function writeStash() {
  if (!stash.value) return
  const next: NachrichtRunStash = { ...stash.value, plan: plan.value }
  sessionStorage.setItem(NACHRICHT_STASH_KEY, JSON.stringify(next))
}

// The whole point of Planung being a route (not a modal) is that it survives
// a reload — so it must actually persist as the learner types, not only at
// the CTA. Debounced (~500 ms) so a few keystrokes don't mean a few writes;
// `go()`/`startWithoutPlan()` below still write synchronously before
// navigating.
watch(plan, () => {
  if (!stash.value) return
  if (stashDebounce !== undefined) window.clearTimeout(stashDebounce)
  stashDebounce = window.setTimeout(writeStash, 500)
}, { deep: true })

function flushStash() {
  if (stashDebounce !== undefined) { window.clearTimeout(stashDebounce); stashDebounce = undefined }
  writeStash()
}

function go() {
  if (!stash.value) return
  flushStash()
  router.push({ name: 'schreiben-teil2-run' })
}

// The Schreibplan is advisory, not mandatory — this clears whatever
// keywords were typed rather than carrying half-filled ones into a run the
// learner explicitly chose to start without a plan.
function startWithoutPlan() {
  if (!stash.value) return
  plan.value = emptySchreibPlan()
  flushStash()
  router.push({ name: 'schreiben-teil2-run' })
}

async function refineBank() {
  const s = stash.value
  if (!s || !canUseAi.value || regenerating.value) return
  regenerating.value = true
  try {
    const client = resolveAiClient(settings.value)
    const fresh = await generateBaukasten(client, settings.value.model, {
      titleDe: s.auftrag.titleDe, situationDe: s.auftrag.situationDe,
      taskDe: s.auftrag.taskDe, anlass: s.auftrag.anlass
    })
    await saveCachedBaukasten(s.auftrag.id, fresh)
    bank.value = fresh
    scope.value = 'cached'
    toast.success('Neuer Inhalts-Baukasten generiert')
  } catch (err) {
    // Keep whatever bank was showing (flagship or Anlass fallback) — a
    // failed regeneration must never blank the planning screen.
    toast.error('Generierung fehlgeschlagen', {
      description: err instanceof Error ? err.message : String(err)
    })
  } finally {
    regenerating.value = false
  }
}

function backToSetup() { router.push({ name: 'schreiben-teil2' }) }
</script>

<template>
  <div v-if="!stash" class="page">
    <div class="alert alert-info">
      <span class="alert-label">Hinweis</span>
      Kein Auftrag gewählt — die Planung braucht ein Aufgabenblatt.
    </div>
    <button class="btn btn-ghost" type="button" @click="backToSetup">← Auftragswahl</button>
  </div>

  <div v-else class="page prep-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Schreiben Teil 2 · Etappe 02</div>
        <h1 class="section-title">Planung<em>.</em></h1>
        <p class="section-subtitle">
          Kein Manuskript — ein Plan. Ein Stichwort pro Inhaltspunkt reicht;
          genau das steht später neben dir, während du die Nachricht
          schreibst. Der Schreibplan ist keine Pflicht — „Ohne Plan starten"
          geht jederzeit.
        </p>
      </div>
    </header>

    <div class="spr-prep-mast">
      <div>
        <div class="spr-lbl">
          Schreibauftrag · {{ stash.auftrag.titleDe }}
          <span class="sch-mast-anlass">{{ ANLASS_LABEL[stash.auftrag.anlass].de }}</span>
        </div>
        <p class="sch-prep-situation">{{ stash.auftrag.situationDe }}</p>

        <div class="sch-empf-card">
          <span class="sch-empf-lbl">Empfänger</span>
          <span class="sch-empf-name">{{ stash.auftrag.empfaengerName }}</span>
          <span class="sch-empf-rolle">{{ stash.auftrag.empfaengerRolleDe }}</span>
        </div>

        <p class="spr-prep-stmt">{{ stash.auftrag.taskDe }}</p>
        <div class="spr-sides">
          <span>Vier Inhaltspunkte</span><b>{{ filledCount }} geplant</b>
          <span style="opacity: 0.5">·</span>
          <span>Ziel</span><b>{{ NACHRICHT_TARGET_WORDS }} Wörter</b>
        </div>
        <p class="sch-muster-link">
          <router-link :to="musterLinkTo">{{ musterLinkLabel }} <span aria-hidden="true">→</span></router-link>
        </p>
      </div>
    </div>

    <div class="spr-block-h" style="margin-top: 42px; margin-bottom: 18px">
      <h2 class="spr-block-t">Schreibplan</h2>
      <span class="spr-block-n">Ein Stichwort pro Inhaltspunkt · wird in der Nachricht mitgezählt</span>
    </div>

    <div class="spr-plan">
      <template v-for="(punkt, index) in stash.auftrag.inhaltspunkte" :key="index">
        <div class="spr-plan-row" :class="{ on: keywordFor(index).trim().length > 0 }">
          <div class="spr-plan-n">{{ String(index + 1).padStart(2, '0') }}</div>
          <div class="spr-plan-l">
            <div class="spr-plan-t">Inhaltspunkt {{ index + 1 }}</div>
            <div class="spr-plan-h">{{ punkt }}</div>
          </div>
          <div class="sch-plan-incell">
            <input
              class="spr-plan-in"
              :value="keywordFor(index)"
              placeholder="Stichwort …"
              @input="setKeyword(index, ($event.target as HTMLInputElement).value)"
              @focus="focused = index"
              @blur="markTouched(index)"
            />
            <p v-if="keywordWarnings[index]" class="sch-plan-warn">{{ keywordWarnings[index] }}</p>
          </div>
        </div>
      </template>
    </div>

    <template v-if="bank">
      <div class="spr-block-h" style="margin-top: 46px; margin-bottom: 4px">
        <h2 class="spr-block-t">Inhalts-Baukasten</h2>
        <span class="spr-block-n">{{ scopeLabel }}</span>
        <button
          class="btn btn-quiet regen-btn"
          type="button"
          :disabled="!canUseAi || regenerating"
          @click="refineBank"
        >{{ regenerating ? 'Generiere…' : 'Baukasten mit KI verfeinern' }}</button>
      </div>
      <p class="ai-cost-note">Ersetzt den angezeigten Baukasten mit einem frisch generierten (1 Call).</p>

      <div class="spr-angles" style="margin-top: 16px">
        <section class="spr-acol">
          <div class="spr-acol-h">
            <span class="spr-acol-t">Mögliche Gründe</span>
            <span class="spr-lbl">{{ bank.gruende.length }} Ideen</span>
          </div>
          <div v-for="(g, i) in bank.gruende" :key="i" class="spr-angle">
            <div class="spr-angle-c"><b>{{ String(i + 1).padStart(2, '0') }}</b><span>{{ g.ideaDe }}</span></div>
            <p class="spr-angle-w">{{ g.noteEn }}</p>
          </div>
        </section>
        <section class="spr-acol">
          <div class="spr-acol-h">
            <span class="spr-acol-t">Lösungen &amp; Vorschläge</span>
            <span class="spr-lbl">{{ bank.loesungen.length }} Ideen</span>
          </div>
          <div v-for="(l, i) in bank.loesungen" :key="i" class="spr-angle">
            <div class="spr-angle-c"><b>{{ String(i + 1).padStart(2, '0') }}</b><span>{{ l.ideaDe }}</span></div>
            <p class="spr-angle-w">{{ l.noteEn }}</p>
          </div>
        </section>
      </div>

      <div class="spr-wordstrip">
        <div class="spr-lbl">Textwortschatz · {{ bank.words.length }} Wörter, die in der Nachricht gut ankommen</div>
        <div class="spr-words">
          <div v-for="w in bank.words" :key="w.de" class="spr-word">
            <div class="spr-word-de">{{ w.de }}</div>
            <div class="spr-word-en">{{ w.en }}</div>
          </div>
        </div>
      </div>
    </template>

    <div class="setup-actions">
      <button class="btn btn-ghost" type="button" @click="backToSetup">← Auftrag wechseln</button>
      <button class="btn btn-quiet" type="button" @click="startWithoutPlan">Ohne Plan starten</button>
      <button class="btn btn-accent btn-meta" type="button" @click="go">
        <span class="bm-main">Schreiben beginnen <span aria-hidden="true">→</span></span>
        <span class="bm-sub">{{ filledCount }} von 4 Punkten geplant</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.prep-page { max-width: 900px; }
.sch-prep-situation { font-size: 13.5px; line-height: 1.5; color: var(--mute); font-style: italic; margin: 8px 0 0; }

/* Aufgabenmuster-style Anlass badge beside the mast label — the occasion
   the learner is about to write for, named where they plan it. */
.sch-mast-anlass {
  color: var(--accent);
  border: 1px solid color-mix(in oklab, var(--accent) 45%, transparent);
  border-radius: 999px;
  padding: 1px 8px;
  margin-left: 8px;
  font-size: 9.5px;
  letter-spacing: 0.12em;
  white-space: nowrap;
}

/* The Empfänger card: name and role rendered STANDALONE, never spliced into
   a prepositional phrase — see Teil2Setup.vue's identical comment. */
.sch-empf-card {
  display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap;
  margin: 12px 0 0; padding: 10px 14px;
  background: var(--paper-deep); border-left: 2px solid var(--accent);
}
.sch-empf-lbl { font-family: var(--font-mono); font-size: 9.5px; letter-spacing: .16em; text-transform: uppercase; color: var(--mute); }
.sch-empf-name { font-family: var(--font-display); font-size: 16px; font-weight: 500; letter-spacing: -.01em; }
.sch-empf-rolle { font-size: 13.5px; color: var(--ink-soft); font-style: italic; }

/* Quiet inline link to the Musternachrichten library, right under the
   task-sheet stats row — no button affordance. */
.sch-muster-link { font-size: 12.5px; margin: 12px 0 0; }

.regen-btn { text-transform: none; letter-spacing: normal; font-family: var(--font-body); font-size: 13px; }
.ai-cost-note {
  margin: 8px 0 0;
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.14em;
  color: var(--mute);
  text-transform: uppercase;
}

/*
 * The keyword warning lives inside .spr-plan-row, in the input's own grid
 * cell, instead of floating between rows (mirrors Teil1Prep.vue). This
 * component owns .spr-plan-row's alignment for its own instances only — the
 * scoped attribute selector below never reaches Sprechen's rows in
 * sprechen.css. `align-items: start` (rather than the shared `center`) keeps
 * the number/label columns pinned to the top of the row so a two-line cell
 * (input + warning) grows downward without recentering its siblings.
 */
.spr-plan-row { align-items: start; }
.sch-plan-incell { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.sch-plan-warn {
  margin: 0;
  padding-left: 2px;
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--clay);
}

/* Mirrors sprechen.css's `@media (max-width:1080px) .spr-plan-in{grid-column:2}`
   for the new wrapper — the input used to occupy that cell directly, now the
   wrapper does. */
@media (max-width: 1080px) {
  .sch-plan-incell { grid-column: 2; }
}

.setup-actions { flex-wrap: wrap; }
</style>
