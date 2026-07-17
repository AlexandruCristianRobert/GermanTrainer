<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  PASSIV_DIFFICULTIES,
  PASSIV_DIFFICULTY_LABEL,
  PASSIV_DIFFICULTY_BLURB,
  TRANSFORMATION_TYPES,
  TRANSFORMATION_LABELS,
  type PassivDifficulty,
  type TransformationType
} from '../../data/passiv'
import { useSettings } from '../../composables/useSettings'
import { useToast } from '../../composables/useToast'

const STORAGE_KEY = 'passivSetup'
const router = useRouter()

const difficulty = ref<PassivDifficulty>('medium')
const count = ref<number>(10)
const focusTypes = ref<TransformationType[]>([...TRANSFORMATION_TYPES])

const { settings, canUseAi, load: loadSettings } = useSettings()
onMounted(loadSettings)

const error = ref<string | null>(null)

interface Stored { difficulty?: PassivDifficulty; count?: number; focusTypes?: TransformationType[] }

onMounted(() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const s = JSON.parse(raw) as Stored
    if (s.difficulty && (PASSIV_DIFFICULTIES as readonly string[]).includes(s.difficulty)) {
      difficulty.value = s.difficulty
    }
    if (typeof s.count === 'number' && s.count >= 5 && s.count <= 25) count.value = s.count
    if (Array.isArray(s.focusTypes)) {
      focusTypes.value = s.focusTypes.filter(
        t => (TRANSFORMATION_TYPES as readonly string[]).includes(t)
      ) as TransformationType[]
    }
  } catch { /* ignore */ }
})

watch([difficulty, count, focusTypes], () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      difficulty: difficulty.value,
      count: count.value,
      focusTypes: focusTypes.value
    } satisfies Stored))
  } catch { /* ignore */ }
}, { deep: true })

function toggleType(t: TransformationType) {
  focusTypes.value = focusTypes.value.includes(t)
    ? focusTypes.value.filter(x => x !== t)
    : [...focusTypes.value, t]
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
  if (focusTypes.value.length === 0) return
  error.value = null

  const focus = focusTypes.value.length > 0 && focusTypes.value.length < TRANSFORMATION_TYPES.length
    ? focusTypes.value
    : undefined

  // Stash the generation params; the runner streams the batches progressively.
  sessionStorage.setItem('gt:lastPassiv', JSON.stringify({
    count: count.value,
    difficulty: difficulty.value,
    focusedTypes: focus,
    focusTypes: focusTypes.value,
    model: settings.value.model
  }))
  router.push({ name: 'passiv-quiz-run' })
}

function back() { router.push({ name: 'passiv' }) }
</script>

<template>
  <div class="page setup-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Passiv · Einrichtung</div>
        <h1 class="section-title">Setup<em>.</em></h1>
        <p class="section-subtitle">
          One active sentence per screen, one transformation per question.
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
          v-for="d in PASSIV_DIFFICULTIES" :key="d"
          type="button"
          :class="{ active: difficulty === d }"
          @click="difficulty = d"
        >{{ PASSIV_DIFFICULTY_LABEL[d] }}</button>
      </div>
      <p class="difficulty-blurb">{{ PASSIV_DIFFICULTY_BLURB[difficulty] }}</p>
    </div>

    <div class="field">
      <div class="field-row">
        <div class="field-label">Focus types · {{ focusTypes.length }} of {{ TRANSFORMATION_TYPES.length }}</div>
        <div class="field-actions">
          <button class="btn btn-quiet" type="button" @click="focusTypes = [...TRANSFORMATION_TYPES]">All</button>
        </div>
      </div>
      <div class="chip-row">
        <button v-for="t in TRANSFORMATION_TYPES" :key="t"
          type="button"
          class="chip"
          :class="{ selected: focusTypes.includes(t) }"
          @click="toggleType(t)"
          :title="TRANSFORMATION_LABELS[t]"
        >{{ t }}</button>
      </div>
    </div>

    <div class="field">
      <div class="field-label">Number of sentences</div>
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
      Sentences are generated fresh on every Start. Each rewrite is judged by Gemini;
      grading also reports which transformation type your answer actually used, so
      you can spot type mismatches.
    </div>

    <div v-if="error" class="alert alert-danger">
      <span class="alert-label">Generation failed</span>{{ error }}
    </div>

    <div class="setup-actions">
      <button class="btn btn-ghost" type="button" @click="back">← Back</button>
      <button
        class="btn btn-accent btn-meta"
        type="button"
        :disabled="!canUseAi || focusTypes.length === 0"
        @click="start"
      >
        <span class="bm-main">Generate &amp; start <span aria-hidden="true">→</span></span>
        <span class="bm-sub">{{ count }} sentences · {{ PASSIV_DIFFICULTY_LABEL[difficulty] }}</span>
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
