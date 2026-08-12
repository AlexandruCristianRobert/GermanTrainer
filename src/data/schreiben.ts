//
// Schreiben Teil 1 — the Forumsbeitrag row's lifecycle. See CONTEXT.md →
// "Forumsbeitrag", "Schreibthema", "Inhaltspunkt", "Schreibplan".
//
// Ephemeral working state, exactly like a Vortrag: it exists so a fifty-minute
// Forumsbeitrag survives a dead tab and a failed grade stays retryable.
// `in_progress` → `submitted` → the row is DELETED once the Run is recorded.
// There is no `graded` and no `abandoned` status — those rows do not exist.

import type { TopicTag } from './sprechenTopics'
import type { HelpLogEntry } from './sprechen'

/**
 * A Schreibthema, denormalized onto the Beitrag row. Custom (AI-generated)
 * themes can be deleted from their own pool independently of any Beitrag that
 * references them, so the row carries its own copy rather than a live pointer.
 */
export interface SchreibThemaRef {
  id: string
  titleDe: string
  forumContextDe: string
  taskDe: string
  inhaltspunkte: string[]
  tags: TopicTag[]
}

/** The four help switches, frozen when the Beitrag starts. */
export interface SchreibHelps {
  hints: boolean
  checklist: boolean
  kiTipp: boolean
  timer: boolean
}

/** One line of the Schreibplan: a keyword against an Inhaltspunkt. `index` ↔ `inhaltspunkte[index]`. */
export interface SchreibPlanEntry {
  index: number
  keyword: string
}

export interface SchreibenBeitrag {
  id: string                       // crypto.randomUUID()
  thema: SchreibThemaRef
  helps: SchreibHelps               // frozen at creation
  plan: SchreibPlanEntry[]          // the Schreibplan — four entries, keywords may be ''
  textDe: string
  status: 'in_progress' | 'submitted'   // no graded/abandoned states — those rows are deleted
  startedAt: number
  updatedAt: number
  kiTippCount: number
  helpLog: HelpLogEntry[]
}

export const SCHREIBEN_MIN_WORDS = 150
export const SCHREIBEN_TARGET_WORDS = 180
export const SCHREIBEN_COMFORT_MAX_WORDS = 240
export const SCHREIBEN_TIME_BUDGET_SECONDS = 50 * 60

/** Below the exam floor, within the comfortable band, or past the ceiling. */
export function schreibenWordBand(words: number): 'under' | 'ok' | 'over' {
  return words < SCHREIBEN_MIN_WORDS ? 'under' : words <= SCHREIBEN_COMFORT_MAX_WORDS ? 'ok' : 'over'
}

/** m:ss, works past the hour (the exam's 50-minute budget never triggers this, but overrun can). */
export function schreibenClock(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
}

/**
 * Setup/Prep → Runner handoff, one-shot. sessionStorage — it must survive a
 * route change but not a new tab.
 */
export const SCHREIBEN_STASH_KEY = 'gt:lastSchreibenTeil1'

export interface SchreibenRunStash {
  thema: SchreibThemaRef
  helps: SchreibHelps
  plan: SchreibPlanEntry[]
  model: string
}

/** Four entries, indices 0..3, empty keywords — the Schreibplan's starting shape. */
export function emptySchreibPlan(): SchreibPlanEntry[] {
  return [0, 1, 2, 3].map(index => ({ index, keyword: '' }))
}

/**
 * Dexie row — `db.schreibenArgumentBanks`, primary key `themaId` (see
 * src/db/index.ts). Declared here, not in ./schreibenArguments, so this
 * module stays self-contained for the Dexie wiring; Task 7 imports it from
 * here rather than redefining it.
 */
export interface CachedSchreibArgumentBank {
  themaId: string
  bank: import('./sprechenArguments').ArgumentBank
  generatedAt: number
}
