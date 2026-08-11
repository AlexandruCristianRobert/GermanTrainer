// Dative-governing adjectives — family VII of the Dativ module, and the
// adjective half of the module's item ledger (the ledger denominator is
// DATIVE_VERB_KEYS.length + DATIVE_ADJECTIVE_KEYS.length — never hard-coded).
// Same side-table discipline as dativeVerbs.ts: teaching data only.

export interface DativeAdjectiveEntry {
  english: string
  /** Predicative example containing the adjective and a dative person. */
  example: string
  /** ≤90 chars, ≤14 words, unique — same contract as coreIdeaHint. */
  coreIdeaHint: string
  /** Unpacks the pattern, then names the adjective and case. Shown only on a miss. */
  coreIdeaExplanation: string
  /** Impersonal body-state predicative: "Mir ist kalt" — no subject at all. */
  impersonal?: true
}

export const DATIVE_ADJECTIVES: Record<string, DativeAdjectiveEntry> = {
  'wichtig': {
    english: 'important',
    example: 'Deine Meinung ist mir wichtig.',
    coreIdeaHint: 'What matters always matters to a particular person keeping score.',
    coreIdeaExplanation: 'Importance is measured on somebody — the affected person stands in the Dativ next to wichtig: Deine Meinung ist mir wichtig.',
  },
  'peinlich': {
    english: 'embarrassing',
    example: 'Der Fehler ist ihm peinlich.',
    coreIdeaHint: 'Embarrassment needs a person to blush; the cause alone is nothing.',
    coreIdeaExplanation: 'The embarrassing thing is the subject and the person who blushes takes the Dativ with peinlich: Der Fehler ist ihm peinlich.',
  },
  'egal': {
    english: 'all the same',
    example: 'Das ist mir egal.',
    coreIdeaHint: 'Indifference is measured on somebody; things cannot shrug.',
    coreIdeaExplanation: 'egal marks the unmoved person in the Dativ: Das ist mir egal — it is all the same to me.',
  },
  'ähnlich': {
    english: 'similar',
    example: 'Sie ist ihrer Mutter sehr ähnlich.',
    coreIdeaHint: 'Likeness always points at the counterpart it resembles.',
    coreIdeaExplanation: 'The counterpart of the resemblance stands in the Dativ with ähnlich: Sie ist ihrer Mutter sehr ähnlich — same pattern as the verb ähneln.',
  },
  'treu': {
    english: 'loyal / faithful',
    example: 'Der Hund ist seinem Herrn treu.',
    coreIdeaHint: 'Loyalty binds you to the one you keep faith with.',
    coreIdeaExplanation: 'The person you keep faith with takes the Dativ with treu: Der Hund ist seinem Herrn treu.',
  },
  'klar': {
    english: 'clear',
    example: 'Die Regel ist mir jetzt klar.',
    coreIdeaHint: 'Clarity dawns on a particular mind, not in thin air.',
    coreIdeaExplanation: 'The mind something becomes clear to stands in the Dativ with klar: Die Regel ist mir jetzt klar.',
  },
  'leid': {
    english: 'sorry (only with tun)',
    example: 'Das tut mir leid.',
    coreIdeaHint: 'Regret settles on the person who carries it, via one fixed verb.',
    coreIdeaExplanation: 'leid survives only in the fixed pattern with tun — never *das ist mir leid with sein — and the sorry person stands in the Dativ: Das tut mir leid.',
  },
  'bekannt': {
    english: 'known / familiar',
    example: 'Der Name ist mir bekannt.',
    coreIdeaHint: 'Familiarity exists only relative to the person who already knows.',
    coreIdeaExplanation: 'The person who already knows stands in the Dativ with bekannt: Der Name ist mir bekannt.',
  },
  'fremd': {
    english: 'foreign / strange',
    example: 'Die Stadt ist ihr noch fremd.',
    coreIdeaHint: 'Strangeness is strangeness for someone; a newcomer feels it most.',
    coreIdeaExplanation: 'The person something feels strange to stands in the Dativ with fremd: Die Stadt ist ihr noch fremd.',
  },
  'dankbar': {
    english: 'grateful',
    example: 'Ich bin dir sehr dankbar.',
    coreIdeaHint: 'Gratitude flows from the thankful person toward their benefactor.',
    coreIdeaExplanation: 'Here the grateful person is the subject and the benefactor takes the Dativ with dankbar: Ich bin dir sehr dankbar — same receiver as with danken.',
  },
  'böse': {
    english: 'angry (with somebody)',
    example: 'Bist du mir noch böse?',
    coreIdeaHint: 'Anger aimed at a person keeps that person in the sentence.',
    coreIdeaExplanation: 'The person the anger is aimed at stands in the Dativ with böse: Bist du mir noch böse?',
  },
  'recht': {
    english: 'fine / agreeable',
    example: 'Der Termin ist mir recht.',
    coreIdeaHint: 'Suitability is judged by the person it must suit.',
    coreIdeaExplanation: 'The person something suits stands in the Dativ with recht: Der Termin ist mir recht.',
  },

  // ─── impersonal body-state predicatives: no subject at all ─────────────
  'kalt': {
    english: 'cold (feeling)',
    example: 'Mir ist kalt.',
    coreIdeaHint: 'A body state with no actor; only the feeler is named.',
    coreIdeaExplanation: 'The body-state predicative has no real subject — the person who feels it stands in the Dativ: Mir ist kalt, never *Ich bin kalt (that would describe your character).',
    impersonal: true,
  },
  'warm': {
    english: 'warm (feeling)',
    example: 'Ist dir warm genug?',
    coreIdeaHint: 'Warmth felt from inside; the sentence names only who feels it.',
    coreIdeaExplanation: 'Like kalt, warm as a felt state marks the feeler in the Dativ: Ist dir warm genug? — *Ich bin warm claims something about your personality.',
    impersonal: true,
  },
  'schlecht': {
    english: 'nauseous / unwell',
    example: 'Mir ist schlecht.',
    coreIdeaHint: 'Queasiness strikes a person; no thing in the sentence causes it.',
    coreIdeaExplanation: 'The nausea predicative is subjectless — the sufferer stands in the Dativ with schlecht: Mir ist schlecht.',
    impersonal: true,
  },
  'übel': {
    english: 'queasy / sick',
    example: 'Ihm ist übel geworden.',
    coreIdeaHint: 'A wave of sickness washes over someone; the someone is the sentence.',
    coreIdeaExplanation: 'übel in the body-state reading is subjectless and marks the sufferer in the Dativ: Ihm ist übel geworden.',
    impersonal: true,
  },
}

export const DATIVE_ADJECTIVE_KEYS: readonly string[] = Object.freeze(Object.keys(DATIVE_ADJECTIVES))
