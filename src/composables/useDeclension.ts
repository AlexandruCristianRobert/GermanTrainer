import {
  DECLENSION_TABLES, ARTICLE_FILL_ENTRIES, ADJECTIVE_ENDING_ENTRIES,
  type DeclensionEntry, type ArticleFillEntry, type AdjectiveEndingEntry,
  type DeclCase, type DeclGender, type Determiner, type Inflection, type DeclLevel
} from '../data/declension'
import { createPool, type FieldMatchers } from '../data/pool'

export type DeclensionFilter = {
  levels?: DeclLevel[]
  determiners?: Determiner[]
  genders?: DeclGender[]
}
export type ArticleFilter = {
  levels?: DeclLevel[]
  cases?: DeclCase[]
  determiners?: Determiner[]
  genders?: DeclGender[]
}
export type AdjectiveFilter = {
  levels?: DeclLevel[]
  inflections?: Inflection[]
  cases?: DeclCase[]
  genders?: DeclGender[]
}

const declensionTablePool = createPool<DeclensionEntry, DeclensionFilter>(
  DECLENSION_TABLES,
  {
    levels: e => e.level,
    determiners: e => e.determiner,
    genders: e => e.gender,
  } satisfies FieldMatchers<DeclensionEntry, DeclensionFilter>
)

const articleFillPool = createPool<ArticleFillEntry, ArticleFilter>(
  ARTICLE_FILL_ENTRIES,
  {
    levels: e => e.level,
    cases: e => e.case,
    determiners: e => e.determiner,
    genders: e => e.gender,
  } satisfies FieldMatchers<ArticleFillEntry, ArticleFilter>
)

const adjectiveEndingPool = createPool<AdjectiveEndingEntry, AdjectiveFilter>(
  ADJECTIVE_ENDING_ENTRIES,
  {
    levels: e => e.level,
    inflections: e => e.inflection,
    cases: e => e.case,
    genders: e => e.gender,
  } satisfies FieldMatchers<AdjectiveEndingEntry, AdjectiveFilter>
)

export function filterDeclensionTables(f: DeclensionFilter = {}): DeclensionEntry[] {
  return declensionTablePool.filter(f)
}

export function sampleDeclensionTables(count: number, f: DeclensionFilter = {}): DeclensionEntry[] {
  return declensionTablePool.sample(count, f)
}

export function filterArticleFill(f: ArticleFilter = {}): ArticleFillEntry[] {
  return articleFillPool.filter(f)
}

export function sampleArticleFill(count: number, f: ArticleFilter = {}): ArticleFillEntry[] {
  return articleFillPool.sample(count, f)
}

export function filterAdjectiveEndings(f: AdjectiveFilter = {}): AdjectiveEndingEntry[] {
  return adjectiveEndingPool.filter(f)
}

export function sampleAdjectiveEndings(count: number, f: AdjectiveFilter = {}): AdjectiveEndingEntry[] {
  return adjectiveEndingPool.sample(count, f)
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
