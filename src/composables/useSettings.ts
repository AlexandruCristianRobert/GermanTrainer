import { computed, ref } from 'vue'
import { db } from '../db'
import { DEFAULT_MODEL, type Settings } from '../db/types'
import { localClaudeAvailable, probeLocalClaude } from './localClaude'

const LC_MODELS: readonly string[] = ['sonnet', 'haiku', 'opus']
const LC_EFFORTS: readonly string[] = ['low', 'medium', 'high', 'xhigh', 'max']

export function useSettings() {
  const settings = ref<Settings>({
    id: 'singleton',
    geminiApiKey: '',
    model: DEFAULT_MODEL,
    aiProvider: 'gemini',
    localClaudeModel: 'sonnet',
    localClaudeEffort: 'low'
  })

  async function load(): Promise<void> {
    const stored = await db.settings.get('singleton')
    if (stored) {
      const legacyKey = (stored as unknown as { anthropicApiKey?: string }).anthropicApiKey
      const modelOk = typeof stored.model === 'string' && stored.model.startsWith('gemini-')
      settings.value = {
        id: 'singleton',
        geminiApiKey: stored.geminiApiKey ?? (legacyKey && legacyKey.startsWith('AIza') ? legacyKey : ''),
        model: modelOk ? stored.model : DEFAULT_MODEL,
        aiProvider: stored.aiProvider === 'local-claude' ? 'local-claude' : 'gemini',
        localClaudeModel: LC_MODELS.includes(stored.localClaudeModel) ? stored.localClaudeModel : 'sonnet',
        localClaudeEffort: LC_EFFORTS.includes(stored.localClaudeEffort) ? stored.localClaudeEffort : 'low'
      }
    }
    void probeLocalClaude()
  }

  async function save(): Promise<void> {
    await db.settings.put({ ...settings.value, id: 'singleton' })
  }

  const hasApiKey = computed(() => settings.value.geminiApiKey.trim().length > 0)
  const canUseAi = computed(() =>
    settings.value.aiProvider === 'local-claude' ? localClaudeAvailable.value : hasApiKey.value
  )

  return { settings, hasApiKey, canUseAi, load, save }
}
