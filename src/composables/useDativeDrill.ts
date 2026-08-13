// Shared deterministic sampling + grading for the Dativ module's offline
// drills (ADR-0007 family). No Vue/DOM — runners own their own ref state,
// this module owns the pure layer: filter → sample → build → grade.

import { computed, ref } from 'vue'
import { shuffle, type Rng } from '../data/pool'
import { checkText } from './drillGrading'
import { DATIVE_VERBS, type DativeVerbEntry } from '../data/dativeVerbs'
import {
  T1_CASE_ITEMS, T2_FORM_ITEMS, T3_TRAP_ITEMS,
  type CaseChoiceItem, type FormItem, type TrapItem, type DativeItemLevel,
} from '../data/dativeItems'
import {
  EXPERIENCER_SUBJECT_ITEMS, EXPERIENCER_PRODUCTION_ITEMS,
  type ExperiencerSubjectItem, type ExperiencerProductionItem, type DativeDrillLevel,
} from '../data/dativeExperiencer'
import { TWIN_PAIRS, TWIN_ITEMS, type TwinItem } from '../data/dativeTwins'
import {
  DITRANSITIVE_ITEMS, type DitransitiveItem,
  OBJECT_ORDER_ITEMS, objectOrderAnswer, type ObjectOrderItem,
} from '../data/dativeDitransitive'
import { DATIVE_ADJECTIVE_ITEMS, type DativeAdjectiveItem } from '../data/dativeAdjectives'
import { FREE_DATIVE_ITEMS, type FreeDativeItem } from '../data/dativeFree'
import {
  PASSIVE_ITEMS, type PassiveItem,
  REFLEXIVE_ITEMS, type ReflexiveItem,
} from '../data/dativeConsequences'

export interface DativeCard {
  id: string
  prompt: string
  answers: readonly string[]
  verb?: string
  explanation?: string
}

export function sampleDativeCards<T extends { id: string }>(pool: readonly T[], count: number): T[] {
  return shuffle(pool, Math.min(count, pool.length))
}

export function gradeDativeAnswer(given: string, answers: readonly string[]): boolean {
  if (answers.length === 0) return false
  return checkText(given, answers[0], [...answers.slice(1)])
}

export type DativeFamily = DativeVerbEntry['family']
export const DATIVE_FAMILIES: readonly DativeFamily[] = ['recipient', 'experiencer', 'co-agent']
export const FAMILY_LABELS: Record<DativeFamily, string> = {
  'recipient': 'Empfänger',
  'experiencer': 'Erlebender',
  'co-agent': 'Mit-Handelnder',
}

export interface DativeFilter {
  levels: DativeItemLevel[]
  families: DativeFamily[]
}

/** T1: the family filter narrows the DATIVE side only — accusative
 *  distractors always stay in, so a round is never one-button-winnable. */
export function filterCaseItems(f: DativeFilter): CaseChoiceItem[] {
  return T1_CASE_ITEMS.filter(i => f.levels.includes(i.level)
    && (i.answer === 'accusative' || f.families.includes(DATIVE_VERBS[i.verb].family)))
}

export function filterFormItems(f: DativeFilter): FormItem[] {
  return T2_FORM_ITEMS.filter(i => f.levels.includes(i.level)
    && f.families.includes(DATIVE_VERBS[i.verb].family))
}

export function filterTrapItems(f: DativeFilter): TrapItem[] {
  return T3_TRAP_ITEMS.filter(i => f.levels.includes(i.level)
    && f.families.includes(DATIVE_VERBS[i.verb].family))
}

export function buildCaseCards(items: readonly CaseChoiceItem[]): DativeCard[] {
  return items.map(i => ({
    id: i.id,
    prompt: i.verb,
    answers: [i.answer],
    verb: i.verb,
    explanation: i.answer === 'dative'
      ? DATIVE_VERBS[i.verb].coreIdeaExplanation
      : `${i.verb} ist kein Dativverb — es nimmt ein Akkusativobjekt.`,
  }))
}

export function buildFormCards(items: readonly FormItem[]): DativeCard[] {
  return items.map(i => ({
    id: i.id,
    prompt: i.sentence,
    answers: i.answers,
    verb: i.verb,
    explanation: DATIVE_VERBS[i.verb].coreIdeaExplanation,
  }))
}

export function buildTrapCards(items: readonly TrapItem[]): DativeCard[] {
  return items.map(i => ({
    id: i.id,
    prompt: i.sentence,
    answers: i.answers,
    verb: i.verb,
    explanation: DATIVE_VERBS[i.verb].coreIdeaExplanation,
  }))
}

// ─── Phase 3+: shared question engine for the deterministic Dativ drills ───
// Mirrors useDirectionDrill's state machine. `ledgerKey` names the gt:dativeLedger
// item this card is an encounter of (a dative verb or adjective lemma) — or null
// for the rule-driven drills (T7/T8/T10/T12/T13), which are band-tracked only.

export interface DativeQuizCard {
  key: string
  prompt: string
  answers: string[]        // [0] canonical; the rest accepted alternatives (type mode)
  options: string[]        // pick-mode buttons, shuffled at build time — authored order leaks the answer; [] in type-only drills
  translation: string
  note: string | null      // teaching line revealed after grading
  ledgerKey: string | null
  sourceIndex: number      // index into the sampled source array (retry rebuild)
  picked: string | null
  typed: string | null
  isCorrect: boolean | null
}

export function useDativeQuiz(cards: DativeQuizCard[]) {
  const questions = ref<DativeQuizCard[]>(cards)
  const currentIndex = ref(0)
  const current = computed(() => questions.value[currentIndex.value] ?? null)
  const finished = computed(() => currentIndex.value >= questions.value.length)
  const score = computed(() => questions.value.filter(q => q.isCorrect === true).length)
  const total = computed(() => questions.value.length)
  const wrongIndexes = computed(() =>
    questions.value.filter(q => q.isCorrect === false).map(q => q.sourceIndex))

  function pickOption(option: string) {
    const q = questions.value[currentIndex.value]
    if (!q || q.isCorrect !== null) return
    q.picked = option
    q.isCorrect = q.answers.includes(option)
  }

  function submitText(input: string) {
    const q = questions.value[currentIndex.value]
    if (!q || q.isCorrect !== null) return
    const cleaned = input.replace(/[.!?]+\s*$/, '')
    q.typed = input
    q.isCorrect = gradeDativeAnswer(cleaned, q.answers)
  }

  function advance() {
    if (currentIndex.value < questions.value.length) currentIndex.value++
  }

  return { questions, currentIndex, current, finished, pickOption, submitText, advance, score, total, wrongIndexes }
}

// ─── Phase 3, Task 3: T4 Wer ist Subjekt? (family IV) ───
// Ledger-coupled: keyed by the dative verb (item.verb).

export function buildSubjectCards(items: ExperiencerSubjectItem[], rng: Rng = Math.random): DativeQuizCard[] {
  return items.map((item, sourceIndex) => ({
    key: item.id,
    prompt: item.kind === 'subject' ? `${item.sentence} — Was ist das Subjekt?` : item.sentence,
    answers: item.answers,
    options: shuffle(item.options, item.options.length, rng),
    translation: item.translation,
    note: item.explanation,
    ledgerKey: item.verb,
    sourceIndex,
    picked: null, typed: null, isCorrect: null,
  }))
}

export function filterSubjectItems(f: { levels: DativeDrillLevel[]; kinds: string[] }): ExperiencerSubjectItem[] {
  return EXPERIENCER_SUBJECT_ITEMS.filter(i => f.levels.includes(i.level) && f.kinds.includes(i.kind))
}

// ─── Phase 3, Task 4: T5 Produktion (family IV) ───
// Ledger-coupled: keyed by the dative verb (item.verb).

export function buildProductionCards(items: ExperiencerProductionItem[]): DativeQuizCard[] {
  return items.map((item, sourceIndex) => ({
    key: item.id,
    prompt: item.promptEn,
    answers: item.answers,
    options: [],
    translation: `Bausteine: ${item.cue}`,
    note: item.explanation,
    ledgerKey: item.verb,
    sourceIndex,
    picked: null, typed: null, isCorrect: null,
  }))
}

export function filterProductionItems(f: { levels: DativeDrillLevel[]; verbs: string[] }): ExperiencerProductionItem[] {
  return EXPERIENCER_PRODUCTION_ITEMS.filter(i => f.levels.includes(i.level) && f.verbs.includes(i.verb))
}

// ─── Phase 3, Task 6: T6 Zwillingspaare (family V) ───
// Ledger-coupled: keyed by the pair's DATIVE verb, never the twin — twins are
// teaching contrast, not their own ledger entries.

const TWIN_DATIVE_BY_PAIR = new Map(TWIN_PAIRS.map(p => [p.pairId, p.dativeVerb]))

export function buildTwinCards(items: TwinItem[], rng: Rng = Math.random): DativeQuizCard[] {
  return items.map((item, sourceIndex) => ({
    key: item.id,
    prompt: item.prompt,
    answers: item.answers,
    options: shuffle(item.options, item.options.length, rng),
    translation: item.translation,
    note: item.explanation,
    ledgerKey: TWIN_DATIVE_BY_PAIR.get(item.pairId) ?? null,
    sourceIndex,
    picked: null, typed: null, isCorrect: null,
  }))
}

export function filterTwinItems(f: { levels: DativeDrillLevel[]; pairs: string[] }): TwinItem[] {
  return TWIN_ITEMS.filter(i => f.levels.includes(i.level) && f.pairs.includes(i.pairId))
}

// ─── Phase 3, Task 8: T7 Welches Objekt? (family VI) ───
// Rule-driven: ledgerKey is always null — band-tracked only, never in gt:dativeLedger.

export function buildDitransitiveCards(items: DitransitiveItem[], rng: Rng = Math.random): DativeQuizCard[] {
  return items.map((item, sourceIndex) => ({
    key: item.id,
    prompt: item.prompt,
    answers: item.answers,
    options: shuffle(item.options, item.options.length, rng),
    translation: item.translation,
    note: item.explanation,
    ledgerKey: null,
    sourceIndex,
    picked: null, typed: null, isCorrect: null,
  }))
}

export function filterDitransitiveItems(f: { levels: DativeDrillLevel[]; roles: string[] }): DitransitiveItem[] {
  return DITRANSITIVE_ITEMS.filter(i => f.levels.includes(i.level) && f.roles.includes(i.gapRole))
}

// ─── Phase 3, Task 9: T8 Objektfolge (family VI) ───
// Rule-driven: ledgerKey is always null — band-tracked only, never in gt:dativeLedger.

export function buildObjectOrderCards(items: ObjectOrderItem[], rng: Rng = Math.random): DativeQuizCard[] {
  return items.map((item, sourceIndex) => {
    const correct = objectOrderAnswer(item)
    const flipped = correct === `${item.datPhrase} ${item.akkPhrase}`
      ? `${item.akkPhrase} ${item.datPhrase}` : `${item.datPhrase} ${item.akkPhrase}`
    return {
      key: item.id,
      prompt: `${item.stem} ___${item.punct}`,
      answers: [correct],
      options: shuffle([correct, flipped], 2, rng),
      translation: item.translation,
      note: item.explanation,
      ledgerKey: null,
      sourceIndex,
      picked: null, typed: null, isCorrect: null,
    }
  })
}

export function filterObjectOrderItems(f: { levels: DativeDrillLevel[]; kinds: string[] }): ObjectOrderItem[] {
  return OBJECT_ORDER_ITEMS.filter(i => f.levels.includes(i.level) && f.kinds.includes(i.kind))
}

// ─── Phase 3, Task 11: T9 Dativ-Adjektive (family VII) ───
// Ledger-coupled: keyed by the adjective LEMMA (item.adjective), not the inflected answer.

export function buildAdjectiveCards(items: DativeAdjectiveItem[], rng: Rng = Math.random): DativeQuizCard[] {
  return items.map((item, sourceIndex) => ({
    key: item.id,
    prompt: item.prompt,
    answers: item.answers,
    options: shuffle(item.options, item.options.length, rng),
    translation: item.translation,
    note: item.explanation,
    ledgerKey: item.adjective,
    sourceIndex,
    picked: null, typed: null, isCorrect: null,
  }))
}

export function filterAdjectiveItems(f: { levels: DativeDrillLevel[]; adjectives: string[] }): DativeAdjectiveItem[] {
  return DATIVE_ADJECTIVE_ITEMS.filter(i => f.levels.includes(i.level) && f.adjectives.includes(i.adjective))
}

// ─── Phase 4, Task 2: T10 Freier Dativ (family VIII) ───
// Rule-driven: ledgerKey is always null — band-tracked only, never in gt:dativeLedger.

export function buildFreeCards(items: FreeDativeItem[], rng: Rng = Math.random): DativeQuizCard[] {
  return items.map((item, sourceIndex) => ({
    key: item.id,
    prompt: item.kind === 'drop'
      ? `${item.prompt} — Ist „${item.probePhrase}“ weglassbar?`
      : `${item.prompt} — Welche Lesart hat „${item.probePhrase}“?`,
    answers: item.answers,
    options: shuffle(item.options, item.options.length, rng),
    translation: item.translation,
    note: item.explanation,
    ledgerKey: null,   // rule-driven family: band-tracked only, never in the ledger
    sourceIndex,
    picked: null, typed: null, isCorrect: null,
  }))
}

export function filterFreeItems(f: { levels: DativeDrillLevel[]; kinds: string[] }): FreeDativeItem[] {
  return FREE_DATIVE_ITEMS.filter(i => f.levels.includes(i.level) && f.kinds.includes(i.kind))
}

// ─── Phase 4, Task 4: T12 Kein persönliches Passiv (family X) ───
// Rule-driven: ledgerKey is always null — band-tracked only, never in gt:dativeLedger.

export function buildPassiveCards(items: PassiveItem[], rng: Rng = Math.random): DativeQuizCard[] {
  return items.map((item, sourceIndex) => ({
    key: item.id,
    prompt: item.prompt,        // authored complete per kind (question suffix / gap / constant)
    answers: item.answers,
    options: shuffle(item.options, item.options.length, rng),
    translation: item.translation,
    note: item.explanation,
    ledgerKey: null,   // rule-driven family: band-tracked only, never in the ledger
    sourceIndex,
    picked: null, typed: null, isCorrect: null,
  }))
}

export function filterPassiveItems(f: { levels: DativeDrillLevel[]; kinds: string[] }): PassiveItem[] {
  return PASSIVE_ITEMS.filter(i => f.levels.includes(i.level) && f.kinds.includes(i.kind))
}

// ─── Phase 4, Task 5: T13 Reflexiver Dativ (family X) ───
// Rule-driven: ledgerKey is always null — band-tracked only, never in gt:dativeLedger.

export function buildReflexiveCards(items: ReflexiveItem[], rng: Rng = Math.random): DativeQuizCard[] {
  return items.map((item, sourceIndex) => ({
    key: item.id,
    prompt: item.prompt,
    answers: item.answers,
    options: shuffle(item.options, item.options.length, rng),
    translation: item.translation,
    note: item.explanation,
    ledgerKey: null,   // rule-driven family: band-tracked only, never in the ledger
    sourceIndex,
    picked: null, typed: null, isCorrect: null,
  }))
}

export function filterReflexiveItems(f: { levels: DativeDrillLevel[] }): ReflexiveItem[] {
  return REFLEXIVE_ITEMS.filter(i => f.levels.includes(i.level))
}
