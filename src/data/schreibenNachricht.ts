//
// Schreiben Teil 2 — the Nachricht row's lifecycle. See CONTEXT.md →
// "Nachricht", "Schreibauftrag", "Inhaltspunkt", "Schreibplan".
//
// Ephemeral working state, exactly like a Forumsbeitrag: it exists so a
// twenty-five-minute Nachricht survives a dead tab and a failed grade stays
// retryable. `in_progress` → `submitted` → the row is DELETED once the Run
// is recorded (ADR-0019). There is no `graded` and no `abandoned` status —
// those rows do not exist.

import type { HelpLogEntry } from './sprechen'
import type { SchreibPlanEntry } from './schreiben'
import type { SchreibAnlass } from './schreibenAuftraege'

/**
 * A Schreibauftrag, denormalized onto the Nachricht row. Custom
 * (AI-generated) Aufträge can be deleted from their own pool independently
 * of any Nachricht that references them, so the row carries its own copy
 * rather than a live pointer.
 */
export interface SchreibauftragRef {
  id: string
  titleDe: string
  situationDe: string
  empfaengerName: string
  empfaengerRolleDe: string
  taskDe: string
  inhaltspunkte: string[]
  anlass: SchreibAnlass
}

/** The help switches, frozen when the Nachricht starts. */
export interface NachrichtHelps {
  hints: boolean
  checklist: boolean
  kiTipp: boolean
  timer: boolean
  rahmen: boolean   // the two new switches (CONTEXT.md → Rahmen-Gerüst, Radar)
  radar: boolean
}

/** The four-part Rahmen-Gerüst scaffold — present only while `helps.rahmen` is on. */
export interface NachrichtSlots {
  betreff: string
  anrede: string
  text: string
  gruss: string
}

/**
 * Assembles the four Rahmen-Gerüst slots into the plain full text Nachricht
 * expects everywhere else. Three blocks — Betreff, Anrede+Text, Gruß — each
 * skipped along with its separator when empty, so a half-filled scaffold
 * still assembles cleanly (e.g. no Betreff yet still glues Anrede to text).
 */
export function assembleNachricht(slots: NachrichtSlots): string {
  const betreff = slots.betreff.trim()
  const anrede = slots.anrede.trim()
  const text = slots.text.trim()
  const gruss = slots.gruss.trim()

  const betreffBlock = betreff ? `Betreff: ${betreff}` : ''
  const middleBlock = [anrede, text].filter(part => part !== '').join('\n')
  const grussBlock = gruss

  return [betreffBlock, middleBlock, grussBlock].filter(block => block !== '').join('\n\n')
}

export interface SchreibenNachricht {
  id: string                       // crypto.randomUUID()
  auftrag: SchreibauftragRef
  helps: NachrichtHelps             // frozen at creation
  plan: SchreibPlanEntry[]          // the Schreibplan — four entries, keywords may be ''
  textDe: string                    // ALWAYS the authoritative full text (assembled when rahmen on)
  slots?: NachrichtSlots             // present iff helps.rahmen — the resume surface
  status: 'in_progress' | 'submitted'   // no graded/abandoned states — those rows are deleted
  startedAt: number
  updatedAt: number
  kiTippCount: number
  kiTippText?: string               // the latest paid tip, restored on resume — app advice, not learner text (ADR-0019 untouched)
  helpLog: HelpLogEntry[]
}

export const NACHRICHT_MIN_WORDS = 100
export const NACHRICHT_TARGET_WORDS = 120
export const NACHRICHT_COMFORT_MAX_WORDS = 160
export const NACHRICHT_TIME_BUDGET_SECONDS = 25 * 60

/** Below the exam floor, within the comfortable band, or past the ceiling. */
export function nachrichtWordBand(words: number): 'under' | 'ok' | 'over' {
  return words < NACHRICHT_MIN_WORDS ? 'under' : words <= NACHRICHT_COMFORT_MAX_WORDS ? 'ok' : 'over'
}

/** The Runner's four clock phases: 5' planen, 15' schreiben, 5' prüfen, then Überzeit. */
export type NachrichtPhase = 'planen' | 'schreiben' | 'pruefen' | 'ueberzeit'

export function nachrichtPhase(elapsedSeconds: number): NachrichtPhase {
  if (elapsedSeconds < 300) return 'planen'
  if (elapsedSeconds < 1200) return 'schreiben'
  if (elapsedSeconds <= 1500) return 'pruefen'
  return 'ueberzeit'
}

/**
 * Setup/Prep → Runner handoff, one-shot. sessionStorage — it must survive a
 * route change but not a new tab.
 */
export const NACHRICHT_STASH_KEY = 'gt:lastSchreibenTeil2'

export interface NachrichtRunStash {
  auftrag: SchreibauftragRef
  helps: NachrichtHelps
  plan: SchreibPlanEntry[]
  model: string
}

/** One Baukasten entry: the German idea plus a short English gloss of its use. */
export interface BaukastenIdee {
  ideaDe: string
  noteEn: string
}

/** The Inhalts-Baukasten — Gründe/Lösungen ideas plus topic vocabulary for an Auftrag. */
export interface NachrichtBaukasten {
  gruende: BaukastenIdee[]
  loesungen: BaukastenIdee[]
  words: import('./sprechenArguments').TopicWord[]
}

/**
 * Dexie row — `db.schreibenBaukaesten`, primary key `auftragId` (see
 * src/db/index.ts). Declared here, not in ./schreibenAuftraege, so this
 * module stays self-contained for the Dexie wiring.
 */
export interface CachedNachrichtBaukasten {
  auftragId: string
  bank: NachrichtBaukasten
  generatedAt: number
}
