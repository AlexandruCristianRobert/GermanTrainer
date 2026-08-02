import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import VerbSentenceRunner from '../../../src/modules/verbs/VerbSentenceRunner.vue'
import type { VerbSentenceSpec } from '../../../src/composables/useVerbSentenceQuiz'
import { useToast } from '../../../src/composables/useToast'

const STASH_KEY = 'gt:lastVerbSentenceQuiz'

// ── AI boundary — mock the client, not the composable, so the real
// generateVerbSentenceBatch/gradeVerbAnswer validation still runs (same
// convention as tests/modules/direction-words/SentenceRunner.test.ts). ──
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
// Mirrors the ambient slice useSpeechRecognizer.ts declares for itself (see
// tests/composables/useSpeechRecognizer.test.ts for the canonical fixture).
// useSpeechRecognizer is used UNCHANGED here — only the browser constructor
// is faked, so the runner drives the real composable end to end.

interface FakeSRAlternative { transcript: string; confidence?: number }
interface FakeSRResult { isFinal: boolean; length: number; 0: FakeSRAlternative }
interface FakeSRResultList { length: number; [i: number]: FakeSRResult }
interface FakeSREvent { resultIndex: number; results: FakeSRResultList }

let instances: FakeSpeechRecognition[] = []

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
    instances.push(this)
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

/** The most recently constructed fake instance — useSpeechRecognizer only
 *  constructs one on the FIRST start() call, so tests must start the mic
 *  before asking for it. */
function currentInstance(): FakeSpeechRecognition {
  const inst = instances[instances.length - 1]
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

/** Dispatched on `window` — the runner binds its Space handler there directly
 *  (see VerbSentenceRunner.vue's onMounted), so no bubbling is needed. */
function spaceKeydown(opts: { repeat?: boolean } = {}) {
  window.dispatchEvent(new KeyboardEvent('keydown', {
    code: 'Space',
    repeat: opts.repeat ?? false,
    cancelable: true
  }))
}

// ── Fixture ──────────────────────────────────────────────────────────

const SPEC: VerbSentenceSpec = {
  index: 0,
  verbs: [{ german: 'gehen', english: 'go', level: 'A1' }],
  nouns: []
}
const GENERATED_ENGLISH = 'I go home.'
const GENERATED_GERMAN = 'Ich gehe nach Hause.'

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

function setStash(modality: 'typed' | 'spoken') {
  sessionStorage.setItem(STASH_KEY, JSON.stringify({
    specs: [SPEC],
    runType: 'verb-sentence',
    level: 'A2–B1',
    wordHints: true,
    modality,
    meta: { levels: ['A1'], types: [], cases: [], groups: [], verbsPer: 1, nounsPer: 1 }
  }))
}

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

describe('VerbSentenceRunner — spoken Modality', () => {
  beforeEach(() => {
    sessionStorage.clear()
    instances = []
    installSpeechCtor()
    vi.mocked(saveQuizRun).mockClear()
    useToast().clear()

    generateContentMock.mockReset()
    generateContentMock.mockImplementation(async (params: Record<string, unknown>) => {
      const contents = String(params.contents ?? '')
      // Grading prompts always carry the learner-answer label (buildVerbGradePrompt);
      // generation prompts never do.
      if (contents.includes('ANSWER')) {
        return { text: JSON.stringify({ correct: true, tip: '', errorTags: [] }) }
      }
      return {
        text: JSON.stringify({
          items: [{
            index: 0,
            english: GENERATED_ENGLISH,
            german: GENERATED_GERMAN,
            verbSpansEn: ['go'],
            nounSpansEn: [],
            extraWords: []
          }]
        })
      }
    })
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('renders the mic composer and no text input for a spoken stash', async () => {
    setStash('spoken')
    const wrapper = await mountReady()

    expect(wrapper.find('.mic-wrap').exists()).toBe(true)
    expect(wrapper.find('input.prep-input').exists()).toBe(false)
    expect(wrapper.find('form.prep-input-wrap').exists()).toBe(false)
    expect(wrapper.find('.mic-btn').text()).toContain('Sprechen')
    wrapper.unmount()
  })

  it('a typed stash still renders the text input, and now registers a window keydown handler too (hear/advance on graded cards)', async () => {
    const addSpy = vi.spyOn(window, 'addEventListener')
    setStash('typed')
    const wrapper = await mountReady()

    expect(wrapper.find('input.prep-input').exists()).toBe(true)
    expect(wrapper.find('.mic-wrap').exists()).toBe(false)
    expect(addSpy.mock.calls.some(call => call[0] === 'keydown')).toBe(true)

    addSpy.mockRestore()
    wrapper.unmount()
  })

  it('Space starts the recognizer; a second Space ends it and submits the transcript', async () => {
    setStash('spoken')
    const wrapper = await mountReady()

    spaceKeydown()
    await flushPromises()
    expect(instances.length).toBe(1)
    expect(wrapper.find('.mic-btn').text()).toContain('Antwort abgeben')

    const inst = currentInstance()
    inst.onresult!(makeEvent([makeFinal('Ich gehe nach Hause')]))
    await flushPromises()
    expect(wrapper.find('.mic-transcript').text()).toBe('Ich gehe nach Hause')

    spaceKeydown()
    await flushPromises()
    inst.onend!()   // flush() is waiting on this to resolve recognizer.end()
    await flushPromises()
    await flushPromises()

    // Submitted as the answer, graded, and the card moved to its graded state.
    expect(wrapper.find('.mic-transcript').text()).toBe('Ich gehe nach Hause')
    expect(wrapper.find('.mic-row .btn-accent').exists()).toBe(true)
    expect(wrapper.find('.mic-btn').exists()).toBe(false)
    wrapper.unmount()
  })

  it('an empty transcript submits nothing, leaves the phase at input, and does not advance', async () => {
    setStash('spoken')
    const wrapper = await mountReady()

    spaceKeydown()
    await flushPromises()
    const inst = currentInstance()

    spaceKeydown()   // end immediately — nothing was ever heard
    await flushPromises()
    inst.onend!()
    await flushPromises()
    await flushPromises()

    expect(wrapper.find('.result-page').exists()).toBe(false)
    expect(wrapper.find('.mic-transcript').text()).toBe('Deutsch…')
    expect(wrapper.find('.mic-btn').text()).toContain('Sprechen')
    expect(useToast().items.value.some(t => t.title === 'Nichts verstanden')).toBe(true)
    expect(saveQuizRun).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('ignores a key-repeat Space and never starts the recognizer', async () => {
    setStash('spoken')
    const wrapper = await mountReady()

    spaceKeydown({ repeat: true })
    await flushPromises()

    expect(instances.length).toBe(0)
    expect(wrapper.find('.mic-btn').text()).toContain('Sprechen')
    wrapper.unmount()
  })
})
