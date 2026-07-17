<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  KI_DIFFICULTIES,
  KI_DIFFICULTY_LABEL,
  KI_DIFFICULTY_BLURB,
  KI_TOPICS,
  type KiDifficulty,
  type KiTopic
} from '../../data/konjunktiv'
import { useSettings } from '../../composables/useSettings'
import { useToast } from '../../composables/useToast'

const STORAGE_KEY = 'konjunktivSetup'
const router = useRouter()

const difficulty = ref<KiDifficulty>('medium')
const count = ref<number>(10)
const topics = ref<KiTopic[]>([...KI_TOPICS])

const { settings, canUseAi, load: loadSettings } = useSettings()
onMounted(loadSettings)

const error = ref<string | null>(null)

interface Stored { difficulty?: KiDifficulty; count?: number; topics?: KiTopic[] }

onMounted(() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const s = JSON.parse(raw) as Stored
    if (s.difficulty && (KI_DIFFICULTIES as readonly string[]).includes(s.difficulty)) {
      difficulty.value = s.difficulty
    }
    if (typeof s.count === 'number' && s.count >= 5 && s.count <= 25) count.value = s.count
    if (Array.isArray(s.topics)) {
      topics.value = s.topics.filter(t => (KI_TOPICS as readonly string[]).includes(t)) as KiTopic[]
    }
  } catch { /* ignore */ }
})

watch([difficulty, count, topics], () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      difficulty: difficulty.value,
      count: count.value,
      topics: topics.value
    } satisfies Stored))
  } catch { /* ignore */ }
}, { deep: true })

function toggleTopic(t: KiTopic) {
  topics.value = topics.value.includes(t)
    ? topics.value.filter(x => x !== t)
    : [...topics.value, t]
}

const toast = useToast()

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
  error.value = null
  const focusTopics = topics.value.length > 0 && topics.value.length < KI_TOPICS.length
    ? topics.value
    : undefined
  // Stream on the runner: stash only the params generateKiQuestions needs.
  sessionStorage.setItem('gt:lastKonjunktiv', JSON.stringify({
    count: count.value,
    difficulty: difficulty.value,
    topics: focusTopics ?? [...topics.value],
    model: settings.value.model
  }))
  router.push({ name: 'konjunktiv-quiz-run' })
}

function back() { router.push({ name: 'konjunktiv' }) }
</script>

<template>
  <div class="page setup-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Konjunktiv I · Einrichtung</div>
        <h1 class="section-title">Setup<em>.</em></h1>
        <p class="section-subtitle">
          Pick a difficulty and topic mix. Gemini generates quotes on demand;
          each session is fresh.
        </p>
      </div>
    </header>

    <div v-if="!canUseAi" class="alert alert-warning">
      <span class="alert-label">AI access needed</span>
      Set a Gemini API key, or pick <em>Local Claude (dev)</em>, in <router-link :to="{ name: 'settings' }">Settings</router-link>.
    </div>

    <div class="field">
      <div class="field-label">Difficulty</div>
      <div class="segmented">
        <button
          v-for="d in KI_DIFFICULTIES" :key="d"
          type="button"
          :class="{ active: difficulty === d }"
          @click="difficulty = d"
        >{{ KI_DIFFICULTY_LABEL[d] }}</button>
      </div>
      <p class="difficulty-blurb">{{ KI_DIFFICULTY_BLURB[difficulty] }}</p>
    </div>

    <div class="field">
      <div class="field-row">
        <div class="field-label">Topics · {{ topics.length }} of {{ KI_TOPICS.length }}</div>
        <div class="field-actions">
          <button class="btn btn-quiet" type="button" @click="topics = [...KI_TOPICS]">All</button>
        </div>
      </div>
      <div class="chip-row">
        <button v-for="t in KI_TOPICS" :key="t"
          type="button"
          class="chip"
          :class="{ selected: topics.includes(t) }"
          @click="toggleTopic(t)"
        >{{ t }}</button>
      </div>
    </div>

    <div class="field">
      <div class="field-label">Number of quotes</div>
      <div class="segmented">
        <button v-for="n in [5, 10, 15, 20, 25]" :key="n"
          type="button"
          :class="{ active: count === n }"
          @click="count = n"
        >{{ n }}</button>
      </div>
      <p class="ai-cost-note">≈{{ count * 2 }} Gemini calls per session.</p>
    </div>

    <div class="alert alert-info">
      <span class="alert-label">How it works</span>
      Quotes are generated fresh on every Start. Each submitted rewrite is graded
      by Gemini against the canonical answer; when grading is unavailable, the
      app falls back to an exact reference match.
    </div>

    <div v-if="error" class="alert alert-danger">
      <span class="alert-label">Cannot start</span>{{ error }}
    </div>

    <div class="setup-actions">
      <button class="btn btn-ghost" type="button" @click="back">← Back</button>
      <button
        class="btn btn-accent btn-meta"
        type="button"
        :disabled="!canUseAi || topics.length === 0"
        @click="start"
      >
        <span class="bm-main">Generate &amp; start <span aria-hidden="true">→</span></span>
        <span class="bm-sub">{{ count }} quotes · {{ KI_DIFFICULTY_LABEL[difficulty] }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.setup-page { max-width: 720px; }
.field-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px; gap: 12px; flex-wrap: wrap; }
.field-actions { display: flex; gap: 4px; }
.setup-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 40px; gap: 16px; }
@media (max-width: 720px) {
  .setup-actions { flex-direction: column-reverse; align-items: stretch; }
  .setup-actions .btn { justify-content: center; }
}
.difficulty-blurb {
  margin: 10px 0 0 0;
  font-family: var(--font-body);
  font-style: italic;
  font-size: 13.5px;
  color: var(--ink-soft);
}
.ai-cost-note {
  margin: 8px 0 0 0;
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.14em;
  color: var(--mute);
  text-transform: uppercase;
}
</style>
