<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { filterArticleFill } from '../../composables/useDeclension'
import {
  DECL_LEVELS, DECL_CASES, DECL_DETERMINERS, DECL_GENDERS,
  type DeclLevel, type DeclCase, type Determiner, type DeclGender
} from '../../data/declension'
import {
  generateDeclensionArticles,
  type GenerateResult
} from '../../composables/useDeclensionAI'
import { DIFFICULTIES, DIFFICULTY_LABEL, type Difficulty } from '../../data/declension-ai'
import { useSettings } from '../../composables/useSettings'
import { makeGeminiClient } from '../../composables/useClaude'

const STORAGE_KEY = 'declArticleSetup'
const AI_STORAGE_KEY = 'declArticleAISetup'
const router = useRouter()

type Source = 'curated' | 'ai'
const source = ref<Source>('curated')
const difficulty = ref<Difficulty>('medium')
const aiCount = ref<number>(10)
const aiFocusCases = ref<DeclCase[]>([...DECL_CASES])

const { settings, hasApiKey, load: loadSettings } = useSettings()
onMounted(loadSettings)

const aiGenerating = ref(false)
const aiError = ref<string | null>(null)
const aiLastResult = ref<GenerateResult | null>(null)

interface AIStored { difficulty?: Difficulty; count?: number; focusCases?: DeclCase[]; source?: Source }

onMounted(() => {
  try {
    const raw = localStorage.getItem(AI_STORAGE_KEY)
    if (!raw) return
    const s = JSON.parse(raw) as AIStored
    if (s.difficulty && (DIFFICULTIES as readonly string[]).includes(s.difficulty)) {
      difficulty.value = s.difficulty
    }
    if (typeof s.count === 'number' && s.count > 0 && s.count <= 30) aiCount.value = s.count
    if (Array.isArray(s.focusCases)) {
      aiFocusCases.value = s.focusCases.filter(
        c => (DECL_CASES as readonly string[]).includes(c)
      ) as DeclCase[]
    }
    if (s.source === 'ai' || s.source === 'curated') source.value = s.source
  } catch { /* ignore */ }
})

watch([difficulty, aiCount, aiFocusCases, source], () => {
  try {
    localStorage.setItem(AI_STORAGE_KEY, JSON.stringify({
      difficulty: difficulty.value,
      count: aiCount.value,
      focusCases: aiFocusCases.value,
      source: source.value
    } satisfies AIStored))
  } catch { /* ignore */ }
}, { deep: true })

const levels = ref<DeclLevel[]>([...DECL_LEVELS])
const cases = ref<DeclCase[]>([...DECL_CASES])
const determiners = ref<Determiner[]>([...DECL_DETERMINERS])
const genders = ref<DeclGender[]>([...DECL_GENDERS])
type CountPreset = 10 | 15 | 20 | 'all' | 'custom'
const count = ref<CountPreset>(10)
const customCount = ref(15)

interface Stored {
  levels?: DeclLevel[]
  cases?: DeclCase[]
  determiners?: Determiner[]
  genders?: DeclGender[]
  count?: CountPreset
  customCount?: number
}

function loadStored(): Stored | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return null
    return p as Stored
  } catch { return null }
}
function saveStored(): void {
  try {
    const payload: Stored = {
      levels: [...levels.value],
      cases: [...cases.value],
      determiners: [...determiners.value],
      genders: [...genders.value],
      count: count.value,
      customCount: customCount.value
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch { /* ignore */ }
}

onMounted(() => {
  const s = loadStored()
  if (!s) return
  if (Array.isArray(s.levels)) levels.value = s.levels.filter(l => (DECL_LEVELS as readonly string[]).includes(l))
  if (Array.isArray(s.cases)) cases.value = s.cases.filter(c => (DECL_CASES as readonly string[]).includes(c))
  if (Array.isArray(s.determiners)) determiners.value = s.determiners.filter(d => (DECL_DETERMINERS as readonly string[]).includes(d))
  if (Array.isArray(s.genders)) genders.value = s.genders.filter(g => (DECL_GENDERS as readonly string[]).includes(g))
  if (s.count !== undefined) count.value = s.count
  if (typeof s.customCount === 'number' && s.customCount > 0) customCount.value = s.customCount
})
watch([levels, cases, determiners, genders, count, customCount], saveStored, { deep: true })

const available = computed(() => filterArticleFill({
  levels: levels.value,
  cases: cases.value,
  determiners: determiners.value,
  genders: genders.value
}).length)

const effective = computed(() => {
  if (count.value === 'all') return available.value
  if (count.value === 'custom') return Math.min(customCount.value, available.value)
  return Math.min(count.value, available.value)
})

function toggle<T>(set: T[], v: T): T[] {
  const i = set.indexOf(v)
  if (i >= 0) return set.filter((_, j) => j !== i)
  return [...set, v]
}

function startCurated() {
  if (available.value === 0) return
  router.push({
    name: 'declension-article-run',
    query: {
      count: String(effective.value),
      levels: levels.value.join(','),
      cases: cases.value.join(','),
      determiners: determiners.value.join(','),
      genders: genders.value.join(',')
    }
  })
}

async function startAI() {
  if (!hasApiKey.value) {
    aiError.value = 'Set your Gemini API key in Settings first.'
    return
  }
  aiGenerating.value = true
  aiError.value = null
  aiLastResult.value = null
  try {
    const client = makeGeminiClient(settings.value.geminiApiKey)
    const focusedCases = aiFocusCases.value.length > 0 && aiFocusCases.value.length < DECL_CASES.length
      ? aiFocusCases.value
      : undefined
    const result = await generateDeclensionArticles(client, {
      model: settings.value.model,
      count: aiCount.value,
      difficulty: difficulty.value,
      focusedCases,
      maxRetries: 2
    })
    aiLastResult.value = result
    if (result.entries.length === 0) {
      aiError.value = `The model returned ${result.rejected} entries but none passed validation. Try a different difficulty or retry.`
      return
    }
    sessionStorage.setItem('gt:lastDeclArticleAI', JSON.stringify({
      entries: result.entries,
      difficulty: difficulty.value,
      focusCases: aiFocusCases.value
    }))
    router.push({ name: 'declension-article-ai-run' })
  } catch (err) {
    aiError.value = err instanceof Error ? err.message : 'AI generation failed.'
  } finally {
    aiGenerating.value = false
  }
}

function back() { router.push({ name: 'declension' }) }
</script>

<template>
  <div class="page setup-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Kapitel V · Artikel einsetzen · Einrichtung</div>
        <h1 class="section-title">Setup<em>.</em></h1>
        <p class="section-subtitle">
          One sentence per screen. Type the article that fills the blank.
        </p>
      </div>
    </header>

    <div class="field">
      <div class="field-label">Source</div>
      <div class="segmented">
        <button type="button" :class="{ active: source === 'curated' }" @click="source = 'curated'">
          Curated · 80 phrases
        </button>
        <button type="button" :class="{ active: source === 'ai' }" @click="source = 'ai'">
          AI · Live
        </button>
      </div>
    </div>

    <template v-if="source === 'curated'">
    <div class="field">
      <div class="field-row">
        <div class="field-label">Level · {{ levels.length }} of {{ DECL_LEVELS.length }}</div>
        <div class="field-actions">
          <button class="btn btn-quiet" type="button" @click="levels = [...DECL_LEVELS]">All</button>
          <button class="btn btn-quiet" type="button" @click="levels = []">None</button>
        </div>
      </div>
      <div class="chip-row">
        <button
          v-for="l in DECL_LEVELS" :key="l"
          class="chip"
          :class="{ selected: levels.includes(l) }"
          @click="levels = toggle(levels, l)"
        >{{ l }}</button>
      </div>
    </div>

    <div class="field">
      <div class="field-row">
        <div class="field-label">Case · {{ cases.length }} of {{ DECL_CASES.length }}</div>
        <div class="field-actions">
          <button class="btn btn-quiet" type="button" @click="cases = [...DECL_CASES]">All</button>
          <button class="btn btn-quiet" type="button" @click="cases = []">None</button>
        </div>
      </div>
      <div class="chip-row">
        <button
          v-for="c in DECL_CASES" :key="c"
          class="chip"
          :class="{ selected: cases.includes(c) }"
          @click="cases = toggle(cases, c)"
        >{{ c }}</button>
      </div>
    </div>

    <div class="field">
      <div class="field-row">
        <div class="field-label">Determiner · {{ determiners.length }} of {{ DECL_DETERMINERS.length }}</div>
        <div class="field-actions">
          <button class="btn btn-quiet" type="button" @click="determiners = [...DECL_DETERMINERS]">All</button>
          <button class="btn btn-quiet" type="button" @click="determiners = []">None</button>
        </div>
      </div>
      <div class="chip-row">
        <button
          v-for="d in DECL_DETERMINERS" :key="d"
          class="chip"
          :class="{ selected: determiners.includes(d) }"
          @click="determiners = toggle(determiners, d)"
        >{{ d }}</button>
      </div>
    </div>

    <div class="field">
      <div class="field-row">
        <div class="field-label">Gender · {{ genders.length }} of {{ DECL_GENDERS.length }}</div>
        <div class="field-actions">
          <button class="btn btn-quiet" type="button" @click="genders = [...DECL_GENDERS]">All</button>
          <button class="btn btn-quiet" type="button" @click="genders = []">None</button>
        </div>
      </div>
      <div class="chip-row">
        <button
          v-for="g in DECL_GENDERS" :key="g"
          class="chip"
          :class="{ selected: genders.includes(g) }"
          @click="genders = toggle(genders, g)"
        >{{ g }}</button>
      </div>
    </div>

    <div class="field">
      <div class="field-label">Number of sentences</div>
      <div class="field-row count-row">
        <div class="segmented">
          <button :class="{ active: count === 10 }" @click="count = 10">10</button>
          <button :class="{ active: count === 15 }" @click="count = 15">15</button>
          <button :class="{ active: count === 20 }" @click="count = 20">20</button>
          <button :class="{ active: count === 'all' }" @click="count = 'all'">All · {{ available }}</button>
          <button :class="{ active: count === 'custom' }" @click="count = 'custom'">Custom</button>
        </div>
        <input
          v-if="count === 'custom'"
          class="input custom-count"
          type="number"
          :min="1"
          :max="available || 1"
          v-model.number="customCount"
        />
        <span class="micro-mark count-avail">{{ available }} match</span>
      </div>
    </div>

    <div v-if="available === 0" class="alert alert-warning">
      <span class="alert-label">Warning</span>
      No sentences match the selected filters.
    </div>

    <div class="alert alert-info">
      <span class="alert-label">Acceptance</span>
      Case and whitespace are ignored. The case rule for each preposition is named above the prompt as a hint.
    </div>
    </template>

    <template v-else>
      <div v-if="!hasApiKey" class="alert alert-warning">
        <span class="alert-label">Required</span>
        Set your Gemini API key in <router-link :to="{ name: 'settings' }">Settings</router-link> first.
      </div>

      <div class="field">
        <div class="field-label">Difficulty</div>
        <div class="segmented">
          <button
            v-for="d in DIFFICULTIES" :key="d"
            type="button"
            :class="{ active: difficulty === d }"
            @click="difficulty = d"
          >{{ DIFFICULTY_LABEL[d] }}</button>
        </div>
        <p class="difficulty-blurb">
          <template v-if="difficulty === 'easy'">A1–A2 vocabulary, 1–2 blanks per sentence, definite or indefinite article only.</template>
          <template v-else-if="difficulty === 'medium'">B1 vocabulary, 2–3 blanks per sentence, includes possessive determiners.</template>
          <template v-else>B2–C1 vocabulary, 3–4 blanks per sentence, genitive constructions + subordinate clauses.</template>
        </p>
      </div>

      <div class="field">
        <div class="field-row">
          <div class="field-label">Focus cases · {{ aiFocusCases.length }} of {{ DECL_CASES.length }}</div>
          <div class="field-actions">
            <button class="btn btn-quiet" type="button" @click="aiFocusCases = [...DECL_CASES]">All</button>
          </div>
        </div>
        <div class="chip-row">
          <button v-for="c in DECL_CASES" :key="c"
            type="button"
            class="chip"
            :class="{ selected: aiFocusCases.includes(c) }"
            @click="aiFocusCases = toggle(aiFocusCases, c)"
          >{{ c }}</button>
        </div>
      </div>

      <div class="field">
        <div class="field-label">Number of sentences</div>
        <div class="segmented">
          <button v-for="n in [5, 10, 15, 20]" :key="n"
            type="button"
            :class="{ active: aiCount === n }"
            @click="aiCount = n"
          >{{ n }}</button>
        </div>
        <p class="ai-cost-note">Each run is one Gemini call. Aim for 10 to balance variety and cost.</p>
      </div>

      <div class="alert alert-info">
        <span class="alert-label">How AI mode works</span>
        Sentences are generated fresh on every Start and validated against the German grammar tables.
        Wrong articles or malformed sentences are dropped automatically.
      </div>

      <div v-if="aiError" class="alert alert-danger">
        <span class="alert-label">Generation failed</span>{{ aiError }}
      </div>

      <div v-if="aiLastResult && aiLastResult.entries.length > 0" class="alert alert-info">
        <span class="alert-label">Last run</span>
        {{ aiLastResult.entries.length }} accepted ·
        {{ aiLastResult.rejected }} rejected ·
        {{ aiLastResult.attempts }} {{ aiLastResult.attempts === 1 ? 'attempt' : 'attempts' }}
      </div>
    </template>

    <div class="setup-actions">
      <button class="btn btn-ghost" type="button" @click="back">← Back</button>
      <button
        v-if="source === 'curated'"
        class="btn btn-accent btn-meta"
        type="button"
        :disabled="available === 0"
        @click="startCurated"
      >
        <span class="bm-main">Start quiz <span aria-hidden="true">→</span></span>
        <span class="bm-sub">{{ effective }} sentences</span>
      </button>
      <button
        v-else
        class="btn btn-accent btn-meta"
        type="button"
        :disabled="!hasApiKey || aiGenerating || aiFocusCases.length === 0"
        @click="startAI"
      >
        <span class="bm-main">{{ aiGenerating ? 'Generating…' : 'Generate &amp; start' }} <span v-if="!aiGenerating" aria-hidden="true">→</span></span>
        <span class="bm-sub">{{ aiCount }} sentences · {{ DIFFICULTY_LABEL[difficulty] }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.setup-page { max-width: 720px; }
.field-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px; gap: 12px; flex-wrap: wrap; }
.field-actions { display: flex; gap: 4px; }
.count-row { align-items: center; gap: 12px; }
.custom-count { width: 80px; font-size: 17px; padding: 4px 0; }
.count-avail { margin-left: auto; }
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
