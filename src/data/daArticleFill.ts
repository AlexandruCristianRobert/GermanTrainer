// src/data/daArticleFill.ts
//
// Authored dataset for the Da-compound ARTICLE-FILL drill. Each item is a natural
// sentence that USES a two-way-preposition collocation with a THING noun phrase
// whose article is gapped (`d___` for definite, `ein___` for indefinite). The
// learner supplies the article; its case is dictated by the collocation, not by the
// preposition's usual spatial rule. This drills the exam-critical contrast: the
// two-way prepositions (an/auf/in/über/unter/vor) mostly take Akkusativ in these
// collocations, EXCEPT the an+Dativ (and auf/in/unter/vor+Dativ) verbs — arbeiten
// an, teilnehmen an, leiden an/unter, zweifeln an, bestehen auf, sich fürchten vor …
// A wrong gender or case here teaches wrong German, so accuracy is a shipping gate.
//
// Items JOIN the curated collocation seed by `collocationId`; the case comes from
// that join and the answer is DERIVED (never stored) via articleFillAnswer(): the
// article for the declared `gender` in the collocation's case. `gender` must be the
// noun's true grammatical gender. Invariants in tests/data/daArticleFill.test.ts
// enforce the join, level, the two-way-preposition restriction, the single article
// gap agreeing with the article kind, the ≥12 dative floor, and the derivation.

import { COLLOCATIONS, type CollocationLevel } from './collocations'

/** The three grammatical genders that select an article form. */
export type ArticleGender = 'masculine' | 'feminine' | 'neuter'

/** Definite-article forms (der/die/das) by gender and case. */
export const DEFINITE: Record<ArticleGender, { accusative: string; dative: string }> = {
  masculine: { accusative: 'den', dative: 'dem' },
  feminine: { accusative: 'die', dative: 'der' },
  neuter: { accusative: 'das', dative: 'dem' },
}

/** Indefinite-article forms (ein/eine) by gender and case. */
export const INDEFINITE: Record<ArticleGender, { accusative: string; dative: string }> = {
  masculine: { accusative: 'einen', dative: 'einem' },
  feminine: { accusative: 'eine', dative: 'einer' },
  neuter: { accusative: 'ein', dative: 'einem' },
}

/** The six two-way prepositions (Wechselpräpositionen) that this drill covers. */
export const TWO_WAY_PREPS = ['an', 'auf', 'in', 'über', 'unter', 'vor'] as const

export interface ArticleFillItem {
  /** Unique id, `af-<collocationId>`. */
  id: string
  /** Joins COLLOCATIONS by id; supplies preposition, case and level. */
  collocationId: string
  /** Natural sentence with exactly one article gap: `d___` (definite) or `ein___` (indefinite). */
  sentence: string
  /** Which article the gap is; must agree with the gap stem. */
  article: 'definite' | 'indefinite'
  /** The gapped noun's true grammatical gender. */
  gender: ArticleGender
  /** Copied from the joined collocation. */
  level: CollocationLevel
}

const byId = new Map(COLLOCATIONS.map(c => [c.id, c]))

/** The correct answer: the article for the item's gender in the collocation's case. */
export function articleFillAnswer(item: ArticleFillItem): string {
  const collocation = byId.get(item.collocationId)
  if (!collocation) throw new Error(`Unknown collocationId: ${item.collocationId}`)
  const table = item.article === 'definite' ? DEFINITE : INDEFINITE
  return table[item.gender][collocation.case]
}

export const DA_ARTICLE_FILL: ArticleFillItem[] = [
  // ───────────────────── an — Akkusativ (usual) ─────────────────────
  { id: 'af-denken-an', collocationId: 'denken-an', level: 'B1', article: 'definite', gender: 'masculine',
    sentence: 'Ich denke gern an d___ Urlaub am Meer.' },
  { id: 'af-sich-erinnern-an', collocationId: 'sich-erinnern-an', level: 'B1', article: 'indefinite', gender: 'masculine',
    sentence: 'Erinnerst du dich noch an ein___ Film aus deiner Kindheit?' },
  { id: 'af-glauben-an', collocationId: 'glauben-an', level: 'B1', article: 'definite', gender: 'masculine',
    sentence: 'Sie glaubt fest an d___ Erfolg ihres Plans.' },
  { id: 'af-sich-gewoehnen-an', collocationId: 'sich-gewoehnen-an', level: 'B1', article: 'definite', gender: 'neuter',
    sentence: 'Man gewöhnt sich schnell an d___ neue Klima.' },
  { id: 'af-denken-an-zukunft', collocationId: 'denken-an-zukunft', level: 'B2', article: 'definite', gender: 'feminine',
    sentence: 'Denk bitte auch an d___ Zukunft deiner Kinder.' },
  { id: 'af-sich-erinnern-an-namen', collocationId: 'sich-erinnern-an-namen', level: 'B2', article: 'definite', gender: 'masculine',
    sentence: 'Ich erinnere mich nicht an d___ Namen der Straße.' },
  { id: 'af-sich-klammern-an', collocationId: 'sich-klammern-an', level: 'C1', article: 'indefinite', gender: 'feminine',
    sentence: 'Der Kranke klammert sich an ein___ letzte Hoffnung.' },
  { id: 'af-sich-anpassen-an', collocationId: 'sich-anpassen-an', level: 'B2', article: 'indefinite', gender: 'feminine',
    sentence: 'Ein gutes Team passt sich schnell an ein___ neue Situation an.' },
  { id: 'af-gewoehnt-an', collocationId: 'gewoehnt-an', level: 'B2', article: 'definite', gender: 'feminine',
    sentence: 'Nach Jahren im Norden bin ich an d___ Kälte gewöhnt.' },
  { id: 'af-die-erinnerung-an', collocationId: 'die-erinnerung-an', level: 'B2', article: 'definite', gender: 'masculine',
    sentence: 'Die Erinnerung an d___ Unfall verfolgt ihn bis heute.' },
  { id: 'af-der-glaube-an', collocationId: 'der-glaube-an', level: 'B2', article: 'definite', gender: 'masculine',
    sentence: 'Der Glaube an d___ Fortschritt prägte die ganze Epoche.' },

  // ───────────── an — Dativ (the drilled exception) ─────────────
  { id: 'af-teilnehmen-an', collocationId: 'teilnehmen-an', level: 'B1', article: 'definite', gender: 'feminine',
    sentence: 'Wir nehmen an d___ internationalen Konferenz teil.' },
  { id: 'af-arbeiten-an', collocationId: 'arbeiten-an', level: 'B1', article: 'indefinite', gender: 'neuter',
    sentence: 'Wir arbeiten seit Wochen an ein___ neuen Projekt.' },
  { id: 'af-leiden-an', collocationId: 'leiden-an', level: 'B2', article: 'indefinite', gender: 'feminine',
    sentence: 'Der Patient leidet an ein___ seltenen Krankheit.' },
  { id: 'af-zweifeln-an', collocationId: 'zweifeln-an', level: 'B2', article: 'definite', gender: 'feminine',
    sentence: 'Niemand zweifelt an d___ Ehrlichkeit des Zeugen.' },
  { id: 'af-sterben-an', collocationId: 'sterben-an', level: 'B2', article: 'indefinite', gender: 'feminine',
    sentence: 'Ihr Großvater starb an ein___ schweren Lungenentzündung.' },
  { id: 'af-erkennen-an', collocationId: 'erkennen-an', level: 'B2', article: 'definite', gender: 'feminine',
    sentence: 'Ich erkenne ihn immer an d___ Stimme.' },
  { id: 'af-scheitern-an', collocationId: 'scheitern-an', level: 'B2', article: 'definite', gender: 'feminine',
    sentence: 'Das Projekt scheiterte an d___ fehlenden Finanzierung.' },
  { id: 'af-sich-festhalten-an', collocationId: 'sich-festhalten-an', level: 'B2', article: 'definite', gender: 'feminine',
    sentence: 'Halt dich gut an d___ Leiter fest!' },
  { id: 'af-das-interesse-an', collocationId: 'das-interesse-an', level: 'B2', article: 'definite', gender: 'feminine',
    sentence: 'Ihr Interesse an d___ Astronomie wuchs stetig.' },
  { id: 'af-der-zweifel-an', collocationId: 'der-zweifel-an', level: 'B2', article: 'definite', gender: 'feminine',
    sentence: 'Der Zweifel an d___ Entscheidung wuchs mit der Zeit.' },
  { id: 'af-die-kritik-an', collocationId: 'die-kritik-an', level: 'B2', article: 'definite', gender: 'feminine',
    sentence: 'Die Kritik an d___ Reform wurde immer lauter.' },
  { id: 'af-schuld-an', collocationId: 'schuld-an', level: 'B2', article: 'definite', gender: 'feminine',
    sentence: 'Am Ende war niemand schuld an d___ Verspätung.' },
  { id: 'af-interessiert-an', collocationId: 'interessiert-an', level: 'B2', article: 'indefinite', gender: 'feminine',
    sentence: 'Die Firma ist an ein___ langfristigen Zusammenarbeit interessiert.' },
  { id: 'af-der-mangel-an', collocationId: 'der-mangel-an', level: 'B2', article: 'definite', gender: 'feminine',
    sentence: 'Der Mangel an d___ nötigen Ausrüstung wurde schnell offensichtlich.' },

  // ───────────────────── auf — Akkusativ (usual) ─────────────────────
  { id: 'af-warten-auf', collocationId: 'warten-auf', level: 'B1', article: 'definite', gender: 'masculine',
    sentence: 'An der Haltestelle warten wir auf d___ nächsten Bus.' },
  { id: 'af-sich-freuen-auf', collocationId: 'sich-freuen-auf', level: 'B1', article: 'definite', gender: 'neuter',
    sentence: 'Ich freue mich schon riesig auf d___ lange Wochenende.' },
  { id: 'af-achten-auf', collocationId: 'achten-auf', level: 'B1', article: 'definite', gender: 'feminine',
    sentence: 'Beim Kochen musst du auf d___ Hitze achten.' },
  { id: 'af-sich-vorbereiten-auf', collocationId: 'sich-vorbereiten-auf', level: 'B1', article: 'definite', gender: 'feminine',
    sentence: 'Sie bereitet sich gründlich auf d___ Prüfung vor.' },
  { id: 'af-antworten-auf', collocationId: 'antworten-auf', level: 'B1', article: 'indefinite', gender: 'feminine',
    sentence: 'Er antwortet nicht auf ein___ einzige Frage.' },
  { id: 'af-hoffen-auf', collocationId: 'hoffen-auf', level: 'B1', article: 'indefinite', gender: 'masculine',
    sentence: 'Nach dem Regen hoffen alle auf ein___ sonnigen Tag.' },
  { id: 'af-verzichten-auf', collocationId: 'verzichten-auf', level: 'B2', article: 'definite', gender: 'masculine',
    sentence: 'Zum Abnehmen verzichtet sie ganz auf d___ Nachtisch.' },
  { id: 'af-reagieren-auf', collocationId: 'reagieren-auf', level: 'B2', article: 'definite', gender: 'feminine',
    sentence: 'Der Markt reagierte sofort auf d___ neue Nachricht.' },
  { id: 'af-sich-konzentrieren-auf', collocationId: 'sich-konzentrieren-auf', level: 'B1', article: 'definite', gender: 'neuter',
    sentence: 'Der Sportler konzentriert sich nur auf d___ Ziel.' },
  { id: 'af-hinweisen-auf', collocationId: 'hinweisen-auf', level: 'B2', article: 'indefinite', gender: 'feminine',
    sentence: 'Das Schild weist auf ein___ Gefahr hin.' },
  { id: 'af-deuten-auf', collocationId: 'deuten-auf', level: 'B2', article: 'indefinite', gender: 'masculine',
    sentence: 'Alle Spuren deuten auf ein___ Einbruch hin.' },
  { id: 'af-gespannt-auf', collocationId: 'gespannt-auf', level: 'B2', article: 'definite', gender: 'neuter',
    sentence: 'Wir sind alle gespannt auf d___ Ergebnis.' },
  { id: 'af-stolz-auf', collocationId: 'stolz-auf', level: 'B1', article: 'definite', gender: 'masculine',
    sentence: 'Das ganze Team ist stolz auf d___ großen Erfolg.' },
  { id: 'af-die-lust-auf', collocationId: 'die-lust-auf', level: 'B1', article: 'indefinite', gender: 'masculine',
    sentence: 'Am Morgen habe ich Lust auf ein___ starken Kaffee.' },
  { id: 'af-die-hoffnung-auf', collocationId: 'die-hoffnung-auf', level: 'B2', article: 'definite', gender: 'masculine',
    sentence: 'Die Hoffnung auf d___ Sieg hielt das Team zusammen.' },
  { id: 'af-der-einfluss-auf', collocationId: 'der-einfluss-auf', level: 'B2', article: 'definite', gender: 'feminine',
    sentence: 'Das Wetter hat großen Einfluss auf d___ Ernte.' },
  { id: 'af-die-reaktion-auf', collocationId: 'die-reaktion-auf', level: 'B2', article: 'definite', gender: 'masculine',
    sentence: 'Die Reaktion auf d___ Vorschlag war überraschend positiv.' },

  // ───────────── auf — Dativ (the drilled exception) ─────────────
  { id: 'af-bestehen-auf', collocationId: 'bestehen-auf', level: 'B2', article: 'indefinite', gender: 'feminine',
    sentence: 'Der Kunde besteht auf ein___ schriftlichen Bestätigung.' },
  { id: 'af-basieren-auf', collocationId: 'basieren-auf', level: 'B2', article: 'indefinite', gender: 'feminine',
    sentence: 'Der Film basiert auf ein___ wahren Geschichte.' },
  { id: 'af-beruhen-auf', collocationId: 'beruhen-auf', level: 'C1', article: 'indefinite', gender: 'masculine',
    sentence: 'Das ganze Missverständnis beruht auf ein___ Irrtum.' },

  // ───────────────────── über — Akkusativ ─────────────────────
  { id: 'af-sich-aergern-ueber', collocationId: 'sich-aergern-ueber', level: 'B1', article: 'definite', gender: 'masculine',
    sentence: 'Jeden Morgen ärgert er sich über d___ Stau.' },
  { id: 'af-nachdenken-ueber', collocationId: 'nachdenken-ueber', level: 'B1', article: 'indefinite', gender: 'masculine',
    sentence: 'Ich denke schon lange über ein___ Umzug nach.' },
  { id: 'af-sprechen-ueber', collocationId: 'sprechen-ueber', level: 'B1', article: 'definite', gender: 'masculine',
    sentence: 'Im Unterricht sprechen wir über d___ Klimawandel.' },
  { id: 'af-sich-beschweren-ueber', collocationId: 'sich-beschweren-ueber', level: 'B1', article: 'definite', gender: 'masculine',
    sentence: 'Die Gäste beschweren sich über d___ Lärm.' },
  { id: 'af-lachen-ueber', collocationId: 'lachen-ueber', level: 'B1', article: 'definite', gender: 'masculine',
    sentence: 'Alle lachten laut über d___ Witz.' },
  { id: 'af-diskutieren-ueber', collocationId: 'diskutieren-ueber', level: 'B1', article: 'indefinite', gender: 'feminine',
    sentence: 'Wir diskutieren lange über ein___ schwierige Frage.' },
  { id: 'af-sich-freuen-ueber', collocationId: 'sich-freuen-ueber', level: 'B1', article: 'definite', gender: 'neuter',
    sentence: 'Sie freut sich riesig über d___ Geschenk.' },
  { id: 'af-die-freude-ueber', collocationId: 'die-freude-ueber', level: 'B1', article: 'definite', gender: 'masculine',
    sentence: 'Die Freude über d___ Sieg war riesig.' },
  { id: 'af-der-aerger-ueber', collocationId: 'der-aerger-ueber', level: 'B2', article: 'definite', gender: 'feminine',
    sentence: 'Der Ärger über d___ Verspätung war groß.' },
  { id: 'af-die-kontrolle-ueber', collocationId: 'die-kontrolle-ueber', level: 'B2', article: 'definite', gender: 'masculine',
    sentence: 'Auf dem Eis verlor er die Kontrolle über d___ Wagen.' },

  // ───────────────────── in — Akkusativ ─────────────────────
  { id: 'af-investieren-in', collocationId: 'investieren-in', level: 'B2', article: 'indefinite', gender: 'feminine',
    sentence: 'Die Stadt investiert in ein___ moderne Schule.' },
  { id: 'af-sich-verwandeln-in', collocationId: 'sich-verwandeln-in', level: 'B2', article: 'indefinite', gender: 'masculine',
    sentence: 'Im Märchen verwandelt sich der Prinz in ein___ Frosch.' },
  { id: 'af-geraten-in', collocationId: 'geraten-in', level: 'B2', article: 'indefinite', gender: 'masculine',
    sentence: 'Auf der Autobahn gerieten wir in ein___ langen Stau.' },
  { id: 'af-uebersetzen-in', collocationId: 'uebersetzen-in', level: 'B2', article: 'definite', gender: 'feminine',
    sentence: 'Sie übersetzt das Buch in d___ englische Sprache.' },
  { id: 'af-das-vertrauen-in', collocationId: 'das-vertrauen-in', level: 'B2', article: 'definite', gender: 'feminine',
    sentence: 'Das Vertrauen in d___ Zukunft ist langsam zurückgekehrt.' },
  { id: 'af-der-einblick-in', collocationId: 'der-einblick-in', level: 'C1', article: 'definite', gender: 'masculine',
    sentence: 'Der Bericht gibt einen guten Einblick in d___ Alltag der Klinik.' },

  // ───────────── in — Dativ (the drilled exception) ─────────────
  { id: 'af-sich-irren-in', collocationId: 'sich-irren-in', level: 'B2', article: 'indefinite', gender: 'masculine',
    sentence: 'Da irrst du dich in ein___ wichtigen Punkt.' },
  { id: 'af-gut-in', collocationId: 'gut-in', level: 'B1', article: 'definite', gender: 'feminine',
    sentence: 'Unsere Mannschaft ist richtig gut in d___ Verteidigung.' },

  // ───────────── unter — Dativ (the drilled exception) ─────────────
  { id: 'af-leiden-unter', collocationId: 'leiden-unter', level: 'B2', article: 'definite', gender: 'masculine',
    sentence: 'Viele Pendler leiden unter d___ täglichen Stress.' },
  { id: 'af-stehen-unter-druck', collocationId: 'stehen-unter-druck', level: 'B2', article: 'definite', gender: 'masculine',
    sentence: 'Seit Wochen steht das Team unter d___ ständigen Druck der Öffentlichkeit.' },
  { id: 'af-verstehen-unter', collocationId: 'verstehen-unter', level: 'B2', article: 'definite', gender: 'masculine',
    sentence: 'Was verstehst du eigentlich unter d___ Begriff Freiheit?' },
  { id: 'af-sich-vorstellen-unter', collocationId: 'sich-vorstellen-unter', level: 'B2', article: 'definite', gender: 'masculine',
    sentence: 'Unter d___ neuen Fachbegriff kann ich mir wenig vorstellen.' },

  // ───────────── unter — Akkusativ ─────────────
  { id: 'af-verstehen-unter-begriff', collocationId: 'verstehen-unter-begriff', level: 'C1', article: 'indefinite', gender: 'feminine',
    sentence: 'Dieser Fall fällt unter ein___ andere Kategorie.' },

  // ───────────── vor — Dativ (the drilled exception) ─────────────
  { id: 'af-sich-fuerchten-vor', collocationId: 'sich-fuerchten-vor', level: 'B1', article: 'definite', gender: 'feminine',
    sentence: 'Kleine Kinder fürchten sich oft vor d___ Dunkelheit.' },
  { id: 'af-warnen-vor', collocationId: 'warnen-vor', level: 'B2', article: 'indefinite', gender: 'masculine',
    sentence: 'Der Wetterdienst warnt vor ein___ schweren Sturm.' },
  { id: 'af-schuetzen-vor', collocationId: 'schuetzen-vor', level: 'B2', article: 'definite', gender: 'feminine',
    sentence: 'Die Creme schützt zuverlässig vor d___ Sonne.' },
  { id: 'af-sich-schuetzen-vor', collocationId: 'sich-schuetzen-vor', level: 'B2', article: 'definite', gender: 'masculine',
    sentence: 'Mit einem Schirm schützt man sich vor d___ Regen.' },
  { id: 'af-Angst-haben-vor', collocationId: 'Angst-haben-vor', level: 'B2', article: 'definite', gender: 'feminine',
    sentence: 'Viele Studenten haben Angst vor d___ mündlichen Prüfung.' },
  { id: 'af-erschrecken-vor', collocationId: 'erschrecken-vor', level: 'B2', article: 'indefinite', gender: 'neuter',
    sentence: 'Das Pferd erschrak vor ein___ lauten Geräusch.' },
  { id: 'af-die-angst-vor', collocationId: 'die-angst-vor', level: 'B1', article: 'definite', gender: 'feminine',
    sentence: 'Die Angst vor d___ Zukunft lähmt viele Menschen.' },
  { id: 'af-die-warnung-vor', collocationId: 'die-warnung-vor', level: 'B2', article: 'definite', gender: 'masculine',
    sentence: 'Die Warnung vor d___ Sturm kam gerade rechtzeitig.' },
  { id: 'af-der-schutz-vor', collocationId: 'der-schutz-vor', level: 'B2', article: 'definite', gender: 'feminine',
    sentence: 'Der Schutz vor d___ Kälte ist im Winter besonders wichtig.' },
  { id: 'af-sicher-vor', collocationId: 'sicher-vor', level: 'B2', article: 'definite', gender: 'masculine',
    sentence: 'In der Hütte waren wir endlich sicher vor d___ Regen.' },
]
