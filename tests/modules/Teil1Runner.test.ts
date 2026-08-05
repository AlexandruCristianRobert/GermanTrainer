import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import {
  abandonVortrag, createVortrag, deleteVortrag, findActiveVortrag, incrementVortragKiTipp,
  logHelp, markDowngraded, saveNachfrage, saveRede
} from '../../src/composables/useVortrag'
import { generateNachfrage, generateVortragKiTipp } from '../../src/composables/useVortragPartner'
import { gradeVortrag, type VortragGradeResult } from '../../src/composables/useVortragGrader'
import { appendCorrections } from '../../src/composables/useSprechenArchive'
import { saveQuizRun } from '../../src/composables/useQuizHistory'
import { loadCachedBank } from '../../src/composables/useSprechenArguments'
import { GLIEDERUNGSPUNKTE, VORTRAG_MOVE_LABEL } from '../../src/data/sprechenVortragsmittel'
import type { SprechenVortrag } from '../../src/data/sprechen'

// ── Fake SpeechRecognition ──────────────────────────────────────────
// Mirrors the fake in tests/composables/useSpeechRecognizer.test.ts (T4) —
// same minimal ambient shape, same helpers — so the F1/F2/F13 tests below can
// drive real finals/errors through the ACTUAL useSpeechRecognizer() the
// runner constructs, instead of mocking the composable away entirely.

interface FakeSRAlternative { transcript: string; confidence?: number }
interface FakeSRResult { isFinal: boolean; length: number; 0: FakeSRAlternative }
interface FakeSRResultList { length: number; [i: number]: FakeSRResult }
interface FakeSREvent { resultIndex: number; results: FakeSRResultList }
interface FakeSRErrorEvent { error: string }

interface FakeSRInstance {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((e: FakeSREvent) => void) | null
  onend: (() => void) | null
  onerror: ((e: FakeSRErrorEvent) => void) | null
}

let srInstances: FakeSpeechRecognition[] = []

class FakeSpeechRecognition implements FakeSRInstance {
  lang = ''
  continuous = false
  interimResults = false
  maxAlternatives = 1
  onresult: ((e: FakeSREvent) => void) | null = null
  onend: (() => void) | null = null
  onerror: ((e: FakeSRErrorEvent) => void) | null = null

  start = vi.fn()
  stop = vi.fn()
  abort = vi.fn()

  constructor() {
    srInstances.push(this)
  }
}

type FakeSRConstructor = new () => FakeSpeechRecognition

interface WindowWithSpeech {
  SpeechRecognition?: FakeSRConstructor
  webkitSpeechRecognition?: FakeSRConstructor
}

function windowSpeech(): WindowWithSpeech {
  return window as unknown as WindowWithSpeech
}

function setSpeechCtor(ctor: FakeSRConstructor | undefined) {
  const w = windowSpeech()
  if (ctor) w.SpeechRecognition = ctor
  else delete w.SpeechRecognition
  delete w.webkitSpeechRecognition
}

function finalResult(transcript: string, confidence = 0.9): FakeSRResult {
  return { isFinal: true, length: 1, 0: { transcript, confidence } }
}

function makeResultList(items: FakeSRResult[]): FakeSRResultList {
  const list: FakeSRResultList = { length: items.length }
  items.forEach((item, i) => { list[i] = item })
  return list
}

function makeEvent(resultIndex: number, results: FakeSRResult[]): FakeSREvent {
  return { resultIndex, results: makeResultList(results) }
}

/** The one recognizer instance the mounted Teil1Runner constructs — created
 *  lazily on the FIRST `recognizer.start()`, then reused across every
 *  subsequent pause/resume within the same mounted component. */
function currentSrInstance(): FakeSpeechRecognition {
  const inst = srInstances[0]
  if (!inst) throw new Error('no FakeSpeechRecognition was constructed — did the test open the mic first?')
  return inst
}

const push = vi.fn()
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))

// Belt-and-suspenders, same boundary Teil2Runner.test.ts stubs: every AI call
// in this file goes through the higher-level composables mocked below, so
// resolveAiClient's result is never actually invoked — but stubbing it too
// means constructing a real GoogleGenAI client never happens in this suite.
vi.mock('../../src/composables/localClaude', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/composables/localClaude')>()
  return {
    ...actual,
    resolveAiClient: vi.fn(() => ({
      models: { generateContent: vi.fn(async () => ({ text: '' })) }
    }))
  }
})

// The real useSettings() reads Dexie and probes a dev-only local endpoint —
// neither resolves under jsdom. Stub it so canUseAi is deterministically true
// (the KI-Tipp gating tests need to tell helps.kiTipp apart from canUseAi).
vi.mock('../../src/composables/useSettings', async () => {
  const vue = await import('vue')
  return {
    useSettings: () => ({
      settings: vue.ref({
        id: 'singleton', geminiApiKey: 'AIzaTest', model: 'gemini-test',
        aiProvider: 'gemini', localClaudeModel: 'sonnet', localClaudeEffort: 'low'
      }),
      hasApiKey: vue.computed(() => true),
      canUseAi: vue.computed(() => true),
      load: async () => {},
      save: async () => {}
    })
  }
})

function baseVortrag(over: Partial<SprechenVortrag> = {}): SprechenVortrag {
  return {
    id: 'v1',
    thema: {
      id: 'vt-ehrenamt', titleDe: 'Ehrenamtliches Engagement',
      taskDe: 'Halten Sie einen kurzen Vortrag darüber, welche Rolle freiwillige Arbeit in einer Gesellschaft spielt.',
      source: 'seed'
    },
    modality: 'typed',
    helps: { hints: true, checklist: true, kiTipp: true, hardLimit: false },
    plan: [
      { key: 'einstieg', keyword: 'Sportvereine' },
      { key: 'situation', keyword: 'ein Drittel' },
      { key: 'aspekte', keyword: 'Freistellung' },
      { key: 'erfahrung', keyword: 'Feuerwehr' },
      { key: 'fazit', keyword: 'Unterstützung' }
    ],
    notes: 'meine Notizen',
    rede: { textDe: '' },
    kiTippCount: 0,
    helpLog: [],
    status: 'in_progress',
    startedAt: 1,
    ...over
  }
}

vi.mock('../../src/composables/useVortrag', () => ({
  createVortrag: vi.fn(async () => baseVortragSingleton()),
  findActiveVortrag: vi.fn(async () => baseVortragSingleton()),
  saveRede: vi.fn(async () => undefined),
  saveNachfrage: vi.fn(async () => undefined),
  markVortragSubmitted: vi.fn(async () => undefined),
  incrementVortragKiTipp: vi.fn(async () => undefined),
  logHelp: vi.fn(async () => undefined),
  markDowngraded: vi.fn(async () => undefined),
  abandonVortrag: vi.fn(async () => undefined),
  deleteVortrag: vi.fn(async () => undefined)
}))

// A stable default fixture the mocked findActiveVortrag/createVortrag resolve
// to unless a test overrides them with mockResolvedValueOnce. Named oddly to
// dodge vitest's hoisting rule against referencing outer `const`s from inside
// vi.mock() factories — this one is a function, so it's fine.
function baseVortragSingleton(): SprechenVortrag { return baseVortrag() }

vi.mock('../../src/composables/useVortragPartner', () => ({
  generateNachfrage: vi.fn(async () => 'Wer soll diese Ausfallzeit bezahlen?'),
  generateVortragKiTipp: vi.fn(async () => 'Geh jetzt auf die Nachteile ein.')
}))

function goodResult(over: Partial<VortragGradeResult> = {}): VortragGradeResult {
  return {
    totalScore: 74, passes: true, praedikat: 'befriedigend',
    criteria: [
      { key: 'erfuellung', labelDe: 'Erfüllung / Gliederung', maxPoints: 25, score: 20, justificationDe: 'd', justificationEn: 'e' },
      { key: 'kohaerenz', labelDe: 'Kohärenz & Flüssigkeit', maxPoints: 25, score: 19, justificationDe: 'd', justificationEn: 'e' },
      { key: 'wortschatz', labelDe: 'Wortschatz', maxPoints: 25, score: 18, justificationDe: 'd', justificationEn: 'e' },
      { key: 'strukturen', labelDe: 'Strukturen', maxPoints: 25, score: 17, justificationDe: 'd', justificationEn: 'e' }
    ],
    coverage: GLIEDERUNGSPUNKTE.map(p => ({ key: p.key, covered: true, note: 'ok' })),
    mistakes: [
      { phase: 'rede', quote: 'Sportvereine', suggested: 'Sportvereine e. V.', kind: 'grammar', reasonDe: 'x', reasonEn: 'y', spanStart: 0, spanEnd: 5 }
    ],
    aufwertungen: [
      { quote: 'Sportvereine', better: 'die örtlichen Sportvereine', whyDe: 'präziser', whyEn: 'more precise', spanStart: 0, spanEnd: 5 }
    ],
    strengths: [{ de: 'a', en: 'b' }],
    weaknesses: [{ de: 'c', en: 'd' }],
    overallDe: 'Gut gebaut.', overallEn: 'Well built.',
    generatedAt: 0, modelUsed: 'm',
    ...over
  }
}

vi.mock('../../src/composables/useVortragGrader', () => ({
  gradeVortrag: vi.fn(async () => goodResultSingleton()),
  VORTRAG_RESULT_KEY: 'gt:lastSprechenTeil1Result'
}))

function goodResultSingleton(): VortragGradeResult { return goodResult() }

vi.mock('../../src/composables/useSprechenArchive', () => ({
  appendCorrections: vi.fn(async () => [])
}))

vi.mock('../../src/composables/useQuizHistory', () => ({
  saveQuizRun: vi.fn()
}))

// Wraps the REAL loadCachedBank (fake-indexeddb, offline fallback layers and
// all) so `bank.value` still resolves to something real — only wrapped in a
// vi.fn so F14's "loads on the resume-into-grading path" test can assert it
// was called, without hand-rolling the whole fallback pool.
vi.mock('../../src/composables/useSprechenArguments', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/composables/useSprechenArguments')>()
  return { ...actual, loadCachedBank: vi.fn(actual.loadCachedBank) }
})

import Teil1Runner from '../../src/modules/sprechen/Teil1Runner.vue'

async function mountReady(): Promise<VueWrapper> {
  const w = mount(Teil1Runner)
  for (let i = 0; i < 40; i++) {
    await flushPromises()
    if (!w.find('.loading-state').exists()) return w
  }
  return w
}

/** Types into the Rede, ends it, and answers the Nachfrage — the shared path
 *  every grade-pipeline test needs before it can reach 'Abgeben'. Well under
 *  150 words — relies on the `confirmSpy` default (below) resolving F12's
 *  under-150-words confirmation to `true`. */
async function reachNachfrageAnswer(w: VueWrapper, answer = 'Ich denke, beide Seiten sollten sich beteiligen.') {
  await w.find('.rede-textarea').setValue('Ein Vortrag über das Ehrenamt in unserer Gesellschaft und seine Bedeutung.')
  await w.find('.run-meta .btn-quiet').trigger('click')
  await flushPromises()
  await w.find('.spr-composer textarea').setValue(answer)
}

function spokenVortrag(over: Partial<SprechenVortrag> = {}): SprechenVortrag {
  return baseVortrag({
    modality: 'spoken',
    helps: { hints: true, checklist: true, kiTipp: true, hardLimit: false },
    ...over
  })
}

/** Mounts with a spoken, ready-to-resume Vortrag — the shared starting point
 *  for the F1/F2/F13 tests below, which drive the recognizer through the
 *  FakeSpeechRecognition constructed on `.mic-btn`'s first click. */
async function mountSpokenReady(over: Partial<SprechenVortrag> = {}): Promise<VueWrapper> {
  vi.mocked(findActiveVortrag).mockResolvedValueOnce(spokenVortrag(over))
  return mountReady()
}

let confirmSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  push.mockClear()
  sessionStorage.clear()
  localStorage.clear()
  srInstances = []
  setSpeechCtor(FakeSpeechRecognition)
  // F12's under-150-words confirmation defaults to accepted so every existing
  // short-Rede test (well under 150 words) keeps working unchanged; the F12
  // describe block below overrides this per-test to prove the decline path.
  confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
  vi.mocked(findActiveVortrag).mockResolvedValue(baseVortrag())
  vi.mocked(createVortrag).mockResolvedValue(baseVortrag())
  vi.mocked(generateNachfrage).mockResolvedValue('Wer soll diese Ausfallzeit bezahlen?')
  vi.mocked(generateVortragKiTipp).mockResolvedValue('Geh jetzt auf die Nachteile ein.')
  vi.mocked(gradeVortrag).mockClear()
  vi.mocked(gradeVortrag).mockResolvedValue(goodResult())
  vi.mocked(appendCorrections).mockClear()
  vi.mocked(deleteVortrag).mockClear()
  vi.mocked(saveQuizRun).mockClear()
  vi.mocked(logHelp).mockClear()
  vi.mocked(generateNachfrage).mockClear()
  vi.mocked(generateVortragKiTipp).mockClear()
  vi.mocked(saveRede).mockClear()
  vi.mocked(saveNachfrage).mockClear()
  vi.mocked(markDowngraded).mockClear()
  vi.mocked(abandonVortrag).mockClear()
  vi.mocked(incrementVortragKiTipp).mockClear()
  vi.mocked(incrementVortragKiTipp).mockResolvedValue(undefined)
  vi.mocked(loadCachedBank).mockClear()
})

afterEach(() => {
  setSpeechCtor(undefined)
  vi.useRealTimers()
})

describe('Teil1Runner boot', () => {
  it('shows a guard alert with no stash and no active Vortrag', async () => {
    vi.mocked(findActiveVortrag).mockResolvedValueOnce(null)
    const w = await mountReady()
    expect(w.find('.alert-danger').exists()).toBe(true)
    expect(w.find('.spr-composer').exists()).toBe(false)
  })

  it('renders exactly one composer for the whole Rede', async () => {
    const w = await mountReady()
    expect(w.findAll('.spr-composer')).toHaveLength(1)
    expect(w.findAll('.rede-textarea')).toHaveLength(1)
  })
})

describe('Teil1Runner Live-Checkliste', () => {
  it('renders five rows with one dot each and no per-point word count', async () => {
    const w = await mountReady()
    const rows = w.findAll('.spr-steps .spr-step-btn')
    expect(rows).toHaveLength(5)
    for (const row of rows) expect(row.findAll('.spr-step-dot')).toHaveLength(1)

    const section = w.findAll('.spr-rail-sec').find(s => s.text().includes('Live-Checkliste'))!
    expect(section.text()).not.toMatch(/\d+\s*Wörter/)
  })

  it("lights exactly the row whose planned keyword was said, reading 'gesagt'", async () => {
    const w = await mountReady()
    await w.find('.rede-textarea').setValue('Die Freistellung von der Arbeit war das große Thema.')
    await flushPromises()
    const rows = w.findAll('.spr-steps .spr-step-btn')
    const done = rows.filter(r => r.classes().includes('done'))
    expect(done).toHaveLength(1)
    expect(done[0].text()).toContain('gesagt')
    expect(w.text()).not.toContain('abgedeckt')
  })

  it('hides the checklist and the Redezeit bar when helps.checklist is off', async () => {
    vi.mocked(findActiveVortrag).mockResolvedValueOnce(
      baseVortrag({ helps: { hints: true, checklist: false, kiTipp: true, hardLimit: false } })
    )
    const w = await mountReady()
    expect(w.find('.spr-steps').exists()).toBe(false)
    expect(w.find('.spr-timebar').exists()).toBe(false)
  })
})

describe('Teil1Runner help surface', () => {
  it('hides the drawer, the nudge and the Rettungsleine when helps.hints is off', async () => {
    vi.mocked(findActiveVortrag).mockResolvedValueOnce(
      baseVortrag({ helps: { hints: false, checklist: true, kiTipp: true, hardLimit: false } })
    )
    const w = await mountReady()
    expect(w.find('.spr-drawer').exists()).toBe(false)
    expect(w.find('.spr-nudge').exists()).toBe(false)
    expect(w.find('.spr-lifeline').exists()).toBe(false)
  })

  it('renders the KI-Tipp button alone when helps.hints is off and helps.kiTipp is on', async () => {
    vi.mocked(findActiveVortrag).mockResolvedValueOnce(
      baseVortrag({ helps: { hints: false, checklist: true, kiTipp: true, hardLimit: false } })
    )
    const w = await mountReady()
    expect(w.find('.ki-standalone').exists()).toBe(true)
    expect(w.find('.spr-drawer').exists()).toBe(false)
  })

  it('hides the KI-Tipp button when helps.kiTipp is off, hints or not', async () => {
    vi.mocked(findActiveVortrag).mockResolvedValueOnce(
      baseVortrag({ helps: { hints: true, checklist: true, kiTipp: false, hardLimit: false } })
    )
    const w = await mountReady()
    expect(w.find('.ki-standalone').exists()).toBe(false)
  })

  it('inserts a phrase stub into the composer and logs a help', async () => {
    const w = await mountReady()
    const phraseBtn = w.findAll('.spr-phrase-t')[0]
    await phraseBtn.trigger('click')
    const val = (w.find('.rede-textarea').element as HTMLTextAreaElement).value
    expect(val.length).toBeGreaterThan(0)
    expect(val).not.toContain('…')
    expect(vi.mocked(logHelp)).toHaveBeenCalledWith('v1', 'phrase', expect.any(Number))
  })

  it('outlines the Move groups for the furthest reached Gliederungspunkt', async () => {
    const w = await mountReady()
    await w.find('.rede-textarea').setValue('Zuerst Sportvereine, aber später auch die Freistellung.')
    await flushPromises()
    const fitLabels = new Set(w.findAll('.spr-move.fit').map(b => b.text()))
    expect(fitLabels).toEqual(new Set([VORTRAG_MOVE_LABEL.kontrast.de, VORTRAG_MOVE_LABEL.aspekt.de]))
  })

  it('never spends a KI-Tipp call on its own after typed stuck-detection fires', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    try {
      const w = await mountReady()
      await w.find('.rede-textarea').setValue('Ich beginne meinen Vortrag heute')
      vi.advanceTimersByTime(20000)
      await flushPromises()
      expect(vi.mocked(generateVortragKiTipp)).not.toHaveBeenCalled()
      expect(w.find('.ki-suggest').exists()).toBe(true)
      expect(vi.mocked(logHelp)).toHaveBeenCalledWith('v1', 'rettungsleine', expect.any(Number))
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('Teil1Runner Nachfrage', () => {
  it("requests a Nachfrage and renders the question on 'Vortrag beenden'", async () => {
    const w = await mountReady()
    await w.find('.rede-textarea').setValue('Ich spreche heute über das Ehrenamt in unserer Gesellschaft.')
    await w.find('.run-meta .btn-quiet').trigger('click')
    await flushPromises()
    expect(w.text()).toContain('Wer soll diese Ausfallzeit bezahlen?')
  })

  it('offers a retry after a failed Nachfrage, and an escape after that', async () => {
    vi.mocked(generateNachfrage).mockRejectedValue(new Error('boom'))
    const w = await mountReady()
    await w.find('.rede-textarea').setValue('Ich spreche heute über das Ehrenamt in unserer Gesellschaft.')
    await w.find('.run-meta .btn-quiet').trigger('click')
    await flushPromises()

    expect(w.find('.alert-warning').exists()).toBe(true)
    let buttons = w.findAll('.alert-warning button')
    expect(buttons.some(b => b.text().includes('Nochmal'))).toBe(true)
    expect(buttons.some(b => b.text().includes('Ohne Nachfrage'))).toBe(false)

    await buttons.find(b => b.text().includes('Nochmal'))!.trigger('click')
    await flushPromises()

    buttons = w.findAll('.alert-warning button')
    expect(buttons.some(b => b.text().includes('Ohne Nachfrage'))).toBe(true)

    await buttons.find(b => b.text().includes('Ohne Nachfrage'))!.trigger('click')
    await flushPromises()
    expect(push).toHaveBeenCalledWith({ name: 'sprechen-teil1-result' })
  })
})

describe('Teil1Runner grade pipeline', () => {
  it('records exactly one Run even when Abgeben fires twice', async () => {
    const w = await mountReady()
    await reachNachfrageAnswer(w)
    const submitBtn = w.find('.spr-composer .btn-accent')
    void submitBtn.trigger('click')
    void submitBtn.trigger('click')
    await flushPromises()
    await flushPromises()

    expect(vi.mocked(gradeVortrag)).toHaveBeenCalledTimes(1)
    expect(vi.mocked(saveQuizRun)).toHaveBeenCalledTimes(1)
    expect(push).toHaveBeenCalledTimes(1)
  })

  it('archives corrections with part 1 and never archives Aufwertungen', async () => {
    const w = await mountReady()
    await reachNachfrageAnswer(w)
    await w.find('.spr-composer .btn-accent').trigger('click')
    await flushPromises()

    expect(vi.mocked(appendCorrections)).toHaveBeenCalledTimes(1)
    const [entries] = vi.mocked(appendCorrections).mock.calls[0]
    expect(entries).toHaveLength(1)
    expect(entries[0].part).toBe(1)
    expect(entries[0]).not.toHaveProperty('better')
    expect(entries[0]).not.toHaveProperty('whyDe')
  })

  it('deletes the Vortrag row only after saveQuizRun has succeeded', async () => {
    const order: string[] = []
    vi.mocked(saveQuizRun).mockImplementationOnce(() => { order.push('saveQuizRun') })
    vi.mocked(deleteVortrag).mockImplementationOnce(async () => { order.push('deleteVortrag') })

    const w = await mountReady()
    await reachNachfrageAnswer(w)
    await w.find('.spr-composer .btn-accent').trigger('click')
    await flushPromises()

    expect(order).toEqual(['saveQuizRun', 'deleteVortrag'])
  })

  it('never deletes the Vortrag row when saveQuizRun throws', async () => {
    vi.mocked(saveQuizRun).mockImplementationOnce(() => { throw new Error('storage full') })
    const w = await mountReady()
    await reachNachfrageAnswer(w)
    await w.find('.spr-composer .btn-accent').trigger('click')
    await flushPromises()

    expect(vi.mocked(deleteVortrag)).not.toHaveBeenCalled()
    expect(w.find('.alert-danger').exists()).toBe(true)
  })

  it('leaves the row submitted and offers a retry when grading fails', async () => {
    vi.mocked(gradeVortrag).mockRejectedValueOnce(new Error('network'))
    const w = await mountReady()
    await reachNachfrageAnswer(w)
    await w.find('.spr-composer .btn-accent').trigger('click')
    await flushPromises()

    const retryBtn = w.findAll('.alert-danger button').find(b => b.text().includes('Analyse erneut'))
    expect(retryBtn?.exists()).toBe(true)
    expect(vi.mocked(deleteVortrag)).not.toHaveBeenCalled()

    await retryBtn!.trigger('click')
    await flushPromises()
    expect(push).toHaveBeenCalledWith({ name: 'sprechen-teil1-result' })
  })
})

describe('Teil1Runner hard limit', () => {
  it('is ignored entirely in a typed run, even when helps.hardLimit is set', async () => {
    vi.mocked(findActiveVortrag).mockResolvedValueOnce(
      baseVortrag({ modality: 'typed', helps: { hints: true, checklist: true, kiTipp: true, hardLimit: true } })
    )
    const w = await mountReady()
    await w.find('.rede-textarea').setValue('Ein Vortrag, der niemals von einem Zeitlimit unterbrochen wird.')
    await flushPromises()
    expect(w.text()).not.toContain('Zeit vorbei')
    expect(w.find('.rede-textarea').exists()).toBe(true)
  })
})

describe('Teil1Runner — the spoken Rede is persisted continuously (F1)', () => {
  it('persists a committed final via onFinal, before any recognizer.end()', async () => {
    const w = await mountSpokenReady()
    await w.find('.mic-btn').trigger('click')
    const inst = currentSrInstance()

    inst.onresult!(makeEvent(0, [finalResult('Ich beginne meinen Vortrag')]))
    await flushPromises()

    expect(vi.mocked(saveRede)).toHaveBeenCalledWith(
      'v1', expect.objectContaining({ textDe: 'Ich beginne meinen Vortrag' })
    )
    // Proves the persistence rode on `onFinal`, not on the segment ending.
    expect(inst.stop).not.toHaveBeenCalled()
  })

  it('flushes the open segment on unmount instead of discarding it', async () => {
    const w = await mountSpokenReady()
    await w.find('.mic-btn').trigger('click')
    const inst = currentSrInstance()
    inst.onresult!(makeEvent(0, [finalResult('Ein Satz, der noch nicht fertig ist')]))
    await flushPromises()
    vi.mocked(saveRede).mockClear()

    w.unmount()

    // `end()`, not `abort()` — the pending finals still get a chance to flush.
    expect(inst.stop).toHaveBeenCalledTimes(1)
    expect(inst.abort).not.toHaveBeenCalled()

    inst.onend!()
    await flushPromises()

    expect(vi.mocked(saveRede)).toHaveBeenCalledWith(
      'v1', expect.objectContaining({ textDe: expect.stringContaining('Ein Satz') })
    )
  })
})

describe('Teil1Runner — Redezeit wall clock and the hard limit (F2)', () => {
  it('stamps firstSpokenAt on the first mic open and persists it', async () => {
    const w = await mountSpokenReady()
    await w.find('.mic-btn').trigger('click')
    await flushPromises()
    expect(vi.mocked(saveRede)).toHaveBeenCalledWith(
      'v1', expect.objectContaining({ firstSpokenAt: expect.any(Number) })
    )
  })

  it('shows both Redezeit and Gesamt on the rail once the mic has been used', async () => {
    const w = await mountSpokenReady()
    await w.find('.mic-btn').trigger('click')
    await flushPromises()
    const railText = w.find('.spr-timebar-l').text()
    expect(railText).toContain('Redezeit')
    expect(railText).toContain('Gesamt')
  })

  it('accumulates wallSeconds on a 1s tick even while the mic is paused', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] })
    try {
      const w = await mountSpokenReady()
      await w.find('.mic-btn').trigger('click')
      await w.find('.mic-btn').trigger('click') // pause
      const inst = currentSrInstance()
      inst.onend!() // resolve the pause's recognizer.end() flush
      await flushPromises()

      vi.mocked(saveRede).mockClear()
      vi.advanceTimersByTime(5000)
      await flushPromises()

      const grew = vi.mocked(saveRede).mock.calls.some(([, rede]) => (rede.wallSeconds ?? 0) >= 5)
      expect(grew, 'wallSeconds must keep accumulating while the mic is paused').toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })

  it('fires the hard limit on wallSeconds while the mic is paused, committing the text first', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] })
    try {
      const w = await mountSpokenReady({ helps: { hints: true, checklist: true, kiTipp: true, hardLimit: true } })
      await w.find('.mic-btn').trigger('click')
      const inst = currentSrInstance()
      inst.onresult!(makeEvent(0, [
        finalResult('Ein langer gesprochener Vortrag ueber das Ehrenamt in unserer Gesellschaft')
      ]))
      await w.find('.mic-btn').trigger('click') // pause
      inst.onend!()
      await flushPromises()

      vi.advanceTimersByTime(240000) // 4:00 of wall time, mic paused throughout
      await flushPromises()

      expect(vi.mocked(saveRede)).toHaveBeenCalledWith(
        'v1', expect.objectContaining({ textDe: expect.stringContaining('Ein langer') })
      )
      expect(vi.mocked(generateNachfrage)).toHaveBeenCalled()
      expect(w.text()).toContain('Wer soll diese Ausfallzeit bezahlen?')
    } finally {
      vi.useRealTimers()
    }
  })

  it('tells the learner the clock keeps running in a hard-limit run', async () => {
    const w = await mountSpokenReady({ helps: { hints: true, checklist: true, kiTipp: true, hardLimit: true } })
    expect(w.find('.mic-hint').text()).toContain('läuft weiter')
  })
})

describe('Teil1Runner Nachfrage persistence (F4)', () => {
  it('saves the Nachfrage with an empty answer the moment the question arrives', async () => {
    const w = await mountReady()
    await w.find('.rede-textarea').setValue('Ich spreche heute über das Ehrenamt in unserer Gesellschaft.')
    await w.find('.run-meta .btn-quiet').trigger('click')
    await flushPromises()
    expect(vi.mocked(saveNachfrage)).toHaveBeenCalledWith(
      'v1', { questionDe: 'Wer soll diese Ausfallzeit bezahlen?', answerDe: '' }
    )
  })

  it('debounces the typed Nachfrage answer into saveNachfrage', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    try {
      const w = await mountReady()
      await w.find('.rede-textarea').setValue('Ich spreche heute über das Ehrenamt in unserer Gesellschaft.')
      await w.find('.run-meta .btn-quiet').trigger('click')
      await flushPromises()
      vi.mocked(saveNachfrage).mockClear()

      await w.find('.spr-composer textarea').setValue('Meine Antwort auf die Nachfrage.')
      vi.advanceTimersByTime(1000)
      await flushPromises()

      expect(vi.mocked(saveNachfrage)).toHaveBeenCalledWith(
        'v1', { questionDe: 'Wer soll diese Ausfallzeit bezahlen?', answerDe: 'Meine Antwort auf die Nachfrage.' }
      )
    } finally {
      vi.useRealTimers()
    }
  })

  it('restores the Nachfrage phase and answer on mount, without re-billing the question', async () => {
    vi.mocked(findActiveVortrag).mockResolvedValueOnce(baseVortrag({
      nachfrage: { questionDe: 'Wer soll diese Ausfallzeit bezahlen?', answerDe: 'Teilantwort' }
    }))
    const w = await mountReady()
    expect(w.text()).toContain('Wer soll diese Ausfallzeit bezahlen?')
    expect((w.find('.spr-composer textarea').element as HTMLTextAreaElement).value).toBe('Teilantwort')
    expect(vi.mocked(generateNachfrage)).not.toHaveBeenCalled()
  })
})

describe('Teil1Runner finishRede latch and confirmation (F12)', () => {
  it('latches synchronously so a double-click issues exactly one Nachfrage call', async () => {
    const w = await mountReady()
    await w.find('.rede-textarea').setValue('Ein kurzer Vortrag zum Testen des Latches.')
    const btn = w.find('.run-meta .btn-quiet')
    void btn.trigger('click')
    void btn.trigger('click')
    await flushPromises()
    await flushPromises()
    expect(vi.mocked(generateNachfrage)).toHaveBeenCalledTimes(1)
  })

  it('asks for confirmation before ending a Rede under 150 words', async () => {
    const w = await mountReady()
    await w.find('.rede-textarea').setValue('Ein kurzer Vortrag.')
    await w.find('.run-meta .btn-quiet').trigger('click')
    await flushPromises()
    expect(confirmSpy).toHaveBeenCalled()
    expect(confirmSpy.mock.calls[0][0]).toMatch(/150 Wört/)
  })

  it('keeps the Rede phase and never calls generateNachfrage when the confirmation is declined', async () => {
    confirmSpy.mockReturnValueOnce(false)
    const w = await mountReady()
    await w.find('.rede-textarea').setValue('Ein kurzer Vortrag.')
    await w.find('.run-meta .btn-quiet').trigger('click')
    await flushPromises()
    expect(vi.mocked(generateNachfrage)).not.toHaveBeenCalled()
    expect(w.find('.rede-textarea').exists()).toBe(true)
  })
})

describe('Teil1Runner mic-denied downgrade (F13)', () => {
  it('records the downgrade without mutating modality, and switches to a typed surface with a persistent alert', async () => {
    const w = await mountSpokenReady()
    await w.find('.mic-btn').trigger('click')
    const inst = currentSrInstance()
    inst.onresult!(makeEvent(0, [finalResult('Ich habe schon etwas gesagt')]))
    inst.onerror!({ error: 'not-allowed' })
    await flushPromises()

    expect(vi.mocked(markDowngraded)).toHaveBeenCalledWith('v1', expect.any(Number))
    // Modality itself is untouched — the breadcrumb still reads the spoken Modality.
    expect(w.find('.breadcrumb').text()).toContain('gesprochen')
    expect(w.find('.alert-danger').exists()).toBe(true)
    expect(w.find('.mic-row').exists()).toBe(false)
    expect(w.find('.rede-textarea').exists()).toBe(true)
    expect((w.find('.rede-textarea').element as HTMLTextAreaElement).value).toContain('Ich habe schon etwas gesagt')
  })

  it('still writes spokenSeconds/sprechenWallSeconds and marks sprechenDowngraded on the eventual Run', async () => {
    const w = await mountSpokenReady()
    await w.find('.mic-btn').trigger('click')
    const inst = currentSrInstance()
    inst.onresult!(makeEvent(0, [finalResult('Ich habe schon etwas gesagt')]))
    inst.onerror!({ error: 'not-allowed' })
    await flushPromises()

    await w.find('.rede-textarea').setValue('Ich habe schon etwas gesagt und tippe jetzt weiter, mit genug Wörtern.')
    await w.find('.run-meta .btn-quiet').trigger('click')
    await flushPromises()
    await w.find('.spr-composer textarea').setValue('Meine Antwort.')
    await w.find('.spr-composer .btn-accent').trigger('click')
    await flushPromises()

    expect(vi.mocked(saveQuizRun)).toHaveBeenCalledTimes(1)
    const [record] = vi.mocked(saveQuizRun).mock.calls[0]
    expect(record.meta.sprechenDowngraded).toBe(true)
    expect(record.meta.spokenSeconds).toBeDefined()
  })
})

describe('Teil1Runner exits and resume gating (F14)', () => {
  it('offers "Vortrag verwerfen" in the Rede phase, confirms, abandons and navigates to setup', async () => {
    const w = await mountReady()
    const exitBtn = w.findAll('button').find(b => b.text().includes('Vortrag verwerfen'))
    expect(exitBtn?.exists()).toBe(true)

    await exitBtn!.trigger('click')
    await flushPromises()
    expect(vi.mocked(abandonVortrag)).toHaveBeenCalledWith('v1')
    expect(push).toHaveBeenCalledWith({ name: 'sprechen-teil1' })
  })

  it('offers "Vortrag verwerfen" in the Nachfrage phase too', async () => {
    const w = await mountReady()
    await w.find('.rede-textarea').setValue('Ich spreche heute über das Ehrenamt in unserer Gesellschaft.')
    await w.find('.run-meta .btn-quiet').trigger('click')
    await flushPromises()
    const exitBtn = w.findAll('button').find(b => b.text().includes('Vortrag verwerfen'))
    expect(exitBtn?.exists()).toBe(true)
  })

  it('does not abandon when the confirmation is declined', async () => {
    confirmSpy.mockReturnValueOnce(false)
    const w = await mountReady()
    const exitBtn = w.findAll('button').find(b => b.text().includes('Vortrag verwerfen'))
    await exitBtn!.trigger('click')
    await flushPromises()
    expect(vi.mocked(abandonVortrag)).not.toHaveBeenCalled()
  })

  it('offers "Vortrag verwerfen" on the grade-failed screen too', async () => {
    vi.mocked(gradeVortrag).mockRejectedValueOnce(new Error('network'))
    const w = await mountReady()
    await reachNachfrageAnswer(w)
    await w.find('.spr-composer .btn-accent').trigger('click')
    await flushPromises()
    const exitBtn = w.findAll('.alert-danger button').find(b => b.text().includes('Vortrag verwerfen'))
    expect(exitBtn?.exists()).toBe(true)
  })

  it('shows "Analyse starten" on a resumed submitted row instead of auto-grading', async () => {
    vi.mocked(findActiveVortrag).mockResolvedValueOnce(baseVortrag({
      status: 'submitted',
      endedAt: 999,
      nachfrage: { questionDe: 'Wer soll diese Ausfallzeit bezahlen?', answerDe: 'Antwort' }
    }))
    const w = await mountReady()
    expect(vi.mocked(gradeVortrag)).not.toHaveBeenCalled()
    const startBtn = w.findAll('button').find(b => b.text().includes('Analyse starten'))
    expect(startBtn?.exists()).toBe(true)

    await startBtn!.trigger('click')
    await flushPromises()
    expect(vi.mocked(gradeVortrag)).toHaveBeenCalledTimes(1)
    expect(push).toHaveBeenCalledWith({ name: 'sprechen-teil1-result' })
  })

  it('loads the argument bank on the resume-into-grading (submitted) path too', async () => {
    vi.mocked(findActiveVortrag).mockResolvedValueOnce(baseVortrag({ status: 'submitted', endedAt: 999 }))
    await mountReady()
    expect(vi.mocked(loadCachedBank)).toHaveBeenCalledWith('vt-ehrenamt')
  })

  it('increments and logs the KI-Tipp before assigning it — a failed increment must not render a tip', async () => {
    vi.mocked(incrementVortragKiTipp).mockRejectedValueOnce(new Error('quota'))
    const w = await mountReady()
    await w.find('.ki-standalone button').trigger('click')
    await flushPromises()
    expect(w.find('.spr-kitipp').exists()).toBe(false)
    expect(vi.mocked(logHelp)).not.toHaveBeenCalledWith('v1', 'kitipp', expect.any(Number))
  })
})
