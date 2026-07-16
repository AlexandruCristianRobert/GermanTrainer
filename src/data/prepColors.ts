// src/data/prepColors.ts
//
// Maps each of the 15 governed prepositions (see src/data/collocations.ts) to its
// permanent "preposition color" — a memory anchor binding a collocation to its
// preposition in the Fixed prepositions drill (CONTEXT.md: "Preposition color").
// The actual hues live in src/styles/tokens.css as --prep-<slug> / --prep-<slug>-wash
// custom properties (locked hue mapping, light + dark theme values); this module only
// knows how to turn a preposition string into the CSS variable names for those tokens.

/**
 * Preposition -> CSS slug. Umlauts transliterate (über -> ueber, für -> fuer) since
 * CSS custom property names must stay ASCII.
 */
const PREP_SLUGS: Record<string, string> = {
  gegen: 'gegen',
  vor: 'vor',
  auf: 'auf',
  über: 'ueber',
  für: 'fuer',
  mit: 'mit',
  zu: 'zu',
  nach: 'nach',
  an: 'an',
  von: 'von',
  um: 'um',
  in: 'in',
  bei: 'bei',
  aus: 'aus',
  unter: 'unter',
}

/** ASCII slug for a governed preposition, or null when the preposition is unknown. */
export function prepSlug(preposition: string): string | null {
  return PREP_SLUGS[preposition] ?? null
}

/**
 * Inline-style object binding `--prep-accent` / `--prep-wash` to the CSS tokens for the
 * given preposition, so descendants can style with `var(--prep-accent)` / `var(--prep-wash)`
 * without knowing the slug. Unknown preposition (defensive, not expected) -> empty object,
 * which leaves the surrounding element unstyled rather than throwing.
 */
export function prepColorStyle(preposition: string): Record<string, string> {
  const slug = prepSlug(preposition)
  if (!slug) return {}
  return {
    '--prep-accent': `var(--prep-${slug})`,
    '--prep-wash': `var(--prep-${slug}-wash)`,
  }
}
