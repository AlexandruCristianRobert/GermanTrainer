<script setup lang="ts">
//
// Schreiben Teil 1 — Planung: the Schreibplan planner.
//
// The exam hands the learner a Schreibthema with four Inhaltspunkte already
// printed on it; the one thing the learner brings is a single keyword per
// point. Those four keywords ARE the Schreibplan — they ride the stash into
// the runner, where they become the live Inhaltspunkt-Checkliste (mirrors
// Sprechen Teil 1's Gliederungsplan/planSignals, CONTEXT.md → "Schreibplan").
//
// Unlike Sprechen's Vorbereitung, there is no countdown here — Schreiben's
// only clock is the 50-minute writing budget, tracked in the runner, not
// during planning. The Schreibplan is also explicitly skippable: „Ohne Plan
// starten" clears whatever keywords were typed and moves on regardless.
//
// The Argumentenspeicher panel mirrors Teil2Prep.vue's bank resolution +
// regenerate flow exactly, but resolves through the Schreiben-specific
// resolveSchreibArgumentBank (written-register banks, schreibenArguments.ts)
// rather than the Sprechen one.

import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  SCHREIBEN_STASH_KEY, SCHREIBEN_TARGET_WORDS, emptySchreibPlan,
  type SchreibenRunStash, type SchreibPlanEntry
} from '../../data/schreiben'
import { resolveSchreibArgumentBank } from '../../data/schreibenArguments'
import type { ArgumentBank } from '../../data/sprechenArguments'
import {
  loadCachedSchreibBank, generateSchreibArgumentBank, saveCachedSchreibBank
} from '../../composables/useSchreibenArguments'
import { resolveAiClient } from '../../composables/localClaude'
import { useSettings } from '../../composables/useSettings'
import { useToast } from '../../composables/useToast'

const router = useRouter()
const toast = useToast()
const { settings, canUseAi, load: loadSettings } = useSettings()

const stash = ref<SchreibenRunStash | null>(null)
const bank = ref<ArgumentBank | null>(null)
const scope = ref<string>('')
const plan = ref<SchreibPlanEntry[]>(emptySchreibPlan())
const regenerating = ref(false)
let stashDebounce: number | undefined

const filledCount = computed(() => plan.value.filter(p => p.keyword.trim().length > 0).length)

// F11-style keyword hygiene, identical normalisation to Sprechen Teil 1's
// prep matcher (punctuation stripped, whitespace collapsed, case-folded) so
// a warning here and the runner's own coverage check can never disagree
// about two keywords being "the same". Advisory only — never gates the CTA.
function normalizeKeyword(s: string): string {
  return s.replace(/[.,;:!?…]/g, '').replace(/\s+/g, ' ').trim().toLowerCase()
}

const keywordWarnings = computed<Partial<Record<number, string>>>(() => {
  const out: Partial<Record<number, string>> = {}
  const entries = plan.value
    .map(p => ({ index: p.index, raw: p.keyword.trim(), norm: normalizeKeyword(p.keyword) }))
    .filter(e => e.norm.length > 0)

  for (const e of entries) {
    if (e.norm.length < 4) {
      out[e.index] = `„${e.raw}" ist kürzer als vier Zeichen — kaum von einem Zufallstreffer im Text zu unterscheiden.`
    }
  }

  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const a = entries[i]
      const b = entries[j]
      if (a.norm === b.norm) {
        const msg = `„${a.raw}" und „${b.raw}" sind gleich — beide Häkchen leuchten zusammen.`
        if (out[a.index] === undefined) out[a.index] = msg
        if (out[b.index] === undefined) out[b.index] = msg
      } else if (a.norm.includes(b.norm) || b.norm.includes(a.norm)) {
        const [short, long] = a.norm.length < b.norm.length ? [a, b] : [b, a]
        const msg = `„${short.raw}" steckt in „${long.raw}" — beide Häkchen leuchten zusammen.`
        if (out[a.index] === undefined) out[a.index] = msg
        if (out[b.index] === undefined) out[b.index] = msg
      }
    }
  }
  return out
})

// Only 'cached' is AI-generated (a fresh call, saved to Dexie) — 'thema' and
// every TopicTag scope are hand-authored data bundled into the app itself,
// never generated and never cached. This label sits right beside the
// AI-cost note, so it must not claim a bundled bank was AI output.
const scopeLabel = computed(() => {
  if (scope.value === 'cached') return 'für dieses Thema · von der KI erzeugt, dann gecacht'
  if (scope.value === 'thema') return 'für dieses Thema · mitgeliefert, ohne KI'
  return `aus dem Fach ${scope.value} · mitgeliefert, ohne KI`
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
  const raw = sessionStorage.getItem(SCHREIBEN_STASH_KEY)
  if (!raw) return
  try {
    const s = JSON.parse(raw) as SchreibenRunStash
    stash.value = s
    plan.value = s.plan && s.plan.length > 0 ? s.plan : emptySchreibPlan()

    // A cached AI bank beats the authored one; the tag bank is the floor —
    // every Schreibthema resolves to content with zero AI calls.
    const cached = await loadCachedSchreibBank(s.thema.id)
    const resolved = resolveSchreibArgumentBank({ id: s.thema.id, tags: s.thema.tags }, cached ?? undefined)
    bank.value = resolved.bank
    scope.value = resolved.scope
  } catch { /* leave stash null — the guard below renders */ }
})

onUnmounted(() => {
  if (stashDebounce !== undefined) window.clearTimeout(stashDebounce)
})

function writeStash() {
  if (!stash.value) return
  const next: SchreibenRunStash = { ...stash.value, plan: plan.value }
  sessionStorage.setItem(SCHREIBEN_STASH_KEY, JSON.stringify(next))
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
  router.push({ name: 'schreiben-teil1-run' })
}

// The Schreibplan is advisory, not mandatory (CONTEXT.md → "Schreibplan") —
// this clears whatever keywords were typed rather than carrying half-filled
// ones into a run the learner explicitly chose to start without a plan.
function startWithoutPlan() {
  if (!stash.value) return
  plan.value = emptySchreibPlan()
  flushStash()
  router.push({ name: 'schreiben-teil1-run' })
}

async function refineBank() {
  const s = stash.value
  if (!s || !canUseAi.value || regenerating.value) return
  regenerating.value = true
  try {
    const client = resolveAiClient(settings.value)
    const fresh = await generateSchreibArgumentBank(
      client, settings.value.model,
      { titleDe: s.thema.titleDe, taskDe: s.thema.taskDe }
    )
    await saveCachedSchreibBank(s.thema.id, fresh)
    bank.value = fresh
    scope.value = 'cached'
    toast.success('Neuer Argumentenspeicher generiert')
  } catch (err) {
    // Keep whatever bank was showing (authored or tag fallback) — a failed
    // regeneration must never blank the planning screen.
    toast.error('Generierung fehlgeschlagen', {
      description: err instanceof Error ? err.message : String(err)
    })
  } finally {
    regenerating.value = false
  }
}

function backToSetup() { router.push({ name: 'schreiben-teil1' }) }
</script>

<template>
  <div v-if="!stash" class="page">
    <div class="alert alert-info">
      <span class="alert-label">Hinweis</span>
      Kein Thema gewählt — die Planung braucht ein Aufgabenblatt.
    </div>
    <button class="btn btn-ghost" type="button" @click="backToSetup">← Themenwahl</button>
  </div>

  <div v-else class="page prep-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Schreiben Teil 1 · Etappe 02</div>
        <h1 class="section-title">Planung<em>.</em></h1>
        <p class="section-subtitle">
          Kein Manuskript — ein Plan. Ein Stichwort pro Inhaltspunkt reicht;
          genau das steht später neben dir, während du den Forumsbeitrag
          schreibst. Der Schreibplan ist keine Pflicht — „Ohne Plan starten"
          geht jederzeit.
        </p>
      </div>
    </header>

    <div class="spr-prep-mast">
      <div>
        <div class="spr-lbl">Schreibthema · {{ stash.thema.titleDe }}</div>
        <p class="sch-prep-forum">{{ stash.thema.forumContextDe }}</p>
        <p class="spr-prep-stmt">{{ stash.thema.taskDe }}</p>
        <div class="spr-sides">
          <span>Vier Inhaltspunkte</span><b>{{ filledCount }} geplant</b>
          <span style="opacity: 0.5">·</span>
          <span>Ziel</span><b>{{ SCHREIBEN_TARGET_WORDS }} Wörter</b>
        </div>
      </div>
    </div>

    <div class="spr-block-h" style="margin-top: 42px; margin-bottom: 18px">
      <h2 class="spr-block-t">Schreibplan</h2>
      <span class="spr-block-n">Ein Stichwort pro Inhaltspunkt · wird im Forumsbeitrag mitgezählt</span>
    </div>

    <div class="spr-plan">
      <template v-for="(punkt, index) in stash.thema.inhaltspunkte" :key="index">
        <div class="spr-plan-row" :class="{ on: keywordFor(index).trim().length > 0 }">
          <div class="spr-plan-n">{{ String(index + 1).padStart(2, '0') }}</div>
          <div class="spr-plan-l">
            <div class="spr-plan-t">Inhaltspunkt {{ index + 1 }}</div>
            <div class="spr-plan-h">{{ punkt }}</div>
          </div>
          <input
            class="spr-plan-in"
            :value="keywordFor(index)"
            placeholder="Stichwort …"
            @input="setKeyword(index, ($event.target as HTMLInputElement).value)"
          />
        </div>
        <p v-if="keywordWarnings[index]" class="spr-plan-warn">{{ keywordWarnings[index] }}</p>
      </template>
    </div>

    <template v-if="bank">
      <div class="spr-block-h" style="margin-top: 46px; margin-bottom: 4px">
        <h2 class="spr-block-t">Argumentenspeicher</h2>
        <span class="spr-block-n">{{ scopeLabel }}</span>
        <button
          class="btn btn-quiet regen-btn"
          type="button"
          :disabled="!canUseAi || regenerating"
          @click="refineBank"
        >{{ regenerating ? 'Generiere…' : 'Bank mit KI verfeinern' }}</button>
      </div>
      <p class="ai-cost-note">Ersetzt die angezeigten Argumente mit frisch generierten (1 Call).</p>
      <p class="spr-argnote">Beide Seiten gehören in denselben Beitrag: deine Meinung und die Gegenmeinung.</p>

      <div class="spr-angles" style="margin-top: 16px">
        <section class="spr-acol mine">
          <div class="spr-acol-h">
            <span class="spr-acol-t">Dafür spricht</span>
            <span class="spr-lbl">{{ bank.pro.length }} Winkel</span>
          </div>
          <div v-for="(a, i) in bank.pro" :key="i" class="spr-angle">
            <div class="spr-angle-c"><b>{{ String(i + 1).padStart(2, '0') }}</b><span>{{ a.claim }}</span></div>
            <p class="spr-angle-w">{{ a.why }}</p>
          </div>
        </section>
        <section class="spr-acol theirs">
          <div class="spr-acol-h">
            <span class="spr-acol-t">Dagegen spricht</span>
            <span class="spr-lbl">{{ bank.contra.length }} Winkel</span>
          </div>
          <div v-for="(a, i) in bank.contra" :key="i" class="spr-angle">
            <div class="spr-angle-c"><b>{{ String(i + 1).padStart(2, '0') }}</b><span>{{ a.claim }}</span></div>
            <p class="spr-angle-w">{{ a.why }}</p>
          </div>
        </section>
      </div>

      <div class="spr-wordstrip">
        <div class="spr-lbl">Wortschatz zum Thema · {{ bank.words.length }} Wörter, die im Forumsbeitrag gut ankommen</div>
        <div class="spr-words">
          <div v-for="w in bank.words" :key="w.de" class="spr-word">
            <div class="spr-word-de">{{ w.de }}</div>
            <div class="spr-word-en">{{ w.en }}</div>
          </div>
        </div>
      </div>

      <div v-if="bank.phrases && bank.phrases.length > 0" class="spr-wordstrip spr-phrasestrip">
        <div class="spr-lbl">Wortverbindungen · {{ bank.phrases.length }} feste Kombinationen zum Thema</div>
        <div class="spr-words">
          <div v-for="w in bank.phrases" :key="w.de" class="spr-word">
            <div class="spr-word-de">{{ w.de }}</div>
            <div class="spr-word-en">{{ w.en }}</div>
          </div>
        </div>
      </div>
    </template>

    <div class="setup-actions">
      <button class="btn btn-ghost" type="button" @click="backToSetup">← Thema wechseln</button>
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
.sch-prep-forum { font-size: 13.5px; line-height: 1.5; color: var(--mute); font-style: italic; margin: 8px 0 0; }
.regen-btn { text-transform: none; letter-spacing: normal; font-family: var(--font-body); font-size: 13px; }
.ai-cost-note {
  margin: 8px 0 0;
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.14em;
  color: var(--mute);
  text-transform: uppercase;
}
.spr-argnote { font-size: 13px; font-style: italic; color: var(--mute); margin: 4px 0 0; }

.spr-plan-warn {
  margin: -8px 0 12px;
  padding-left: 4px;
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--clay);
}

.spr-phrasestrip { margin-top: 0; border-top: 0; padding-top: 0; }

.setup-actions { flex-wrap: wrap; }
</style>
