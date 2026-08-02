<script setup lang="ts">
//
// Sprechen Teil 2 — setup. ONE flow for both Modalities (CONTEXT.md →
// "Modality"): same Topic pool, same turn targets, same partner stance,
// same prep time and hints. Only the input surface differs — Getippt or
// Gesprochen is the first choice on the page, and only the options that
// are genuinely modality-specific (partner voice, mic-support gate) render
// conditionally under it. The Modalität field sits first in the
// Prüfungskarte (spec decision): typed and spoken are one flow producing a
// comparable result, not two separate tests, so Modality is a peer setting
// alongside Beiträge/Position/Vorbereitung/Hilfen — not a screen-level switch.

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
// Row markers need to know which Topics already have a cached argument bank.
// One Dexie read on mount; a failure just drops the markers (see below).
import { cachedBankIds } from '../../composables/useSprechenArguments'
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
const cachedIds = ref<Set<string>>(new Set())

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

/**
 * The learner argues the side the partner did NOT take (same formula as
 * Teil2Prep.vue / Teil2Runner.vue). While `stance` is still 'random' this is
 * only a provisional preview — `start()` resolves the real coin flip.
 */
const mySide = computed<'pro' | 'contra'>(() => (stance.value === 'pro' ? 'contra' : 'pro'))

function tagCount(t: TopicTag): number {
  return pool.value.filter(x => x.tags.includes(t)).length
}

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

// Row markers need to know which Topics already have a cached argument bank.
// One Dexie read on mount; a failure just drops the markers, never the screen.
onMounted(async () => {
  try {
    cachedIds.value = await cachedBankIds()
  } catch {
    cachedIds.value = new Set()
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
</script>

<template>
  <div class="page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Sprechen Teil 2 · Etappe 01</div>
        <h1 class="section-title">Themenwahl<em>.</em></h1>
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

    <div v-if="!active" class="spr-setup">
      <div>
        <div class="spr-search-row">
          <div class="field spr-search-field">
            <div class="field-label">Suche · Titel und These</div>
            <input v-model="query" class="input" placeholder="z. B. Arbeit, Schule, verbieten …" />
          </div>
          <div class="spr-search-btns">
            <button class="btn btn-quiet" type="button" @click="pickRandom">Zufallsthema</button>
            <button class="btn btn-quiet" type="button" @click="onlyNew = !onlyNew">
              {{ onlyNew ? '✓ Nur neue' : 'Nur neue' }}
            </button>
          </div>
        </div>

        <div class="spr-tagrow">
          <button v-for="t in TOPIC_TAGS" :key="t" type="button"
            class="spr-tag" :class="{ on: tags.includes(t) }" @click="toggleTag(t)">
            {{ t }}<i>{{ tagCount(t) }}</i>
          </button>
          <button v-if="tags.length > 0 || query || onlyNew" type="button"
            class="spr-tag" @click="resetFilters">Filter zurücksetzen ×</button>
        </div>

        <div class="micro-mark spr-count-line">
          {{ visible.length }} von {{ pool.length }} Themen ·
          {{ undoneCount }} noch nicht diskutiert
        </div>

        <div class="spr-tlist">
          <button v-for="(t, i) in visible" :key="t.id" type="button"
            class="spr-titem"
            :class="{ sel: t.id === topicId, done: done.has(t.titleDe) }"
            @click="topicId = t.id">
            <span class="spr-titem-mark">
              {{ t.id === topicId ? '●' : done.has(t.titleDe) ? '✓' : String(i + 1).padStart(2, '0') }}
            </span>
            <span class="spr-titem-main">
              <span class="spr-titem-t">
                {{ t.titleDe }}
                <span class="spr-titem-tags">{{ t.tags.join(' · ') }}</span>
              </span>
              <span class="spr-titem-s spr-titem-block">{{ t.statementDe }}</span>
            </span>
            <span class="spr-titem-r">
              <span v-if="t.source === 'custom'" class="spr-flag cache">generiert</span>
              <span v-if="done.has(t.titleDe)" class="spr-flag done">diskutiert</span>
              <span v-if="cachedIds.has(t.id)" class="spr-flag cache">Argumente im Cache</span>
            </span>
          </button>
          <p v-if="visible.length === 0" class="spr-empty">
            Kein Thema passt zu diesen Filtern.
          </p>
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
      </div>

      <aside class="spr-card">
        <div class="spr-card-h">
          <span class="spr-lbl">Prüfungskarte</span>
          <span class="spr-lbl">B2 · Teil 2</span>
        </div>
        <div class="spr-card-b">
          <template v-if="topic">
            <div class="spr-card-topic">{{ topic.titleDe }}</div>
            <p class="spr-card-stmt">{{ topic.statementDe }}</p>
          </template>
          <p v-else class="spr-card-none">
            Noch kein Thema gewählt. Nimm eines aus der Liste — oder lass den Zufall entscheiden.
          </p>

          <div class="spr-card-f">
            <div class="spr-fld">
              <span class="spr-fld-l">Modalität</span>
              <div class="segmented">
                <button type="button" :class="{ active: modality === 'typed' }"
                  @click="selectModality('typed')">Getippt</button>
                <button type="button" :class="{ active: modality === 'spoken' }" :disabled="!micSupported"
                  :title="!micSupported ? 'Dieser Browser kennt keine Spracherkennung.' : undefined"
                  @click="selectModality('spoken')">Gesprochen</button>
              </div>
              <div v-if="modality === 'spoken' && voice.voices.value.length > 0" class="spr-voice">
                <div class="voice-row">
                  <select v-model="voice.voiceName.value" class="select">
                    <option v-for="v in voice.voices.value" :key="v.name" :value="v.name">{{ v.name }}</option>
                  </select>
                  <label class="rate-label">
                    Tempo {{ voice.rate.value.toFixed(1) }}×
                    <input v-model.number="voice.rate.value" type="range" min="0.6" max="1.4" step="0.1" />
                  </label>
                  <button class="btn btn-quiet" type="button" @click="testVoice">Probe hören</button>
                </div>
              </div>
              <span v-else-if="modality === 'spoken'" class="spr-fld-note">
                Keine deutsche Stimme gefunden — der Partner erscheint nur als Text.
              </span>
              <span v-if="!micSupported" class="spr-fld-note">
                Gesprochen ist in diesem Browser nicht verfügbar. Getippt läuft überall.
              </span>
            </div>

            <div class="spr-fld">
              <span class="spr-fld-l">Deine Beiträge</span>
              <div class="segmented">
                <button v-for="n in TURN_TARGETS" :key="n" type="button"
                  :class="{ active: turnTarget === n }" @click="turnTarget = n">{{ n }}</button>
              </div>
            </div>

            <div class="spr-fld">
              <span class="spr-fld-l">Position des Partners</span>
              <div class="segmented">
                <button type="button" :class="{ active: stance === 'random' }"
                  @click="stance = 'random'">Zufall</button>
                <button type="button" :class="{ active: stance === 'pro' }"
                  @click="stance = 'pro'">Dafür</button>
                <button type="button" :class="{ active: stance === 'contra' }"
                  @click="stance = 'contra'">Dagegen</button>
              </div>
              <div v-if="topic" class="spr-card-side">
                <span class="spr-lbl">Du</span>
                <strong :class="mySide === 'pro' ? 'spr-side-pro' : 'spr-side-contra'">
                  {{ mySide === 'pro' ? 'dafür' : 'dagegen' }}
                </strong>
                <span v-if="stance === 'random'" class="spr-fld-note">
                  (bei Zufall erst beim Start endgültig)
                </span>
              </div>
            </div>

            <div class="spr-fld">
              <span class="spr-fld-l">Vorbereitungszeit</span>
              <div class="segmented">
                <button v-for="[v, label] in PREP_CHOICES" :key="v" type="button"
                  :class="{ active: prepSeconds === v }" @click="prepSeconds = v">{{ label }}</button>
              </div>
              <span class="spr-fld-note">
                Argumente und Wortschatz zum Thema, plus ein Notizfeld, das während der
                Diskussion sichtbar bleibt.
              </span>
            </div>

            <div class="spr-fld">
              <span class="spr-fld-l">Hilfen im Gespräch</span>
              <div class="segmented">
                <button type="button" :class="{ active: hintsOn }" @click="hintsOn = true">An</button>
                <button type="button" :class="{ active: !hintsOn }" @click="hintsOn = false">Aus</button>
              </div>
              <span class="spr-fld-note">
                Was (Argumente) und Wie (Redemittel) — kostenlos. KI-Tipp auf Abruf kostet einen Call.
              </span>
            </div>
          </div>
        </div>
        <div class="spr-card-go">
          <button class="btn btn-accent btn-meta"
            :disabled="!topic || !canUseAi || (modality === 'spoken' && !micSupported)" @click="start">
            <span class="bm-main">
              {{ prepSeconds > 0 ? 'Vorbereitung' : 'Diskussion starten' }}
              <span aria-hidden="true">→</span>
            </span>
            <span class="bm-sub">
              {{ modality === 'spoken' ? 'gesprochen' : 'getippt' }} ·
              {{ turnTarget }} Beiträge ·
              {{ prepSeconds === 0 ? 'ohne Vorbereitung' : `${prepSeconds / 60} Min` }}
            </span>
          </button>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.spr-search-field { margin-bottom: 0; }
.spr-search-btns { display: flex; gap: 8px; }
.spr-count-line { margin-top: 18px; }
.spr-titem-main { min-width: 0; }
.spr-titem-block { display: block; }
.spr-voice { margin-top: 8px; }
.spr-fld-note { font-size: 12.5px; color: var(--mute); font-style: italic; line-height: 1.5; }

/* Not in Task 1's sheet (no equivalent in the design comp) — kept because the
   generator block and the voice picker are preserved VERBATIM from the prior
   markup (see brief Step 5) and would otherwise render unstyled. */
.resume-actions { display: flex; gap: 10px; margin-top: 10px; }
.custom-list { list-style: none; padding: 0; margin: 12px 0 0; }
.custom-list li {
  display: flex; gap: 12px; align-items: baseline; justify-content: space-between;
  padding: 6px 0; border-bottom: 1px solid var(--hairline); font-size: 14px;
}
.cl-title { font-family: var(--font-display); }
/* Everything here has to survive the Prüfungskarte's 316px column. A native
   <select> sizes itself to its widest <option>, and German voice names run to
   "Microsoft Katja Online (Natural) - German (Germany)" — so without an
   explicit min-width:0 the select refuses to shrink and hangs out of the card.
   It gets a row to itself; tempo and Probe hören share the next one. */
.voice-row { display: flex; gap: 10px 14px; align-items: center; flex-wrap: wrap; }
.voice-row .select {
  flex: 1 1 100%; min-width: 0; max-width: 100%;
  font-size: 14px; text-overflow: ellipsis;
}
.rate-label {
  display: flex; align-items: center; gap: 8px; flex: 1 1 150px; min-width: 0;
  font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.14em;
  text-transform: uppercase; color: var(--mute);
}
.rate-label input[type="range"] { flex: 1 1 60px; min-width: 0; }
</style>
