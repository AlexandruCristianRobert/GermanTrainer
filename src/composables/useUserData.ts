// User-data export/import. Bundles every localStorage key the app writes
// (theme, display sizes, palette overrides, quiz setup memory, history)
// into a single JSON payload with a small header for forward-compat.
//
// IndexedDB-backed data (nouns, adjectives, settings/API key) is NOT
// included here — exporting an API key is dangerous, and the noun /
// adjective decks are easy to reset to defaults. If we want to bring
// those in later, we'd need to dump Dexie tables to arrays.

export interface UserDataPayload {
  /** Bumped if we ever change the shape in a breaking way. */
  schema: 1
  exportedAt: string
  app: 'german-trainer'
  data: Record<string, unknown>
}

/**
 * Every localStorage key we manage. Order is the order shown in the
 * export-summary list in the UI.
 */
export const USER_DATA_KEYS = [
  // theme + accent
  'theme',
  // display sizes
  'gt:testVerbSize',
  'gt:nounPromptSize',
  'gt:adjectivePromptSize',
  // palette overrides
  'gt:palette',
  // quiz setup memory
  'nounQuizSetup',
  'adjectiveQuizSetup',
  'verbTransSetup',
  'verbConjQuiz',
  'prepCaseSetup',
  'prepArticleSetup',
  'prepTwoWaySetup',
  'declTableSetup',
  'declArticleSetup',
  'declAdjectiveSetup',
  // legacy keys — still readable for migration during import
  'nounQuizGroups',
  'adjectiveQuizGroups',
  // quiz history
  'gt:quizHistory'
] as const

export type UserDataKey = (typeof USER_DATA_KEYS)[number]

const KEY_LABELS: Record<UserDataKey, { label: string; group: string }> = {
  theme: { label: 'Theme', group: 'Appearance' },
  'gt:testVerbSize': { label: 'Verb test-sheet size', group: 'Display' },
  'gt:nounPromptSize': { label: 'Noun prompt size', group: 'Display' },
  'gt:adjectivePromptSize': { label: 'Adjective prompt size', group: 'Display' },
  'gt:palette': { label: 'Palette overrides', group: 'Appearance' },
  nounQuizSetup: { label: 'Noun quiz setup', group: 'Quiz setup' },
  adjectiveQuizSetup: { label: 'Adjective quiz setup', group: 'Quiz setup' },
  verbTransSetup: { label: 'Verb translation setup', group: 'Quiz setup' },
  verbConjQuiz: { label: 'Verb conjugation setup', group: 'Quiz setup' },
  prepCaseSetup: { label: 'Preposition case quiz setup', group: 'Quiz setup' },
  prepArticleSetup: { label: 'Preposition article quiz setup', group: 'Quiz setup' },
  prepTwoWaySetup: { label: 'Preposition two-way quiz setup', group: 'Quiz setup' },
  declTableSetup: { label: 'Declension table quiz setup', group: 'Quiz setup' },
  declArticleSetup: { label: 'Declension article quiz setup', group: 'Quiz setup' },
  declAdjectiveSetup: { label: 'Declension adjective quiz setup', group: 'Quiz setup' },
  nounQuizGroups: { label: 'Noun groups (legacy)', group: 'Quiz setup' },
  adjectiveQuizGroups: { label: 'Adjective groups (legacy)', group: 'Quiz setup' },
  'gt:quizHistory': { label: 'Quiz history', group: 'History' }
}

export interface ExportSummaryRow {
  key: UserDataKey
  label: string
  group: string
  present: boolean
  /** Best-effort short description of what's stored. */
  detail: string
}

function safeGet(key: string): string | null {
  if (typeof localStorage === 'undefined') return null
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeSet(key: string, value: string): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(key, value)
  } catch {
    /* ignore quota */
  }
}

function describe(key: UserDataKey, raw: string | null): string {
  if (raw === null) return '—'
  if (key === 'gt:quizHistory') {
    try {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr)) return `${arr.length} run${arr.length === 1 ? '' : 's'}`
    } catch { /* fall through */ }
    return 'stored'
  }
  if (key === 'gt:palette') {
    try {
      const p = JSON.parse(raw) as { light?: object; dark?: object }
      const l = p?.light ? Object.keys(p.light).length : 0
      const d = p?.dark ? Object.keys(p.dark).length : 0
      if (l === 0 && d === 0) return '—'
      const parts: string[] = []
      if (l > 0) parts.push(`light · ${l}`)
      if (d > 0) parts.push(`dark · ${d}`)
      return parts.join(' · ')
    } catch { return 'stored' }
  }
  if (
    key === 'gt:testVerbSize' ||
    key === 'gt:nounPromptSize' ||
    key === 'gt:adjectivePromptSize'
  ) {
    return `${raw}px`
  }
  if (key === 'theme') return raw
  // Quiz-setup blobs — show one-liner counts
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return `${parsed.length} item${parsed.length === 1 ? '' : 's'}`
    if (parsed && typeof parsed === 'object') {
      const summary: string[] = []
      const obj = parsed as Record<string, unknown>
      for (const field of ['groups', 'levels', 'types', 'cases', 'tenses']) {
        const v = obj[field]
        if (Array.isArray(v) && v.length > 0) {
          summary.push(`${field}: ${v.length}`)
        }
      }
      if (typeof obj.mode === 'string') summary.push(`mode: ${obj.mode}`)
      if (obj.count !== undefined) summary.push(`count: ${obj.count}`)
      return summary.length > 0 ? summary.join(' · ') : 'stored'
    }
  } catch { /* fall through */ }
  return 'stored'
}

export function readSummary(): ExportSummaryRow[] {
  return USER_DATA_KEYS.map(key => {
    const raw = safeGet(key)
    const meta = KEY_LABELS[key]
    return {
      key,
      label: meta.label,
      group: meta.group,
      present: raw !== null,
      detail: describe(key, raw)
    }
  })
}

/** Build the export payload — parses each value so the JSON is human-readable. */
export function buildExport(): UserDataPayload {
  const data: Record<string, unknown> = {}
  for (const key of USER_DATA_KEYS) {
    const raw = safeGet(key)
    if (raw === null) continue
    // Try to parse — store as the parsed object when it's JSON, else as
    // the raw string (e.g. theme = "light").
    try {
      data[key] = JSON.parse(raw)
    } catch {
      data[key] = raw
    }
  }
  return {
    schema: 1,
    exportedAt: new Date().toISOString(),
    app: 'german-trainer',
    data
  }
}

export function buildExportJson(): string {
  return JSON.stringify(buildExport(), null, 2)
}

export interface ImportResult {
  imported: UserDataKey[]
  skipped: { key: string; reason: string }[]
}

/**
 * Apply an imported payload. Accepts either the full envelope
 * `{ schema, data: { … } }` or a raw `{ key: value, … }` map.
 * Each entry is JSON-stringified back into localStorage if it isn't
 * already a string.
 */
export function applyImport(input: unknown): ImportResult {
  const out: ImportResult = { imported: [], skipped: [] }
  if (!input || typeof input !== 'object') {
    throw new Error('Import must be a JSON object.')
  }
  const obj = input as Record<string, unknown>
  let payload: Record<string, unknown>
  if (obj.data && typeof obj.data === 'object') {
    payload = obj.data as Record<string, unknown>
  } else {
    payload = obj
  }
  const known = new Set<string>(USER_DATA_KEYS)
  for (const [key, value] of Object.entries(payload)) {
    if (!known.has(key)) {
      out.skipped.push({ key, reason: 'unknown key' })
      continue
    }
    const k = key as UserDataKey
    let serialized: string
    if (typeof value === 'string') {
      serialized = value
    } else if (value === null || value === undefined) {
      out.skipped.push({ key, reason: 'null/undefined value' })
      continue
    } else {
      try {
        serialized = JSON.stringify(value)
      } catch {
        out.skipped.push({ key, reason: 'unserializable value' })
        continue
      }
    }
    safeSet(k, serialized)
    out.imported.push(k)
  }
  return out
}

export function clearAllUserData(): void {
  for (const key of USER_DATA_KEYS) {
    if (typeof localStorage === 'undefined') return
    try {
      localStorage.removeItem(key)
    } catch {
      /* ignore */
    }
  }
}
