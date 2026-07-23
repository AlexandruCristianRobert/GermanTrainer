// src/data/daContrast.ts
//
// Authored dataset for the Da-compound CONTRAST drill. Some verbs govern DIFFERENT
// prepositions for different meanings (sich freuen auf vs. über, leiden an vs.
// unter, bestehen auf vs. aus …). Each CONTRAST_SETS entry lists a verb's competing
// prepositions with a short German+English sense hook. Each DA_CONTRAST item is a
// sentence whose context (a temporal cue, the object's semantics) forces EXACTLY
// ONE of those prepositions — never leaving two defensible.
//
// Accuracy is a shipping gate: if a second option were also natural, the item is
// wrong. `correct` is the governed preposition for that meaning. Invariants (set
// options, correct ∈ set, one gap, no leak, >=4 items per set) live in
// tests/data/daContrast.test.ts.

import { type CollocationLevel } from './collocations'

export interface ContrastOption {
  /** The governed preposition for this meaning. */
  preposition: string
  /** Short German+English hook telling the two meanings apart. */
  sense: string
}

export interface ContrastSet {
  /** Stable key used in item ids, e.g. 'freuen'. */
  key: string
  /** German headword as displayed (reflexive verbs include "sich"). */
  word: string
  /** The 2-3 competing prepositions with their senses. */
  options: ContrastOption[]
}

export interface ContrastItem {
  /** Unique id, `ct-<key>-<n>`. */
  id: string
  /** Joins CONTRAST_SETS by key. */
  contrastKey: string
  /** One `___` gap; the context forces exactly one option. */
  sentence: string
  /** The forced preposition; one of the set's options. */
  correct: string
  level: CollocationLevel
}

export const CONTRAST_SETS: ContrastSet[] = [
  { key: 'freuen', word: 'sich freuen', options: [
    { preposition: 'auf', sense: 'Vorfreude auf etwas Kommendes — to look forward to sth in the future' },
    { preposition: 'über', sense: 'Freude über etwas Geschehenes/Erhaltenes — to be glad about sth received or past' },
  ] },
  { key: 'leiden', word: 'leiden', options: [
    { preposition: 'an', sense: 'an einer Krankheit leiden — to suffer from an illness (its cause)' },
    { preposition: 'unter', sense: 'unter Umständen leiden — to suffer under conditions/circumstances' },
  ] },
  { key: 'bestehen', word: 'bestehen', options: [
    { preposition: 'auf', sense: 'auf etwas beharren — to insist on sth (+ Dativ)' },
    { preposition: 'aus', sense: 'aus Teilen zusammengesetzt sein — to consist of parts' },
  ] },
  { key: 'kaempfen', word: 'kämpfen', options: [
    { preposition: 'für', sense: 'für eine Sache/ein Ideal — to fight for a cause, on behalf of sth' },
    { preposition: 'gegen', sense: 'gegen einen Gegner/eine Gefahr — to fight against sth' },
    { preposition: 'um', sense: 'um etwas ringen, das man gewinnen/behalten will — to fight to win or keep sth' },
  ] },
  { key: 'beschweren', word: 'sich beschweren', options: [
    { preposition: 'bei', sense: 'bei einer Person/Stelle — to complain to sb / an authority' },
    { preposition: 'über', sense: 'über einen Missstand — to complain about sth' },
  ] },
  { key: 'bewerben', word: 'sich bewerben', options: [
    { preposition: 'bei', sense: 'bei einem Arbeitgeber — to apply at a company/employer' },
    { preposition: 'um', sense: 'um eine Stelle/Position — to apply for a post one wants' },
  ] },
  { key: 'halten', word: 'halten', options: [
    { preposition: 'von', sense: 'eine Meinung von etwas haben — to think of / have an opinion about sth' },
    { preposition: 'für', sense: 'jemanden/etwas einschätzen als — to consider sb/sth to be sth' },
  ] },
]

export const DA_CONTRAST: ContrastItem[] = [
  // ─── sich freuen: auf (future) vs. über (received/past) ───
  { id: 'ct-freuen-1', contrastKey: 'freuen', correct: 'auf', level: 'B1',
    sentence: 'Ich freue mich schon jetzt ___ den Urlaub in der nächsten Woche.' },
  { id: 'ct-freuen-2', contrastKey: 'freuen', correct: 'über', level: 'B1',
    sentence: 'Sie freut sich sehr ___ das Geschenk, das sie gestern bekommen hat.' },
  { id: 'ct-freuen-3', contrastKey: 'freuen', correct: 'auf', level: 'B1',
    sentence: 'Die Kinder freuen sich riesig ___ das Weihnachtsfest im Dezember.' },
  { id: 'ct-freuen-4', contrastKey: 'freuen', correct: 'über', level: 'B1',
    sentence: 'Wir freuen uns alle ___ die gute Nachricht von heute Morgen.' },
  { id: 'ct-freuen-5', contrastKey: 'freuen', correct: 'auf', level: 'B1',
    sentence: 'Er freut sich ___ das Konzert, das erst morgen Abend stattfindet.' },
  { id: 'ct-freuen-6', contrastKey: 'freuen', correct: 'über', level: 'B1',
    sentence: 'Ich freue mich ___ das Lob, das mir der Chef gerade gegeben hat.' },

  // ─── leiden: an (illness) vs. unter (circumstances) ───
  { id: 'ct-leiden-1', contrastKey: 'leiden', correct: 'an', level: 'B2',
    sentence: 'Ihr Großvater leidet schon lange ___ einer chronischen Krankheit.' },
  { id: 'ct-leiden-2', contrastKey: 'leiden', correct: 'unter', level: 'B2',
    sentence: 'Viele Menschen leiden im Sommer sehr ___ der großen Hitze.' },
  { id: 'ct-leiden-3', contrastKey: 'leiden', correct: 'an', level: 'B2',
    sentence: 'Der Patient leidet ___ einer seltenen Blutkrankheit.' },
  { id: 'ct-leiden-4', contrastKey: 'leiden', correct: 'unter', level: 'B2',
    sentence: 'Die Angestellten leiden ___ dem ständigen Stress im Büro.' },
  { id: 'ct-leiden-5', contrastKey: 'leiden', correct: 'an', level: 'B2',
    sentence: 'Sie leidet seit ihrer Kindheit ___ einer starken Allergie.' },
  { id: 'ct-leiden-6', contrastKey: 'leiden', correct: 'unter', level: 'B2',
    sentence: 'Das kleine Kind leidet sehr ___ der Trennung seiner Eltern.' },

  // ─── bestehen: auf (insist, Dativ) vs. aus (consist of) ───
  { id: 'ct-bestehen-1', contrastKey: 'bestehen', correct: 'aus', level: 'B2',
    sentence: 'Unser Team besteht ___ fünf sehr erfahrenen Mitgliedern.' },
  { id: 'ct-bestehen-2', contrastKey: 'bestehen', correct: 'auf', level: 'B2',
    sentence: 'Der Kunde besteht ___ einer sofortigen Rückerstattung des Geldes.' },
  { id: 'ct-bestehen-3', contrastKey: 'bestehen', correct: 'aus', level: 'B2',
    sentence: 'Reines Wasser besteht ___ Wasserstoff und Sauerstoff.' },
  { id: 'ct-bestehen-4', contrastKey: 'bestehen', correct: 'auf', level: 'B2',
    sentence: 'Die Lehrerin besteht ___ absoluter Pünktlichkeit im Unterricht.' },
  { id: 'ct-bestehen-5', contrastKey: 'bestehen', correct: 'aus', level: 'B2',
    sentence: 'Die schriftliche Prüfung besteht ___ drei verschiedenen Teilen.' },
  { id: 'ct-bestehen-6', contrastKey: 'bestehen', correct: 'auf', level: 'B2',
    sentence: 'Er bestand hartnäckig ___ seinem guten alten Recht.' },

  // ─── kämpfen: für (cause) vs. gegen (enemy) vs. um (to win/keep) ───
  { id: 'ct-kaempfen-1', contrastKey: 'kaempfen', correct: 'für', level: 'B2',
    sentence: 'Viele Menschen kämpfen weltweit ___ den Frieden.' },
  { id: 'ct-kaempfen-2', contrastKey: 'kaempfen', correct: 'für', level: 'B2',
    sentence: 'Die Bürgerinitiative kämpft entschlossen ___ eine sauberere Umwelt.' },
  { id: 'ct-kaempfen-3', contrastKey: 'kaempfen', correct: 'gegen', level: 'B2',
    sentence: 'Die Feuerwehr kämpft die ganze Nacht ___ die lodernden Flammen.' },
  { id: 'ct-kaempfen-4', contrastKey: 'kaempfen', correct: 'gegen', level: 'B2',
    sentence: 'Die Regierung kämpft entschlossen ___ die wachsende Korruption.' },
  { id: 'ct-kaempfen-5', contrastKey: 'kaempfen', correct: 'um', level: 'B2',
    sentence: 'Die beiden Mannschaften kämpfen verbissen ___ den Meistertitel.' },
  { id: 'ct-kaempfen-6', contrastKey: 'kaempfen', correct: 'um', level: 'B2',
    sentence: 'Der schwer verletzte Fahrer kämpft ___ sein nacktes Überleben.' },

  // ─── sich beschweren: bei (person/authority) vs. über (grievance) ───
  { id: 'ct-beschweren-1', contrastKey: 'beschweren', correct: 'bei', level: 'B2',
    sentence: 'Der verärgerte Gast beschwerte sich lautstark ___ dem Kellner.' },
  { id: 'ct-beschweren-2', contrastKey: 'beschweren', correct: 'über', level: 'B2',
    sentence: 'Die Nachbarn beschweren sich ständig ___ den nächtlichen Lärm.' },
  { id: 'ct-beschweren-3', contrastKey: 'beschweren', correct: 'bei', level: 'B2',
    sentence: 'Beschwer dich doch einfach ___ dem zuständigen Chef!' },
  { id: 'ct-beschweren-4', contrastKey: 'beschweren', correct: 'über', level: 'B2',
    sentence: 'Wir beschweren uns ___ die schlechte Qualität der Ware.' },
  { id: 'ct-beschweren-5', contrastKey: 'beschweren', correct: 'bei', level: 'B2',
    sentence: 'Sie hat sich ___ der Geschäftsleitung beschwert.' },
  { id: 'ct-beschweren-6', contrastKey: 'beschweren', correct: 'über', level: 'B2',
    sentence: 'Viele Kunden beschweren sich ___ die langen Wartezeiten.' },

  // ─── sich bewerben: bei (employer) vs. um (position) ───
  { id: 'ct-bewerben-1', contrastKey: 'bewerben', correct: 'bei', level: 'B2',
    sentence: 'Sie bewirbt sich ___ einem großen Automobilkonzern.' },
  { id: 'ct-bewerben-2', contrastKey: 'bewerben', correct: 'um', level: 'B2',
    sentence: 'Er bewirbt sich ___ die frei gewordene Stelle als Ingenieur.' },
  { id: 'ct-bewerben-3', contrastKey: 'bewerben', correct: 'bei', level: 'B2',
    sentence: 'Ich habe mich ___ mehreren großen Krankenhäusern beworben.' },
  { id: 'ct-bewerben-4', contrastKey: 'bewerben', correct: 'um', level: 'B2',
    sentence: 'Viele Studierende bewerben sich ___ ein begehrtes Stipendium.' },
  { id: 'ct-bewerben-5', contrastKey: 'bewerben', correct: 'bei', level: 'B2',
    sentence: 'Bewirb dich doch ___ der Stadtverwaltung deiner Heimatstadt!' },
  { id: 'ct-bewerben-6', contrastKey: 'bewerben', correct: 'um', level: 'B2',
    sentence: 'Sie bewarb sich ___ den Posten der Abteilungsleiterin.' },

  // ─── halten: von (opinion) vs. für (consider to be) ───
  { id: 'ct-halten-1', contrastKey: 'halten', correct: 'von', level: 'B2',
    sentence: 'Was hältst du eigentlich ___ meinem ganz neuen Vorschlag?' },
  { id: 'ct-halten-2', contrastKey: 'halten', correct: 'für', level: 'B2',
    sentence: 'Ich halte diesen riskanten Plan ___ einen großen Fehler.' },
  { id: 'ct-halten-3', contrastKey: 'halten', correct: 'von', level: 'B2',
    sentence: 'Sie hält nicht besonders viel ___ solchen modernen Methoden.' },
  { id: 'ct-halten-4', contrastKey: 'halten', correct: 'für', level: 'B2',
    sentence: 'Alle halten ihn ___ einen ausgesprochen ehrlichen Menschen.' },
  { id: 'ct-halten-5', contrastKey: 'halten', correct: 'von', level: 'B2',
    sentence: 'Ich halte wirklich sehr viel ___ deiner ehrlichen Art.' },
  { id: 'ct-halten-6', contrastKey: 'halten', correct: 'für', level: 'B2',
    sentence: 'Man hielt die schwierige Aufgabe zunächst ___ völlig unlösbar.' },
]
