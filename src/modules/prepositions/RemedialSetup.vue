<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { PREPOSITIONS, type Preposition } from '../../data/prepositions'
import { shuffle } from '../../data/pool'
import { useNouns } from '../../composables/useNouns'
import { useSettings } from '../../composables/useSettings'
import { useLoading } from '../../composables/useLoading'
import { useToast } from '../../composables/useToast'
import { resolveAiClient } from '../../composables/localClaude'
import { loadHistory } from '../../composables/useQuizHistory'
import {
  computeWeakPoints,
  buildRemedialPlan,
  type WeakPoints,
  type RemedialQuestion
} from '../../composables/usePrepRemedial'
import {
  pickPrepositions, buildSpecs, nounToRef, generateSentences,
  type GeneratedSentence
} from '../../composables/useSentenceQuiz'
import type { Noun } from '../../db/types'

const STASH_KEY = 'gt:lastPrepRemedial'
const router = useRouter()

const { findByGerman } = useNouns()
const { settings, canUseAi, load: loadSettings } = useSettings()
const loading = useLoading()
const toast = useToast()

type LengthPreset = 10 | 15 | 20
const length = ref<LengthPreset>(15)
const generating = ref(false)

const wp = ref<WeakPoints>({ weakPreps: [], weakNouns: [], tagCounts: { preposition: 0, case: 0, noun: 0, typo: 0 } })

onMounted(async () => {
  await loadSettings()
  wp.value = computeWeakPoints(loadHistory())
})

const plan = computed(() => buildRemedialPlan(wp.value, length.value))

const hasData = computed(() => wp.value.weakPreps.length > 0 || wp.value.weakNouns.length > 0)
const topPreps = computed(() => wp.value.weakPreps.slice(0, 4))
const topNouns = computed(() => wp.value.weakNouns.slice(0, 4))

const canStart = computed(() => canUseAi.value && hasData.value && !generating.value)

function aiToast() {
  toast.error(
    settings.value.aiProvider === 'local-claude' ? 'Local Claude not reachable' : 'Gemini API key required',
    { description: settings.value.aiProvider === 'local-claude'
        ? 'Run the app with npm run dev, or switch to Gemini in Settings.'
        : 'Set your API key in Settings before generating sentences.' }
  )
}

/** Resolve a list of prep ids to Prepositions, dropping unknown ids. */
function resolvePreps(ids: string[]): Preposition[] {
  const out: Preposition[] = []
  for (const id of ids) {
    const p = PREPOSITIONS.find(x => x.id === id)
    if (p) out.push(p)
  }
  return out
}

/** Resolve a list of noun german surfaces to stored Nouns, dropping misses. */
async function resolveNouns(keys: string[]): Promise<Noun[]> {
  const out: Noun[] = []
  for (const key of keys) {
    const n = await findByGerman(key)
    if (n) out.push(n)
  }
  return out
}

async function start() {
  if (!canUseAi.value) { aiToast(); return }
  if (!canStart.value) return
  generating.value = true
  try {
    const deck = await loading.wrap(
      async () => {
        const p = plan.value

        // 1. Sentence questions (AI-generated).
        let sentenceQs: RemedialQuestion[] = []
        if (p.counts.sentence > 0) {
          const seedPreps = resolvePreps(p.prepIdsForSentence)
          const chosenPreps = pickPrepositions(seedPreps, p.counts.sentence)
          const nounPool = (await resolveNouns(p.nounKeysForSentence)).map(nounToRef)
          const specs = buildSpecs(chosenPreps, nounPool, 'mix')
          if (specs.length > 0) {
            const gen = await generateSentences(resolveAiClient(settings.value), {
              model: settings.value.model, specs, maxRetries: 2
            })
            sentenceQs = gen.sentences.map((sentence: GeneratedSentence) => ({ format: 'sentence', sentence }))
          }
        }

        // 2. Case-fill questions — cycle the resolved weak preps to fill the count.
        const caseQs: RemedialQuestion[] = []
        const casePreps = resolvePreps(p.prepIdsForCase)
        if (casePreps.length > 0) {
          for (let i = 0; i < p.counts.caseFill; i++) {
            const prep = casePreps[i % casePreps.length]
            const example = shuffle(prep.examples, 1)[0]
            if (!example) continue
            caseQs.push({
              format: 'case-fill',
              prepId: prep.id,
              prepGerman: prep.german,
              prepEnglish: prep.english,
              case: prep.case,
              example
            })
          }
        }

        // 3. Noun-card questions — cycle resolved nouns, alternating gender/translation.
        const nounQs: RemedialQuestion[] = []
        const cardNouns = await resolveNouns(p.nounKeysForCards)
        if (cardNouns.length > 0) {
          for (let i = 0; i < p.counts.nounCard; i++) {
            const noun = cardNouns[i % cardNouns.length]
            nounQs.push(i % 2 === 0
              ? { format: 'noun-gender', noun }
              : { format: 'noun-translation', noun })
          }
        }

        return shuffle([...sentenceQs, ...caseQs, ...nounQs])
      },
      {
        title: 'Building your drill',
        subtitle: `Targeting your weak points across ${length.value} mixed questions. Sentence generation can take 30–90 seconds — please don't close the tab.`
      }
    )

    if (deck.length === 0) {
      toast.error('Nothing to drill', { description: 'No questions could be built — try doing a few more AI-graded sentence quizzes first.' })
      return
    }
    sessionStorage.setItem(STASH_KEY, JSON.stringify({ deck }))
    router.push({ name: 'prepositions-remedial-run' })
  } catch (err) {
    toast.error('Could not build the drill', { description: err instanceof Error ? err.message : String(err) })
  } finally {
    generating.value = false
  }
}

function back() { router.push({ name: 'prepositions' }) }
</script>

<template>
  <div class="page setup-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Kapitel IV · Schwachstellen · Einrichtung</div>
        <h1 class="section-title">Remedial drill<em>.</em></h1>
        <p class="section-subtitle">
          A mixed-format session — case fill-ins, noun cards and AI sentence translations —
          aimed squarely at the prepositions and nouns you miss most.
        </p>
      </div>
    </header>

    <div v-if="!canUseAi" class="alert alert-warning">
      <span class="alert-label">AI access needed</span>
      Set a Gemini API key, or pick <em>Local Claude (dev)</em>, in Settings.
    </div>

    <div v-if="!hasData" class="alert alert-info">
      <span class="alert-label">Not enough data yet</span>
      Do a few EN→DE sentence quizzes with AI grading first — that's what tells us where you're weak.
    </div>

    <template v-else>
      <div class="field">
        <div class="field-label">Length</div>
        <div class="segmented">
          <button :class="{ active: length === 10 }" @click="length = 10">10</button>
          <button :class="{ active: length === 15 }" @click="length = 15">15</button>
          <button :class="{ active: length === 20 }" @click="length = 20">20</button>
        </div>
      </div>

      <div class="field">
        <div class="field-label">Your weak spots</div>
        <div class="weak-cols">
          <div class="weak-col">
            <div class="weak-head">Prepositions</div>
            <ul v-if="topPreps.length" class="weak-list">
              <li v-for="p in topPreps" :key="p.prepId">
                <span class="weak-term">{{ p.german }}</span>
                <span class="weak-rate">{{ p.wrong }}/{{ p.seen }}</span>
              </li>
            </ul>
            <p v-else class="micro-mark">No preposition misses recorded.</p>
          </div>
          <div class="weak-col">
            <div class="weak-head">Nouns</div>
            <ul v-if="topNouns.length" class="weak-list">
              <li v-for="n in topNouns" :key="n.nounKey">
                <span class="weak-term">{{ n.nounKey }}</span>
                <span class="weak-rate">{{ n.wrong }}/{{ n.seen }}</span>
              </li>
            </ul>
            <p v-else class="micro-mark">No noun misses recorded.</p>
          </div>
        </div>
      </div>

      <div class="alert alert-info">
        <span class="alert-label">Planned mix · {{ length }} questions</span>
        Case fill-ins · {{ plan.counts.caseFill }} | Noun cards · {{ plan.counts.nounCard }} | Sentences · {{ plan.counts.sentence }}
      </div>
    </template>

    <div class="setup-actions">
      <button class="btn btn-ghost" type="button" @click="back">← Back</button>
      <button
        class="btn btn-accent"
        type="button"
        :disabled="!canStart"
        @click="start"
      >Build &amp; start <span aria-hidden="true">→</span></button>
    </div>
  </div>
</template>

<style scoped>
.setup-page { max-width: 720px; }
.weak-cols { display: flex; gap: 24px; flex-wrap: wrap; }
.weak-col { flex: 1; min-width: 200px; }
.weak-head {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--mute);
  margin-bottom: 8px;
}
.weak-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.weak-list li { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
.weak-term { font-family: var(--font-display); font-size: 17px; color: var(--ink); }
.weak-rate { font-family: var(--font-mono); font-size: 13px; color: var(--danger); }
.setup-actions {
  display: flex; justify-content: space-between; align-items: center;
  margin-top: 40px; gap: 16px;
}
@media (max-width: 720px) {
  .setup-actions { flex-direction: column-reverse; align-items: stretch; }
  .setup-actions .btn { justify-content: center; }
}
</style>
