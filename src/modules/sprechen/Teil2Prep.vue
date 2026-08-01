<script setup lang="ts">
//
// Sprechen Teil 2 — Vorbereitung (the exam's thinking minute).
//
// Learners fail this exam part on CONTENT, not phrasing, so this screen exists
// to answer "what could I even say". Angles come from the argument bank: a
// per-Topic bank when one is cached or authored, otherwise the Topic's tag
// bank — every Topic therefore has content instantly, offline, with no AI call
// (ADR-0007's offline-first posture).
//
// Shared across both Modalities (CONTEXT.md → "Modality"): the same angles,
// the same Wortschatz, the same notes field. Only the framing text below
// differs, because what the notes are FOR differs — a spoken learner reads
// from them mid-sentence, a typed learner types the sentence themselves.
//
// The notes written here ride along to the runner on the stash, where they
// stay visible for the whole Discussion regardless of Modality.

import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { TEIL2_STASH_KEY, type Teil2RunStash } from '../../data/sprechen'
import { resolveArgumentBank, type ArgumentBank } from '../../data/sprechenArguments'
import { generateArgumentBank, loadCachedBank, saveCachedBank } from '../../composables/useSprechenArguments'
import { SPRECHEN_TOPICS } from '../../data/sprechenTopics'
import { resolveAiClient } from '../../composables/localClaude'
import { useSettings } from '../../composables/useSettings'
import { useToast } from '../../composables/useToast'

const router = useRouter()
const toast = useToast()
const { settings, canUseAi, load: loadSettings } = useSettings()

const stash = ref<Teil2RunStash | null>(null)
const bank = ref<ArgumentBank | null>(null)
const scope = ref<string>('')
const notes = ref('')
const left = ref(60)
const running = ref(true)
const regenerating = ref(false)
let tick: number | undefined

/** The learner argues the side the partner did NOT take. */
const mySide = computed<'pro' | 'contra'>(() =>
  stash.value?.stance === 'pro' ? 'contra' : 'pro'
)

const mine = computed(() => {
  if (!bank.value) return []
  return mySide.value === 'pro' ? bank.value.pro : bank.value.contra
})
const theirs = computed(() => {
  if (!bank.value) return []
  return mySide.value === 'pro' ? bank.value.contra : bank.value.pro
})

const clock = computed(() => {
  const m = Math.floor(left.value / 60)
  const s = left.value % 60
  return `${m}:${String(s).padStart(2, '0')}`
})

/** One word confirming the Modality picked a screen ago, without a trip back. */
const modalityWord = computed(() => stash.value?.modality === 'typed' ? 'getippt' : 'gesprochen')

// The notes are the same hint surface in both Modalities, but what they're
// FOR differs: a spoken learner reads them aloud mid-sentence, so everything
// not jotted down must still be sayable from memory. A typed learner is
// typing the sentence anyway, so the notes are a plan, not a lifeline.
const prepSubtitle = computed(() => stash.value?.modality === 'typed'
  ? 'Lies die Winkel, nimm zwei mit, notiere drei Wörter. Deine Notizen bleiben sichtbar, aber sie sind ein Plan, keine Krücke — den Rest tippst du selbst.'
  : 'Lies die Winkel, nimm zwei mit, notiere drei Wörter. Deine Notizen bleiben während der Diskussion sichtbar — alles andere musst du sagen können.'
)

function sideDe(side: 'pro' | 'contra') { return side === 'pro' ? 'dafür' : 'dagegen' }

onMounted(async () => {
  await loadSettings()
  const raw = sessionStorage.getItem(TEIL2_STASH_KEY)
  if (!raw) return
  try {
    const s = JSON.parse(raw) as Teil2RunStash
    stash.value = s
    notes.value = s.notes ?? ''
    left.value = s.prepSeconds > 0 ? s.prepSeconds : 60

    // A cached AI bank beats the authored one; the tag bank is the floor.
    // Custom (generated) Topics aren't in SPRECHEN_TOPICS, so they resolve
    // through their own cached bank or fall back to the Gesellschaft tag.
    const record = SPRECHEN_TOPICS.find(t => t.id === s.topic.id)
    const cached = await loadCachedBank(s.topic.id)
    const resolved = resolveArgumentBank(
      { id: s.topic.id, tags: record?.tags ?? [] },
      cached ?? undefined
    )
    bank.value = resolved.bank
    scope.value = resolved.scope
  } catch { /* leave stash null — the guard below renders */ }

  tick = window.setInterval(() => {
    if (running.value && left.value > 0) left.value -= 1
  }, 1000)
})

onUnmounted(() => { if (tick !== undefined) window.clearInterval(tick) })

function go() {
  if (!stash.value) return
  const next: Teil2RunStash = { ...stash.value, notes: notes.value }
  sessionStorage.setItem(TEIL2_STASH_KEY, JSON.stringify(next))
  router.push({ name: 'sprechen-teil2-run' })
}

async function regenerateBank() {
  const s = stash.value
  if (!s || !canUseAi.value || regenerating.value) return
  regenerating.value = true
  try {
    const client = resolveAiClient(settings.value)
    const fresh = await generateArgumentBank(client, settings.value.model, s.topic)
    await saveCachedBank(s.topic.id, fresh)
    bank.value = fresh
    scope.value = 'cached'
    toast.success('Neuer Argumentenspeicher generiert')
  } catch (err) {
    // Keep whatever bank was showing (authored or tag fallback) — a failed
    // regeneration must never blank the prep screen.
    toast.error('Generierung fehlgeschlagen', {
      description: err instanceof Error ? err.message : String(err)
    })
  } finally {
    regenerating.value = false
  }
}

function backToSetup() { router.push({ name: 'sprechen-teil2' }) }
</script>

<template>
  <div v-if="!stash" class="page">
    <div class="alert alert-info">
      <span class="alert-label">Hinweis</span>
      Kein Thema gewählt — die Vorbereitung braucht eine Prüfungskarte.
    </div>
    <button class="btn btn-ghost" type="button" @click="backToSetup">← Themenwahl</button>
  </div>

  <div v-else class="page prep-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Sprechen Teil 2 · {{ modalityWord }} · Etappe 02</div>
        <h1 class="section-title">Vorbereitung<em>.</em></h1>
        <p class="section-subtitle">{{ prepSubtitle }}</p>
      </div>
      <div class="prep-timer">
        <div class="micro-mark">Denkzeit</div>
        <div class="timer-num" :class="{ low: left <= 10 }">{{ clock }}</div>
        <div class="timer-ctl">
          <button class="btn btn-quiet" type="button" @click="running = !running">
            {{ running ? 'Pause' : 'Weiter' }}
          </button>
          <button class="btn btn-quiet" type="button" @click="running = false; left = 0">Stopp</button>
        </div>
        <div v-if="left === 0" class="micro-mark time-up">Zeit vorbei — starten geht weiter</div>
      </div>
    </header>

    <div class="prep-thesis">
      <div class="micro-mark">Thema · {{ stash.topic.titleDe }}</div>
      <p class="thesis-text">{{ stash.topic.statementDe }}</p>
      <div class="sides">
        <span>Du</span><b :class="mySide === 'pro' ? 'side-pro' : 'side-contra'">{{ sideDe(mySide) }}</b>
        <span class="sep">·</span>
        <span>Partner</span><b>{{ sideDe(stash.stance) }}</b>
        <span class="sep">·</span>
        <span>{{ stash.turnTarget }} Beiträge</span>
        <span class="sep">·</span>
        <span>Modus</span><b>{{ modalityWord }}</b>
      </div>
    </div>

    <template v-if="bank">
      <h3 class="block-heading">
        Argumentenspeicher
        <span class="scope-note">{{ scope === 'topic' || scope === 'cached' ? 'themenspezifisch' : `Feld ${scope}` }}</span>
        <button
          class="btn btn-quiet regen-btn"
          type="button"
          :disabled="!canUseAi || regenerating"
          @click="regenerateBank"
        >{{ regenerating ? 'Generiere…' : 'Argumente neu generieren' }}</button>
      </h3>
      <p class="ai-cost-note">Ersetzt die angezeigten Argumente mit frisch generierten (1 Call).</p>

      <div class="angles">
        <section class="angle-col mine">
          <div class="angle-head">Deine Seite · {{ sideDe(mySide) }}</div>
          <div v-for="(a, i) in mine" :key="i" class="angle">
            <div class="angle-claim"><b>{{ String(i + 1).padStart(2, '0') }}</b><span>{{ a.claim }}</span></div>
            <p class="angle-why">{{ a.why }}</p>
          </div>
        </section>
        <section class="angle-col theirs">
          <div class="angle-head">Damit wird der Partner kommen</div>
          <div v-for="(a, i) in theirs" :key="i" class="angle">
            <div class="angle-claim"><b>{{ String(i + 1).padStart(2, '0') }}</b><span>{{ a.claim }}</span></div>
            <p class="angle-why">{{ a.why }}</p>
          </div>
        </section>
      </div>

      <h3 class="block-heading">Wortschatz zum Thema</h3>
      <div class="words">
        <div v-for="w in bank.words" :key="w.de" class="word">
          <div class="word-de">{{ w.de }}</div>
          <div class="word-en">{{ w.en }}</div>
        </div>
      </div>
    </template>

    <h3 class="block-heading">Notizen · bleiben im Gespräch sichtbar</h3>
    <textarea
      v-model="notes"
      class="input notes-field"
      rows="5"
      placeholder="Stichpunkte, keine Sätze — zwei Argumente und eine Rückfrage reichen."
    />

    <div class="setup-actions">
      <button class="btn btn-ghost" type="button" @click="backToSetup">← Thema wechseln</button>
      <button class="btn btn-accent btn-meta" type="button" @click="go">
        <span class="bm-main">Diskussion starten <span aria-hidden="true">→</span></span>
        <span class="bm-sub">{{ stash.turnTarget }} Beiträge · Partner {{ sideDe(stash.stance) }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.prep-page { max-width: 900px; }
.prep-timer { text-align: right; flex: 0 0 auto; }
.timer-num {
  font-family: var(--font-display); font-size: 42px; font-variant-numeric: tabular-nums;
  line-height: 1.1; margin: 4px 0;
}
.timer-num.low { color: var(--danger); }
.timer-ctl { display: flex; gap: 8px; justify-content: flex-end; }
.time-up { margin-top: 8px; color: var(--ochre, var(--mute)); }
.prep-thesis { margin: 24px 0 8px; }
.thesis-text {
  font-family: var(--font-display); font-size: 24px; font-style: italic;
  line-height: 1.35; margin: 6px 0 12px; max-width: 640px;
}
.sides { display: flex; gap: 8px; align-items: baseline; font-size: 14px; flex-wrap: wrap; }
.sides b { font-family: var(--font-display); font-style: italic; }
.sides .sep { opacity: 0.5; }
.side-pro { color: var(--success); }
.side-contra { color: var(--danger); }
.block-heading {
  font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.22em;
  text-transform: uppercase; color: var(--mute); margin: 34px 0 12px;
  display: flex; gap: 12px; align-items: baseline;
}
.scope-note { letter-spacing: 0.14em; opacity: 0.75; }
.regen-btn { margin-left: auto; text-transform: none; letter-spacing: normal; font-family: var(--font-body); font-size: 13px; }
.ai-cost-note {
  margin: 0 0 12px;
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.14em;
  color: var(--mute);
  text-transform: uppercase;
}
.angles { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; }
.angle-col.theirs { opacity: 0.82; }
.angle-head {
  font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.2em;
  text-transform: uppercase; color: var(--mute); padding-bottom: 8px;
  border-bottom: 1px solid var(--hairline); margin-bottom: 12px;
}
.angle { margin-bottom: 16px; }
.angle-claim { display: flex; gap: 10px; align-items: baseline; }
.angle-claim b { font-family: var(--font-mono); font-size: 11px; color: var(--accent); }
.angle-claim span { font-family: var(--font-display); font-size: 16px; }
.angle-why { margin: 4px 0 0 26px; font-size: 13.5px; line-height: 1.55; color: var(--ink-soft); }
.words { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 12px; }
.word { padding: 10px 12px; background: var(--paper-deep); border-radius: 4px; }
.word-de { font-family: var(--font-display); font-size: 15px; }
.word-en { color: var(--mute); font-size: 12.5px; font-style: italic; margin-top: 2px; }
.notes-field { width: 100%; resize: vertical; font-size: 15px; line-height: 1.6; }
.setup-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 40px; gap: 16px; }
@media (max-width: 720px) {
  .angles, .words { grid-template-columns: 1fr; }
  .setup-actions { flex-direction: column-reverse; align-items: stretch; }
  .setup-actions .btn { justify-content: center; }
}
</style>
