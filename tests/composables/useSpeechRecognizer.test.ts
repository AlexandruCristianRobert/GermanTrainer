import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  useSpeechRecognizer,
  isSpeechRecognitionSupported,
  countWords,
  type CommittedSpeech
} from '../../src/composables/useSpeechRecognizer'

// ── Fake SpeechRecognition ──────────────────────────────────────────
// Mirrors the ambient slice the module declares for itself (see the
// "Minimal ambient types" section of useSpeechRecognizer.ts): `results` is
// array-like (length + numeric index), each result is array-like with
// `[0] = { transcript, confidence }` plus `isFinal`, and the event carries
// `resultIndex`. None of that is a real DOM type here — lib.dom in this
// project's tsconfig does not ship SpeechRecognition — so this file defines
// its own minimal shape and casts once at the `window` assignment, same as
// the module itself does for `SpeechWindow`.

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

let instances: FakeSpeechRecognition[] = []

class FakeSpeechRecognition implements FakeSRInstance {
  lang = ''
  continuous = false
  interimResults = false
  maxAlternatives = 1
  onresult: ((e: FakeSREvent) => void) | null = null
  onend: (() => void) | null = null
  onerror: ((e: FakeSRErrorEvent) => void) | null = null

  startCalls = 0
  stopCalls = 0
  abortCalls = 0

  start = vi.fn(() => { this.startCalls++ })
  stop = vi.fn(() => { this.stopCalls++ })
  abort = vi.fn(() => { this.abortCalls++ })

  constructor() {
    instances.push(this)
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

function setCtor(ctor: FakeSRConstructor | undefined) {
  const w = windowSpeech()
  if (ctor) w.SpeechRecognition = ctor
  else delete w.SpeechRecognition
  delete w.webkitSpeechRecognition
}

function makeResult(transcript: string, isFinal: boolean, confidence?: number): FakeSRResult {
  return { isFinal, length: 1, 0: { transcript, confidence } }
}

function finalResult(transcript: string, confidence?: number): FakeSRResult {
  return makeResult(transcript, true, confidence)
}

function interimResult(transcript: string): FakeSRResult {
  return makeResult(transcript, false)
}

function makeResultList(items: FakeSRResult[]): FakeSRResultList {
  const list: FakeSRResultList = { length: items.length }
  items.forEach((item, i) => { list[i] = item })
  return list
}

function makeEvent(resultIndex: number, results: FakeSRResult[]): FakeSREvent {
  return { resultIndex, results: makeResultList(results) }
}

/** The one instance the module constructs for a given useSpeechRecognizer() call. */
function currentInstance(): FakeSpeechRecognition {
  const inst = instances[0]
  if (!inst) throw new Error('no FakeSpeechRecognition was constructed — did the test call r.start()?')
  return inst
}

beforeEach(() => {
  instances = []
  setCtor(FakeSpeechRecognition)
})

afterEach(() => {
  setCtor(undefined)
  vi.useRealTimers()
})

describe('isSpeechRecognitionSupported', () => {
  it('is true when a ctor is present on window', () => {
    expect(isSpeechRecognitionSupported()).toBe(true)
  })

  it('is false when neither SpeechRecognition nor webkitSpeechRecognition exists', () => {
    setCtor(undefined)
    expect(isSpeechRecognitionSupported()).toBe(false)
  })

  it('falls back to webkitSpeechRecognition when SpeechRecognition is absent', () => {
    setCtor(undefined)
    windowSpeech().webkitSpeechRecognition = FakeSpeechRecognition
    expect(isSpeechRecognitionSupported()).toBe(true)
  })
})

describe('useSpeechRecognizer — interim vs final', () => {
  it('streams interim results into liveText without committing them', () => {
    const r = useSpeechRecognizer()
    r.start()
    const inst = currentInstance()

    inst.onresult!(makeEvent(0, [interimResult('hallo wie')]))
    expect(r.liveText.value).toBe('hallo wie')

    inst.onresult!(makeEvent(0, [interimResult('hallo wie geht')]))
    expect(r.liveText.value).toBe('hallo wie geht')
  })

  it('commits a final result: it lands in the buffer and in liveText', () => {
    const r = useSpeechRecognizer()
    r.start()
    const inst = currentInstance()

    inst.onresult!(makeEvent(0, [finalResult('Hallo Welt', 0.9)]))
    expect(r.liveText.value).toBe('Hallo Welt')
  })

  it('does not duplicate a final the engine re-emits at an already-committed index', () => {
    const r = useSpeechRecognizer()
    r.start()
    const inst = currentInstance()

    inst.onresult!(makeEvent(0, [finalResult('Hallo Welt', 0.9)]))
    // Some engines re-send the same finalized index in a later event.
    inst.onresult!(makeEvent(0, [finalResult('Hallo Welt', 0.9)]))

    expect(r.liveText.value).toBe('Hallo Welt')
  })
})

describe('useSpeechRecognizer — restart survives (buffer lives outside the recognizer)', () => {
  it('keeps BOTH sentences across a mid-turn onend restart', async () => {
    const r = useSpeechRecognizer()
    r.start()
    const inst = currentInstance()

    // First sentence, committed in the first recognizer session.
    inst.onresult!(makeEvent(0, [finalResult('Ich bin dagegen', 0.9)]))
    expect(r.liveText.value).toBe('Ich bin dagegen')

    // Chrome's endpointer gives up on a silence and fires onend even though
    // the learner still holds the floor. The module must restart underneath
    // them, NOT treat this as the end of the turn.
    inst.onend!()
    expect(inst.startCalls).toBe(2) // initial start() + the restart start()
    expect(r.listening.value).toBe(true) // turn is NOT over

    // A restart resets the recognizer's own `results`, so the fresh session's
    // first event starts back at index 0 — exactly the case that would lose
    // "Ich bin dagegen" if the buffer were read from event.results instead of
    // the module's own external buffer.
    inst.onresult!(makeEvent(0, [finalResult('weil es zu teuer ist', 0.85)]))

    const p = r.end()
    inst.onend!() // engine's final onend after stop(); holding is already false
    const result = await p

    expect(
      result.text,
      'REGRESSION: a restart must not lose already-committed finals — the ' +
      'buffer must live outside the recognizer, not be read from event.results. ' +
      `Got "${result.text}", expected both sentences joined.`
    ).toBe('Ich bin dagegen weil es zu teuer ist')
  })

  it('restarts counts exactly the mid-turn onend firings', async () => {
    const r = useSpeechRecognizer()
    r.start()
    const inst = currentInstance()

    inst.onend!() // mid-turn restart #1
    inst.onend!() // mid-turn restart #2

    const p = r.end()
    inst.onend!() // the flush-ending onend — must NOT be counted as a restart
    const result = await p

    expect(result.restarts).toBe(2)
  })

  it('restarts is 0 for a turn with no mid-turn onend at all', async () => {
    const r = useSpeechRecognizer()
    r.start()
    const inst = currentInstance()

    const p = r.end()
    inst.onend!()
    const result = await p

    expect(result.restarts).toBe(0)
  })

  it('after end(), a further onend does not restart the recognizer (holding cleared)', async () => {
    const r = useSpeechRecognizer()
    r.start()
    const inst = currentInstance()

    inst.onend!() // legitimate mid-turn restart while still holding
    expect(inst.startCalls).toBe(2)

    const p = r.end()
    inst.onend!() // resolves the flush; holding is now false
    await p

    const startCallsAfterEnd = inst.startCalls
    inst.onend!() // a stray/late onend arriving after the turn is over
    expect(inst.startCalls).toBe(startCallsAfterEnd) // no new start() call
  })
})

describe('useSpeechRecognizer — end() flush behaviour', () => {
  it('resolves with a final delivered between stop() and onend (the flush path)', async () => {
    const r = useSpeechRecognizer()
    r.start()
    const inst = currentInstance()

    inst.onresult!(makeEvent(0, [finalResult('Ich bin dagegen', 0.9)]))

    const p = r.end()
    // The engine flushes one more pending final before it actually ends.
    inst.onresult!(makeEvent(1, [
      finalResult('Ich bin dagegen', 0.9),
      finalResult('und fertig', 0.8)
    ]))
    inst.onend!()

    const result = await p
    expect(result.text).toBe('Ich bin dagegen und fertig')
  })

  it('still resolves via the flush timeout when onend never fires', async () => {
    vi.useFakeTimers()
    try {
      const r = useSpeechRecognizer()
      r.start()
      const inst = currentInstance()

      inst.onresult!(makeEvent(0, [finalResult('Hallo', 0.7)]))

      const p = r.end()
      // FLUSH_TIMEOUT_MS in the source is 1200ms.
      await vi.advanceTimersByTimeAsync(1200)

      const result = await p
      expect(result.text).toBe('Hallo')
    } finally {
      vi.useRealTimers()
    }
  })

  it('resolves immediately when end() is called before start() ever ran', async () => {
    const r = useSpeechRecognizer()
    const result = await r.end()
    expect(result.text).toBe('')
    expect(result.restarts).toBe(0)
  })
})

describe('useSpeechRecognizer — spans', () => {
  it('carries per-final text and confidence; a missing confidence becomes 0', async () => {
    const r = useSpeechRecognizer()
    r.start()
    const inst = currentInstance()

    inst.onresult!(makeEvent(1, [
      finalResult('Ich bin dagegen', 0.87),
      finalResult('und fertig', undefined)
    ]))

    const p = r.end()
    inst.onend!()
    const result = await p

    expect(result.spans).toEqual([
      { text: 'Ich bin dagegen', confidence: 0.87 },
      { text: 'und fertig', confidence: 0 }
    ])
  })
})

describe('useSpeechRecognizer — onFinal callback (F1)', () => {
  it('fires once per committed final with the accumulated text, spans and restarts', () => {
    const finals: CommittedSpeech[] = []
    const r = useSpeechRecognizer('de-DE', c => finals.push(c))
    r.start()
    const inst = currentInstance()

    inst.onresult!(makeEvent(0, [finalResult('Ich bin dagegen', 0.9)]))
    expect(finals).toEqual([
      { text: 'Ich bin dagegen', spans: [{ text: 'Ich bin dagegen', confidence: 0.9 }], restarts: 0 }
    ])

    inst.onresult!(makeEvent(1, [
      finalResult('Ich bin dagegen', 0.9),
      finalResult('weil es teuer ist', 0.8)
    ]))
    expect(finals.length).toBe(2)
    expect(finals[1]).toEqual({
      text: 'Ich bin dagegen weil es teuer ist',
      spans: [
        { text: 'Ich bin dagegen', confidence: 0.9 },
        { text: 'weil es teuer ist', confidence: 0.8 }
      ],
      restarts: 0
    })
  })

  it('fires once per final within a single event that carries two brand-new finals', () => {
    const finals: CommittedSpeech[] = []
    const r = useSpeechRecognizer('de-DE', c => finals.push(c))
    r.start()
    const inst = currentInstance()

    inst.onresult!(makeEvent(1, [
      finalResult('Erster Satz', 0.9),
      finalResult('zweiter Satz', 0.8)
    ]))

    expect(finals.length).toBe(2)
    expect(finals[0].text).toBe('Erster Satz')
    expect(finals[1].text).toBe('Erster Satz zweiter Satz')
  })

  it('does not fire on interim results', () => {
    const finals: CommittedSpeech[] = []
    const r = useSpeechRecognizer('de-DE', c => finals.push(c))
    r.start()
    const inst = currentInstance()

    inst.onresult!(makeEvent(0, [interimResult('hallo wie')]))
    expect(finals).toEqual([])
  })

  it('reflects the restart count in the accumulated state after a mid-turn onend', () => {
    const finals: CommittedSpeech[] = []
    const r = useSpeechRecognizer('de-DE', c => finals.push(c))
    r.start()
    const inst = currentInstance()

    inst.onresult!(makeEvent(0, [finalResult('Erster Satz', 0.9)]))
    inst.onend!() // mid-turn restart
    inst.onresult!(makeEvent(0, [finalResult('zweiter Satz', 0.8)]))

    expect(finals[finals.length - 1].restarts).toBe(1)
  })

  it('a throwing onFinal does not kill recognition — the next final still commits', () => {
    let calls = 0
    const r = useSpeechRecognizer('de-DE', () => {
      calls++
      throw new Error('listener boom')
    })
    r.start()
    const inst = currentInstance()

    expect(() => inst.onresult!(makeEvent(0, [finalResult('Erster Satz', 0.9)]))).not.toThrow()
    expect(calls).toBe(1)

    inst.onresult!(makeEvent(1, [
      finalResult('Erster Satz', 0.9),
      finalResult('zweiter Satz', 0.8)
    ]))
    expect(calls).toBe(2)
    expect(r.liveText.value).toBe('Erster Satz zweiter Satz')
  })

  it('a recognizer constructed without onFinal behaves exactly as before', () => {
    const r = useSpeechRecognizer('de-DE')
    r.start()
    const inst = currentInstance()

    expect(() => inst.onresult!(makeEvent(0, [finalResult('Hallo Welt', 0.9)]))).not.toThrow()
    expect(r.liveText.value).toBe('Hallo Welt')
  })
})

describe('useSpeechRecognizer — error mapping', () => {
  it('maps not-allowed to a denied error and stops listening (terminal)', () => {
    const r = useSpeechRecognizer()
    r.start()
    const inst = currentInstance()

    inst.onerror!({ error: 'not-allowed' })

    expect(r.error.value).toEqual({ kind: 'denied', raw: 'not-allowed' })
    expect(r.listening.value).toBe(false)

    // denied clears holding — a later onend must not restart.
    const startCallsAfterDenied = inst.startCalls
    inst.onend!()
    expect(inst.startCalls).toBe(startCallsAfterDenied)
  })

  it('maps network to a network error but does NOT clear holding', () => {
    const r = useSpeechRecognizer()
    r.start()
    const inst = currentInstance()

    inst.onerror!({ error: 'network' })

    expect(r.error.value).toEqual({ kind: 'network', raw: 'network' })
    expect(r.listening.value).toBe(true) // the turn is still live

    // holding survived, so the engine's subsequent onend still restarts us.
    const startCallsBefore = inst.startCalls
    inst.onend!()
    expect(inst.startCalls).toBe(startCallsBefore + 1)
  })

  it('swallows no-speech and aborted (onend is what handles the restart)', () => {
    const r = useSpeechRecognizer()
    r.start()
    const inst = currentInstance()

    inst.onerror!({ error: 'no-speech' })
    expect(r.error.value).toBeNull()

    inst.onerror!({ error: 'aborted' })
    expect(r.error.value).toBeNull()

    expect(r.listening.value).toBe(true)
  })
})

describe('useSpeechRecognizer — abort', () => {
  it('clears buffer and liveText and calls through to the instance', () => {
    const r = useSpeechRecognizer()
    r.start()
    const inst = currentInstance()

    inst.onresult!(makeEvent(0, [finalResult('Hallo Welt', 0.9)]))
    expect(r.liveText.value).toBe('Hallo Welt')

    r.abort()

    expect(r.liveText.value).toBe('')
    expect(r.listening.value).toBe(false)
    expect(inst.abortCalls).toBe(1)
  })

  it('a later onend does not restart after abort (holding cleared)', () => {
    const r = useSpeechRecognizer()
    r.start()
    const inst = currentInstance()

    r.abort()
    const startCallsAfterAbort = inst.startCalls
    inst.onend!()
    expect(inst.startCalls).toBe(startCallsAfterAbort)
  })
})

describe('useSpeechRecognizer — unsupported environment', () => {
  it('reports unsupported and start() is a no-op that never throws', () => {
    setCtor(undefined)
    const r = useSpeechRecognizer()

    expect(r.supported).toBe(false)
    expect(() => r.start()).not.toThrow()
    expect(r.listening.value).toBe(false)
    expect(instances.length).toBe(0) // no recognizer was ever constructed
  })
})

describe('countWords', () => {
  it('is 0 for an empty string', () => {
    expect(countWords('')).toBe(0)
  })

  it('is 0 for a whitespace-only string', () => {
    expect(countWords('   ')).toBe(0)
  })

  it('is 1 for a single word', () => {
    expect(countWords('Hallo')).toBe(1)
  })

  it('counts words separated by runs of varied whitespace', () => {
    expect(countWords('Hallo   schöne  \t Welt\n')).toBe(3)
  })
})
