import { describe, it, expect } from 'vitest'
import { COLLOCATIONS } from '../../src/data/collocations'
import { prepColorStyle, prepSlug } from '../../src/data/prepColors'

const distinctPrepositions = [...new Set(COLLOCATIONS.map((c) => c.preposition))]

describe('prepColors', () => {
  it('COLLOCATIONS actually governs the expected 15 prepositions (sanity check)', () => {
    // If this ever drifts, the assertions below about "every distinct preposition
    // resolves" would silently stop meaning much.
    expect(distinctPrepositions.sort()).toEqual([
      'an', 'auf', 'aus', 'bei', 'für', 'gegen', 'in', 'mit',
      'nach', 'um', 'unter', 'vor', 'von', 'zu', 'über',
    ].sort())
  })

  it('every distinct preposition in COLLOCATIONS yields a non-empty style object', () => {
    for (const preposition of distinctPrepositions) {
      const style = prepColorStyle(preposition)
      expect(Object.keys(style).length, `preposition "${preposition}" produced an empty style`).toBeGreaterThan(0)
      expect(style['--prep-accent']).toMatch(/^var\(--prep-[a-z]+\)$/)
      expect(style['--prep-wash']).toMatch(/^var\(--prep-[a-z]+-wash\)$/)
    }
  })

  it('slugs are ASCII for every distinct preposition in COLLOCATIONS', () => {
    for (const preposition of distinctPrepositions) {
      const slug = prepSlug(preposition)
      expect(slug, `preposition "${preposition}" has no slug`).not.toBeNull()
      expect(slug).toMatch(/^[a-z]+$/)
    }
  })

  it('transliterates umlauts (über -> ueber, für -> fuer)', () => {
    expect(prepSlug('über')).toBe('ueber')
    expect(prepSlug('für')).toBe('fuer')
  })

  it('returns an empty object for an unknown/defensive preposition', () => {
    expect(prepColorStyle('nichtvorhanden')).toEqual({})
    expect(prepSlug('nichtvorhanden')).toBeNull()
  })
})
