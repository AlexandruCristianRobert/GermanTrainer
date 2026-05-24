// AI-generated declension article-fill entries.
// Each sentence supports MULTIPLE blanks (the curated dataset is single-blank).

import type { DeclCase, DeclGender, Determiner } from './declension'

export type Difficulty = 'easy' | 'medium' | 'hard'

export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'Easy · A1–A2',
  medium: 'Medium · B1',
  hard: 'Hard · B2–C1'
}

/** One blank inside a multi-blank AI-generated sentence. */
export interface AIBlank {
  /** The article/determiner the user must produce. */
  answer: string
  case: DeclCase
  gender: DeclGender
  determiner: Determiner
  /** Brief explanation shown in feedback (e.g. "Dativ: indirect object of geben"). */
  rationale: string
}

/** A single AI-generated sentence with N blanks. */
export interface MultiArticleEntry {
  /** Stable id assigned client-side (e.g. "ai-<timestamp>-<n>"). */
  id: string
  difficulty: Difficulty
  /** Sentence with `___` markers — one per blank, in order. */
  template: string
  /** Fully-filled sentence — shown after submit. */
  sentence: string
  /** English gloss. */
  gloss: string
  /** Blanks in left-to-right order — length matches `___` occurrences in template. */
  blanks: AIBlank[]
}

/**
 * Definite article forms — used by the validator to catch wrong-form
 * fabrications. Every case × gender combination has exactly one correct
 * form, so this table is exhaustive and deterministic.
 */
export const DEFINITE_FORMS: Record<DeclCase, Record<DeclGender, string>> = {
  nominative: { masculine: 'der', feminine: 'die', neuter: 'das', plural: 'die' },
  accusative: { masculine: 'den', feminine: 'die', neuter: 'das', plural: 'die' },
  dative:     { masculine: 'dem', feminine: 'der', neuter: 'dem', plural: 'den' },
  genitive:   { masculine: 'des', feminine: 'der', neuter: 'des', plural: 'der' }
}

/**
 * Indefinite article forms — same shape, but plural has no indefinite
 * (bare nouns or possessives are used instead). Plural cells return null
 * so the validator can reject `{ determiner: 'indefinite', gender: 'plural' }`.
 */
export const INDEFINITE_FORMS: Record<DeclCase, Record<DeclGender, string | null>> = {
  nominative: { masculine: 'ein',   feminine: 'eine',  neuter: 'ein',   plural: null },
  accusative: { masculine: 'einen', feminine: 'eine',  neuter: 'ein',   plural: null },
  dative:     { masculine: 'einem', feminine: 'einer', neuter: 'einem', plural: null },
  genitive:   { masculine: 'eines', feminine: 'einer', neuter: 'eines', plural: null }
}
