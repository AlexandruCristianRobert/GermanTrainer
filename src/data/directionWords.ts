// Direction words (hin & her) — perspective adverbs, r-forms, question words,
// lexicalized prefix verbs, idioms, and the scene-spec contract.
// hin = away from the speaker, her = toward the speaker (CONTEXT.md: Perspective adverb).
// Phase 1 ships the cheatsheet content and the schema; drill item banks arrive in Phase 2+.

export interface AdverbPair {
  element: string        // 'ein' — the directional element both twins share
  rForm: string | null   // 'rein' — the colloquial R-form; null when none exists (no *rab)
  gloss: string          // short English sense
}

export function hinForm(element: string): string {
  return 'hin' + element
}

export function herForm(element: string): string {
  return 'her' + element
}

/** The six compound pairs — the module's analogue of a governed preposition. */
export const ADVERB_PAIRS: AdverbPair[] = [
  { element: 'ein',   rForm: 'rein',   gloss: 'in — into something' },
  { element: 'aus',   rForm: 'raus',   gloss: 'out — out of something' },
  { element: 'auf',   rForm: 'rauf',   gloss: 'up — onto or up something' },
  { element: 'unter', rForm: 'runter', gloss: 'down' },
  { element: 'über',  rForm: 'rüber',  gloss: 'across — to the other side' },
  { element: 'ab',    rForm: null,     gloss: 'down — elevated register' },
]

export interface UnpairedAdverb {
  form: string
  gloss: string
}

/** Forms with no hin/her twin — one fixed perspective or none. */
export const UNPAIRED_ADVERBS: UnpairedAdverb[] = [
  { form: 'herum',     gloss: 'around — in circles, or aimlessly' },
  { form: 'hervor',    gloss: 'out from behind or under something' },
  { form: 'hindurch',  gloss: 'through — all the way through' },
  { form: 'hinterher', gloss: 'after — following behind' },
]

export interface PerspectivePair {
  her: string      // example sentence on the her side
  herNote: string  // why it is her
  hin: string      // example sentence on the hin side
  hinNote: string  // why it is hin
}

/** Minimal pairs for the perspective rule — same situation, flipped speaker. */
export const PERSPECTIVE_PAIRS: PerspectivePair[] = [
  {
    her: 'Komm her!',            herNote: 'toward the speaker',
    hin: 'Geh hin!',             hinNote: 'away from the speaker',
  },
  {
    her: 'Wo kommst du her?',    herNote: 'origin — toward me',
    hin: 'Wo gehst du hin?',     hinNote: 'goal — away from me',
  },
  {
    her: 'Sie kommt herein.',    herNote: 'the speaker is inside',
    hin: 'Sie geht hinein.',     hinNote: 'the speaker is outside',
  },
]

export interface QuestionWordRow {
  word: string           // 'wohin'
  asksDe: string         // 'Ziel'
  asksEn: string         // 'where to — goal'
  example: string        // question + short answer
  split: string | null   // the split spoken variant, if one exists
}

export const QUESTION_WORDS: QuestionWordRow[] = [
  { word: 'wo',    asksDe: 'Ort',      asksEn: 'where — static place', example: 'Wo bist du? — Im Büro.',           split: null },
  { word: 'wohin', asksDe: 'Ziel',     asksEn: 'where to — goal',      example: 'Wohin gehst du? — Zum Bahnhof.',   split: 'Wo gehst du hin?' },
  { word: 'woher', asksDe: 'Herkunft', asksEn: 'where from — origin',  example: 'Woher kommst du? — Aus der Stadt.', split: 'Wo kommst du her?' },
]

export interface PointerWord {
  word: string
  gloss: string
  example: string
}

export const POINTER_WORDS: PointerWord[] = [
  { word: 'dahin',   gloss: 'to there — to the place just mentioned', example: 'Fährst du nach Rom? — Ja, ich fahre morgen dahin.' },
  { word: 'dorthin', gloss: 'to that place — pointing more firmly',   example: 'Stell die Kiste bitte dorthin.' },
  { word: 'hierher', gloss: 'to here — toward the speaker',           example: 'Komm bitte hierher.' },
  { word: 'daher',   gloss: 'from there — and, as a trap, „therefore“', example: 'Daher kommt der Lärm. / Daher weiß ich es (= deshalb).' },
]

export interface LexicalizedVerb {
  verb: string     // infinitive, incl. 'sich' where reflexive
  meaning: string  // English meaning — deliberately non-directional
  example: string  // one German sentence
}

/** Verbs whose hin-/her- prefix no longer means direction (CONTEXT.md: Lexicalized prefix verb). */
export const LEXICALIZED_VERBS: LexicalizedVerb[] = [
  { verb: 'herstellen',         meaning: 'to manufacture, produce',   example: 'Die Firma stellt Möbel her.' },
  { verb: 'hinrichten',         meaning: 'to execute (put to death)', example: 'Der Verräter wurde 1601 hingerichtet.' },
  { verb: 'hinweisen auf',      meaning: 'to point out',              example: 'Sie weist auf ein Problem hin.' },
  { verb: 'hinzufügen',         meaning: 'to add',                    example: 'Er fügte hinzu, dass er müde sei.' },
  { verb: 'herausfinden',       meaning: 'to find out',               example: 'Wir haben die Wahrheit herausgefunden.' },
  { verb: 'herausfordern',      meaning: 'to challenge',              example: 'Der Boxer fordert den Meister heraus.' },
  { verb: 'sich herausstellen', meaning: 'to turn out',               example: 'Es stellte sich heraus, dass alles gut war.' },
  { verb: 'hervorheben',        meaning: 'to emphasize, highlight',   example: 'Die Lehrerin hebt das Wichtigste hervor.' },
]

export interface Idiom {
  idiom: string
  meaning: string
  example: string
}

export const IDIOMS: Idiom[] = [
  { idiom: 'hin und her',      meaning: 'back and forth',                    example: 'Wir haben lange hin und her überlegt.' },
  { idiom: 'hin und wieder',   meaning: 'now and then',                      example: 'Hin und wieder gehe ich ins Kino.' },
  { idiom: 'hin und zurück',   meaning: 'there and back — a return ticket',  example: 'Einmal Berlin hin und zurück, bitte.' },
  { idiom: 'vor sich hin',     meaning: 'to oneself, absently',              example: 'Sie summte vor sich hin.' },
  { idiom: 'hinter … her',     meaning: 'in pursuit of',                     example: 'Der Hund ist hinter der Katze her.' },
  { idiom: 'lange her',        meaning: 'long ago (time since)',             example: 'Das ist schon lange her.' },
  { idiom: 'noch lange hin',   meaning: 'still a long way off (time until)', example: 'Bis Weihnachten ist es noch lange hin.' },
  { idiom: 'her mit …!',       meaning: 'hand it over!',                     example: 'Her mit dem Geld!' },
]

// ---------------------------------------------------------------------------
// Scene diagrams (CONTEXT.md: Scene diagram) — the schema Phase 2 item banks
// conform to. Each archetype has exactly two logical positions; the speaker
// stands at one of them, and motion runs toward or away from the speaker
// (her = toward-speaker, hin = away-from-speaker).
// ---------------------------------------------------------------------------

export type SceneArchetype = 'stairs' | 'hill' | 'doorway' | 'window' | 'room' | 'street'
export type ScenePosition = 'top' | 'bottom' | 'inside' | 'outside' | 'near' | 'far'
export type SceneMotion = 'toward-speaker' | 'away-from-speaker'

export interface SceneSpec {
  archetype: SceneArchetype
  speakerAt: ScenePosition   // must be one of the archetype's two positions
  motion: SceneMotion
  description: string        // one-line English scene text — the accessible fallback
}

export const SCENE_ARCHETYPES = ['stairs', 'hill', 'doorway', 'window', 'room', 'street'] as const satisfies readonly SceneArchetype[]

export const SCENE_POSITIONS: Record<SceneArchetype, [ScenePosition, ScenePosition]> = {
  stairs:  ['bottom', 'top'],
  hill:    ['bottom', 'top'],
  doorway: ['outside', 'inside'],
  window:  ['outside', 'inside'],
  room:    ['outside', 'inside'],
  street:  ['near', 'far'],
}

export function otherPosition(archetype: SceneArchetype, pos: ScenePosition): ScenePosition {
  const [a, b] = SCENE_POSITIONS[archetype]
  return pos === a ? b : a
}

export function validSceneSpec(spec: SceneSpec): boolean {
  return SCENE_POSITIONS[spec.archetype].includes(spec.speakerAt)
    && spec.description.trim().length > 0
}

// ---------------------------------------------------------------------------
// Drill item schema — defined now so Phase 2 seed data conforms to it.
// No items ship in Phase 1.
// ---------------------------------------------------------------------------

export type DirectionLevel = 'A2' | 'B1' | 'B2' | 'C1'

export interface PerspectiveItem {
  id: string
  level: DirectionLevel
  sentence: string     // German sentence with a ___ gap
  answers: string[]    // accepted forms; first entry is the canonical reveal
  pair: string | null  // AdverbPair element ('ein', 'auf', …) for pair-filtered drills; null for bare hin/her
  scene: SceneSpec
  translation: string  // English rendering shown on the reveal
}
