// src/composables/useDaMatchQuiz.ts
//
// Engine for T2, the Da-Compounds "matching" drill: pair each collocation's word
// with its da-compound. Screens are packed so that every screen's prepositions are
// pairwise distinct (up to `pairsPerScreen`) — otherwise two right-side chips on
// the same screen would be textually identical and the tap-to-match UI couldn't
// tell them apart. Grading is per-pair (compound === daCompound(colloc.preposition));
// wrong pairs (including anything left unassigned) feed `wrongCollocs` for a retry
// round, mirroring the other Da-Compound drills.

import { computed, ref } from 'vue'
import {
  COLLOCATIONS, type Collocation, type CollocationLevel, type CollocationRole,
} from '../data/collocations'
import { daCompound } from '../data/daCompounds'
import { createPool, shuffle, type FieldMatchers } from '../data/pool'

export type MatchFilter = {
  levels?: CollocationLevel[]
  roles?: CollocationRole[]
  preps?: string[]
}

const matchPool = createPool<Collocation, MatchFilter>(
  COLLOCATIONS,
  {
    levels: c => c.level,
    roles: c => c.role,
    preps: c => c.preposition,
  } satisfies FieldMatchers<Collocation, MatchFilter>
)

/** Every preposition governed by a collocation — the universe for the prep chip row. */
export const MATCH_PREPS: string[] =
  Array.from(new Set(COLLOCATIONS.map(c => c.preposition))).sort()

/** Collocations matching the filter (an empty/omitted field matches every value). */
export function filterMatchCollocations(f: MatchFilter = {}): Collocation[] {
  return matchPool.filter(f)
}

/** A fresh random sample of up to `count` collocations matching the filter. */
export function sampleMatchCollocations(count: number, f: MatchFilter = {}): Collocation[] {
  return matchPool.sample(count, f)
}

/**
 * Greedy screen packing: walks `collocs` in the given order (the caller supplies an
 * already-shuffled sample — this never reshuffles) and starts a new screen whenever
 * the next collocation's preposition already appears on the current screen, or the
 * current screen has reached `pairsPerScreen`. Every screen therefore has pairwise-
 * distinct prepositions and at most `pairsPerScreen` pairs (possibly fewer).
 */
export function packMatchScreens(collocs: Collocation[], pairsPerScreen: number): Collocation[][] {
  const screens: Collocation[][] = []
  let current: Collocation[] = []
  let usedPreps = new Set<string>()

  for (const c of collocs) {
    if (current.length >= pairsPerScreen || usedPreps.has(c.preposition)) {
      screens.push(current)
      current = []
      usedPreps = new Set()
    }
    current.push(c)
    usedPreps.add(c.preposition)
  }
  if (current.length > 0) screens.push(current)
  return screens
}

export interface MatchLeftRow {
  collocId: string
  word: string
  english: string
  /** Carried alongside word/english so the runner can grade + accent-color without a second lookup. */
  preposition: string
}

export interface MatchScreen {
  left: MatchLeftRow[]
  /** This screen's da-compounds, shuffled once at build time — a bijection with `left`. */
  right: string[]
  /** collocId -> the compound the learner has assigned it, so far. */
  pairs: Map<string, string>
  submitted: boolean
  /** collocId -> correct, populated by submitScreen(). */
  results: Map<string, boolean>
}

export function useDaMatchQuiz(collocs: Collocation[], pairsPerScreen = 5) {
  const collocsById = new Map(collocs.map(c => [c.id, c]))
  const packed = packMatchScreens(collocs, pairsPerScreen)

  const screens = ref<MatchScreen[]>(packed.map(group => ({
    left: group.map(c => ({ collocId: c.id, word: c.word, english: c.english, preposition: c.preposition })),
    right: shuffle(group.map(c => daCompound(c.preposition))),
    pairs: new Map<string, string>(),
    submitted: false,
    results: new Map<string, boolean>(),
  })))

  const screenIndex = ref(0)
  const total = computed(() => collocs.length)
  const score = ref(0)
  const wrongCollocs = ref<Collocation[]>([])

  const currentScreen = computed(() => screens.value[screenIndex.value] ?? null)
  const finished = computed(() => screenIndex.value >= screens.value.length)

  const allAssigned = computed(() => {
    const s = currentScreen.value
    return !!s && s.pairs.size === s.left.length
  })

  function assign(collocId: string, compound: string): void {
    const s = currentScreen.value
    if (!s || s.submitted) return
    if (s.pairs.has(collocId)) return // already paired; unassign first
    if (!s.right.includes(compound)) return // not one of this screen's compounds (defensive)
    for (const used of s.pairs.values()) {
      if (used === compound) return // already claimed by another row this screen
    }
    s.pairs.set(collocId, compound)
  }

  function unassign(collocId: string): void {
    const s = currentScreen.value
    if (!s || s.submitted) return
    s.pairs.delete(collocId)
  }

  function submitScreen(): void {
    const s = currentScreen.value
    if (!s || s.submitted) return
    s.submitted = true
    for (const row of s.left) {
      const assigned = s.pairs.get(row.collocId)
      const correct = assigned === daCompound(row.preposition)
      s.results.set(row.collocId, correct)
      if (correct) {
        score.value++
      } else {
        const colloc = collocsById.get(row.collocId)
        if (colloc) wrongCollocs.value.push(colloc)
      }
    }
  }

  function advanceScreen(): void {
    if (screenIndex.value < screens.value.length) screenIndex.value++
  }

  return {
    screens, screenIndex, currentScreen, assign, unassign, allAssigned,
    submitScreen, advanceScreen, finished, score, total, wrongCollocs,
  }
}
