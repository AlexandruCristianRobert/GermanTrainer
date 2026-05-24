import {
  DECLENSION_TABLES, ARTICLE_FILL_ENTRIES, ADJECTIVE_ENDING_ENTRIES,
  type DeclensionEntry, type ArticleFillEntry, type AdjectiveEndingEntry,
  type DeclCase, type DeclGender, type Determiner, type Inflection, type DeclLevel
} from '../data/declension'

export interface DeclensionFilter {
  levels?: DeclLevel[]
  determiners?: Determiner[]
  genders?: DeclGender[]
}
export interface ArticleFilter {
  levels?: DeclLevel[]
  cases?: DeclCase[]
  determiners?: Determiner[]
  genders?: DeclGender[]
}
export interface AdjectiveFilter {
  levels?: DeclLevel[]
  inflections?: Inflection[]
  cases?: DeclCase[]
  genders?: DeclGender[]
}

function setOf<T extends string>(arr: T[] | undefined): Set<T> | null {
  return arr && arr.length > 0 ? new Set(arr) : null
}

export function filterDeclensionTables(f: DeclensionFilter = {}): DeclensionEntry[] {
  const levels = setOf(f.levels)
  const determiners = setOf(f.determiners)
  const genders = setOf(f.genders)
  return DECLENSION_TABLES.filter(e => {
    if (levels && !levels.has(e.level)) return false
    if (determiners && !determiners.has(e.determiner)) return false
    if (genders && !genders.has(e.gender)) return false
    return true
  })
}

export function sampleDeclensionTables(count: number, f: DeclensionFilter = {}): DeclensionEntry[] {
  const pool = filterDeclensionTables(f)
  return [...pool].sort(() => Math.random() - 0.5).slice(0, Math.min(count, pool.length))
}

export function filterArticleFill(f: ArticleFilter = {}): ArticleFillEntry[] {
  const levels = setOf(f.levels)
  const cases = setOf(f.cases)
  const determiners = setOf(f.determiners)
  const genders = setOf(f.genders)
  return ARTICLE_FILL_ENTRIES.filter(e => {
    if (levels && !levels.has(e.level)) return false
    if (cases && !cases.has(e.case)) return false
    if (determiners && !determiners.has(e.determiner)) return false
    if (genders && !genders.has(e.gender)) return false
    return true
  })
}

export function sampleArticleFill(count: number, f: ArticleFilter = {}): ArticleFillEntry[] {
  const pool = filterArticleFill(f)
  return [...pool].sort(() => Math.random() - 0.5).slice(0, Math.min(count, pool.length))
}

export function filterAdjectiveEndings(f: AdjectiveFilter = {}): AdjectiveEndingEntry[] {
  const levels = setOf(f.levels)
  const inflections = setOf(f.inflections)
  const cases = setOf(f.cases)
  const genders = setOf(f.genders)
  return ADJECTIVE_ENDING_ENTRIES.filter(e => {
    if (levels && !levels.has(e.level)) return false
    if (inflections && !inflections.has(e.inflection)) return false
    if (cases && !cases.has(e.case)) return false
    if (genders && !genders.has(e.gender)) return false
    return true
  })
}

export function sampleAdjectiveEndings(count: number, f: AdjectiveFilter = {}): AdjectiveEndingEntry[] {
  const pool = filterAdjectiveEndings(f)
  return [...pool].sort(() => Math.random() - 0.5).slice(0, Math.min(count, pool.length))
}

export function useDeclension() {
  return {
    tables: DECLENSION_TABLES,
    articleEntries: ARTICLE_FILL_ENTRIES,
    adjectiveEntries: ADJECTIVE_ENDING_ENTRIES,
    filterDeclensionTables, sampleDeclensionTables,
    filterArticleFill, sampleArticleFill,
    filterAdjectiveEndings, sampleAdjectiveEndings
  }
}
