import { GoogleGenAI } from '@google/genai'

export interface AiClient {
  models: {
    generateContent: (params: Record<string, unknown>) => Promise<{ text?: string }>
  }
}

export interface SentenceItem {
  adjective_base: string
  adjective_inflected: string
  sentence: string
  hint: string
}

export interface GenerateOptions {
  model: string
  adjectives: Array<{ german: string; english: string; group?: string }>
}

export interface GenerateResult {
  valid: SentenceItem[]
  invalid: SentenceItem[]
}

const SYSTEM_PROMPT =
  'You generate short, natural German sentences for German vocabulary practice. ' +
  'For each German word the user provides, return one grammatically correct German sentence ' +
  'that uses that word in an inflected form appropriate to the sentence (e.g. an adjective ' +
  'inflected for case/gender, a verb conjugated for the subject, an adverb in its natural ' +
  'position). Keep sentences under 12 words and use everyday vocabulary appropriate for an ' +
  'A2-B1 learner. ' +
  'When a category/group is given, build a sentence whose context fits that category — for ' +
  'example "Food & Taste" words belong in sentences about eating, "Position & Direction" in ' +
  'sentences about location, "Actions & Verbs" in sentences describing action. ' +
  'Also provide a short English hint (a synonym or 4-8 word descriptive phrase) that nudges ' +
  'the learner toward the word\'s meaning. The hint must NOT contain the word itself in any ' +
  'form (German or its direct English translation). ' +
  'Use the field names "adjective_base" and "adjective_inflected" even for non-adjectives ' +
  '(verbs, adverbs); they refer to the base/dictionary form and the form as it appears in ' +
  'the sentence.'

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    sentences: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          adjective_base: { type: 'string' },
          adjective_inflected: { type: 'string' },
          sentence: { type: 'string' },
          hint: { type: 'string' }
        },
        required: ['adjective_base', 'adjective_inflected', 'sentence', 'hint']
      }
    }
  },
  required: ['sentences']
}

export async function generateAdjectiveSentences(
  client: AiClient,
  opts: GenerateOptions
): Promise<GenerateResult> {
  const userMsg =
    'Generate one German sentence for each of these words. Use the word in an inflected ' +
    'form appropriate to the sentence, and let each word\'s category guide the sentence ' +
    'context:\n' +
    opts.adjectives
      .map(a => `- ${a.german} (${a.english})${a.group ? ` — group: ${a.group}` : ''}`)
      .join('\n')

  const response = await client.models.generateContent({
    model: opts.model,
    contents: userMsg,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA
    }
  })

  const text = response.text
  if (!text) {
    throw new Error('Gemini response missing text content')
  }

  let parsed: { sentences?: unknown }
  try {
    parsed = JSON.parse(text)
  } catch (err) {
    throw new Error(
      `Failed to parse Gemini JSON response: ${err instanceof Error ? err.message : String(err)}`
    )
  }

  if (!Array.isArray(parsed.sentences)) {
    throw new Error('Gemini response missing sentences array')
  }

  const valid: SentenceItem[] = []
  const invalid: SentenceItem[] = []
  for (const raw of parsed.sentences) {
    const entry = raw as SentenceItem
    const ok =
      typeof entry.adjective_base === 'string' &&
      typeof entry.adjective_inflected === 'string' &&
      typeof entry.sentence === 'string' &&
      typeof entry.hint === 'string' &&
      entry.adjective_base.length > 0 &&
      entry.adjective_inflected.length > 0 &&
      entry.hint.length > 0 &&
      entry.sentence.toLowerCase().includes(entry.adjective_inflected.toLowerCase())
    if (ok) valid.push(entry)
    else invalid.push(entry)
  }
  return { valid, invalid }
}

export function makeGeminiClient(apiKey: string): AiClient {
  return new GoogleGenAI({ apiKey }) as unknown as AiClient
}
