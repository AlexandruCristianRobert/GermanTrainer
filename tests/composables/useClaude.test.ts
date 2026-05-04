import { describe, it, expect, vi } from 'vitest'
import { generateAdjectiveSentences, type AiClient } from '../../src/composables/useClaude'

function makeFakeClient(response: { text?: string }): AiClient {
  return {
    models: {
      generateContent: vi.fn().mockResolvedValue(response)
    }
  }
}

function jsonText(payload: unknown): string {
  return JSON.stringify(payload)
}

describe('generateAdjectiveSentences', () => {
  it('builds the request with model, system instruction, and response schema', async () => {
    const generateContent = vi.fn().mockResolvedValue({
      text: jsonText({
        sentences: [
          {
            adjective_base: 'schön',
            adjective_inflected: 'schöne',
            sentence: 'Eine schöne Blume.',
            hint: 'pleasant to look at'
          }
        ]
      })
    })
    const fake: AiClient = { models: { generateContent } }
    await generateAdjectiveSentences(fake, {
      model: 'gemini-2.5-flash',
      adjectives: [{ german: 'schön', english: 'beautiful' }]
    })
    const call = generateContent.mock.calls[0][0]
    expect(call.model).toBe('gemini-2.5-flash')
    expect(call.contents).toContain('schön')
    expect(call.config).toBeDefined()
    expect(call.config.systemInstruction).toBeTypeOf('string')
    expect(call.config.systemInstruction).toContain('hint')
    expect(call.config.responseMimeType).toBe('application/json')
    expect(call.config.responseSchema).toBeDefined()
    expect(call.config.responseSchema.required).toContain('sentences')
    expect(call.config.responseSchema.properties.sentences.items.required).toContain('hint')
  })

  it('returns valid sentences with hints attached', async () => {
    const fake = makeFakeClient({
      text: jsonText({
        sentences: [
          {
            adjective_base: 'schön',
            adjective_inflected: 'schöne',
            sentence: 'Eine schöne Blume.',
            hint: 'pleasant to look at'
          },
          {
            adjective_base: 'alt',
            adjective_inflected: 'alten',
            sentence: 'Der alten Mann.',
            hint: 'having existed for a long time'
          }
        ]
      })
    })
    const result = await generateAdjectiveSentences(fake, {
      model: 'gemini-2.5-flash',
      adjectives: [
        { german: 'schön', english: 'beautiful' },
        { german: 'alt', english: 'old' }
      ]
    })
    expect(result.valid.length).toBe(2)
    expect(result.invalid.length).toBe(0)
    expect(result.valid[0].hint).toBe('pleasant to look at')
    expect(result.valid[1].hint).toBe('having existed for a long time')
  })

  it('rejects entries whose sentence does not contain the inflected form', async () => {
    const fake = makeFakeClient({
      text: jsonText({
        sentences: [
          {
            adjective_base: 'schön',
            adjective_inflected: 'schöne',
            sentence: 'Das ist gut.',
            hint: 'lovely'
          }
        ]
      })
    })
    const result = await generateAdjectiveSentences(fake, {
      model: 'gemini-2.5-flash',
      adjectives: [{ german: 'schön', english: 'beautiful' }]
    })
    expect(result.valid.length).toBe(0)
    expect(result.invalid.length).toBe(1)
  })

  it('rejects entries with empty hint', async () => {
    const fake = makeFakeClient({
      text: jsonText({
        sentences: [
          {
            adjective_base: 'schön',
            adjective_inflected: 'schöne',
            sentence: 'Eine schöne Blume.',
            hint: ''
          }
        ]
      })
    })
    const result = await generateAdjectiveSentences(fake, {
      model: 'gemini-2.5-flash',
      adjectives: [{ german: 'schön', english: 'beautiful' }]
    })
    expect(result.valid.length).toBe(0)
    expect(result.invalid.length).toBe(1)
  })

  it('throws when text response is missing', async () => {
    const fake = makeFakeClient({})
    await expect(
      generateAdjectiveSentences(fake, {
        model: 'gemini-2.5-flash',
        adjectives: [{ german: 'schön', english: 'beautiful' }]
      })
    ).rejects.toThrow(/text content/)
  })

  it('throws when text is not valid JSON', async () => {
    const fake = makeFakeClient({ text: 'Sorry, I cannot.' })
    await expect(
      generateAdjectiveSentences(fake, {
        model: 'gemini-2.5-flash',
        adjectives: [{ german: 'schön', english: 'beautiful' }]
      })
    ).rejects.toThrow(/parse Gemini JSON/)
  })

  it('throws when sentences field is missing', async () => {
    const fake = makeFakeClient({ text: jsonText({ foo: 'bar' }) })
    await expect(
      generateAdjectiveSentences(fake, {
        model: 'gemini-2.5-flash',
        adjectives: [{ german: 'schön', english: 'beautiful' }]
      })
    ).rejects.toThrow(/sentences array/)
  })

  it('matching is case-insensitive', async () => {
    const fake = makeFakeClient({
      text: jsonText({
        sentences: [
          {
            adjective_base: 'schön',
            adjective_inflected: 'Schöne',
            sentence: 'Eine schöne Blume.',
            hint: 'lovely'
          }
        ]
      })
    })
    const result = await generateAdjectiveSentences(fake, {
      model: 'gemini-2.5-flash',
      adjectives: [{ german: 'schön', english: 'beautiful' }]
    })
    expect(result.valid.length).toBe(1)
  })
})
