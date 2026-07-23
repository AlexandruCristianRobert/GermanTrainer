<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useVerbs } from '../../composables/useVerbs'
import { useNouns } from '../../composables/useNouns'
import { useSettings } from '../../composables/useSettings'
import { useToast } from '../../composables/useToast'
import { loadHistory } from '../../composables/useQuizHistory'
import { NOUN_GROUPS } from '../../db/types'
import { nounToRef, type NounRef } from '../../composables/useSentenceQuiz'
import { verbToRef, buildVerbSpecs, levelLabel, type VerbRef } from '../../composables/useVerbSentenceQuiz'
import { computeVerbWeakPoints, weakKeysForRemedial, selectRemedialPool } from '../../composables/useVerbSentenceStats'
import { VERB_LEVELS } from '../../data/verbs'

const STASH_KEY = 'gt:lastVerbSentenceQuiz'
const router = useRouter()
const { all: allVerbs } = useVerbs()
const { sampleByGroups } = useNouns()
const { canUseAi, load: loadSettings } = useSettings()
const toast = useToast()

const wp = ref(computeVerbWeakPoints([]))
type CountPreset = 10 | 15 | 20 | 'custom'
const count = ref<CountPreset>(10)
const customCount = ref(15)
const wordHints = ref(true)

const effective = computed(() => count.value === 'custom' ? Math.max(1, customCount.value) : count.value)
const weakVerbCount = computed(() => wp.value.weakVerbs.filter(v => v.wrong > 0).length)
const weakNounCount = computed(() => wp.value.weakNouns.filter(n => n.wrong > 0).length)
const hasWeak = computed(() => weakVerbCount.value > 0)

onMounted(async () => {
  await loadSettings()
  wp.value = computeVerbWeakPoints(loadHistory())
})

async function start() {
  if (!canUseAi.value) { toast.error('AI access needed', { description: 'Set a Gemini API key (or Local Claude) in Settings.' }); return }
  if (!hasWeak.value) { toast.info('No weak verbs yet', { description: 'Finish a few verb sentence quizzes first.' }); return }

  const keys = weakKeysForRemedial(wp.value, 40)
  const byGerman = new Map(allVerbs().map(v => [v.german, verbToRef(v)]))
  const weakVerbRefs: VerbRef[] = keys.verbKeys.map(k => byGerman.get(k)).filter((v): v is VerbRef => !!v)
  const verbPool = selectRemedialPool(weakVerbRefs, allVerbs().map(verbToRef))

  // Resolve weak nouns from the full noun store; fall back to all nouns.
  const allNouns = (await sampleByGroups([...NOUN_GROUPS], 100000)).map(nounToRef)
  const byNoun = new Map(allNouns.map(n => [n.german, n]))
  const weakNounRefs: NounRef[] = keys.nounKeys.map(k => byNoun.get(k)).filter((n): n is NounRef => !!n)
  const nounPool = selectRemedialPool(weakNounRefs, allNouns)

  const specs = buildVerbSpecs(verbPool, nounPool, effective.value, 'mix', 'mix')
  sessionStorage.setItem(STASH_KEY, JSON.stringify({
    specs, runType: 'verb-remedial', level: levelLabel([...VERB_LEVELS]), wordHints: wordHints.value,
    meta: { levels: [], types: [], cases: [], groups: [], verbsPer: 'mix', nounsPer: 'mix' }
  }))
  router.push({ name: 'verbs-sentence-run' })
}

function back() { router.push({ name: 'verbs' }) }
</script>

<template>
  <div class="page setup-page">
    <header class="section-header">
      <div>
        <div class="breadcrumb">Kapitel III · Schwachstellen · Einrichtung</div>
        <h1 class="section-title">Practise weak verbs<em>.</em></h1>
        <p class="section-subtitle">A sentence drill drawn from the verbs and nouns you've missed most across your recent runs.</p>
      </div>
    </header>

    <div v-if="!canUseAi" class="alert alert-warning"><span class="alert-label">AI access needed</span>Set a Gemini API key, or pick Local Claude, in Settings.</div>
    <div v-else-if="!hasWeak" class="alert alert-info"><span class="alert-label">Nothing to drill yet</span>Finish a few verb sentence quizzes so we can spot your weak spots.</div>

    <div v-else class="alert alert-info">
      <span class="alert-label">Your weak spots</span>
      {{ weakVerbCount }} weak verb{{ weakVerbCount === 1 ? '' : 's' }} and {{ weakNounCount }} weak noun{{ weakNounCount === 1 ? '' : 's' }} from recent runs. We'll weight the drill toward them.
    </div>

    <div class="field">
      <div class="field-label">Word hints</div>
      <div class="segmented">
        <button :class="{ active: wordHints }" @click="wordHints = true">On</button>
        <button :class="{ active: !wordHints }" @click="wordHints = false">Off</button>
      </div>
    </div>

    <div class="field">
      <div class="field-label">Number of sentences</div>
      <div class="field-row count-row">
        <div class="segmented">
          <button :class="{ active: count === 10 }" @click="count = 10">10</button>
          <button :class="{ active: count === 15 }" @click="count = 15">15</button>
          <button :class="{ active: count === 20 }" @click="count = 20">20</button>
          <button :class="{ active: count === 'custom' }" @click="count = 'custom'">Custom</button>
        </div>
        <input v-if="count === 'custom'" class="input custom-count" type="number" :min="1" :max="50" v-model.number="customCount" />
      </div>
    </div>

    <div class="setup-actions">
      <button class="btn btn-ghost" type="button" @click="back">← Back</button>
      <button class="btn btn-accent" type="button" :disabled="!canUseAi || !hasWeak" @click="start">Start · {{ effective }} sentences <span aria-hidden="true">→</span></button>
    </div>
  </div>
</template>

<style scoped>
.setup-page { max-width: 720px; }
.field-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px; gap: 12px; flex-wrap: wrap; }
.count-row { align-items: center; gap: 12px; }
.custom-count { width: 80px; font-size: 17px; padding: 4px 0; }
.setup-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 40px; gap: 16px; }
@media (max-width: 720px) { .setup-actions { flex-direction: column-reverse; align-items: stretch; } .setup-actions .btn { justify-content: center; } }
</style>
