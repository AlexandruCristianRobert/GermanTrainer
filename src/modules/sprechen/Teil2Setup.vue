<script setup lang="ts">
//
// Sprechen Teil 2 — setup. ONE flow for both Modalities (CONTEXT.md →
// "Modality"): same Topic pool, same turn targets, same partner stance,
// same prep time and hints. Only the input surface differs — Getippt or
// Gesprochen is the first choice on the page, and only the options that
// are genuinely modality-specific (partner voice, mic-support gate) render
// conditionally under it.

import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  TEIL2_STASH_KEY, TURN_TARGETS,
  type Modality, type PartnerStance, type SprechenDiscussion, type Teil2RunStash, type TurnTarget
} from '../../data/sprechen'
import { TOPIC_TAGS, type SprechenTopic, type TopicTag } from '../../data/sprechenTopics'
import {
  allTopics, doneTopicTitles, generateTopics, addCustomTopics, deleteCustomTopic,
  loadCustomTopics, pickRandomTopic
} from '../../composables/useSprechenTopics'
import { abandonDiscussion, findActiveDiscussion } from '../../composables/useSprechenDiscussion'
import { isSpeechRecognitionSupported } from '../../composables/useSpeechRecognizer'
import { useSpeechVoice } from '../../composables/useSpeechVoice'
import { resolveAiClient } from '../../composables/localClaude'
import { useSettings } from '../../composables/useSettings'
import { useToast } from '../../composables/useToast'

// NOTE: no `export` here — <script setup> blocks cannot export bindings.
const STORAGE_KEY = 'sprechenTeil2Setup'
const PREP_CHOICES: Array<[number, string]> = [[0, 'Aus'], [60, '1 Min'], [180, '3 Min']]

interface StoredSetup {
  modality?: Modality
  turnTarget?: TurnTarget
  stance?: 'random' | 'pro' | 'contra'
  prepSeconds?: number
  hintsOn?: boolean
}

const router = useRouter()
const toast = useToast()
const { settings, canUseAi, load: loadSettings } = useSettings()
const voice = useSpeechVoice()

// Static for the lifetime of the page — the browser either has
// SpeechRecognition or it doesn't. Only SPOKEN depends on it; TYPED must
// stay usable regardless (requirement: an unsupported browser must not
// dead-end the whole module).
const micSupported = isSpeechRecognitionSupported()

const modality = ref<Modality>('typed')
const query = ref('')
const tags = ref<TopicTag[]>([])
const onlyNew = ref(false)
const topicId = ref('')
const turnTarget = ref<TurnTarget>(6)
const stance = ref<'random' | 'pro' | 'contra'>('random')
const prepSeconds = ref(60)
const hintsOn = ref(true)
const customTopics = ref<SprechenTopic[]>([])
const generating = ref(false)
const done = ref<Set<string>>(new Set())
const active = ref<SprechenDiscussion | null>(null)

const pool = computed(() => allTopics())

const visible = computed(() => {
  const q = query.value.trim().toLowerCase()
  return pool.value.filter(t => {
    if (onlyNew.value && done.value.has(t.titleDe)) return false
    if (tags.value.length > 0 && !t.tags.some(x => tags.value.includes(x))) return false
    if (q && !`${t.titleDe} ${t.statementDe}`.toLowerCase().includes(q)) return false
    return true
  })
})

const topic = computed(() => pool.value.find(t => t.id === topicId.value) ?? null)
const undoneCount = computed(() => visible.value.filter(t => !done.value.has(t.titleDe)).length)

onMounted(async () => {
  await loadSettings()
  customTopics.value = loadCustomTopics()
  done.value = doneTopicTitles()
  // No modality filter: one flow now handles both, so any unfinished
  // Discussion — whichever Modality it was started in — is resumable here.
  active.value = await findActiveDiscussion()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const s = JSON.parse(raw) as StoredSetup
      if (s.modality === 'typed' || s.modality === 'spoken') modality.value = s.modality
      if (s.turnTarget && (TURN_TARGETS as readonly number[]).includes(s.turnTarget)) turnTarget.value = s.turnTarget
      if (s.stance === 'random' || s.stance === 'pro' || s.stance === 'contra') stance.value = s.stance
      if (typeof s.prepSeconds === 'number') prepSeconds.value = s.prepSeconds
      if (typeof s.hintsOn === 'boolean') hintsOn.value = s.hintsOn
    }
  } catch { /* ignore */ }

  // A stored preference for Gesprochen can predate this browser session (a
  // different browser, or Firefox without its about:config flag) — never
  // leave the learner stuck on an unselectable modality.
  if (modality.value === 'spoken' && !micSupported) {
    modality.value = 'typed'
    toast.info('Gesprochen ist in diesem Browser nicht verfügbar', {
      description: 'Auf Getippt umgeschaltet — das läuft überall.'
    })
  }
})

watch([modality, turnTarget, stance, prepSeconds, hintsOn], () => {
  try {
    const prev = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, unknown>
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...prev,
      modality: modality.value, turnTarget: turnTarget.value, stance: stance.value,
      prepSeconds: prepSeconds.value, hintsOn: hintsOn.value
    } satisfies StoredSetup))
  } catch { /* ignore */ }
})

function selectModality(m: Modality) {
  // The segment is also :disabled in the template; this guard is defense in
  // depth so nothing can ever land the learner on Gesprochen without a mic.
  if (m === 'spoken' && !micSupported) return
  modality.value = m
}

function toggleTag(t: TopicTag) {
  tags.value = tags.value.includes(t) ? tags.value.filter(x => x !== t) : [...tags.value, t]
}

function resetFilters() { tags.value = []; query.value = ''; onlyNew.value = false }

function pickRandom() {
  const candidates = visible.value.filter(t => !done.value.has(t.titleDe))
  const from = candidates.length > 0 ? candidates : visible.value
  if (from.length > 0) topicId.value = from[Math.floor(Math.random() * from.length)].id
  else topicId.value = pickRandomTopic().id
}

async function generate() {
  if (!canUseAi.value || generating.value) return
  generating.value = true
  try {
    const fresh = await generateTopics(resolveAiClient(settings.value), settings.value.model)
    addCustomTopics(fresh)
    customTopics.value = loadCustomTopics()
    toast.success(`${fresh.length} neue Themen im Pool`)
  } catch (err) {
    toast.error('Themengenerierung fehlgeschlagen', {
      description: err instanceof Error ? err.message : String(err)
    })
  } finally {
    generating.value = false
  }
}

function removeCustom(id: string) {
  deleteCustomTopic(id)
  customTopics.value = loadCustomTopics()
  if (topicId.value === id) topicId.value = ''
}

async function testVoice() {
  await voice.speak('Guten Tag. Ich bin heute Ihre Gesprächspartnerin.')
}

function resumeActive() { router.push({ name: 'sprechen-teil2-run' }) }

async function discardActive() {
  if (!active.value) return
  await abandonDiscussion(active.value.id)
  active.value = null
}

function start() {
  const t = topic.value
  if (!t) return
  if (!canUseAi.value) {
    toast.error(
      settings.value.aiProvider === 'local-claude' ? 'Local Claude not reachable' : 'Gemini API key required',
      { description: settings.value.aiProvider === 'local-claude'
          ? 'Run the app with npm run dev, or switch to Gemini in Settings.'
          : 'Set your API key in Settings before using AI.' }
    )
    return
  }
  // Belt-and-suspenders: the segment can't be selected without a mic and we
  // fall back on mount, but never let a stale ref value start an
  // unsupported spoken run.
  const effectiveModality: Modality = modality.value === 'spoken' && !micSupported ? 'typed' : modality.value
  const resolvedStance: PartnerStance = stance.value === 'random'
    ? (Math.random() < 0.5 ? 'pro' : 'contra')
    : stance.value
  const stash: Teil2RunStash = {
    topic: { id: t.id, titleDe: t.titleDe, statementDe: t.statementDe, source: t.source },
    modality: effectiveModality,
    turnTarget: turnTarget.value,
    stance: resolvedStance,
    prepSeconds: prepSeconds.value,
    hintsOn: hintsOn.value,
    notes: '',
    model: settings.value.model
  }
  sessionStorage.setItem(TEIL2_STASH_KEY, JSON.stringify(stash))
  router.push({ name: prepSeconds.value > 0 ? 'sprechen-teil2-prep' : 'sprechen-teil2-run' })
}

function back() { router.push({ name: 'sprechen' }) }
</script>

<template>
  <div class="page teil2-setup">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Sprechen Teil 2 · Einrichtung</div>
        <h1 class="section-title">Diskussion<em>.</em></h1>
        <p class="section-subtitle">
          Pick a Topic and argue your side — typed or spoken, your choice. The
          partner takes a stance and argues back; your mistakes are marked
          only afterwards.
        </p>
      </div>
    </header>

    <div v-if="!canUseAi" class="alert alert-warning">
      <span class="alert-label">AI access needed</span>
      Set a Gemini API key, or pick <em>Local Claude (dev)</em>, in
      <router-link :to="{ name: 'settings' }">Settings</router-link>.
    </div>

    <div v-if="active" class="alert alert-info">
      <span class="alert-label">Diskussion fortsetzen?</span>
      Eine unfertige {{ active.modality === 'spoken' ? 'gesprochene' : 'getippte' }}
      Diskussion zu „{{ active.topic.titleDe }}" existiert
      ({{ active.turns.filter(t => t.role === 'learner').length }} / {{ active.turnTarget }} Beiträge).
      <div class="resume-actions">
        <button class="btn btn-accent" type="button" @click="resumeActive">Fortsetzen →</button>
        <button class="btn btn-danger" type="button" @click="discardActive">Verwerfen</button>
      </div>
    </div>

    <template v-if="!active">
    <div class="field modality-field">
      <div class="field-label">Modalität</div>
      <div class="segmented segmented-modality">
        <button type="button" :class="{ active: modality === 'typed' }"
          @click="selectModality('typed')">Getippt</button>
        <button type="button" :class="{ active: modality === 'spoken' }" :disabled="!micSupported"
          :title="!micSupported ? 'Dieser Browser kennt keine Spracherkennung.' : undefined"
          @click="selectModality('spoken')">Gesprochen</button>
      </div>
      <p v-if="!micSupported" class="modality-note">
        Gesprochen ist in diesem Browser nicht verfügbar — er kennt keine
        Spracherkennung. Chrome, Edge oder Safari ab 14.1 funktionieren;
        Firefox nur hinter einem about:config-Schalter. Getippt läuft überall.
      </p>
    </div>

    <div v-if="modality === 'spoken'" class="field">
      <div class="field-label">Stimme des Partners</div>
      <div v-if="voice.voices.value.length > 0" class="voice-row">
        <select v-model="voice.voiceName.value" class="select">
          <option v-for="v in voice.voices.value" :key="v.name" :value="v.name">{{ v.name }}</option>
        </select>
        <label class="rate-label">
          Tempo {{ voice.rate.value.toFixed(1) }}×
          <input v-model.number="voice.rate.value" type="range" min="0.6" max="1.4" step="0.1" />
        </label>
        <button class="btn btn-quiet" type="button" @click="testVoice">Probe hören</button>
      </div>
      <p v-else class="ai-cost-note">Keine deutsche Stimme gefunden — der Partner erscheint nur als Text.</p>
    </div>
    <p v-else class="modality-plain-note">
      Getippt braucht keine zusätzliche Einrichtung — funktioniert in jedem Browser.
    </p>

    <div class="field">
      <div class="field-label">Suche · Titel und These</div>
      <input v-model="query" class="input" placeholder="z. B. Arbeit, Schule, verbieten …" />
      <div class="filter-actions">
        <button class="btn btn-quiet" type="button" @click="pickRandom">Zufallsthema</button>
        <button class="btn btn-quiet" type="button" @click="onlyNew = !onlyNew">
          {{ onlyNew ? '✓ Nur neue' : 'Nur neue' }}
        </button>
      </div>
    </div>

    <div class="chip-row tag-row">
      <button v-for="t in TOPIC_TAGS" :key="t" type="button"
        class="chip" :class="{ selected: tags.includes(t) }" @click="toggleTag(t)">{{ t }}</button>
      <button v-if="tags.length > 0 || query || onlyNew" class="chip" type="button" @click="resetFilters">
        Filter zurücksetzen ×
      </button>
    </div>

    <div class="micro-mark list-count">
      {{ visible.length }} von {{ pool.length }} Themen · {{ undoneCount }} noch nicht diskutiert
    </div>

    <div class="topic-list">
      <button v-for="(t, i) in visible" :key="t.id" type="button"
        class="topic-item" :class="{ sel: t.id === topicId, done: done.has(t.titleDe) }"
        @click="topicId = t.id">
        <span class="ti-mark">{{ t.id === topicId ? '●' : done.has(t.titleDe) ? '✓' : String(i + 1).padStart(2, '0') }}</span>
        <span class="ti-body">
          <span class="ti-title">{{ t.titleDe }}<span class="ti-tags">{{ t.tags.join(' · ') }}</span></span>
          <span class="ti-stmt">{{ t.statementDe }}</span>
        </span>
        <span class="ti-flags">
          <span v-if="t.source === 'custom'" class="tag">generiert</span>
          <span v-if="done.has(t.titleDe)" class="tag">diskutiert</span>
        </span>
      </button>
      <p v-if="visible.length === 0" class="empty-note">Kein Thema passt zu diesen Filtern.</p>
    </div>

    <div class="field">
      <div class="field-label">Neue Themen generieren</div>
      <button class="btn btn-ghost" type="button" :disabled="!canUseAi || generating" @click="generate">
        {{ generating ? 'Generiere…' : '5 neue Themen generieren' }}
      </button>
      <ul v-if="customTopics.length > 0" class="custom-list">
        <li v-for="t in customTopics" :key="t.id">
          <span class="cl-title">{{ t.titleDe }}</span>
          <button class="btn btn-quiet" type="button" @click="removeCustom(t.id)">Löschen</button>
        </li>
      </ul>
    </div>

    <div class="field">
      <div class="field-label">Deine Redebeiträge</div>
      <div class="segmented">
        <button v-for="n in TURN_TARGETS" :key="n" type="button"
          :class="{ active: turnTarget === n }" @click="turnTarget = n">{{ n }}</button>
      </div>
    </div>

    <div class="field">
      <div class="field-label">Position des Partners</div>
      <div class="segmented">
        <button type="button" :class="{ active: stance === 'random' }" @click="stance = 'random'">Zufällig</button>
        <button type="button" :class="{ active: stance === 'pro' }" @click="stance = 'pro'">Dafür</button>
        <button type="button" :class="{ active: stance === 'contra' }" @click="stance = 'contra'">Dagegen</button>
      </div>
    </div>

    <div class="field">
      <div class="field-label">Vorbereitungszeit</div>
      <div class="segmented">
        <button v-for="[v, label] in PREP_CHOICES" :key="v" type="button"
          :class="{ active: prepSeconds === v }" @click="prepSeconds = v">{{ label }}</button>
      </div>
      <p class="ai-cost-note">Argumente und Wortschatz zum Thema, plus Notizen, die im Gespräch sichtbar bleiben.</p>
    </div>

    <div class="field">
      <div class="field-label">Hints</div>
      <div class="segmented">
        <button type="button" :class="{ active: hintsOn }" @click="hintsOn = true">An</button>
        <button type="button" :class="{ active: !hintsOn }" @click="hintsOn = false">Aus</button>
      </div>
      <p class="ai-cost-note">Move-Chips mit Redemitteln (kostenlos) + KI-Tipp auf Abruf (1 Call).</p>
    </div>

    <div v-if="modality === 'spoken'" class="alert alert-info">
      <span class="alert-label">So läuft es</span>
      <strong>Leertaste</strong> startet und beendet deinen Beitrag — Beenden schickt ihn
      sofort ab. Was die Erkennung verstanden hat, zählt: korrigieren kannst du nicht.
      Aussprache wird nicht bewertet, Sprechtempo und Pausen schon.
    </div>
    <div v-else class="alert alert-info">
      <span class="alert-label">How it works</span>
      The partner opens with its position, you alternate typed turns, and
      after your last turn the discussion is analyzed: every mistake marked
      and explained, four criteria scored to 100 points (Aussprache excluded).
      The conversation is discarded afterwards; what is kept is the summary
      and each marked mistake, with your own sentence, in the Fehlerarchiv.
    </div>

    <div class="setup-actions">
      <button class="btn btn-ghost" type="button" @click="back">← Back</button>
      <button class="btn btn-accent btn-meta" type="button"
        :disabled="!topic || !canUseAi || (modality === 'spoken' && !micSupported)" @click="start">
        <span class="bm-main">{{ prepSeconds > 0 ? 'Vorbereitung' : 'Diskussion starten' }} <span aria-hidden="true">→</span></span>
        <span class="bm-sub">{{ turnTarget }} Beiträge · Partner {{ stance === 'random' ? 'zufällig' : stance === 'pro' ? 'dafür' : 'dagegen' }}</span>
      </button>
    </div>
    </template>
  </div>
</template>

<style scoped>
.teil2-setup { max-width: 820px; }
.resume-actions { display: flex; gap: 10px; margin-top: 10px; }
.modality-field { margin-bottom: 22px; }
.segmented-modality button {
  padding: 14px 22px;
  font-family: var(--font-display);
  font-size: 16px;
}
.segmented-modality button.active { background: var(--accent); color: var(--paper); }
.modality-note {
  margin: 10px 0 0; color: var(--mute); font-size: 13px; line-height: 1.5;
}
.modality-plain-note {
  margin: 4px 0 20px;
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.04em;
  color: var(--mute);
}
.filter-actions { display: flex; gap: 8px; margin-top: 10px; }
.tag-row { margin: 18px 0 0; }
.list-count { margin: 16px 0 8px; }
.topic-list { max-height: 46vh; overflow-y: auto; border-top: 1px solid var(--hairline); }
.topic-item {
  display: grid; grid-template-columns: 34px minmax(0, 1fr) auto; gap: 12px;
  width: 100%; text-align: left; background: none; border: 0;
  border-bottom: 1px solid var(--hairline); padding: 10px 4px; cursor: pointer; font: inherit;
}
.topic-item:hover { background: var(--paper-deep); }
.topic-item.sel { background: var(--accent-tint); }
.topic-item.done .ti-title { color: var(--mute); }
.ti-mark { font-family: var(--font-mono); font-size: 11px; color: var(--mute); padding-top: 3px; }
.ti-body { min-width: 0; }
.ti-title { font-family: var(--font-display); font-size: 16px; display: block; }
.ti-tags {
  font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.16em;
  text-transform: uppercase; color: var(--mute); margin-left: 10px;
}
.ti-stmt { display: block; color: var(--mute); font-size: 13.5px; margin-top: 2px; }
.ti-flags { display: flex; gap: 6px; align-items: flex-start; flex: 0 0 auto; }
.empty-note { color: var(--mute); font-style: italic; padding: 18px 4px; }
.custom-list { list-style: none; padding: 0; margin: 12px 0 0; }
.custom-list li {
  display: flex; gap: 12px; align-items: baseline; justify-content: space-between;
  padding: 6px 0; border-bottom: 1px solid var(--hairline); font-size: 14px;
}
.cl-title { font-family: var(--font-display); }
.voice-row { display: flex; gap: 14px; align-items: center; flex-wrap: wrap; margin-top: 8px; }
.rate-label {
  display: flex; align-items: center; gap: 8px;
  font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.14em;
  text-transform: uppercase; color: var(--mute);
}
.ai-cost-note {
  margin: 8px 0 0; font-family: var(--font-mono); font-size: 10.5px;
  letter-spacing: 0.14em; color: var(--mute); text-transform: uppercase;
}
.setup-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 40px; gap: 16px; }
@media (max-width: 720px) {
  .setup-actions { flex-direction: column-reverse; align-items: stretch; }
  .setup-actions .btn { justify-content: center; }
}
</style>
