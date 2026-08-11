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
  'vermissen', 'verlieren', 'vergessen', 'beschreiben', 'beobachten',
  'hassen', 'übersetzen', 'wiederholen', 'korrigieren', 'gewinnen', 'üben',
  'mieten', 'planen', 'reparieren', 'schneiden', 'malen',
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
  { id: 't2-misslingen-1', verb: 'misslingen', sentence: 'Der Plan ist ___ leider misslungen.', cue: 'der Chef', answers: ['dem Chef'], translation: 'The plan unfortunately turned out badly for the boss.', level: 'B1' },
  { id: 't2-auffallen-1', verb: 'auffallen', sentence: 'Der Tippfehler ist ___ nicht aufgefallen.', cue: 'die Redakteurin', answers: ['der Redakteurin'], translation: 'The typo did not catch the editor\'s (f.) eye.', level: 'B1' },
  { id: 't2-passieren-1', verb: 'passieren', sentence: 'So etwas ist ___ noch nie passiert.', cue: 'meine Großmutter', answers: ['meiner Großmutter'], translation: 'Something like that had never happened to my grandmother before.', level: 'A2' },
  { id: 't2-leidtun-1', verb: 'leidtun', sentence: 'Der alte Mann tut ___ leid.', cue: 'die Nachbarin', answers: ['der Nachbarin'], translation: 'The neighbor (f.) feels sorry for the old man.', level: 'B1' },
  { id: 't2-guttun-1', verb: 'guttun', sentence: 'Der Urlaub hat ___ richtig gutgetan.', cue: 'meine Eltern (Plural)', answers: ['meinen Eltern'], translation: 'The vacation really did my parents good.', level: 'B1' },
  { id: 't2-entgehen-1', verb: 'entgehen', sentence: 'Der Rabatt ist ___ leider entgangen.', cue: 'der Kunde', answers: ['dem Kunden'], translation: 'The customer unfortunately missed out on the discount.', level: 'B2' },
  { id: 't2-zusehen-1', verb: 'zusehen', sentence: 'Die Zuschauer sehen ___ konzentriert zu.', cue: 'die Trainerin', answers: ['der Trainerin'], translation: 'The spectators watch the coach (f.) closely.', level: 'B1' },
  { id: 't2-zuschauen-1', verb: 'zuschauen', sentence: 'Die Touristen schauen ___ beim Bau zu.', cue: 'die Handwerker (Plural)', answers: ['den Handwerkern'], translation: 'The tourists watch the workers during construction.', level: 'B1' },
  { id: 't2-beistehen-1', verb: 'beistehen', sentence: 'Die Freunde stehen ___ in der schwierigen Zeit bei.', cue: 'die Familie', answers: ['der Familie'], translation: 'The friends stand by the family in the difficult time.', level: 'B2' },
  { id: 't2-unterliegen-1', verb: 'unterliegen', sentence: 'Der Meister unterliegt ___ im Finale.', cue: 'die Herausforderin', answers: ['der Herausforderin'], translation: 'The champion loses to the challenger (f.) in the final.', level: 'B2' },
  { id: 't2-helfen-2', verb: 'helfen', sentence: 'Die Freiwilligen helfen ___ nach der Flut.', cue: 'die Betroffenen (Plural)', answers: ['den Betroffenen'], translation: 'The volunteers help those affected after the flood.', level: 'A2' },
  { id: 't2-danken-2', verb: 'danken', sentence: 'Die Firma dankt ___ für die langjährige Treue.', cue: 'ihre Kunden (Plural)', answers: ['ihren Kunden'], translation: 'The company thanks its customers for their years of loyalty.', level: 'A2' },
  { id: 't2-gefallen-2', verb: 'gefallen', sentence: 'Das neue Kleid gefällt ___ überhaupt nicht.', cue: 'meine Tante', answers: ['meiner Tante'], translation: 'My aunt does not like the new dress at all.', level: 'A2' },
  { id: 't2-schmecken-2', verb: 'schmecken', sentence: 'Der Kuchen schmeckt ___ ausgezeichnet.', cue: 'die Gäste (Plural)', answers: ['den Gästen'], translation: 'The guests find the cake excellent.', level: 'A2' },
  { id: 't2-antworten-2', verb: 'antworten', sentence: 'Der Zeuge antwortet ___ ausführlich.', cue: 'der Richter', answers: ['dem Richter'], translation: 'The witness answers the judge in detail.', level: 'B1' },
  { id: 't2-folgen-2', verb: 'folgen', sentence: 'Die Wanderer folgen ___ auf dem schmalen Pfad.', cue: 'die Reiseleiterin', answers: ['der Reiseleiterin'], translation: 'The hikers follow the tour guide (f.) on the narrow path.', level: 'B1' },
  { id: 't2-vertrauen-2', verb: 'vertrauen', sentence: 'Die Kinder vertrauen ___ blind.', cue: 'ihre Erzieherin', answers: ['ihrer Erzieherin'], translation: 'The children trust their caregiver (f.) blindly.', level: 'A2' },
  { id: 't2-gratulieren-2', verb: 'gratulieren', sentence: 'Der Trainer gratuliert ___ zum Sieg.', cue: 'die Mannschaft', answers: ['der Mannschaft'], translation: 'The coach congratulates the team on the victory.', level: 'A2' },
  { id: 't2-raten-2', verb: 'raten', sentence: 'Der Reiseführer rät ___ zu wärmerer Kleidung.', cue: 'die Touristen (Plural)', answers: ['den Touristen'], translation: 'The tour guide advises the tourists to wear warmer clothing.', level: 'B1' },
  { id: 't2-begegnen-2', verb: 'begegnen', sentence: 'Wir sind ___ zufällig auf der Straße begegnet.', cue: 'unsere frühere Lehrerin', answers: ['unserer früheren Lehrerin'], translation: 'We ran into our former teacher (f.) by chance on the street.', level: 'B1' },
  { id: 't2-widersprechen-2', verb: 'widersprechen', sentence: 'Die Anwältin widerspricht ___ energisch.', cue: 'der Zeuge', answers: ['dem Zeugen'], translation: 'The lawyer (f.) energetically contradicts the witness.', level: 'B1' },
  { id: 't2-aehneln-2', verb: 'ähneln', sentence: 'Der Sohn ähnelt ___ sehr.', cue: 'sein Onkel', answers: ['seinem Onkel'], translation: 'The son resembles his uncle a lot.', level: 'B1' },
  { id: 't2-dienen-2', verb: 'dienen', sentence: 'Der neue Bericht dient ___ als Grundlage.', cue: 'die Kommission', answers: ['der Kommission'], translation: 'The new report serves the commission as a basis.', level: 'B1' },
  { id: 't2-befehlen-2', verb: 'befehlen', sentence: 'Die Königin befiehlt ___ sofort zu kommen.', cue: 'ihr Diener', answers: ['ihrem Diener'], translation: 'The queen commands her servant to come immediately.', level: 'B2' },
  { id: 't2-gehorchen-2', verb: 'gehorchen', sentence: 'Der Schüler gehorcht ___ meistens.', cue: 'der Direktor', answers: ['dem Direktor'], translation: 'The student usually obeys the principal.', level: 'B1' },
  { id: 't2-ausweichen-2', verb: 'ausweichen', sentence: 'Die Skifahrerin wich ___ gekonnt aus.', cue: 'der Baum', answers: ['dem Baum'], translation: 'The skier skillfully dodged the tree.', level: 'B2' },
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
  { id: 't3-drohen-1', verb: 'drohen', english: 'The landlord threatens the tenant with eviction.', sentence: 'Der Vermieter droht ___ mit der Kündigung.', cue: 'der Mieter', answers: ['dem Mieter'], level: 'B1' },
  { id: 't3-danken-2', verb: 'danken', english: 'The mayor thanks the volunteers.', sentence: 'Der Bürgermeister dankt ___ für ihren Einsatz.', cue: 'die Freiwilligen (Plural)', answers: ['den Freiwilligen'], level: 'B1' },
  { id: 't3-antworten-2', verb: 'antworten', english: 'He never answers his sister.', sentence: 'Er antwortet ___ nie.', cue: 'seine Schwester', answers: ['seiner Schwester'], level: 'B1' },
  { id: 't3-raten-2', verb: 'raten', english: 'The teacher advises the students to practice more.', sentence: 'Die Lehrerin rät ___ mehr zu üben.', cue: 'die Schüler (Plural)', answers: ['den Schülern'], level: 'B1' },
  { id: 't3-gratulieren-2', verb: 'gratulieren', english: 'They congratulate the graduate.', sentence: 'Sie gratulieren ___ zum Abschluss.', cue: 'der Absolvent', answers: ['dem Absolventen'], level: 'B1' },
  { id: 't3-verzeihen-2', verb: 'verzeihen', english: 'He never forgave his brother.', sentence: 'Er hat ___ nie verziehen.', cue: 'sein Bruder', answers: ['seinem Bruder'], level: 'B1' },
  { id: 't3-befehlen-2', verb: 'befehlen', english: 'The officer commands the recruits to stand still.', sentence: 'Der Offizier befiehlt ___ stillzustehen.', cue: 'die Rekruten (Plural)', answers: ['den Rekruten'], level: 'B2' },
  { id: 't3-vertrauen-2', verb: 'vertrauen', english: 'The patients trust the new doctor.', sentence: 'Die Patienten vertrauen ___.', cue: 'der neue Arzt', answers: ['dem neuen Arzt'], level: 'B1' },
  { id: 't3-misstrauen-2', verb: 'misstrauen', english: 'The villagers distrust the stranger.', sentence: 'Die Dorfbewohner misstrauen ___.', cue: 'der Fremde', answers: ['dem Fremden'], level: 'B2' },
  { id: 't3-imponieren-2', verb: 'imponieren', english: 'Her determination impresses the whole team.', sentence: 'Ihre Entschlossenheit imponiert ___.', cue: 'das ganze Team', answers: ['dem ganzen Team'], level: 'B2' },
  { id: 't3-helfen-2', verb: 'helfen', english: 'The teacher helps the new students settle in.', sentence: 'Die Lehrerin hilft ___ beim Ankommen.', cue: 'die neuen Schüler (Plural)', answers: ['den neuen Schülern'], level: 'B1' },
  { id: 't3-folgen-2', verb: 'folgen', english: 'The reporters follow the minister everywhere.', sentence: 'Die Reporter folgen ___ überallhin.', cue: 'der Minister', answers: ['dem Minister'], level: 'B1' },
  { id: 't3-widersprechen-2', verb: 'widersprechen', english: 'The students contradict their professor openly.', sentence: 'Die Studenten widersprechen ___ offen.', cue: 'ihr Professor', answers: ['ihrem Professor'], level: 'B1' },
  { id: 't3-zuhoeren-2', verb: 'zuhören', english: 'The audience listens to the speaker attentively.', sentence: 'Das Publikum hört ___ aufmerksam zu.', cue: 'die Rednerin', answers: ['der Rednerin'], level: 'B1' },
  { id: 't3-zusehen-2', verb: 'zusehen', english: 'The apprentice watches the master at work.', sentence: 'Der Lehrling sieht ___ bei der Arbeit zu.', cue: 'der Meister', answers: ['dem Meister'], level: 'B1' },
  { id: 't3-zuschauen-2', verb: 'zuschauen', english: 'The fans watch the goalkeeper closely.', sentence: 'Die Fans schauen ___ genau zu.', cue: 'der Torwart', answers: ['dem Torwart'], level: 'B1' },
  { id: 't3-begegnen-2', verb: 'begegnen', english: 'She ran into her ex-boyfriend at the party.', sentence: 'Sie ist ___ auf der Party begegnet.', cue: 'ihr Ex-Freund', answers: ['ihrem Ex-Freund'], level: 'B1' },
  { id: 't3-gehorchen-2', verb: 'gehorchen', english: 'The soldiers obey their commander without question.', sentence: 'Die Soldaten gehorchen ___ ohne Widerspruch.', cue: 'ihr Kommandant', answers: ['ihrem Kommandanten'], level: 'B1' },
  { id: 't3-dienen-2', verb: 'dienen', english: 'The maid served the countess for many years.', sentence: 'Das Mädchen diente ___ viele Jahre lang.', cue: 'die Gräfin', answers: ['der Gräfin'], level: 'B2' },
  { id: 't3-beitreten-2', verb: 'beitreten', english: 'The new employee joined the workers\' union.', sentence: 'Die neue Mitarbeiterin ist ___ beigetreten.', cue: 'die Gewerkschaft', answers: ['der Gewerkschaft'], level: 'B2' },
  { id: 't3-ausweichen-2', verb: 'ausweichen', english: 'The pilot avoided the storm at the last moment.', sentence: 'Der Pilot wich ___ im letzten Moment aus.', cue: 'das Gewitter', answers: ['dem Gewitter'], level: 'B2' },
  { id: 't3-naehern-2', verb: 'sich nähern', english: 'The hurricane is approaching the coast.', sentence: 'Der Hurrikan nähert sich ___.', cue: 'die Küste', answers: ['der Küste'], level: 'B2' },
  { id: 't3-aehneln-2', verb: 'ähneln', english: 'The twin resembles her sister perfectly.', sentence: 'Die Zwillingsschwester ähnelt ___ perfekt.', cue: 'ihre Schwester', answers: ['ihrer Schwester'], level: 'B1' },
]
