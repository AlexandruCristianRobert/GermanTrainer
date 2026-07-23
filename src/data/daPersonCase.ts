// src/data/daPersonCase.ts
//
// Authored dataset for the Da-compound PERSON-CASE drill. Each item is a natural
// frame with exactly one gap where "preposition + personal pronoun" belongs, and
// the object of that preposition is a PERSON. This is the deliberate counterpart to
// the substitution drill: da-compounds stand in for THINGS, but when the object is
// a person you must use Präposition + Pronomen (auf ihn, mit ihr, zu uns …) — never
// a da-compound (see CONTEXT.md → "Da-compound"). Teaching a person as a da-compound
// would be wrong German, so accuracy here is a shipping gate.
//
// Items JOIN the curated collocation seed by `collocationId`; the preposition and
// case come from that join and the answer is DERIVED (never stored) via
// personCaseAnswer(): the collocation's preposition + the cue pronoun declined into
// the collocation's case. The frame must NOT contain the preposition (it is part of
// the answer) and must read naturally with the cue's person in the gap. Invariants
// in tests/data/daPersonCase.test.ts enforce the join, level, single gap, the
// preposition-not-in-frame rule, cue coverage, and the derivation.

import { COLLOCATIONS, type CollocationLevel } from './collocations'

/** The nine pronoun cues the drill can prompt with (the person in the gap). */
export type PronounCue =
  | 'ich'
  | 'du'
  | 'er'
  | 'sie'
  | 'es'
  | 'wir'
  | 'ihr'
  | 'sie (Plural)'
  | 'Sie'

/** Accusative + dative personal-pronoun forms for each cue. */
export const PRONOUN_FORMS: Record<PronounCue, { accusative: string; dative: string }> = {
  ich: { accusative: 'mich', dative: 'mir' },
  du: { accusative: 'dich', dative: 'dir' },
  er: { accusative: 'ihn', dative: 'ihm' },
  sie: { accusative: 'sie', dative: 'ihr' },
  es: { accusative: 'es', dative: 'ihm' },
  wir: { accusative: 'uns', dative: 'uns' },
  ihr: { accusative: 'euch', dative: 'euch' },
  'sie (Plural)': { accusative: 'sie', dative: 'ihnen' },
  Sie: { accusative: 'Sie', dative: 'Ihnen' },
}

export interface PersonCaseItem {
  /** Unique id, `pc-<collocationId>`. */
  id: string
  /** Joins COLLOCATIONS by id; supplies preposition, case and level. */
  collocationId: string
  /** Natural sentence with exactly one `___` where prep + pronoun goes; no preposition. */
  frame: string
  /** The person in the gap; selects the pronoun form. */
  cue: PronounCue
  /** Copied from the joined collocation. */
  level: CollocationLevel
}

const byId = new Map(COLLOCATIONS.map(c => [c.id, c]))

/** The correct answer: the collocation's preposition + the cue pronoun in its case. */
export function personCaseAnswer(item: PersonCaseItem): string {
  const collocation = byId.get(item.collocationId)
  if (!collocation) throw new Error(`Unknown collocationId: ${item.collocationId}`)
  return `${collocation.preposition} ${PRONOUN_FORMS[item.cue][collocation.case]}`
}

export const DA_PERSON_CASE: PersonCaseItem[] = [
  // ─────────────────────────────── B1 ───────────────────────────────
  // verbs
  { id: 'pc-warten-auf', collocationId: 'warten-auf', level: 'B1', cue: 'er',
    frame: 'Ich warte schon seit einer Stunde ___.' },
  { id: 'pc-denken-an', collocationId: 'denken-an', level: 'B1', cue: 'du',
    frame: 'Ich denke den ganzen Tag ___.' },
  { id: 'pc-sich-verlassen-auf', collocationId: 'sich-verlassen-auf', level: 'B1', cue: 'Sie',
    frame: 'Herr Klein, wir können uns immer ___ verlassen.' },
  { id: 'pc-sich-freuen-auf', collocationId: 'sich-freuen-auf', level: 'B1', cue: 'sie',
    frame: 'Die Enkelin kommt zu Besuch; die Großeltern freuen sich schon riesig ___.' },
  { id: 'pc-sich-kuemmern-um', collocationId: 'sich-kuemmern-um', level: 'B1', cue: 'sie',
    frame: 'Die kleine Schwester ist krank, deshalb kümmert sich die Oma liebevoll ___.' },
  { id: 'pc-glauben-an', collocationId: 'glauben-an', level: 'B1', cue: 'er',
    frame: 'Sie hat nie aufgehört, ___ zu glauben.' },
  { id: 'pc-schreiben-an', collocationId: 'schreiben-an', level: 'B1', cue: 'ich',
    frame: 'Meine Oma schreibt jeden Monat einen langen Brief ___.' },
  { id: 'pc-sich-erinnern-an', collocationId: 'sich-erinnern-an', level: 'B1', cue: 'sie (Plural)',
    frame: 'Auch nach vielen Jahren erinnere ich mich gern ___.' },
  { id: 'pc-sich-aergern-ueber', collocationId: 'sich-aergern-ueber', level: 'B1', cue: 'sie',
    frame: 'Meine Schwester ist unmöglich; ständig ärgere ich mich ___.' },
  { id: 'pc-sprechen-ueber', collocationId: 'sprechen-ueber', level: 'B1', cue: 'sie (Plural)',
    frame: 'Die neuen Nachbarn sind sehr laut; wir sprechen oft ___.' },
  { id: 'pc-lachen-ueber', collocationId: 'lachen-ueber', level: 'B1', cue: 'sie',
    frame: 'Sie hat sich nur versprochen; bitte lach jetzt nicht ___.' },
  { id: 'pc-sich-verlieben-in', collocationId: 'sich-verlieben-in', level: 'B1', cue: 'sie',
    frame: 'Er hat sich sofort ___ verliebt.' },
  { id: 'pc-sich-bedanken-bei', collocationId: 'sich-bedanken-bei', level: 'B1', cue: 'Sie',
    frame: 'Für Ihre Hilfe möchte ich mich herzlich ___ bedanken.' },
  { id: 'pc-sich-entschuldigen-bei', collocationId: 'sich-entschuldigen-bei', level: 'B1', cue: 'er',
    frame: 'Du warst gemein; du solltest dich ___ entschuldigen.' },
  { id: 'pc-gehoeren-zu', collocationId: 'gehoeren-zu', level: 'B1', cue: 'wir',
    frame: 'Komm ruhig mit, du gehörst doch ___!' },
  { id: 'pc-passen-zu', collocationId: 'passen-zu', level: 'B1', cue: 'sie',
    frame: 'Ihr seid ein tolles Paar; du passt wirklich ___.' },
  { id: 'pc-sich-treffen-mit', collocationId: 'sich-treffen-mit', level: 'B1', cue: 'er',
    frame: 'Morgen treffe ich mich endlich wieder ___.' },
  { id: 'pc-telefonieren-mit', collocationId: 'telefonieren-mit', level: 'B1', cue: 'sie',
    frame: 'Jeden Abend telefoniert er stundenlang ___.' },
  { id: 'pc-sich-streiten-mit', collocationId: 'sich-streiten-mit', level: 'B1', cue: 'du',
    frame: 'Ich will mich nicht schon wieder ___ streiten.' },
  { id: 'pc-sich-unterhalten-mit', collocationId: 'sich-unterhalten-mit', level: 'B1', cue: 'Sie',
    frame: 'Es war mir eine große Freude, mich ___ zu unterhalten.' },
  { id: 'pc-reden-mit', collocationId: 'reden-mit', level: 'B1', cue: 'ihr',
    frame: 'Kinder, ich muss dringend einmal ___ reden.' },
  { id: 'pc-spielen-mit', collocationId: 'spielen-mit', level: 'B1', cue: 'es',
    frame: 'Das Nachbarskind ist zu Besuch; unsere Tochter spielt den ganzen Nachmittag ___.' },
  { id: 'pc-sich-verstehen-mit', collocationId: 'sich-verstehen-mit', level: 'B1', cue: 'sie (Plural)',
    frame: 'Meine neuen Kollegen sind nett; ich verstehe mich gut ___.' },
  { id: 'pc-fragen-nach', collocationId: 'fragen-nach', level: 'B1', cue: 'du',
    frame: 'Deine Mutter hat gestern am Telefon ___ gefragt.' },
  { id: 'pc-suchen-nach', collocationId: 'suchen-nach', level: 'B1', cue: 'sie',
    frame: 'Die kleine Tochter ist verschwunden; alle suchen verzweifelt ___.' },
  { id: 'pc-traeumen-von', collocationId: 'traeumen-von', level: 'B1', cue: 'du',
    frame: 'Heute Nacht habe ich tatsächlich ___ geträumt.' },
  { id: 'pc-sich-verabschieden-von', collocationId: 'sich-verabschieden-von', level: 'B1', cue: 'sie (Plural)',
    frame: 'Am Bahnhof mussten wir uns endgültig ___ verabschieden.' },
  { id: 'pc-halten-von', collocationId: 'halten-von', level: 'B1', cue: 'er',
    frame: 'Sag mal ehrlich, was hältst du eigentlich ___?' },
  { id: 'pc-sich-fuerchten-vor', collocationId: 'sich-fuerchten-vor', level: 'B1', cue: 'er',
    frame: 'Der neue Chef ist streng; viele fürchten sich ___.' },
  { id: 'pc-sich-verstecken-vor', collocationId: 'sich-verstecken-vor', level: 'B1', cue: 'sie',
    frame: 'Das Kind hat etwas angestellt und versteckt sich jetzt ___.' },
  // adjectives
  { id: 'pc-stolz-auf', collocationId: 'stolz-auf', level: 'B1', cue: 'er',
    frame: 'Der kleine Junge hat den Wettbewerb gewonnen; die ganze Familie ist unglaublich stolz ___.' },
  { id: 'pc-boese-auf', collocationId: 'boese-auf', level: 'B1', cue: 'ich',
    frame: 'Bist du etwa immer noch böse ___?' },
  { id: 'pc-nett-zu', collocationId: 'nett-zu', level: 'B1', cue: 'ich',
    frame: 'An meinem ersten Tag waren alle total nett ___.' },
  { id: 'pc-freundlich-zu', collocationId: 'freundlich-zu', level: 'B1', cue: 'es',
    frame: 'Das neue Kind war zuerst schüchtern, aber alle waren sehr freundlich ___.' },
  { id: 'pc-verheiratet-mit', collocationId: 'verheiratet-mit', level: 'B1', cue: 'sie',
    frame: 'Seit zwanzig Jahren ist er glücklich ___ verheiratet.' },
  { id: 'pc-zufrieden-mit', collocationId: 'zufrieden-mit', level: 'B1', cue: 'du',
    frame: 'Der Chef lobt dich; er ist wirklich sehr zufrieden ___.' },
  // nouns
  { id: 'pc-die-angst-vor', collocationId: 'die-angst-vor', level: 'B1', cue: 'sie',
    frame: 'Seine Angst ___ war völlig unbegründet.' },
  { id: 'pc-die-frage-an', collocationId: 'die-frage-an', level: 'B1', cue: 'Sie',
    frame: 'Ich hätte da noch eine kurze Frage ___.' },

  // ─────────────────────────────── B2 ───────────────────────────────
  // verbs
  { id: 'pc-zaehlen-auf', collocationId: 'zaehlen-auf', level: 'B2', cue: 'ihr',
    frame: 'Leute, in der Not zähle ich fest ___!' },
  { id: 'pc-sich-sorgen-um', collocationId: 'sich-sorgen-um', level: 'B2', cue: 'du',
    frame: 'Bleib gesund — die ganze Familie sorgt sich sehr ___.' },
  { id: 'pc-trauern-um', collocationId: 'trauern-um', level: 'B2', cue: 'sie',
    frame: 'Als die Großmutter starb, trauerte das ganze Dorf ___.' },
  { id: 'pc-sich-versoehnen-mit', collocationId: 'sich-versoehnen-mit', level: 'B2', cue: 'sie',
    frame: 'Nach dem langen Streit hat er sich endlich wieder ___ versöhnt.' },
  { id: 'pc-sich-anfreunden-mit', collocationId: 'sich-anfreunden-mit', level: 'B2', cue: 'wir',
    frame: 'Der neue Schüler hat sich schnell ___ angefreundet.' },
  { id: 'pc-sich-beschweren-bei', collocationId: 'sich-beschweren-bei', level: 'B2', cue: 'Sie',
    frame: 'Ich möchte mich ausdrücklich ___ beschweren.' },
  { id: 'pc-sich-erkundigen-bei', collocationId: 'sich-erkundigen-bei', level: 'B2', cue: 'er',
    frame: 'Erkundige dich am besten direkt ___.' },
  { id: 'pc-sich-sehnen-nach', collocationId: 'sich-sehnen-nach', level: 'B2', cue: 'du',
    frame: 'Seit du weg bist, sehne ich mich schrecklich ___.' },
  { id: 'pc-rufen-nach', collocationId: 'rufen-nach', level: 'B2', cue: 'ich',
    frame: 'Mitten in der Nacht hat das kranke Kind ___ gerufen.' },
  { id: 'pc-sich-wenden-an', collocationId: 'sich-wenden-an', level: 'B2', cue: 'er',
    frame: 'Bei Problemen kannst du dich jederzeit ___ wenden.' },
  // adjectives
  { id: 'pc-wuetend-auf', collocationId: 'wuetend-auf', level: 'B2', cue: 'er',
    frame: 'Nach dem gemeinen Kommentar war sie tagelang wütend ___.' },
  { id: 'pc-eifersuechtig-auf', collocationId: 'eifersuechtig-auf', level: 'B2', cue: 'sie',
    frame: 'Ganz ohne Grund ist er furchtbar eifersüchtig ___.' },
  { id: 'pc-hoeflich-zu', collocationId: 'hoeflich-zu', level: 'B2', cue: 'Sie',
    frame: 'Der Kellner war den ganzen Abend ausgesprochen höflich ___.' },
  { id: 'pc-befreundet-mit', collocationId: 'befreundet-mit', level: 'B2', cue: 'wir',
    frame: 'Die neuen Nachbarn sind schon eng ___ befreundet.' },
  { id: 'pc-einverstanden-mit', collocationId: 'einverstanden-mit', level: 'B2', cue: 'er',
    frame: 'In diesem einen Punkt bin ich ganz ___ einverstanden.' },
  // nouns
  { id: 'pc-der-respekt-vor', collocationId: 'der-respekt-vor', level: 'B2', cue: 'Sie',
    frame: 'Nach allem, was Sie geleistet haben, habe ich großen Respekt ___.' },
  { id: 'pc-die-beziehung-zu', collocationId: 'die-beziehung-zu', level: 'B2', cue: 'sie',
    frame: 'Seine enge Beziehung ___ ist wirklich etwas Besonderes.' },
  { id: 'pc-der-kontakt-zu', collocationId: 'der-kontakt-zu', level: 'B2', cue: 'sie (Plural)',
    frame: 'Nach dem Umzug ist der Kontakt ___ leider abgebrochen.' },
  { id: 'pc-die-angst-um', collocationId: 'die-angst-um', level: 'B2', cue: 'er',
    frame: 'Die Angst ___ ließ die Mutter nicht schlafen.' },

  // ─────────────────────────────── C1 ───────────────────────────────
  // verbs
  { id: 'pc-appellieren-an', collocationId: 'appellieren-an', level: 'C1', cue: 'ihr',
    frame: 'Der Trainer appelliert vor dem Spiel eindringlich ___.' },
  { id: 'pc-sich-raechen-an', collocationId: 'sich-raechen-an', level: 'C1', cue: 'sie',
    frame: 'Für die Kränkung wollte er sich unbedingt ___ rächen.' },
  { id: 'pc-bangen-um', collocationId: 'bangen-um', level: 'C1', cue: 'er',
    frame: 'Als er im Krankenhaus lag, bangte die ganze Familie ___.' },
  // adjectives
  { id: 'pc-angewiesen-auf', collocationId: 'angewiesen-auf', level: 'C1', cue: 'ihr',
    frame: 'Ohne euer Team läuft gar nichts; wir sind völlig ___ angewiesen.' },
  { id: 'pc-grausam-zu', collocationId: 'grausam-zu', level: 'C1', cue: 'sie (Plural)',
    frame: 'Das alte Regime war grausam ___.' },
  // nouns
  { id: 'pc-die-sehnsucht-nach', collocationId: 'die-sehnsucht-nach', level: 'C1', cue: 'du',
    frame: 'Die Sehnsucht ___ wird mit jedem Tag größer.' },
  { id: 'pc-die-trauer-um', collocationId: 'die-trauer-um', level: 'C1', cue: 'sie',
    frame: 'Die Trauer ___ war im ganzen Ort deutlich zu spüren.' },
]
