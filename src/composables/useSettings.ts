import { computed, ref } from 'vue'
import { db } from '../db'
import { DEFAULT_MODEL, type Settings } from '../db/types'

export function useSettings() {
  const settings = ref<Settings>({
    id: 'singleton',
    geminiApiKey: '',
    model: DEFAULT_MODEL
  })

  async function load(): Promise<void> {
    const stored = await db.settings.get('singleton')
    if (stored) {
      const legacyKey = (stored as unknown as { anthropicApiKey?: string }).anthropicApiKey
      const modelOk = typeof stored.model === 'string' && stored.model.startsWith('gemini-')
      settings.value = {
        id: 'singleton',
        geminiApiKey: stored.geminiApiKey ?? (legacyKey && legacyKey.startsWith('AIza') ? legacyKey : ''),
        model: modelOk ? stored.model : DEFAULT_MODEL
      }
    }
  }

  async function save(): Promise<void> {
    await db.settings.put({ ...settings.value, id: 'singleton' })
  }

  const hasApiKey = computed(() => settings.value.geminiApiKey.trim().length > 0)

  return { settings, hasApiKey, load, save }
}
