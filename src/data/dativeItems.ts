// Item banks for the Dativ module's T1–T3. T1 is DERIVED from the side-table
// (membership is the whole bank — that is what makes the ledger's verb half
// reachable); T2/T3 are authored. Gate tests: tests/data/dativeItems.test.ts.

import { DATIVE_VERB_KEYS } from './dativeVerbs'
import { VERBS, verbLevelToCefr } from './verbs'

export const DATIVE_ITEM_LEVELS = ['A2', 'B1', 'B2'] as const
export type DativeItemLevel = (typeof DATIVE_ITEM_LEVELS)[number]

const LEVEL_OF = new Map(VERBS.map(v => [v.german, verbLevelToCefr(v.level)]))

/** Pool level collapsed to the drill's three buckets (A1 drills as A2). */
function drillLevel(german: string): DativeItemLevel {
  const cefr = LEVEL_OF.get(german) ?? 'B1'
  if (cefr === 'A1' || cefr === 'A2') return 'A2'
  if (cefr === 'B1') return 'B1'
  return 'B2'
}

// ─── T1 · Dativ oder Akkusativ? ─────────────────────────────────────────

export interface CaseChoiceItem {
  id: string
  verb: string                       // VERBS.german
  answer: 'dative' | 'accusative'
  level: DativeItemLevel
}

// Real accusative verbs a learner plausibly suspects of dativehood —
// every one verified case: "accusative" in verbs.ts (test-enforced).
const ACCUSATIVE_DISTRACTORS = [
  'sehen', 'hören', 'treffen', 'fragen', 'brauchen', 'suchen', 'lieben',
  'kaufen', 'kennen', 'anrufen', 'besuchen', 'unterstützen', 'beantworten',
  'verfolgen', 'vermeiden', 'bestellen', 'verletzen', 'stören', 'bitten',
  'einladen',
] as const

export const T1_CASE_ITEMS: readonly CaseChoiceItem[] = [
  ...DATIVE_VERB_KEYS.map(v => ({
    id: `t1-${v.replace(/\s+/g, '-')}`,
    verb: v,
    answer: 'dative' as const,
    level: drillLevel(v),
  })),
  ...ACCUSATIVE_DISTRACTORS.map(v => ({
    id: `t1-${v}`,
    verb: v,
    answer: 'accusative' as const,
    level: drillLevel(v),
  })),
]

// ─── T2 · Verb → Dativobjekt ────────────────────────────────────────────

export interface FormItem {
  id: string
  verb: string                       // DATIVE_VERBS key
  sentence: string                   // exactly one ___
  cue: string                        // base form to decline
  answers: readonly string[]         // first is canonical
  translation: string
  level: DativeItemLevel
}

export const T2_FORM_ITEMS: readonly FormItem[] = [
  { id: 't2-helfen-1', verb: 'helfen', sentence: 'Ich helfe ___ beim Umzug.', cue: 'mein Bruder', answers: ['meinem Bruder'], translation: 'I am helping my brother with the move.', level: 'A2' },
  { id: 't2-danken-1', verb: 'danken', sentence: 'Wir danken ___ für die Einladung.', cue: 'sie (= she)', answers: ['ihr'], translation: 'We thank her for the invitation.', level: 'A2' },
  { id: 't2-gehoeren-1', verb: 'gehören', sentence: 'Das Fahrrad gehört ___.', cue: 'ich', answers: ['mir'], translation: 'The bicycle belongs to me.', level: 'A2' },
  { id: 't2-schmecken-1', verb: 'schmecken', sentence: 'Die Suppe schmeckt ___ nicht.', cue: 'das Kind', answers: ['dem Kind'], translation: 'The child does not like the soup.', level: 'A2' },
  { id: 't2-gefallen-1', verb: 'gefallen', sentence: 'Der Film hat ___ gut gefallen.', cue: 'wir', answers: ['uns'], translation: 'We liked the film a lot.', level: 'A2' },
  { id: 't2-antworten-1', verb: 'antworten', sentence: 'Der Schüler antwortet ___.', cue: 'die Lehrerin', answers: ['der Lehrerin'], translation: 'The pupil answers the teacher.', level: 'A2' },
  { id: 't2-folgen-1', verb: 'folgen', sentence: 'Der Hund folgt ___ durch den Park.', cue: 'sein Herr', answers: ['seinem Herrn'], translation: 'The dog follows its master through the park.', level: 'B1' },
  { id: 't2-vertrauen-1', verb: 'vertrauen', sentence: 'Ich vertraue ___ voll und ganz.', cue: 'du', answers: ['dir'], translation: 'I trust you completely.', level: 'A2' },
  { id: 't2-zuhoeren-1', verb: 'zuhören', sentence: 'Bitte hör ___ genau zu!', cue: 'ich', answers: ['mir'], translation: 'Please listen to me carefully!', level: 'A2' },
  { id: 't2-gratulieren-1', verb: 'gratulieren', sentence: 'Wir gratulieren ___ zum Geburtstag.', cue: 'unsere Oma', answers: ['unserer Oma'], translation: 'We congratulate our grandma on her birthday.', level: 'A2' },
  { id: 't2-raten-1', verb: 'raten', sentence: 'Der Arzt rät ___ zu mehr Bewegung.', cue: 'der Patient', answers: ['dem Patienten'], translation: 'The doctor advises the patient to exercise more.', level: 'B1' },
  { id: 't2-passen-1', verb: 'passen', sentence: 'Die Schuhe passen ___ perfekt.', cue: 'meine Schwester', answers: ['meiner Schwester'], translation: 'The shoes fit my sister perfectly.', level: 'A2' },
  { id: 't2-fehlen-1', verb: 'fehlen', sentence: 'Du fehlst ___ sehr.', cue: 'ich', answers: ['mir'], translation: 'I miss you a lot.', level: 'A2' },
  { id: 't2-drohen-1', verb: 'drohen', sentence: 'Der Chef droht ___ mit Kündigung.', cue: 'die Mitarbeiter (Plural)', answers: ['den Mitarbeitern'], translation: 'The boss threatens the employees with dismissal.', level: 'B1' },
  { id: 't2-begegnen-1', verb: 'begegnen', sentence: 'Gestern bin ich ___ im Supermarkt begegnet.', cue: 'ein alter Freund', answers: ['einem alten Freund'], translation: 'Yesterday I ran into an old friend at the supermarket.', level: 'B1' },
  { id: 't2-verzeihen-1', verb: 'verzeihen', sentence: 'Sie verzeiht ___ den Fehler.', cue: 'er', answers: ['ihm'], translation: 'She forgives him the mistake.', level: 'A2' },
  { id: 't2-widersprechen-1', verb: 'widersprechen', sentence: 'Warum widersprichst du ___ immer?', cue: 'deine Eltern (Plural)', answers: ['deinen Eltern'], translation: 'Why do you always contradict your parents?', level: 'B1' },
  { id: 't2-aehneln-1', verb: 'ähneln', sentence: 'Das Baby ähnelt ___.', cue: 'sein Vater', answers: ['seinem Vater'], translation: 'The baby resembles its father.', level: 'B1' },
  { id: 't2-gelingen-1', verb: 'gelingen', sentence: 'Der Kuchen ist ___ gut gelungen.', cue: 'die Bäckerin', answers: ['der Bäckerin'], translation: 'The baker (f.) succeeded well with the cake.', level: 'B1' },
  { id: 't2-einfallen-1', verb: 'einfallen', sentence: 'Der Name fällt ___ nicht ein.', cue: 'ich', answers: ['mir'], translation: 'The name does not come to my mind.', level: 'A2' },
  { id: 't2-schaden-1', verb: 'schaden', sentence: 'Zu viel Zucker schadet ___.', cue: 'die Zähne (Plural)', answers: ['den Zähnen'], translation: 'Too much sugar harms the teeth.', level: 'B1' },
  { id: 't2-zustimmen-1', verb: 'zustimmen', sentence: 'Ich stimme ___ zu.', cue: 'dein Vorschlag', answers: ['deinem Vorschlag'], translation: 'I agree with your proposal.', level: 'B1' },
  { id: 't2-dienen-1', verb: 'dienen', sentence: 'Diese Regel dient ___.', cue: 'die Sicherheit', answers: ['der Sicherheit'], translation: 'This rule serves safety.', level: 'B1' },
  { id: 't2-entsprechen-1', verb: 'entsprechen', sentence: 'Der Bericht entspricht ___.', cue: 'die Tatsachen (Plural)', answers: ['den Tatsachen'], translation: 'The report corresponds to the facts.', level: 'B2' },
  { id: 't2-wehtun-1', verb: 'wehtun', sentence: 'Der Rücken tut ___ weh.', cue: 'der Großvater', answers: ['dem Großvater'], translation: 'The grandfather\'s back hurts.', level: 'A2' },
  { id: 't2-befehlen-1', verb: 'befehlen', sentence: 'Der General befiehlt ___.', cue: 'die Soldaten (Plural)', answers: ['den Soldaten'], translation: 'The general gives the soldiers orders.', level: 'B2' },
  { id: 't2-gehorchen-1', verb: 'gehorchen', sentence: 'Das Kind gehorcht ___ nicht.', cue: 'seine Eltern (Plural)', answers: ['seinen Eltern'], translation: 'The child does not obey its parents.', level: 'B1' },
  { id: 't2-misstrauen-1', verb: 'misstrauen', sentence: 'Sie misstraut ___.', cue: 'der Verkäufer', answers: ['dem Verkäufer'], translation: 'She distrusts the salesman.', level: 'B2' },
  { id: 't2-beitreten-1', verb: 'beitreten', sentence: 'Mein Vater ist ___ beigetreten.', cue: 'der Verein', answers: ['dem Verein'], translation: 'My father joined the club.', level: 'B2' },
  { id: 't2-ausweichen-1', verb: 'ausweichen', sentence: 'Das Auto wich ___ aus.', cue: 'der Radfahrer', answers: ['dem Radfahrer'], translation: 'The car dodged the cyclist.', level: 'B2' },
  { id: 't2-naehern-1', verb: 'sich nähern', sentence: 'Der Zug nähert sich ___.', cue: 'der Bahnhof', answers: ['dem Bahnhof'], translation: 'The train is approaching the station.', level: 'B2' },
  { id: 't2-imponieren-1', verb: 'imponieren', sentence: 'Dein Mut imponiert ___.', cue: 'wir', answers: ['uns'], translation: 'Your courage impresses us.', level: 'B2' },
  { id: 't2-nuetzen-1', verb: 'nützen', sentence: 'Das Wörterbuch nützt ___ sehr.', cue: 'die Studenten (Plural)', answers: ['den Studenten'], translation: 'The dictionary is very useful to the students.', level: 'B1' },
  { id: 't2-genuegen-1', verb: 'genügen', sentence: 'Eine kurze E-Mail genügt ___.', cue: 'ich', answers: ['mir'], translation: 'A short e-mail is enough for me.', level: 'B1' },
]

// ─── T3 · Fallen-Karten (English pull) ──────────────────────────────────

export interface TrapItem {
  id: string
  verb: string                       // DATIVE_VERBS key with englishPull
  english: string                    // the pulling English sentence
  sentence: string                   // exactly one ___
  cue: string
  answers: readonly string[]
  level: DativeItemLevel
}

export const T3_TRAP_ITEMS: readonly TrapItem[] = [
  { id: 't3-helfen-1', verb: 'helfen', english: 'I help my little brother with his homework.', sentence: 'Ich helfe ___ bei den Hausaufgaben.', cue: 'mein kleiner Bruder', answers: ['meinem kleinen Bruder'], level: 'B1' },
  { id: 't3-danken-1', verb: 'danken', english: 'She thanks the bus driver.', sentence: 'Sie dankt ___.', cue: 'der Busfahrer', answers: ['dem Busfahrer'], level: 'B1' },
  { id: 't3-folgen-1', verb: 'folgen', english: 'The detective follows the suspect.', sentence: 'Der Detektiv folgt ___.', cue: 'der Verdächtige', answers: ['dem Verdächtigen'], level: 'B1' },
  { id: 't3-antworten-1', verb: 'antworten', english: 'Why don\'t you answer your mother?', sentence: 'Warum antwortest du ___ nicht?', cue: 'deine Mutter', answers: ['deiner Mutter'], level: 'B1' },
  { id: 't3-vertrauen-1', verb: 'vertrauen', english: 'I trust my doctor.', sentence: 'Ich vertraue ___.', cue: 'meine Ärztin', answers: ['meiner Ärztin'], level: 'B1' },
  { id: 't3-gratulieren-1', verb: 'gratulieren', english: 'We congratulate the winner.', sentence: 'Wir gratulieren ___.', cue: 'die Gewinnerin', answers: ['der Gewinnerin'], level: 'B1' },
  { id: 't3-zuhoeren-1', verb: 'zuhören', english: 'The students listen to the professor.', sentence: 'Die Studenten hören ___ zu.', cue: 'der Professor', answers: ['dem Professor'], level: 'B1' },
  { id: 't3-widersprechen-1', verb: 'widersprechen', english: 'He contradicts his boss in every meeting.', sentence: 'Er widerspricht ___ in jeder Besprechung.', cue: 'sein Chef', answers: ['seinem Chef'], level: 'B1' },
  { id: 't3-aehneln-1', verb: 'ähneln', english: 'The daughter resembles her grandmother.', sentence: 'Die Tochter ähnelt ___.', cue: 'ihre Großmutter', answers: ['ihrer Großmutter'], level: 'B1' },
  { id: 't3-begegnen-1', verb: 'begegnen', english: 'I met an old colleague at the station.', sentence: 'Ich bin ___ am Bahnhof begegnet.', cue: 'ein alter Kollege', answers: ['einem alten Kollegen'], level: 'B1' },
  { id: 't3-gehorchen-1', verb: 'gehorchen', english: 'The dog obeys its owner.', sentence: 'Der Hund gehorcht ___.', cue: 'sein Besitzer', answers: ['seinem Besitzer'], level: 'B1' },
  { id: 't3-raten-1', verb: 'raten', english: 'The lawyer advises her client to stay silent.', sentence: 'Die Anwältin rät ___ zu schweigen.', cue: 'ihr Mandant', answers: ['ihrem Mandanten'], level: 'B1' },
  { id: 't3-dienen-1', verb: 'dienen', english: 'He served the king for twenty years.', sentence: 'Er diente ___ zwanzig Jahre lang.', cue: 'der König', answers: ['dem König'], level: 'B1' },
  { id: 't3-misstrauen-1', verb: 'misstrauen', english: 'She distrusts the salesman.', sentence: 'Sie misstraut ___.', cue: 'der Verkäufer', answers: ['dem Verkäufer'], level: 'B2' },
  { id: 't3-beitreten-1', verb: 'beitreten', english: 'My sister joined the chess club.', sentence: 'Meine Schwester ist ___ beigetreten.', cue: 'der Schachverein', answers: ['dem Schachverein'], level: 'B2' },
  { id: 't3-ausweichen-1', verb: 'ausweichen', english: 'The cyclist dodged the pedestrian.', sentence: 'Der Radfahrer wich ___ aus.', cue: 'der Fußgänger', answers: ['dem Fußgänger'], level: 'B2' },
  { id: 't3-naehern-1', verb: 'sich nähern', english: 'The ship is approaching the harbor.', sentence: 'Das Schiff nähert sich ___.', cue: 'der Hafen', answers: ['dem Hafen'], level: 'B2' },
  { id: 't3-zusehen-1', verb: 'zusehen', english: 'The children watch the cook.', sentence: 'Die Kinder sehen ___ zu.', cue: 'der Koch', answers: ['dem Koch'], level: 'B1' },
  { id: 't3-zuschauen-1', verb: 'zuschauen', english: 'We watch the dancers.', sentence: 'Wir schauen ___ zu.', cue: 'die Tänzer (Plural)', answers: ['den Tänzern'], level: 'B1' },
  { id: 't3-verzeihen-1', verb: 'verzeihen', english: 'She forgave her friend.', sentence: 'Sie hat ___ verziehen.', cue: 'ihre Freundin', answers: ['ihrer Freundin'], level: 'B1' },
  { id: 't3-imponieren-1', verb: 'imponieren', english: 'Your courage impresses the jury.', sentence: 'Dein Mut imponiert ___.', cue: 'die Jury', answers: ['der Jury'], level: 'B2' },
  { id: 't3-befehlen-1', verb: 'befehlen', english: 'The captain commands the crew.', sentence: 'Der Kapitän befiehlt ___.', cue: 'die Mannschaft', answers: ['der Mannschaft'], level: 'B2' },
]
