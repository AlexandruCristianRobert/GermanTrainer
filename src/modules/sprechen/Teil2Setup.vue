<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { TURN_TARGETS, type PartnerStance, type SprechenDiscussion, type TurnTarget } from '../../data/sprechen'
import { SPRECHEN_TOPICS, type SprechenTopic } from '../../data/sprechenTopics'
import {
  abandonDiscussion, findActiveDiscussion
} from '../../composables/useSprechenDiscussion'
import {
  deleteCustomTopic, generateTopics, addCustomTopics, loadCustomTopics, pickRandomTopic
} from '../../composables/useSprechenTopics'
import { resolveAiClient } from '../../composables/localClaude'
import { useSettings } from '../../composables/useSettings'
import { useToast } from '../../composables/useToast'

const STORAGE_KEY = 'sprechenTeil2Setup'
// NOTE: no `export` here — <script setup> blocks cannot export bindings.
interface SprechenSetupStored {
  mode?: 'random' | 'choose'
  topicId?: string
  turnTarget?: TurnTarget
  stance?: 'random' | 'pro' | 'contra'
  hintsOn?: boolean
  lang?: 'de' | 'en'
}

const router = useRouter()
const toast = useToast()
const { settings, canUseAi, load: loadSettings } = useSettings()

const mode = ref<'random' | 'choose'>('random')
const topicId = ref<string>('')
const turnTarget = ref<TurnTarget>(6)
const stance = ref<'random' | 'pro' | 'contra'>('random')
const hintsOn = ref(true)
const generating = ref(false)
const customTopics = ref<SprechenTopic[]>([])
const active = ref<SprechenDiscussion | null>(null)

const topics = computed(() => [...SPRECHEN_TOPICS, ...customTopics.value])

onMounted(async () => {
  await loadSettings()
  customTopics.value = loadCustomTopics()
  active.value = await findActiveDiscussion()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const s = JSON.parse(raw) as SprechenSetupStored
    if (s.mode === 'random' || s.mode === 'choose') mode.value = s.mode
    if (typeof s.topicId === 'string') topicId.value = s.topicId
    if (s.turnTarget && (TURN_TARGETS as readonly number[]).includes(s.turnTarget)) turnTarget.value = s.turnTarget
    if (s.stance === 'random' || s.stance === 'pro' || s.stance === 'contra') stance.value = s.stance
    if (typeof s.hintsOn === 'boolean') hintsOn.value = s.hintsOn
  } catch { /* ignore */ }
})

watch([mode, topicId, turnTarget, stance, hintsOn], () => {
  try {
    const prev = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as SprechenSetupStored
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...prev,
      mode: mode.value, topicId: topicId.value, turnTarget: turnTarget.value,
      stance: stance.value, hintsOn: hintsOn.value
    } satisfies SprechenSetupStored))
  } catch { /* ignore */ }
})

async function generate() {
  if (!canUseAi.value || generating.value) return
  generating.value = true
  try {
    const client = resolveAiClient(settings.value)
    const fresh = await generateTopics(client, settings.value.model)
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

function resumeActive() { router.push({ name: 'sprechen-teil2-run' }) }

async function discardActive() {
  if (!active.value) return
  await abandonDiscussion(active.value.id)
  active.value = null
}

function start() {
  if (!canUseAi.value) {
    toast.error(
      settings.value.aiProvider === 'local-claude' ? 'Local Claude not reachable' : 'Gemini API key required',
      { description: settings.value.aiProvider === 'local-claude'
          ? 'Run the app with npm run dev, or switch to Gemini in Settings.'
          : 'Set your API key in Settings before using AI.' }
    )
    return
  }
  const topic = mode.value === 'choose'
    ? topics.value.find(t => t.id === topicId.value)
    : pickRandomTopic()
  if (!topic) {
    toast.error('Kein Thema gewählt', { description: 'Wähle ein Thema aus der Liste oder nimm Zufallsthema.' })
    return
  }
  const resolvedStance: PartnerStance = stance.value === 'random'
    ? (Math.random() < 0.5 ? 'pro' : 'contra')
    : stance.value
  sessionStorage.setItem('gt:lastSprechenTeil2', JSON.stringify({
    topic: { id: topic.id, titleDe: topic.titleDe, statementDe: topic.statementDe, source: topic.source },
    turnTarget: turnTarget.value,
    stance: resolvedStance,
    hintsOn: hintsOn.value,
    model: settings.value.model
  }))
  router.push({ name: 'sprechen-teil2-run' })
}

function back() { router.push({ name: 'sprechen' }) }
</script>

<template>
  <div class="page setup-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Sprechen Teil 2 · Einrichtung</div>
        <h1 class="section-title">Diskussion<em>.</em></h1>
        <p class="section-subtitle">
          Pick a Topic and argue your side. The partner takes a stance and
          argues back; your mistakes are marked only afterwards.
        </p>
      </div>
    </header>

    <div v-if="!canUseAi" class="alert alert-warning">
      <span class="alert-label">AI access needed</span>
      Set a Gemini API key, or pick <em>Local Claude (dev)</em>, in <router-link :to="{ name: 'settings' }">Settings</router-link>.
    </div>

    <div v-if="active" class="alert alert-info">
      <span class="alert-label">Diskussion fortsetzen?</span>
      An unfinished discussion on „{{ active.topic.titleDe }}" exists
      ({{ active.turns.filter(t => t.role === 'learner').length }} / {{ active.turnTarget }} turns).
      <div class="resume-actions">
        <button class="btn btn-accent" type="button" @click="resumeActive">Fortsetzen →</button>
        <button class="btn btn-danger" type="button" @click="discardActive">Verwerfen</button>
      </div>
    </div>

    <template v-if="!active">
      <div class="field">
        <div class="field-label">Thema</div>
        <div class="segmented">
          <button type="button" :class="{ active: mode === 'random' }" @click="mode = 'random'">Zufallsthema</button>
          <button type="button" :class="{ active: mode === 'choose' }" @click="mode = 'choose'">Auswählen</button>
        </div>
        <select v-if="mode === 'choose'" v-model="topicId" class="select topic-select">
          <option value="" disabled>— Thema wählen —</option>
          <optgroup label="Seed">
            <option v-for="t in topics.filter(t => t.source === 'seed')" :key="t.id" :value="t.id">{{ t.titleDe }}</option>
          </optgroup>
          <optgroup v-if="customTopics.length > 0" label="Eigene (generiert)">
            <option v-for="t in customTopics" :key="t.id" :value="t.id">{{ t.titleDe }}</option>
          </optgroup>
        </select>
      </div>

      <div class="field">
        <div class="field-label">Neue Themen generieren</div>
        <button class="btn btn-ghost" type="button" :disabled="!canUseAi || generating" @click="generate">
          {{ generating ? 'Generiere…' : '5 neue Themen generieren' }}
        </button>
        <p class="ai-cost-note">Merkt sich bereits diskutierte Themen und vermeidet Wiederholungen.</p>
        <ul v-if="customTopics.length > 0" class="custom-topic-list">
          <li v-for="t in customTopics" :key="t.id">
            <span class="ct-title">{{ t.titleDe }}</span>
            <span class="ct-statement">{{ t.statementDe }}</span>
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
        <div class="field-label">Hints</div>
        <div class="segmented">
          <button type="button" :class="{ active: hintsOn }" @click="hintsOn = true">An</button>
          <button type="button" :class="{ active: !hintsOn }" @click="hintsOn = false">Aus</button>
        </div>
        <p class="ai-cost-note">Move-Chips mit Redemitteln (kostenlos) + KI-Tipp auf Abruf (1 Call).</p>
      </div>

      <div class="alert alert-info">
        <span class="alert-label">How it works</span>
        The partner opens with its position, you alternate typed turns, and
        after your last turn the discussion is analyzed: every mistake marked
        and explained, four criteria scored to 100 points (Aussprache excluded).
        The conversation itself is never stored — only the summary.
      </div>

      <div class="setup-actions">
        <button class="btn btn-ghost" type="button" @click="back">← Back</button>
        <button class="btn btn-accent btn-meta" type="button"
          :disabled="!canUseAi || (mode === 'choose' && !topicId)" @click="start">
          <span class="bm-main">Start discussion <span aria-hidden="true">→</span></span>
          <span class="bm-sub">{{ turnTarget }} Beiträge · Partner {{ stance === 'random' ? 'zufällig' : stance === 'pro' ? 'dafür' : 'dagegen' }}</span>
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.setup-page { max-width: 720px; }
.setup-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 40px; gap: 16px; }
@media (max-width: 720px) {
  .setup-actions { flex-direction: column-reverse; align-items: stretch; }
  .setup-actions .btn { justify-content: center; }
}
.resume-actions { display: flex; gap: 10px; margin-top: 10px; }
.topic-select { margin-top: 10px; width: 100%; }
.custom-topic-list { list-style: none; padding: 0; margin: 12px 0 0 0; }
.custom-topic-list li {
  display: flex; gap: 12px; align-items: baseline;
  padding: 6px 0; border-bottom: 1px solid var(--hairline); font-size: 14px;
}
.ct-title { font-family: var(--font-display); flex: 0 0 auto; }
.ct-statement { color: var(--mute); flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ai-cost-note {
  margin: 8px 0 0 0;
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.14em;
  color: var(--mute);
  text-transform: uppercase;
}
</style>
