import { describe, it, expect, beforeEach, test } from 'vitest'
import { db } from '../../src/db'
import { useSettings } from '../../src/composables/useSettings'
import { localClaudeAvailable } from '../../src/composables/localClaude'

describe('useSettings', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('returns defaults when no settings row exists', async () => {
    const { load, settings } = useSettings()
    await load()
    expect(settings.value.geminiApiKey).toBe('')
    expect(settings.value.model).toBe('gemini-2.5-flash')
  })

  it('persists and reloads settings', async () => {
    const a = useSettings()
    await a.load()
    a.settings.value.geminiApiKey = 'AIzaXXX'
    a.settings.value.model = 'gemini-2.5-pro'
    await a.save()

    const b = useSettings()
    await b.load()
    expect(b.settings.value.geminiApiKey).toBe('AIzaXXX')
    expect(b.settings.value.model).toBe('gemini-2.5-pro')
  })

  it('hasApiKey is false when key is empty, true when set', async () => {
    const { load, save, settings, hasApiKey } = useSettings()
    await load()
    expect(hasApiKey.value).toBe(false)
    settings.value.geminiApiKey = 'AIzaXXX'
    await save()
    expect(hasApiKey.value).toBe(true)
  })

  it('migrates legacy anthropicApiKey row when key looks like a Gemini key', async () => {
    await db.settings.put({
      id: 'singleton',
      // Simulating a legacy row shape from a previous version of the app
      anthropicApiKey: 'AIzaLegacy',
      model: 'claude-sonnet-4-6'
    } as unknown as Parameters<typeof db.settings.put>[0])
    const { load, settings } = useSettings()
    await load()
    // anthropicApiKey value used to start with 'AIza'? No — only migrates when it looks like Gemini.
    expect(settings.value.geminiApiKey).toBe('AIzaLegacy')
    // Old Claude model gets reset to default
    expect(settings.value.model).toBe('gemini-2.5-flash')
  })

  it('discards legacy anthropic key that is not a Gemini key', async () => {
    await db.settings.put({
      id: 'singleton',
      anthropicApiKey: 'sk-ant-old',
      model: 'claude-sonnet-4-6'
    } as unknown as Parameters<typeof db.settings.put>[0])
    const { load, settings } = useSettings()
    await load()
    expect(settings.value.geminiApiKey).toBe('')
    expect(settings.value.model).toBe('gemini-2.5-flash')
  })
})

test('defaults aiProvider to gemini and computes canUseAi from the key', () => {
  const { settings, hasApiKey, canUseAi } = useSettings()
  settings.value.aiProvider = 'gemini'
  settings.value.geminiApiKey = ''
  expect(canUseAi.value).toBe(false)
  settings.value.geminiApiKey = 'AIzaTest'
  expect(hasApiKey.value).toBe(true)
  expect(canUseAi.value).toBe(true)
})

test('under local-claude, canUseAi follows endpoint availability not the key', () => {
  const { settings, canUseAi } = useSettings()
  settings.value.aiProvider = 'local-claude'
  settings.value.geminiApiKey = ''
  localClaudeAvailable.value = false
  expect(canUseAi.value).toBe(false)
  localClaudeAvailable.value = true
  expect(canUseAi.value).toBe(true)
})
