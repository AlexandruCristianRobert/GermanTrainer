import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import type { VerbSentenceSpec } from '../../../src/composables/useVerbSentenceQuiz'
import { useToast } from '../../../src/composables/useToast'

const STASH_KEY = 'gt:lastVerbSentenceQuiz'

// ── AI boundary — mock the client, not the composable (same convention as
// VerbSentenceRunner.spoken.test.ts / SentenceRunner.test.ts). ──
const { generateContentMock } = vi.hoisted(() => ({ generateContentMock: vi.fn() }))
vi.mock('../../../src/composables/localClaude', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/composables/localClaude')>()
  return {
    ...actual,
    resolveAiClient: () => ({ models: { generateContent: generateContentMock } })
  }
})

vi.mock('../../../src/composables/useQuizHistory', () => ({
  saveQuizRun: vi.fn()
}))
import { saveQuizRun } from '../../../src/composables/useQuizHistory'

// ── Fake SpeechRecognition ──────────────────────────────────────────
// Only needed for the one test that checks the recorder still owns Space
// during the answer phase of a spoken run. Mirrors the fixture in
// VerbSentenceRunner.spoken.test.ts (see that file for the rationale).

interface FakeSRAlternative { transcript: string; confidence?: number }
interface FakeSRResult { isFinal: boolean; length: number; 0: FakeSRAlternative }
interface FakeSRResultList { length: number; [i: number]: FakeSRResult }
interface FakeSREvent { resultIndex: number; results: FakeSRResultList }

let srInstances: FakeSpeechRecognition[] = []

class FakeSpeechRecognition {
  lang = ''
  continuous = false
  interimResults = false
  maxAlternatives = 1
  onresult: ((e: FakeSREvent) => void) | null = null
  onend: (() => void) | null = null
  onerror: ((e: { error: string }) => void) | null = null

  start = vi.fn()
  stop = vi.fn()
  abort = vi.fn()

  constructor() {
    srInstances.push(this)
  }
}

function makeFinal(transcript: string): FakeSRResult {
  return { isFinal: true, length: 1, 0: { transcript, confidence: 0.9 } }
}

function makeEvent(results: FakeSRResult[]): FakeSREvent {
  const list: FakeSRResultList = { length: results.length }
  results.forEach((r, i) => { list[i] = r })
  return { resultIndex: 0, results: list }
}

function currentSrInstance(): FakeSpeechRecognition {
  const inst = srInstances[srInstances.length - 1]
  if (!inst) throw new Error('no FakeSpeechRecognition was constructed — did the test start the mic first?')
  return inst
}

function installSpeechCtor() {
  const w = window as unknown as {
    SpeechRecognition?: typeof FakeSpeechRecognition
    webkitSpeechRecognition?: typeof FakeSpeechRecognition
  }
  w.SpeechRecognition = FakeSpeechRecognition
  delete w.webkitSpeechRecognition
}

// ── Fake speechSynthesis / SpeechSynthesisUtterance ─────────────────────
// useSpeechVoice.ts reads window.speechSynthesis at MODULE scope (`const
// synth = getSynth()`, evaluated once when the module first loads) — see
// its header comment. So this fake must be installed on `window` BEFORE
// VerbSentenceRunner.vue (which imports useSpeechVoice) is ever imported.
// A static top-level `import VerbSentenceRunner from '...'` would defeat
// that: ES import statements are hoisted and evaluate before any of this
// file's own top-level code runs, regardless of where they're written. So,
// like tests/composables/useSpeechVoice.test.ts, we install the fake first
// and only then dynamically `import()` the component, inside `beforeAll`.

class FakeUtterance {
  lang = ''
  rate = 1
  voice: SpeechSynthesisVoice | null = null
  onend: (() => void) | null = null
  onerror: (() => void) | null = null
  constructor(public text: string) {}
}

function makeVoice(name: string, lang: string): SpeechSynthesisVoice {
  return { name, lang, voiceURI: name, localService: true, default: false } as SpeechSynthesisVoice
}

const DEFAULT_VOICES: SpeechSynthesisVoice[] = [makeVoice('Anna', 'de-DE')]

let voiceList: SpeechSynthesisVoice[] = DEFAULT_VOICES
let vcListeners: Array<() => void> = []
let spokenUtterances: FakeUtterance[] = []
let speakSpy: ReturnType<typeof vi.fn>
let cancelSpy: ReturnType<typeof vi.fn>

/** Called exactly once, in beforeAll, before the component is ever imported.
 *  Must NOT be called again later — a later call would swap in a NEW synth
 *  object that useSpeechVoice.ts's already-captured module-level `synth`
 *  const would never see, silently breaking every test after it. */
function installFakeSpeechSynthesis() {
  vcListeners = []
  spokenUtterances = []
  speakSpy = vi.fn((u: FakeUtterance) => { spokenUtterances.push(u) })
  cancelSpy = vi.fn()
  const synth = {
    getVoices: () => voiceList,
    addEventListener: (type: string, fn: () => void) => { if (type === 'voiceschanged') vcListeners.push(fn) },
    removeEventListener: (_type: string, fn: () => void) => { vcListeners = vcListeners.filter(f => f !== fn) },
    speak: speakSpy,
    cancel: cancelSpy
  }
  ;(window as unknown as { speechSynthesis?: unknown }).speechSynthesis = synth
  ;(window as unknown as { SpeechSynthesisUtterance?: unknown }).SpeechSynthesisUtterance = FakeUtterance
}

/** Mutates the shared voice list and replays it through the same
 *  'voiceschanged' listener useSpeechVoice.ts registered at import time —
 *  exactly how a real engine's async voice list would update it. */
function setVoices(list: SpeechSynthesisVoice[]) {
  voiceList = list
  for (const fn of vcListeners) fn()
}

async function settle(times = 8) {
  for (let i = 0; i < times; i++) await flushPromises()
}

// ── Fixture ──────────────────────────────────────────────────────────
// Two distinct sentences (indices 0 and 1) so the "Enter advances to the
// next sentence" test can observe a genuine prompt/counter change, not just
// a transition to the result page. planRampBatches([1,2,5], 10) splits two
// specs into two size-1 batches, and generateProgressively always runs the
// first batch to completion before starting the rest (see
// useProgressiveGenerator.ts), so arrival order is deterministic: index 0
// then index 1.
const SPECS: VerbSentenceSpec[] = [
  { index: 0, verbs: [{ german: 'gehen', english: 'go', level: 'A1' }], nouns: [] },
  { index: 1, verbs: [{ german: 'fahren', english: 'drive', level: 'A1' }], nouns: [] }
]
const GENERATED_ENGLISH = 'I go home.'
const GENERATED_GERMAN = 'Ich gehe nach Hause.'
const GENERATED_ENGLISH_2 = 'I drive to work.'
const GENERATED_GERMAN_2 = 'Ich fahre zur Arbeit.'

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/verbs/sentence/run', name: 'verbs-sentence-run', component: { template: '<div />' } },
      { path: '/verbs/sentence', name: 'verbs-sentence', component: { template: '<div />' } },
      { path: '/verbs', name: 'verbs', component: { template: '<div />' } }
    ]
  })
}

function setStash(modality: 'typed' | 'spoken', specs: VerbSentenceSpec[] = SPECS) {
  sessionStorage.setItem(STASH_KEY, JSON.stringify({
    specs,
    runType: 'verb-sentence',
    level: 'A2–B1',
    wordHints: true,
    modality,
    meta: { levels: ['A1'], types: [], cases: [], groups: [], verbsPer: 1, nounsPer: 1 }
  }))
}

// Resolved once in beforeAll, after the speechSynthesis fake is installed —
// see the header comment on installFakeSpeechSynthesis().
let VerbSentenceRunner: (typeof import('../../../src/modules/verbs/VerbSentenceRunner.vue'))['default']

beforeAll(async () => {
  voiceList = DEFAULT_VOICES
  installFakeSpeechSynthesis()
  const mod = await import('../../../src/modules/verbs/VerbSentenceRunner.vue')
  VerbSentenceRunner = mod.default
})

async function mountReady(): Promise<VueWrapper> {
  const router = makeRouter()
  await router.push({ name: 'verbs-sentence-run' })
  const wrapper = mount(VerbSentenceRunner, {
    attachTo: document.body,
    global: { plugins: [router] }
  })
  for (let i = 0; i < 40; i++) {
    await flushPromises()
    if (!wrapper.find('.loading-state').exists()) return wrapper
  }
  return wrapper
}

/** Types an answer into the typed composer and submits it, waiting for the
 *  card to reach the graded phase. */
async function gradeCurrentTyped(wrapper: VueWrapper, answer: string) {
  await wrapper.find('input.prep-input').setValue(answer)
  await wrapper.find('form.prep-input-wrap').trigger('submit')
  await settle()
}

/** Dispatched on `window` — the runner binds its keydown listener there
 *  directly, so no bubbling is needed. Mirrors the spoken test's helper. */
function spaceKeydown(opts: { repeat?: boolean } = {}) {
  window.dispatchEvent(new KeyboardEvent('keydown', {
    code: 'Space',
    repeat: opts.repeat ?? false,
    cancelable: true
  }))
}

function enterKeydown(opts: { repeat?: boolean } = {}) {
  window.dispatchEvent(new KeyboardEvent('keydown', {
    code: 'Enter',
    repeat: opts.repeat ?? false,
    cancelable: true
  }))
}

describe('VerbSentenceRunner — hear the reference (graded-card playback)', () => {
  beforeEach(() => {
    sessionStorage.clear()
    srInstances = []
    installSpeechCtor()
    vi.mocked(saveQuizRun).mockClear()
    useToast().clear()

    setVoices(DEFAULT_VOICES)
    speakSpy.mockClear()
    cancelSpy.mockClear()
    spokenUtterances.length = 0

    generateContentMock.mockReset()
    generateContentMock.mockImplementation(async (params: Record<string, unknown>) => {
      const contents = String(params.contents ?? '')
      // Grading prompts always carry the learner-answer label (buildVerbGradePrompt);
      // generation prompts never do.
      if (contents.includes('ANSWER')) {
        return { text: JSON.stringify({ correct: true, tip: '', errorTags: [] }) }
      }
      // Generation: return one item per requested spec index (see
      // buildVerbGeneratePrompt's `#<index> —` line), so multi-spec batches
      // (the two-sentence fixture) are matched correctly regardless of how
      // planRampBatches split them.
      const indices = Array.from(contents.matchAll(/#(\d+) —/g)).map(m => Number(m[1]))
      const items = indices.map(i => ({
        index: i,
        english: i === 0 ? GENERATED_ENGLISH : GENERATED_ENGLISH_2,
        german: i === 0 ? GENERATED_GERMAN : GENERATED_GERMAN_2,
        verbSpansEn: [i === 0 ? 'go' : 'drive'],
        nounSpansEn: [],
        extraWords: []
      }))
      return { text: JSON.stringify({ items }) }
    })
  })

  it('a graded card renders .hear-row, .hear-btn and the .hear-hint text', async () => {
    setStash('typed')
    const wrapper = await mountReady()
    await gradeCurrentTyped(wrapper, 'Ich laufe nach Hause.')

    expect(wrapper.find('.prep-feedback').exists()).toBe(true)
    expect(wrapper.find('.hear-row').exists()).toBe(true)
    expect(wrapper.find('.hear-btn').exists()).toBe(true)
    expect(wrapper.find('.hear-btn').text()).toContain('🔊 Anhören')
    expect(wrapper.find('.hear-hint').text()).toBe('Leertaste hören · Enter weiter')

    wrapper.unmount()
  })

  it('Space on a graded card speaks the reference German, not the learner answer', async () => {
    setStash('typed')
    const wrapper = await mountReady()
    const learnerAnswer = 'Ich laufe nach Hause.' // deliberately NOT the reference sentence
    await gradeCurrentTyped(wrapper, learnerAnswer)

    spaceKeydown()
    await settle()

    expect(speakSpy).toHaveBeenCalledTimes(1)
    expect(spokenUtterances).toHaveLength(1)
    expect(spokenUtterances[0].text).toBe(GENERATED_GERMAN)
    expect(spokenUtterances[0].text).not.toBe(learnerAnswer)

    wrapper.unmount()
  })

  it('clicking .hear-btn speaks the reference German', async () => {
    setStash('typed')
    const wrapper = await mountReady()
    await gradeCurrentTyped(wrapper, 'Ich laufe nach Hause.')

    await wrapper.find('.hear-btn').trigger('click')
    await settle()

    expect(speakSpy).toHaveBeenCalledTimes(1)
    expect(spokenUtterances[0].text).toBe(GENERATED_GERMAN)

    wrapper.unmount()
  })

  it('Enter on a graded card advances to the next sentence and does not speak', async () => {
    setStash('typed')
    const wrapper = await mountReady()
    await settle() // let the second (index-1) batch land too — see SPECS comment

    const promptBefore = wrapper.find('.en-sentence').text()
    await gradeCurrentTyped(wrapper, 'Ich laufe nach Hause.')
    expect(wrapper.find('.prep-feedback').exists()).toBe(true)

    enterKeydown()
    await settle()

    expect(speakSpy).not.toHaveBeenCalled()
    expect(wrapper.find('.prep-feedback').exists()).toBe(false)
    expect(wrapper.find('.quiz-counter').text()).toContain('Satz 2')
    expect(wrapper.find('.en-sentence').text()).not.toBe(promptBefore)
    expect(wrapper.find('.result-page').exists()).toBe(false)

    wrapper.unmount()
  })

  it('Space during the input phase does not speak, and typing a space in the input is not stolen', async () => {
    setStash('typed')
    const wrapper = await mountReady()

    spaceKeydown()
    await settle()
    expect(speakSpy).not.toHaveBeenCalled()

    const input = wrapper.find('input.prep-input').element as HTMLInputElement
    const ev = new KeyboardEvent('keydown', { code: 'Space', cancelable: true, bubbles: true })
    const notPrevented = input.dispatchEvent(ev)
    expect(notPrevented).toBe(true) // onKey's INPUT guard skipped it — default (typing a space) survives
    expect(speakSpy).not.toHaveBeenCalled()

    wrapper.unmount()
  })

  it('with no German voices available, .hear-row is absent and Space does not speak', async () => {
    setVoices([])
    setStash('typed')
    const wrapper = await mountReady()
    await gradeCurrentTyped(wrapper, 'Ich laufe nach Hause.')

    expect(wrapper.find('.hear-row').exists()).toBe(false)

    spaceKeydown()
    await settle()
    expect(speakSpy).not.toHaveBeenCalled()

    wrapper.unmount()
  })

  it('advancing cancels in-flight speech, and unmount cancels it too', async () => {
    setStash('typed')
    const wrapper = await mountReady()
    await settle()

    await gradeCurrentTyped(wrapper, 'Ich laufe nach Hause.')
    spaceKeydown()
    await settle()
    expect(speakSpy).toHaveBeenCalledTimes(1)

    cancelSpy.mockClear()
    enterKeydown()
    await settle()
    expect(cancelSpy).toHaveBeenCalled() // card changed — tryAdvance() cancels

    cancelSpy.mockClear()
    wrapper.unmount()
    expect(cancelSpy).toHaveBeenCalled() // onUnmounted cancels too
  })

  it('in a spoken run, Space during the answer phase still starts and ends the recognizer', async () => {
    setStash('spoken')
    const wrapper = await mountReady()

    spaceKeydown()
    await flushPromises()
    expect(srInstances.length).toBe(1)
    expect(wrapper.find('.mic-btn').text()).toContain('Antwort abgeben')

    const inst = currentSrInstance()
    inst.onresult!(makeEvent([makeFinal('Ich gehe nach Hause')]))
    await flushPromises()

    spaceKeydown()
    await flushPromises()
    inst.onend!()
    await settle()

    // Submitted, graded, and a Next button rendered — the recorder ran the
    // whole turn; the playback branch never got a chance to steal Space.
    expect(wrapper.find('.mic-row .btn-accent').exists()).toBe(true)
    expect(wrapper.find('.mic-btn').exists()).toBe(false)
    expect(speakSpy).not.toHaveBeenCalled()

    wrapper.unmount()
  })
})
