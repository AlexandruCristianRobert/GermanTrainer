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

// ─── T9 item bank (phase 3) — Dativ-Adjektive drill ───
// Every item's `adjective` keys into DATIVE_ADJECTIVES above; the reachability
// test (tests/data/dativeAdjectiveItems.test.ts) demands the reverse too —
// every one of the 16 phase-1 keys is drilled by at least one item here,
// because the item ledger's denominator counts these lemmas.
//
// No new adjective lemma is introduced here. DATIVE_ADJECTIVE_KEYS above is a
// frozen snapshot taken at module-load time, and useDativeLedger's
// ledgerSummary() compares its live Object.keys(DATIVE_ADJECTIVES).length
// against that frozen array (tests/composables/useDativeLedger.test.ts) —
// so mutating DATIVE_ADJECTIVES down here to add a 17th key would desync the
// two and fail that pinned test. This bank only ever reuses the 16 keys
// phase 1 already committed.

import type { DativeDrillLevel } from './dativeExperiencer'

export interface DativeAdjectiveItem {
  id: string
  adjective: string         // key of DATIVE_ADJECTIVES
  level: DativeDrillLevel
  prompt: string            // one ___ where the dative NP/pronoun goes; ends with the (cue)
  cue: string                // dictionary form of the person, e.g. 'ich', 'der Chef'
  options: string[]         // exactly 2
  answers: string[]         // exactly 1 — the dative form
  translation: string
  explanation: string
}

export const DATIVE_ADJECTIVE_ITEMS: DativeAdjectiveItem[] = [
  { id: 'da-wichtig-1', adjective: 'wichtig', level: 'B1',
    prompt: 'Deine Meinung ist ___ sehr wichtig. (ich)', cue: 'ich',
    options: ['mir', 'mich'], answers: ['mir'],
    translation: 'Your opinion is very important to me.',
    explanation: 'wichtig nimmt die betroffene Person im Dativ: mir wichtig — important TO me.' },
  { id: 'da-wichtig-2', adjective: 'wichtig', level: 'B1',
    prompt: 'Pünktlichkeit ist ___ Chef sehr wichtig. (der Chef)', cue: 'der Chef',
    options: ['dem', 'den'], answers: ['dem'],
    translation: 'Punctuality is very important to the boss.',
    explanation: 'Die Person, für die etwas wichtig ist, steht im Dativ: dem Chef.' },
  { id: 'da-wichtig-3', adjective: 'wichtig', level: 'B1',
    prompt: 'Ist ___ die Umwelt wichtig? (ihr)', cue: 'ihr',
    options: ['euch', 'ihr'], answers: ['euch'],
    translation: 'Is the environment important to you (all)?',
    explanation: 'ihr wird im Dativ zu euch: Ist euch die Umwelt wichtig?' },
  { id: 'da-peinlich-1', adjective: 'peinlich', level: 'B1',
    prompt: 'Der Fehler ist ___ peinlich. (ich)', cue: 'ich',
    options: ['mir', 'mich'], answers: ['mir'],
    translation: 'The mistake embarrasses me.',
    explanation: 'peinlich + Dativ: mir peinlich. Der englische Sog (embarrasses ME) zieht zum Akkusativ — widerstehen.' },
  { id: 'da-peinlich-2', adjective: 'peinlich', level: 'B2',
    prompt: 'Die Frage war ___ Studentin peinlich. (die Studentin)', cue: 'die Studentin',
    options: ['der', 'die'], answers: ['der'],
    translation: 'The question embarrassed the student.',
    explanation: 'Die Person, der etwas peinlich ist, steht im Dativ: der Studentin.' },
  { id: 'da-egal-1', adjective: 'egal', level: 'B1',
    prompt: 'Das Wetter ist ___ egal. (er)', cue: 'er',
    options: ['ihm', 'ihn'], answers: ['ihm'],
    translation: 'He does not care about the weather.',
    explanation: 'egal + Dativ: ihm egal — gleichgültig für ihn.' },
  { id: 'da-egal-2', adjective: 'egal', level: 'B1',
    prompt: 'Es ist ___ Bruder egal, was du denkst. (mein Bruder)', cue: 'mein Bruder',
    options: ['meinem', 'meinen'], answers: ['meinem'],
    translation: 'My brother does not care what you think.',
    explanation: 'egal nimmt den Dativ: meinem Bruder egal.' },
  { id: 'da-aehnlich-1', adjective: 'ähnlich', level: 'B1',
    prompt: 'Du bist ___ Vater sehr ähnlich. (dein Vater)', cue: 'dein Vater',
    options: ['deinem', 'deinen'], answers: ['deinem'],
    translation: 'You are very similar to your father.',
    explanation: 'ähnlich + Dativ: deinem Vater ähnlich — similar TO him.' },
  { id: 'da-aehnlich-2', adjective: 'ähnlich', level: 'B1',
    prompt: 'Der Sohn ist ___ Mutter ähnlich. (seine Mutter)', cue: 'seine Mutter',
    options: ['seiner', 'seine'], answers: ['seiner'],
    translation: 'The son resembles his mother.',
    explanation: 'Die Vergleichsperson steht im Dativ: seiner Mutter.' },
  { id: 'da-treu-1', adjective: 'treu', level: 'B2',
    prompt: 'Der Hund bleibt ___ Besitzerin treu. (seine Besitzerin)', cue: 'seine Besitzerin',
    options: ['seiner', 'seine'], answers: ['seiner'],
    translation: 'The dog stays loyal to its owner.',
    explanation: 'treu + Dativ: seiner Besitzerin treu — loyal TO her.' },
  { id: 'da-treu-2', adjective: 'treu', level: 'B2',
    prompt: 'Die Firma bleibt ___ Kunden treu. (die Kunden)', cue: 'die Kunden',
    options: ['den', 'die'], answers: ['den'],
    translation: 'The company stays loyal to its customers.',
    explanation: 'treu + Dativ Plural: den Kunden treu bleiben.' },
  { id: 'da-klar-1', adjective: 'klar', level: 'B1',
    prompt: 'Die Antwort ist ___ jetzt klar. (wir)', cue: 'wir',
    options: ['uns', 'wir'], answers: ['uns'],
    translation: 'The answer is clear to us now.',
    explanation: 'klar + Dativ: uns klar — clear TO us.' },
  { id: 'da-klar-2', adjective: 'klar', level: 'B1',
    prompt: 'Ist ___ die Lage klar? (Sie, formell)', cue: 'Sie, formell',
    options: ['Ihnen', 'Sie'], answers: ['Ihnen'],
    translation: 'Is the situation clear to you (formal)?',
    explanation: 'klar + Dativ: Ihnen klar — die Höflichkeitsform bleibt groß auch im Dativ.' },
  { id: 'da-dankbar-1', adjective: 'dankbar', level: 'B1',
    prompt: 'Ich bin ___ Eltern sehr dankbar. (meine Eltern)', cue: 'meine Eltern',
    options: ['meinen', 'meine'], answers: ['meinen'],
    translation: 'I am very grateful to my parents.',
    explanation: 'dankbar + Dativ Plural: meinen Eltern dankbar.' },
  { id: 'da-dankbar-2', adjective: 'dankbar', level: 'B1',
    prompt: 'Wir sind ___ für die Hilfe dankbar. (ihr)', cue: 'ihr',
    options: ['euch', 'ihr'], answers: ['euch'],
    translation: 'We are grateful to you (all) for the help.',
    explanation: 'Die Person steht im Dativ (euch), die Sache hinter für.' },
  { id: 'da-bekannt-1', adjective: 'bekannt', level: 'B1',
    prompt: 'Diese Geschichte ist ___ bekannt. (sie, Plural)', cue: 'sie, Plural',
    options: ['ihnen', 'sie'], answers: ['ihnen'],
    translation: 'This story is known to them.',
    explanation: 'bekannt + Dativ: ihnen bekannt — known TO them.' },
  { id: 'da-bekannt-2', adjective: 'bekannt', level: 'B1',
    prompt: 'Diese Telefonnummer ist ___ Lehrerin bekannt. (die Lehrerin)', cue: 'die Lehrerin',
    options: ['der', 'die'], answers: ['der'],
    translation: 'This phone number is known to the teacher.',
    explanation: 'Wem etwas bekannt ist → Dativ: der Lehrerin.' },
  { id: 'da-fremd-1', adjective: 'fremd', level: 'B2',
    prompt: 'Die Stadt ist ___ noch fremd. (ich)', cue: 'ich',
    options: ['mir', 'mich'], answers: ['mir'],
    translation: 'The city is still unfamiliar to me.',
    explanation: 'fremd + Dativ: mir fremd — foreign TO me.' },
  { id: 'da-recht-1', adjective: 'recht', level: 'B2',
    prompt: 'Der Termin ist ___ recht. (du)', cue: 'du',
    options: ['dir', 'dich'], answers: ['dir'],
    translation: 'The date suits you fine.',
    explanation: 'recht sein + Dativ: dir recht — fine BY you.' },
  { id: 'da-leid-1', adjective: 'leid', level: 'A2',
    prompt: 'Es tut ___ wirklich leid. (ich)', cue: 'ich',
    options: ['mir', 'mich'], answers: ['mir'],
    translation: 'I am really sorry.',
    explanation: 'leidtun nimmt die Person im Dativ: Es tut MIR leid, nie *mich.' },
  { id: 'da-leid-2', adjective: 'leid', level: 'A2',
    prompt: 'Tut es ___ wirklich leid, dass du gehst? (du)', cue: 'du',
    options: ['dir', 'dich'], answers: ['dir'],
    translation: 'Are you really sorry that you are leaving?',
    explanation: 'leidtun bleibt fix mit tun: Tut es DIR leid — nie *dich, und niemals *du bist leid (kein sein-Muster).' },
  { id: 'da-kalt-1', adjective: 'kalt', level: 'A2',
    prompt: '___ ist kalt — mach bitte das Fenster zu. (ich)', cue: 'ich',
    options: ['Mir', 'Mich'], answers: ['Mir'],
    translation: 'I am cold — please close the window.',
    explanation: 'Befindens-Dativ: Mir ist kalt. *Ich bin kalt beschreibt den Charakter, nicht das Frieren.' },
  { id: 'da-warm-1', adjective: 'warm', level: 'A2',
    prompt: 'Ist ___ zu warm hier? (du)', cue: 'du',
    options: ['dir', 'dich'], answers: ['dir'],
    translation: 'Are you too warm in here?',
    explanation: 'Befindens-Dativ: Ist dir zu warm?' },
  { id: 'da-schlecht-1', adjective: 'schlecht', level: 'A2',
    prompt: '___ ist schlecht — ich brauche frische Luft. (ich)', cue: 'ich',
    options: ['Mir', 'Mich'], answers: ['Mir'],
    translation: 'I feel sick — I need fresh air.',
    explanation: 'Befindens-Dativ: Mir ist schlecht (Übelkeit), nicht *Ich bin schlecht.' },
  { id: 'da-boese-1', adjective: 'böse', level: 'B2',
    prompt: 'Bist du ___ noch böse? (ich)', cue: 'ich',
    options: ['mir', 'mich'], answers: ['mir'],
    translation: 'Are you still mad at me?',
    explanation: 'böse sein + Dativ: mir böse.' },
  { id: 'da-uebel-1', adjective: 'übel', level: 'B1',
    prompt: 'Nach dem fettigen Essen ist ___ übel. (er)', cue: 'er',
    options: ['ihm', 'ihn'], answers: ['ihm'],
    translation: 'He feels queasy after the greasy food.',
    explanation: 'Befindens-Dativ: ihm ist übel.' },
]
