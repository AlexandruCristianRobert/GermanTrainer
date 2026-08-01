import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const STORAGE_KEY = 'sprechenTeil2Setup'

// ── Fakes for the Web Speech API — jsdom implements neither piece ──────────
//
// `synth`/`voices`/`supported` are captured once at module-evaluation time
// (a deliberate module-level singleton — see the composable's header
// comment), so every test that needs a stubbed speechSynthesis must install
// it BEFORE importing the module, and must `vi.resetModules()` first so the
// import re-evaluates against the fresh stub instead of a cached instance.

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

function stubSpeechApi(initialVoices: SpeechSynthesisVoice[] = []) {
  let voiceList = initialVoices
  const listeners: Record<string, Array<() => void>> = {}
  const spoken: FakeUtterance[] = []
  const cancelSpy = vi.fn()
  const addEventListenerSpy = vi.fn((type: string, fn: () => void) => {
    (listeners[type] ??= []).push(fn)
  })
  const synth = {
    getVoices: () => voiceList,
    addEventListener: addEventListenerSpy,
    removeEventListener: () => { /* not exercised */ },
    speak: (u: FakeUtterance) => { spoken.push(u) },
    cancel: cancelSpy
  }
  ;(window as unknown as { speechSynthesis?: unknown }).speechSynthesis = synth
  ;(window as unknown as { SpeechSynthesisUtterance?: unknown }).SpeechSynthesisUtterance = FakeUtterance
  return {
    spoken,
    cancelSpy,
    addEventListenerSpy,
    setVoices(v: SpeechSynthesisVoice[]) { voiceList = v },
    fireVoicesChanged() { for (const fn of listeners.voiceschanged ?? []) fn() }
  }
}

function clearSpeechApi() {
  delete (window as unknown as { speechSynthesis?: unknown }).speechSynthesis
  delete (window as unknown as { SpeechSynthesisUtterance?: unknown }).SpeechSynthesisUtterance
}

beforeEach(() => {
  vi.resetModules()
  localStorage.clear()
})

afterEach(() => {
  clearSpeechApi()
  vi.useRealTimers()
})

describe('useSpeechVoice — support + voice list', () => {
  it('reports unsupported when window.speechSynthesis is absent', async () => {
    const { useSpeechVoice } = await import('../../src/composables/useSpeechVoice')
    const api = useSpeechVoice()
    expect(api.supported).toBe(false)
    expect(api.voices.value).toEqual([])
  })

  it('filters to German voices only (lang.startsWith("de"))', async () => {
    stubSpeechApi([
      makeVoice('Anna', 'de-DE'),
      makeVoice('Samantha', 'en-US'),
      makeVoice('Hans', 'de-AT'),
      makeVoice('Marie', 'fr-FR')
    ])
    const { useSpeechVoice } = await import('../../src/composables/useSpeechVoice')
    const api = useSpeechVoice()
    expect(api.voices.value.map(v => v.name)).toEqual(['Anna', 'Hans'])
  })

  it('re-reads voices on the voiceschanged event (getVoices() starts out empty)', async () => {
    const stub = stubSpeechApi([]) // the common browser bug: [] on first read
    const { useSpeechVoice } = await import('../../src/composables/useSpeechVoice')
    const api = useSpeechVoice()
    expect(api.voices.value).toEqual([])

    stub.setVoices([makeVoice('Anna', 'de-DE'), makeVoice('Tom', 'en-US')])
    stub.fireVoicesChanged()

    expect(api.voices.value.map(v => v.name)).toEqual(['Anna'])
  })

  it('registers the voiceschanged listener once, even when useSpeechVoice() is called repeatedly (module singleton)', async () => {
    // Simulates VoiceSetup.vue and VoiceRunner.vue each calling useSpeechVoice()
    // on their own mount — this must not stack a new listener per call.
    const stub = stubSpeechApi([])
    const { useSpeechVoice } = await import('../../src/composables/useSpeechVoice')

    useSpeechVoice()
    useSpeechVoice()
    useSpeechVoice()

    const voiceschangedCalls = stub.addEventListenerSpy.mock.calls.filter(([type]) => type === 'voiceschanged')
    expect(voiceschangedCalls.length).toBe(1)
  })
})

describe('useSpeechVoice — speak()', () => {
  it('applies lang/rate/voice to the utterance and resolves when onend fires', async () => {
    const stub = stubSpeechApi([makeVoice('Anna', 'de-DE')])
    const { useSpeechVoice } = await import('../../src/composables/useSpeechVoice')
    const api = useSpeechVoice()
    api.voiceName.value = 'Anna'
    api.rate.value = 1.2

    const pending = api.speak('Guten Tag.')
    expect(api.speaking.value).toBe(true)

    const u = stub.spoken[0]
    expect(u.lang).toBe('de-DE')
    expect(u.rate).toBe(1.2)
    expect(u.voice?.name).toBe('Anna')

    u.onend?.()
    await expect(pending).resolves.toBeUndefined()
  })

  it('keeps speaking=true for SPEAKING_TAIL_MS after onend, then clears it', async () => {
    vi.useFakeTimers()
    const stub = stubSpeechApi([])
    const { useSpeechVoice, SPEAKING_TAIL_MS } = await import('../../src/composables/useSpeechVoice')
    const api = useSpeechVoice()

    const pending = api.speak('Hallo.')
    stub.spoken[0].onend?.()
    await pending
    expect(api.speaking.value).toBe(true) // tail not elapsed yet

    await vi.advanceTimersByTimeAsync(SPEAKING_TAIL_MS - 1)
    expect(api.speaking.value).toBe(true)

    await vi.advanceTimersByTimeAsync(1)
    expect(api.speaking.value).toBe(false)
  })

  it('resolves via the safety timeout (>= 5000ms) when onend never fires', async () => {
    vi.useFakeTimers()
    stubSpeechApi([])
    const { useSpeechVoice } = await import('../../src/composables/useSpeechVoice')
    const api = useSpeechVoice()

    let done = false
    void api.speak('Hallo.').then(() => { done = true })
    // onend is deliberately never invoked — simulates a hung engine.

    await vi.advanceTimersByTimeAsync(4999)
    expect(done).toBe(false)

    await vi.advanceTimersByTimeAsync(1)
    expect(done).toBe(true)
  })

  it('scales the safety timeout up for longer text (still resolves eventually)', async () => {
    vi.useFakeTimers()
    stubSpeechApi([])
    const { useSpeechVoice } = await import('../../src/composables/useSpeechVoice')
    const api = useSpeechVoice()

    let done = false
    const longText = 'x'.repeat(200)
    void api.speak(longText).then(() => { done = true })

    await vi.advanceTimersByTimeAsync(5000)
    expect(done).toBe(false) // a long reply needs more than the floor

    await vi.advanceTimersByTimeAsync(60_000)
    expect(done).toBe(true)
  })

  it('resolves immediately (never hangs) when speech synthesis is unsupported', async () => {
    const { useSpeechVoice } = await import('../../src/composables/useSpeechVoice')
    const api = useSpeechVoice()
    await expect(api.speak('Hallo.')).resolves.toBeUndefined()
  })
})

describe('useSpeechVoice — cancel()', () => {
  it('calls speechSynthesis.cancel() and clears speaking immediately', async () => {
    const stub = stubSpeechApi([])
    const { useSpeechVoice } = await import('../../src/composables/useSpeechVoice')
    const api = useSpeechVoice()
    void api.speak('Hallo.')
    expect(api.speaking.value).toBe(true)

    api.cancel()

    expect(api.speaking.value).toBe(false)
    expect(stub.cancelSpy).toHaveBeenCalledOnce()
  })

  it('is a no-op (never throws) when unsupported', async () => {
    const { useSpeechVoice } = await import('../../src/composables/useSpeechVoice')
    const api = useSpeechVoice()
    expect(() => api.cancel()).not.toThrow()
  })
})

describe('useSpeechVoice — persistence', () => {
  it('defaults voiceName to "" and rate to 1.0 when nothing is stored', async () => {
    stubSpeechApi([])
    const { useSpeechVoice } = await import('../../src/composables/useSpeechVoice')
    const api = useSpeechVoice()
    expect(api.voiceName.value).toBe('')
    expect(api.rate.value).toBe(1.0)
  })

  it('reads a previously stored voiceName/rate', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ voiceName: 'Anna', rate: 0.8, mode: 'random' }))
    stubSpeechApi([])
    const { useSpeechVoice } = await import('../../src/composables/useSpeechVoice')
    const api = useSpeechVoice()
    expect(api.voiceName.value).toBe('Anna')
    expect(api.rate.value).toBe(0.8)
  })

  it('persists voiceName/rate without clobbering unrelated keys already in storage', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      mode: 'choose', topicId: 'st-x', turnTarget: 6, stance: 'pro', hintsOn: false
    }))
    stubSpeechApi([])
    const { useSpeechVoice } = await import('../../src/composables/useSpeechVoice')
    const api = useSpeechVoice()

    api.voiceName.value = 'Petra'
    api.rate.value = 1.2

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    expect(stored).toEqual({
      mode: 'choose', topicId: 'st-x', turnTarget: 6, stance: 'pro', hintsOn: false,
      voiceName: 'Petra', rate: 1.2
    })
  })

  it('clamps rate to the 0.6..1.4 range, in both the ref and what gets persisted', async () => {
    stubSpeechApi([])
    const { useSpeechVoice } = await import('../../src/composables/useSpeechVoice')
    const api = useSpeechVoice()

    api.rate.value = 5
    expect(api.rate.value).toBe(1.4)
    let stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    expect(stored.rate).toBe(1.4)

    api.rate.value = 0.1
    expect(api.rate.value).toBe(0.6)
    stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    expect(stored.rate).toBe(0.6)
  })
})
