// src/data/directionIdioms.ts
//
// Authored dataset for the IDIOM gap-fill drill (T9). Each item is one sentence
// with a single ___ gap that stands for a WHOLE idiom surface ('hin und her',
// 'noch lange hin', 'hinter ihr her'), plus 3–4 tappable options and a
// German+English teaching line. Every item cross-links one entry of the Phase-1
// cheatsheet (IDIOMS in ./directionWords) through `idiomKey`, so the drill and
// the cheatsheet always teach the same eight idioms.
//
// ── The closed inventory rule (DW_IDIOM_SURFACES) ─────────────────────────────
// Every option AND every answer must be a member of DW_IDIOM_SURFACES, and every
// member is a REAL German surface. A tappable option that a learner has never
// seen gets memorised as German whether it is right or wrong, so an invented
// phrase in the option row would actively teach a non-word — the same reason
// misformed compounds never appear as options elsewhere in this app. Two members
// are distractor-only (they are real, but they are not cheatsheet idioms, so they
// can never be an answer):
//
//   'vor sich her'  — real: etwas vor sich her schieben/treiben/tragen (move
//                     something along ahead of you). The perfect near-miss for
//                     'vor sich hin', because it flips the deixis: hin = away
//                     from me / absently, her = toward the front of the mover.
//                     It is wrong with summen/murmeln/vegetieren, which take the
//                     fixed 'vor sich hin'.
//   'her damit'     — real: "Her damit!" = hand it over. Wrong wherever a noun
//                     phrase follows, because damit (da + mit) already contains
//                     the object: *"her damit dem Geld" is ungrammatical. It is
//                     the systematic near-miss for 'her mit …!'.
//
// ── The no-second-answer gate ────────────────────────────────────────────────
// A distractor that also fits the gap makes the drill mark a correct answer
// wrong. Every distractor here was read back into its own gap and must fail on
// meaning, on time direction, on register, or on grammar. Three consequences
// worth keeping when adding items:
//
//   1. 'hin und wieder' is a bare frequency adverbial and slots into almost any
//      activity clause. Where it is a distractor, the sentence must already
//      occupy (and contradict) the frequency slot — ununterbrochen, ständig,
//      stundenlang — or leave a verb that cannot host it at all ("es ging …",
//      "war der Hund schon …").
//   2. Conversely, never offer 'hin und wieder' against an absent-minded-activity
//      item: "Sie summte hin und wieder" is perfectly good German, so it would be
//      a second valid answer next to 'vor sich hin'.
//   3. Rejected as options for exactly that reason, although all four are real
//      German: 'ab und zu' and 'immer wieder' (true synonyms of 'hin und wieder'
//      in every frequency slot), 'nach wie vor' ("Nach wie vor gehe ich ins
//      Kino" also answers a frequency gap), and 'hinterher' ("Sie rannte
//      hinterher" also answers a pursuit gap).
//   4. Two distractors were dropped in self-review: 'hin und zurück' under the
//      pacing tiger (id-2), because pacing a cage can be described as going there
//      and back over and over, and 'hinter ihr her' beside the humming baker
//      (id-12), because the pronoun would have to reach for a second woman.
//
// The answer is authored FIRST in every option list. Display order is the drill
// engine's job — it must shuffle, or the answer is always the first button.
//
// ── The two near-miss pairs — the teaching payload ───────────────────────────
//   'hin und her'  (back and forth, the WAY something happens)
//     vs 'hin und wieder' (now and then, HOW OFTEN it happens)
//   'lange her'    (time SINCE — the arrow points back)
//     vs 'noch lange hin' (time UNTIL — the arrow points forward)
// The first pair is forced to face each other by an invariant whenever either is
// the answer; the second pair does the same by authoring choice, and the "bis zu
// X ist es ___" frame is what makes it bite: there 'lange her' is perfectly
// grammatical and only the direction of time is wrong.
//
// ── Two smaller authoring rules ──────────────────────────────────────────────
// • Orthography: with a finite verb, hin und her stands as separate words
//   ("Der Tiger lief hin und her"), but before an infinitive or participle the
//   accepted spelling contracts the coordination ("hin- und hergerissen",
//   "hin- und herfahren"), which no ___ gap can produce. So hin-und-her items
//   keep the phrase with a finite verb — the one exception is the established
//   free adverbial "lange hin und her überlegen" (id-1).
// • The gap never leaks: the answer surface must not appear anywhere in its own
//   sentence (a word-boundary invariant enforces it), so example sentences from
//   the cheatsheet were reworded rather than reused.
//
// Levels grade the DISCRIMINATION, not the vocabulary: plain frequency, motion
// and ticket idioms are B1; the patterned ones ('hinter … her', 'vor sich hin')
// and the "her mit + noun" demand are B2; the twin discriminations and the
// forward-looking 'noch lange hin' are C1.
// Invariants live in tests/data/directionIdioms.test.ts.

import type { DirectionLevel } from './directionWords'

/**
 * The closed option inventory. Every surface is real German; the two that are not
 * cheatsheet idioms ('vor sich her', 'her damit') are distractor-only by design
 * — see the file header.
 */
const IDIOM_SURFACES = [
  // ─── the eight cheatsheet idioms, in gap-fillable surface form ───
  'hin und her',      // back and forth
  'hin und wieder',   // now and then
  'hin und zurück',   // there and back — the return-ticket phrase
  'vor sich hin',     // to oneself, absently
  'hinter ihm her',   // 'hinter … her' filled: in pursuit of him
  'hinter ihr her',   // … of her
  'hinter mir her',   // … of me
  'lange her',        // long ago — time SINCE
  'noch lange hin',   // still a long way off — time UNTIL
  'her mit',          // 'her mit …!' — hand it over (a noun phrase follows)
  // ─── real German, distractor-only (never a cheatsheet answer) ───
  'vor sich her',     // etwas vor sich her schieben — move it along ahead of you
  'her damit',        // "Her damit!" — hand it over, with no noun following
] as const

/** A member of the closed inventory — used to keep authoring typo-proof. */
type DwIdiomSurface = (typeof IDIOM_SURFACES)[number]

/** The closed inventory every option and every answer must come from. */
export const DW_IDIOM_SURFACES: readonly string[] = IDIOM_SURFACES

export interface DwIdiomItem {
  /** Unique id, `id-<n>`. */
  id: string
  /** One German sentence with exactly one ___ gap standing for the whole idiom. */
  sentence: string
  /** The surface that fills the gap, e.g. 'hin und her'. Never appears in `sentence`. */
  answer: string
  /**
   * 3–4 unique real idiom surfaces from DW_IDIOM_SURFACES; exactly one === answer,
   * and it is authored first — the drill engine must shuffle before display.
   */
  options: string[]
  /** Joins IDIOMS[].idiom in ./directionWords — the cheatsheet cross-link. */
  idiomKey: string
  /** 'Deutsch … / English …' — the meaning AND why the tempting near-miss fails. */
  explanation: string
  level: DirectionLevel
}

/** Authoring view of an item: answer and options are closed over the inventory. */
interface AuthoredIdiomItem extends Omit<DwIdiomItem, 'answer' | 'options'> {
  answer: DwIdiomSurface
  options: DwIdiomSurface[]
}

const AUTHORED: AuthoredIdiomItem[] = [
  // ═══════════════════════════ hin und her ═══════════════════════════
  // back and forth — the WAY something happens. Every item keeps the phrase with
  // a finite verb (see the orthography note in the header) and blocks the
  // frequency reading of 'hin und wieder' with a contradicting adverbial or with
  // a verb that cannot host a frequency adverbial at all.
  { id: 'id-1', idiomKey: 'hin und her', answer: 'hin und her', level: 'B1',
    sentence: 'Wir haben lange ___ überlegt, ob wir das Auto verkaufen sollen.',
    options: ['hin und her', 'hin und wieder', 'hin und zurück'],
    explanation: '„hin und her“ = vor und zurück, also lange hin- und herdenken. / "hin und her" = back and forth; "hin und wieder" (now and then) would say how OFTEN you thought, not how you thought.' },
  { id: 'id-2', idiomKey: 'hin und her', answer: 'hin und her', level: 'B1',
    sentence: 'Der Tiger lief in seinem Käfig ununterbrochen ___.',
    options: ['hin und her', 'hin und wieder', 'vor sich her'],
    explanation: '„hin und her laufen“ = dieselbe Strecke immer wieder in beide Richtungen. / "hin und her" = to and fro. "hin und wieder" (occasionally) directly contradicts "ununterbrochen", and "vor sich her" would need an object the tiger pushes along ahead of it.' },
  { id: 'id-3', idiomKey: 'hin und her', answer: 'hin und her', level: 'B2',
    sentence: 'Der Blick des Schiedsrichters wanderte ständig zwischen den beiden Spielern ___.',
    options: ['hin und her', 'hin und wieder', 'vor sich hin'],
    explanation: '„zwischen A und B hin und her“ = der Blick pendelt zwischen zwei Punkten. / "hin und her" = between two points, repeatedly; "hin und wieder" (now and then) is already excluded by "ständig", and "vor sich hin" points at nothing outside the person.' },
  { id: 'id-4', idiomKey: 'hin und her', answer: 'hin und her', level: 'C1',
    sentence: 'In der Verhandlung ging es stundenlang ___, bis beide Seiten erschöpft waren.',
    options: ['hin und her', 'hin und wieder', 'hin und zurück'],
    explanation: '„es ging hin und her“ = ein langes Vor und Zurück von Argumenten. / "es ging hin und her" = there was endless back-and-forth. "hin und wieder" is a frequency adverb, so "es ging …" would be left without any complement; "hin und zurück" only describes a journey out and back.' },

  // ═══════════════════════════ hin und wieder ═══════════════════════════
  // now and then — HOW OFTEN. 'hin und her' is the forced near-miss and is wrong
  // in each slot because nothing moves in two directions.
  { id: 'id-5', idiomKey: 'hin und wieder', answer: 'hin und wieder', level: 'B1',
    sentence: '___ gehe ich noch in dieses kleine Kino am Hafen.',
    options: ['hin und wieder', 'hin und her', 'vor sich hin'],
    explanation: '„hin und wieder“ = manchmal, gelegentlich. / "hin und wieder" = now and then; "hin und her" would mean going back and forth, not occasionally, and "vor sich hin" would need "vor mich hin" to match "ich".' },
  { id: 'id-6', idiomKey: 'hin und wieder', answer: 'hin und wieder', level: 'B1',
    sentence: 'Ich koche fast immer selbst, aber ___ bestelle ich mir eine Pizza.',
    options: ['hin und wieder', 'hin und her', 'hin und zurück'],
    explanation: '„hin und wieder“ = ab und zu — der Gegensatz zu „fast immer“. / "hin und wieder" = now and then, the contrast to "fast immer"; "hin und her" and "hin und zurück" both describe movement in two directions, and ordering a pizza goes one way only.' },
  { id: 'id-7', idiomKey: 'hin und wieder', answer: 'hin und wieder', level: 'B2',
    sentence: 'Der alte Plattenspieler funktioniert noch, aber ___ bleibt die Nadel in der Rille hängen.',
    options: ['hin und wieder', 'hin und her', 'vor sich hin'],
    explanation: '„hin und wieder“ = gelegentlich, nicht bei jedem Lied. / "hin und wieder" = every now and then; "hin und her" needs motion in two directions, but "hängen bleiben" is a standstill, and "vor sich hin" has no absent-minded person to belong to.' },
  { id: 'id-8', idiomKey: 'hin und wieder', answer: 'hin und wieder', level: 'C1',
    sentence: 'Der Übersetzer schickte dem Verlag ___ eine Frage per Mail, aber meistens arbeitete er allein.',
    options: ['hin und wieder', 'hin und her', 'hin und zurück'],
    explanation: '„hin und wieder“ = gelegentlich eine einzelne Frage; der Gegensatz „meistens allein“ fragt nach der Häufigkeit. / "hin und wieder" = now and then. "hin und her schicken" is a real collocation, but it means the SAME text travels there and back; here one question goes one way, and the contrast clause asks how often.' },

  // ═══════════════════════════ hin und zurück ═══════════════════════════
  // there and back, once — the ticket and route phrase. 'hin und her' is the
  // tempting near-miss and is never used of a paid, one-off round trip.
  { id: 'id-9', idiomKey: 'hin und zurück', answer: 'hin und zurück', level: 'B1',
    sentence: 'Einmal Hamburg ___, bitte — und zwar mit dem Zug um 14:12 Uhr.',
    options: ['hin und zurück', 'hin und her', 'hin und wieder'],
    explanation: '„hin und zurück“ = Fahrkarte für Hin- und Rückweg. / "hin und zurück" = a return ticket; "hin und her" is restless to-and-fro and is never said at a ticket counter, and "hin und wieder" would be a frequency.' },
  { id: 'id-10', idiomKey: 'hin und zurück', answer: 'hin und zurück', level: 'B1',
    sentence: 'Der Flug ___ hat mich nur neunzig Euro gekostet.',
    options: ['hin und zurück', 'hin und her', 'hin und wieder'],
    explanation: '„hin und zurück“ = Hinflug plus Rückflug, ein Preis. / "hin und zurück" = there and back (round trip); neither "hin und her" nor "hin und wieder" can modify a noun like "der Flug" and carry a price.' },
  { id: 'id-11', idiomKey: 'hin und zurück', answer: 'hin und zurück', level: 'B2',
    sentence: 'Für die Strecke ___ brauchst du mit dem Rad etwa vier Stunden.',
    options: ['hin und zurück', 'hin und her', 'hin und wieder', 'vor sich hin'],
    explanation: '„die Strecke hin und zurück“ = einmal hin, einmal zurück — messbar. / "hin und zurück" = the route out and back, once, so a travel time can be given; "hin und her" would mean repeatedly and aimlessly, and the other two cannot describe a route at all.' },

  // ═══════════════════════════ vor sich hin ═══════════════════════════
  // to oneself, absently. 'vor sich her' is the deictic near-miss: her only works
  // when something is moved along ahead of the person. Note that 'hin und wieder'
  // is deliberately NOT offered here — it would be a second valid answer.
  { id: 'id-12', idiomKey: 'vor sich hin', answer: 'vor sich hin', level: 'B2',
    sentence: 'Während sie den Teig knetete, summte sie leise ___.',
    options: ['vor sich hin', 'vor sich her', 'hin und her'],
    explanation: '„vor sich hin summen“ = leise für sich, ohne Publikum. / "vor sich hin" = to oneself, absently; "vor sich her" is only used when you move something along ahead of you (den Wagen vor sich her schieben), and humming has no direction to go back and forth in.' },
  { id: 'id-13', idiomKey: 'vor sich hin', answer: 'vor sich hin', level: 'B2',
    sentence: 'Der alte Mann saß auf der Bank und murmelte etwas ___.',
    options: ['vor sich hin', 'vor sich her', 'hin und zurück'],
    explanation: '„vor sich hin murmeln“ = mit sich selbst reden. / "vor sich hin" = to oneself; "vor sich her" needs an object being pushed ahead, and a murmur is not carried anywhere.' },
  { id: 'id-14', idiomKey: 'vor sich hin', answer: 'vor sich hin', level: 'C1',
    sentence: 'Seit dem Umbau vegetiert der kleine Laden nur noch ___ und macht kaum Umsatz.',
    options: ['vor sich hin', 'vor sich her', 'hin und her', 'lange her'],
    explanation: '„vor sich hin vegetieren“ = ohne Antrieb weiterexistieren. / "vor sich hin" = plodding along with no direction — the idiom works for things, not just people; "vor sich her" would need something the shop pushes ahead of it, and "hin und her" would need movement in two directions.' },

  // ═══════════════════════════ hinter … her ═══════════════════════════
  // in pursuit of — the pronoun inside the surface names the PURSUED. The gendered
  // variants are never offered against each other: with an exophoric referent any
  // pronoun is arguable, so the distractors here are always a different idiom.
  { id: 'id-15', idiomKey: 'hinter … her', answer: 'hinter ihr her', level: 'B2',
    sentence: 'Kaum hatte die Katze das Zimmer verlassen, war der Hund schon ___.',
    options: ['hinter ihr her', 'hin und her', 'vor sich her'],
    explanation: '„hinter jemandem her sein“ = jemanden verfolgen; das Pronomen nennt den Verfolgten (die Katze → ihr). / "hinter … her" = in pursuit of; "war der Hund schon hin und her" is not a possible predicate, and "vor sich her" would need an object driven ahead of the dog.' },
  { id: 'id-16', idiomKey: 'hinter … her', answer: 'hinter ihm her', level: 'B2',
    sentence: 'Mein Bruder hat drei Mahnungen ignoriert, und jetzt ist das Amt ___.',
    options: ['hinter ihm her', 'hin und her', 'hin und wieder'],
    explanation: '„hinter jemandem her sein“ auch behördlich: hartnäckig verfolgen. / "hinter … her" = to be after someone; "sein" needs a predicate here, and neither "hin und her" nor "hin und wieder" can be one — the second is only a frequency adverb.' },
  { id: 'id-17', idiomKey: 'hinter … her', answer: 'hinter mir her', level: 'B2',
    sentence: 'In der dunklen Gasse hatte ich das Gefühl, dass jemand ___ war.',
    options: ['hinter mir her', 'hin und her', 'vor sich hin'],
    explanation: '„hinter mir her“ = jemand folgt mir; her = auf mich zu. / "hinter mir her" = following ME — her points toward the speaker, so the speaker is the pursued. "hin und her" and "vor sich hin" leave "dass jemand … war" without a predicate.' },
  { id: 'id-18', idiomKey: 'hinter … her', answer: 'hinter ihr her', level: 'C1',
    sentence: 'Den ganzen Sommer war der Junge ___ und trug ihr sogar die Einkäufe nach Hause.',
    options: ['hinter ihr her', 'hin und wieder', 'hin und her', 'vor sich her'],
    explanation: '„hinter jemandem her sein“ heißt auch „umwerben, nachlaufen“. / "hinter … her" = chasing after someone, here romantically; "hin und wieder" is a frequency adverb and cannot follow "war", and "vor sich her" would need something pushed along in front of him.' },

  // ═══════════════════════════ lange her ═══════════════════════════
  // time SINCE — the arrow points back. Its twin 'noch lange hin' is always an
  // option; in id-20 and id-22 it is even grammatical, and only the direction of
  // time rules it out.
  { id: 'id-19', idiomKey: 'lange her', answer: 'lange her', level: 'C1',
    sentence: 'Unser letztes Treffen ist schon ziemlich ___.',
    options: ['lange her', 'noch lange hin', 'hin und her'],
    explanation: '„lange her“ blickt zurück (Zeit seit damals). / "lange her" looks BACK; "noch lange hin" looks FORWARD to something still ahead.' },
  { id: 'id-20', idiomKey: 'lange her', answer: 'lange her', level: 'B1',
    sentence: 'Auf dem Foto ist sie noch Studentin — Gott, ist das ___!',
    options: ['lange her', 'noch lange hin', 'hin und zurück'],
    explanation: '„lange her“ = seitdem ist viel Zeit vergangen. / "lange her" measures time SINCE; "noch lange hin" measures time UNTIL, which cannot apply to a photograph of the past.' },
  { id: 'id-21', idiomKey: 'lange her', answer: 'lange her', level: 'B2',
    sentence: 'Wann warst du zuletzt in Prag? — Puh, das ist schon ___, mindestens zehn Jahre.',
    options: ['lange her', 'noch lange hin', 'hin und wieder'],
    explanation: '„lange her“ antwortet auf „wann zuletzt?“ — Rückblick. / "lange her" answers a question about the last time; "noch lange hin" would put the trip to Prague in the future, and "hin und wieder" would answer "how often", not "when last".' },
  { id: 'id-22', idiomKey: 'lange her', answer: 'lange her', level: 'B2',
    sentence: 'Die Firma wurde 1890 gegründet — die Anfänge sind also ___.',
    options: ['lange her', 'noch lange hin', 'vor sich hin'],
    explanation: '„lange her“ = weit in der Vergangenheit. / "lange her" = long ago; "noch lange hin" is perfectly grammatical in this slot but points FORWARD, which is impossible for a company founded in 1890.' },

  // ═══════════════════════════ noch lange hin ═══════════════════════════
  // time UNTIL — the arrow points forward. The "bis zu X ist es ___" frame makes
  // 'lange her' grammatical and only temporally wrong: the sharpest form of the
  // twin discrimination.
  { id: 'id-23', idiomKey: 'noch lange hin', answer: 'noch lange hin', level: 'B1',
    sentence: 'Bis zu den Sommerferien ist es ___, wir haben noch drei Monate Schule.',
    options: ['noch lange hin', 'lange her', 'hin und wieder'],
    explanation: '„noch lange hin“ = bis dahin dauert es noch (Blick nach vorn). / "noch lange hin" measures time UNTIL; "lange her" would look back, but "bis zu den Sommerferien" points forward.' },
  { id: 'id-24', idiomKey: 'noch lange hin', answer: 'noch lange hin', level: 'B2',
    sentence: 'Der Zug fährt erst um acht, bis dahin ist es also ___.',
    options: ['noch lange hin', 'lange her', 'hin und zurück'],
    explanation: '„noch lange hin“ = es dauert noch eine Weile. / "noch lange hin" = still a long way off; "lange her" reverses the arrow of time — the train has not left yet — and "hin und zurück" belongs to tickets, not to waiting.' },
  { id: 'id-25', idiomKey: 'noch lange hin', answer: 'noch lange hin', level: 'C1',
    sentence: 'Keine Sorge, bis zur Abgabe der Arbeit ist es ___; du hast fast ein Jahr Zeit.',
    options: ['noch lange hin', 'lange her', 'vor sich hin'],
    explanation: '„noch lange hin“ = die Frist liegt weit in der Zukunft. / "noch lange hin" = still far off (time until); "lange her" would mean the deadline had already passed, which contradicts "fast ein Jahr Zeit".' },

  // ═══════════════════════════ her mit …! ═══════════════════════════
  // hand it over — her = toward the speaker. 'her damit' is the systematic
  // near-miss: it is real German, but damit already contains the object, so it
  // cannot stand before a noun phrase.
  { id: 'id-26', idiomKey: 'her mit …!', answer: 'her mit', level: 'B1',
    sentence: 'Der Räuber wollte nur eines: ___ dem Geld!',
    options: ['her mit', 'her damit', 'hin und her'],
    explanation: '„her mit …!“ = gib es sofort heraus (her = zu mir). / "her mit …!" = hand it over — her points toward the speaker. "her damit" is real German but already contains the object (da + mit), so no noun can follow it.' },
  { id: 'id-27', idiomKey: 'her mit …!', answer: 'her mit', level: 'B2',
    sentence: 'Nicht lange diskutieren — ___ dem Schlüssel, sonst rufe ich den Chef!',
    options: ['her mit', 'her damit', 'hin und zurück'],
    explanation: '„her mit …!“ ist ein knapper Befehl mit Dativ: her mit dem Schlüssel. / "her mit …!" takes the dative of the thing demanded; "her damit" would have to stand alone ("Her damit!"), and "hin und zurück" is a travel phrase.' },
  { id: 'id-28', idiomKey: 'her mit …!', answer: 'her mit', level: 'B2',
    sentence: 'Wir wissen, dass du das Foto gemacht hast, also ___ der Kamera!',
    options: ['her mit', 'her damit', 'vor sich hin'],
    explanation: '„her mit …!“ fordert die Sache zum Sprecher hin. / "her mit …!" demands the thing be brought TO the speaker; "her damit" cannot govern the following noun, and "vor sich hin" describes absent-minded activity, not a demand.' },
]

export const DIRECTION_IDIOMS: DwIdiomItem[] = AUTHORED
