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

// Generated from the resolved bank so the hint is never generic filler —
// it names the learner's own first angle and the counter-angle to rebut.
const notesPlaceholder = computed(() => {
  const first = mine.value[0]?.claim ?? ''
  const counter = theirs.value[0]?.claim ?? ''
  return `Stichpunkte, keine Sätze — z. B.\n· ${first}\n· Gegenargument entkräften: ${counter}\n· Frage stellen: „Wie sehen Sie das?"`
})

// Only 'cached' is AI-generated (a fresh Gemini call, saved to Dexie) — 'topic'
// and every TopicTag scope are hand-authored data bundled into the app itself,
// never generated and never cached. The label sits right beside the AI-cost
// note, so it must not claim a bundled bank was AI output.
const scopeLabel = computed(() => {
  if (scope.value === 'cached') return 'themenspezifisch · von der KI erzeugt, dann gecacht'
  if (scope.value === 'topic') return 'themenspezifisch · mitgeliefert, ohne KI'
  return `Feld ${scope.value} · mitgeliefert, ohne KI`
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
    </header>

    <div class="spr-prep-mast">
      <div>
        <div class="spr-lbl">Thema · {{ stash.topic.titleDe }}</div>
        <p class="spr-prep-stmt">{{ stash.topic.statementDe }}</p>
        <div class="spr-sides">
          <span>Du</span><b :class="mySide === 'pro' ? 'spr-side-pro' : 'spr-side-contra'">{{ sideDe(mySide) }}</b>
          <span style="opacity: 0.5">·</span>
          <span>Partner</span><b>{{ sideDe(stash.stance) }}</b>
          <span style="opacity: 0.5">·</span>
          <span>{{ stash.turnTarget }} Beiträge</span>
          <span style="opacity: 0.5">·</span>
          <span>Modus</span><b>{{ modalityWord }}</b>
        </div>
      </div>
      <div class="spr-timer">
        <div class="spr-lbl">Denkzeit</div>
        <div class="spr-timer-num" :class="{ low: left <= 10 }">{{ clock }}</div>
        <div class="spr-timer-ctl">
          <button class="btn btn-quiet" type="button" @click="running = !running">
            {{ running ? 'Pause' : 'Weiter' }}
          </button>
          <button class="btn btn-quiet" type="button" @click="running = false; left = 0">Stopp</button>
        </div>
        <div v-if="left === 0" class="micro-mark" style="margin-top: 8px; color: var(--clay)">Zeit vorbei — starten geht weiter</div>
      </div>
    </div>

    <template v-if="bank">
      <div class="spr-block-h" style="margin-top: 42px; margin-bottom: 0; border-bottom: 0">
        <h2 class="spr-block-t">Argumentenspeicher</h2>
        <span class="spr-block-n">{{ scopeLabel }}</span>
        <button
          class="btn btn-quiet regen-btn"
          type="button"
          :disabled="!canUseAi || regenerating"
          @click="regenerateBank"
        >{{ regenerating ? 'Generiere…' : 'Argumente neu generieren' }}</button>
      </div>
      <p class="ai-cost-note">Ersetzt die angezeigten Argumente mit frisch generierten (1 Call).</p>

      <div class="spr-angles">
        <section class="spr-acol mine">
          <div class="spr-acol-h">
            <span class="spr-acol-t">Deine Seite · {{ sideDe(mySide) }}</span>
            <span class="spr-lbl">{{ mine.length }} Winkel</span>
          </div>
          <div v-for="(a, i) in mine" :key="i" class="spr-angle">
            <div class="spr-angle-c"><b>{{ String(i + 1).padStart(2, '0') }}</b><span>{{ a.claim }}</span></div>
            <p class="spr-angle-w">{{ a.why }}</p>
          </div>
        </section>
        <section class="spr-acol theirs">
          <div class="spr-acol-h">
            <span class="spr-acol-t">Damit wird der Partner kommen</span>
            <span class="spr-lbl">{{ theirs.length }} Winkel</span>
          </div>
          <div v-for="(a, i) in theirs" :key="i" class="spr-angle">
            <div class="spr-angle-c"><b>{{ String(i + 1).padStart(2, '0') }}</b><span>{{ a.claim }}</span></div>
            <p class="spr-angle-w">{{ a.why }}</p>
          </div>
        </section>
      </div>

      <div class="spr-wordstrip">
        <div class="spr-lbl">Wortschatz zum Thema · {{ bank.words.length }} Wörter, die die Prüferin hören will</div>
        <div class="spr-words">
          <div v-for="w in bank.words" :key="w.de" class="spr-word">
            <div class="spr-word-de">{{ w.de }}</div>
            <div class="spr-word-en">{{ w.en }}</div>
          </div>
        </div>
      </div>
    </template>

    <div class="spr-notes-wrap">
      <div>
        <div class="spr-lbl" style="margin-bottom: 10px">Notizen · bleiben im Gespräch sichtbar</div>
        <textarea
          v-model="notes"
          class="spr-notes"
          rows="5"
          :placeholder="notesPlaceholder"
        />
      </div>
      <div>
        <div class="spr-lbl" style="margin-bottom: 10px">Vor dem Start</div>
        <p class="spr-tip">
          Nimm zwei Winkel, nicht vier — mehr bringst du in {{ stash.turnTarget }} Beiträgen nicht unter.
          Plane <em>eine</em> Rückfrage ein: Interaktion wird als eigenes Kriterium bewertet.
        </p>
      </div>
    </div>

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
.regen-btn { text-transform: none; letter-spacing: normal; font-family: var(--font-body); font-size: 13px; }
.ai-cost-note {
  margin: 8px 0 0;
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.14em;
  color: var(--mute);
  text-transform: uppercase;
}
.spr-tip { font-size: 13.5px; line-height: 1.7; color: var(--ink-soft); margin: 0; }
</style>
