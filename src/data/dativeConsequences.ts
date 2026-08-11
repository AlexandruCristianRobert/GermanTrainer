// Dativ module — family X item banks (T12 Kein persönliches Passiv,
// T13 Reflexiver Dativ). Both band-tracked only — consequences of dative-verb
// grammar, not ledger items.
//
// T12 teaches all three facets of the rule: (1) with no accusative object,
// nothing can become the passive subject — the dative SURVIVES (Mir wird
// geholfen, never *Ich werde geholfen); (2) with no subject the verb freezes
// in the 3rd person SINGULAR (Den Kindern wird geholfen — the agreement cards
// mix in real personal passives of accusative verbs so wird/werden is a
// genuine decision, never one-button-winnable); (3) the dummy es exists only
// to fill position 1 and VANISHES when anything else fronts (Es wird mir
// geholfen → Jetzt wird mir geholfen).
//
// T13: the reflexive pronoun goes DATIVE when an accusative object is already
// present (ich wasche mir die Hände) and stays ACCUSATIVE when the reflexive
// itself is the object (ich wasche mich). Only ich/du forms are drilled —
// 3rd-person sich never shows the case. Verbs here are ordinary transitives,
// NOT DATIVE_VERBS members; the gate instead proves an accusative object is
// literally present in every dative-kind prompt. Options never carry final
// punctuation.

import type { DativeDrillLevel } from './dativeExperiencer'

export interface PassiveItem {
  id: string
  /** kind transform/es + verbCase 'dative': a DATIVE_VERBS key. Agreement contrast cards: an accusative VERBS entry. */
  verb: string
  verbCase: 'dative' | 'accusative'
  level: DativeDrillLevel
  kind: 'transform' | 'agreement' | 'es'
  esPattern?: 'es-first' | 'fronted'   // es kind only
  prompt: string
  options: string[]                    // exactly 2
  answers: string[]                    // exactly 1
  translation: string
  explanation: string
}

export const PASSIVE_ITEMS: PassiveItem[] = [
  // ── kind 'transform': Aktiv → Passiv, pick the grammatical passive ──
  { id: 'pv-helfen', verb: 'helfen', verbCase: 'dative', level: 'B2', kind: 'transform',
    prompt: 'Die Sanitäter helfen dem Verletzten. — Wie lautet das Passiv?',
    options: ['Dem Verletzten wird geholfen', 'Der Verletzte wird geholfen'],
    answers: ['Dem Verletzten wird geholfen'],
    translation: 'The injured man is being helped.',
    explanation: 'helfen hat kein Akkusativobjekt — nichts kann im Passiv zum Subjekt werden. Der Dativ überlebt: Dem Verletzten wird geholfen. *Der Verletzte wird geholfen ist der englische Sog (he is being helped).' },
  { id: 'pv-danken', verb: 'danken', verbCase: 'dative', level: 'B2', kind: 'transform',
    prompt: 'Die Stadt dankt den Helfern. — Wie lautet das Passiv?',
    options: ['Den Helfern wird gedankt', 'Die Helfer werden gedankt'],
    answers: ['Den Helfern wird gedankt'],
    translation: 'The helpers are being thanked.',
    explanation: 'Kein Akkusativ, kein Subjekt: Den Helfern wird gedankt — das Verb bleibt Singular (wird), obwohl die Helfer viele sind.' },
  { id: 'pv-gratulieren', verb: 'gratulieren', verbCase: 'dative', level: 'B2', kind: 'transform',
    prompt: 'Alle gratulieren der Gewinnerin. — Wie lautet das Passiv?',
    options: ['Der Gewinnerin wird gratuliert', 'Die Gewinnerin wird gratuliert'],
    answers: ['Der Gewinnerin wird gratuliert'],
    translation: 'The winner is being congratulated.',
    explanation: 'gratulieren + Dativ: Der Gewinnerin wird gratuliert. *Die Gewinnerin wird gratuliert erfände ein Subjekt, das es nicht gibt.' },
  { id: 'pv-vertrauen', verb: 'vertrauen', verbCase: 'dative', level: 'B2', kind: 'transform',
    prompt: 'Die Kollegen vertrauen dem neuen Chef. — Wie lautet das Passiv?',
    options: ['Dem neuen Chef wird vertraut', 'Der neue Chef wird vertraut'],
    answers: ['Dem neuen Chef wird vertraut'],
    translation: 'The new boss is trusted.',
    explanation: 'Dem neuen Chef wird vertraut — der Dativ bleibt Dativ. Ein persönliches Passiv (*Der neue Chef wird vertraut) gibt es nur bei Akkusativverben.' },
  { id: 'pv-widersprechen', verb: 'widersprechen', verbCase: 'dative', level: 'C1', kind: 'transform',
    prompt: 'Niemand widerspricht der Richterin. — Wie lautet das Passiv?',
    options: ['Der Richterin wird nicht widersprochen', 'Die Richterin wird nicht widersprochen'],
    answers: ['Der Richterin wird nicht widersprochen'],
    translation: 'The judge is not being contradicted.',
    explanation: 'Der Richterin wird nicht widersprochen — unpersönliches Passiv, kein Nominativ weit und breit.' },
  { id: 'pv-zuhoeren', verb: 'zuhören', verbCase: 'dative', level: 'B2', kind: 'transform',
    prompt: 'Alle hören dem Redner zu. — Wie lautet das Passiv?',
    options: ['Dem Redner wird zugehört', 'Der Redner wird zugehört'],
    answers: ['Dem Redner wird zugehört'],
    translation: 'The speaker is being listened to.',
    explanation: 'Dem Redner wird zugehört. Die Person bleibt Dativ; die Subjektstelle bleibt leer (oder es als Platzhalter: Es wird dem Redner zugehört).' },
  { id: 'pv-drohen', verb: 'drohen', verbCase: 'dative', level: 'C1', kind: 'transform',
    prompt: 'Man droht den Zeugen. — Wie lautet das Passiv?',
    options: ['Den Zeugen wird gedroht', 'Die Zeugen werden gedroht'],
    answers: ['Den Zeugen wird gedroht'],
    translation: 'The witnesses are being threatened.',
    explanation: 'Den Zeugen wird gedroht — Dativ Plural, Verb trotzdem Singular. *Die Zeugen werden gedroht wäre ein persönliches Passiv, das drohen nicht bilden kann.' },
  { id: 'pv-verzeihen', verb: 'verzeihen', verbCase: 'dative', level: 'C1', kind: 'transform',
    prompt: 'Am Ende verzeihen alle dem Jungen. — Wie lautet das Passiv?',
    options: ['Dem Jungen wird am Ende verziehen', 'Der Junge wird am Ende verziehen'],
    answers: ['Dem Jungen wird am Ende verziehen'],
    translation: 'In the end the boy is forgiven.',
    explanation: 'Dem Jungen wird am Ende verziehen — der Dativ von verzeihen übersteht das Passiv unverändert. der Junge ist ein n-Nomen: Dativ dem Jungen.' },

  // ── kind 'agreement': wird oder werden? — dative verbs freeze at 3sg;
  //    the accusative contrast cards form REAL personal passives and agree ──
  { id: 'pa-kindern', verb: 'helfen', verbCase: 'dative', level: 'B2', kind: 'agreement',
    prompt: 'Den Kindern ___ bei den Hausaufgaben geholfen.',
    options: ['wird', 'werden'], answers: ['wird'],
    translation: 'The children are being helped with their homework.',
    explanation: 'Kein Subjekt im Satz — das Verb erstarrt in der 3. Person Singular: wird. Der Dativ (den Kindern) steuert nie die Kongruenz.' },
  { id: 'pa-gaesten', verb: 'danken', verbCase: 'dative', level: 'B2', kind: 'agreement',
    prompt: 'Den Gästen ___ für die Geduld gedankt.',
    options: ['wird', 'werden'], answers: ['wird'],
    translation: 'The guests are being thanked for their patience.',
    explanation: 'Den Gästen ist Dativ, nicht Subjekt — also Singular: wird gedankt.' },
  { id: 'pa-gewinnern', verb: 'gratulieren', verbCase: 'dative', level: 'B2', kind: 'agreement',
    prompt: 'Den Gewinnern ___ nach dem Rennen gratuliert.',
    options: ['wird', 'werden'], answers: ['wird'],
    translation: 'The winners are being congratulated after the race.',
    explanation: 'Viele Gewinner, trotzdem wird: ohne Nominativ-Subjekt gibt es nichts, womit das Verb kongruieren könnte.' },
  { id: 'pa-zeugen', verb: 'drohen', verbCase: 'dative', level: 'C1', kind: 'agreement',
    prompt: 'Den Zeugen ___ vor dem Prozess gedroht.',
    options: ['wird', 'werden'], answers: ['wird'],
    translation: 'The witnesses are being threatened before the trial.',
    explanation: 'drohen + Dativ: der Plural den Zeugen bleibt Objekt — das unpersönliche Passiv steht starr im Singular.' },
  { id: 'pa-schuelern', verb: 'zuhören', verbCase: 'dative', level: 'B2', kind: 'agreement',
    prompt: 'Den Schülern ___ heute kaum zugehört.',
    options: ['wird', 'werden'], answers: ['wird'],
    translation: 'Hardly anyone is listening to the pupils today.',
    explanation: 'zuhören hat nur ein Dativobjekt — im Passiv bleibt die Subjektstelle leer und das Verb Singular: wird zugehört.' },
  { id: 'pa-experten', verb: 'vertrauen', verbCase: 'dative', level: 'C1', kind: 'agreement',
    prompt: 'Den Experten ___ blind vertraut.',
    options: ['wird', 'werden'], answers: ['wird'],
    translation: 'The experts are trusted blindly.',
    explanation: 'Den Experten ist Dativ Plural — und genau deshalb NICHT Subjekt: wird vertraut, nie *werden vertraut.' },
  { id: 'pa-kinder-gefragt', verb: 'fragen', verbCase: 'accusative', level: 'B2', kind: 'agreement',
    prompt: 'Die Kinder ___ vom Lehrer gefragt.',
    options: ['werden', 'wird'], answers: ['werden'],
    translation: 'The children are being asked by the teacher.',
    explanation: 'Kontrast: fragen nimmt den Akkusativ → echtes persönliches Passiv. Die Kinder SIND das Subjekt, das Verb kongruiert im Plural: werden. Genau das kann ein Dativverb nicht.' },
  { id: 'pa-gaeste-abgeholt', verb: 'abholen', verbCase: 'accusative', level: 'B2', kind: 'agreement',
    prompt: 'Die Gäste ___ vom Bahnhof abgeholt.',
    options: ['werden', 'wird'], answers: ['werden'],
    translation: 'The guests are being picked up from the station.',
    explanation: 'abholen + Akkusativ: die Gäste werden im Passiv zum Subjekt und steuern das Verb — werden abgeholt.' },
  { id: 'pa-studenten-eingeladen', verb: 'einladen', verbCase: 'accusative', level: 'B2', kind: 'agreement',
    prompt: 'Die Studenten ___ zur Feier eingeladen.',
    options: ['werden', 'wird'], answers: ['werden'],
    translation: 'The students are being invited to the party.',
    explanation: 'einladen + Akkusativ → persönliches Passiv mit Plural-Kongruenz: die Studenten werden eingeladen. Vergleiche das starre wird der Dativverben.' },
  { id: 'pa-karten-kontrolliert', verb: 'kontrollieren', verbCase: 'accusative', level: 'C1', kind: 'agreement',
    prompt: 'Die Fahrkarten ___ im Zug kontrolliert.',
    options: ['werden', 'wird'], answers: ['werden'],
    translation: 'The tickets are being checked on the train.',
    explanation: 'kontrollieren + Akkusativ: die Fahrkarten sind Subjekt des Passivsatzes → werden kontrolliert.' },

  // ── kind 'es': the dummy es fills position 1 and vanishes when fronted ──
  { id: 'pe-es-hilfe', verb: 'helfen', verbCase: 'dative', level: 'B2', kind: 'es', esPattern: 'es-first',
    prompt: 'Welcher Satz ist richtig?',
    options: ['Es wird dir geholfen', 'Dir wird es geholfen'],
    answers: ['Es wird dir geholfen'],
    translation: 'You are being helped.',
    explanation: 'es ist nur ein Platzhalter für die erste Position: Es wird dir geholfen. Mitten im Satz hat es nichts verloren — *Dir wird es geholfen. Ohne Platzhalter: Dir wird geholfen.' },
  { id: 'pe-front-hilfe', verb: 'helfen', verbCase: 'dative', level: 'B2', kind: 'es', esPattern: 'fronted',
    prompt: 'Welcher Satz ist richtig?',
    options: ['Jetzt wird dir geholfen', 'Jetzt wird es dir geholfen'],
    answers: ['Jetzt wird dir geholfen'],
    translation: 'Now you are being helped.',
    explanation: 'Sobald jetzt die erste Position füllt, fällt der Platzhalter weg: Jetzt wird dir geholfen, nie *Jetzt wird es dir geholfen.' },
  { id: 'pe-es-dank', verb: 'danken', verbCase: 'dative', level: 'B2', kind: 'es', esPattern: 'es-first',
    prompt: 'Welcher Satz ist richtig?',
    options: ['Es wird den Helfern gedankt', 'Den Helfern wird es gedankt'],
    answers: ['Es wird den Helfern gedankt'],
    translation: 'The helpers are being thanked.',
    explanation: 'Es besetzt Position 1, sonst nichts. Steht den Helfern vorn, verschwindet es: Den Helfern wird gedankt.' },
  { id: 'pe-front-dank', verb: 'danken', verbCase: 'dative', level: 'B2', kind: 'es', esPattern: 'fronted',
    prompt: 'Welcher Satz ist richtig?',
    options: ['Heute wird den Helfern gedankt', 'Heute wird es den Helfern gedankt'],
    answers: ['Heute wird den Helfern gedankt'],
    translation: 'Today the helpers are being thanked.',
    explanation: 'heute nimmt die erste Position — der Platzhalter es muss weichen: Heute wird den Helfern gedankt.' },
  { id: 'pe-front-gratulation', verb: 'gratulieren', verbCase: 'dative', level: 'C1', kind: 'es', esPattern: 'fronted',
    prompt: 'Welcher Satz ist richtig?',
    options: ['Nach dem Spiel wird der Mannschaft gratuliert', 'Nach dem Spiel wird es der Mannschaft gratuliert'],
    answers: ['Nach dem Spiel wird der Mannschaft gratuliert'],
    translation: 'After the match the team is congratulated.',
    explanation: 'Die Angabe nach dem Spiel füllt Position 1 — es hat dort nichts mehr zu suchen.' },
  { id: 'pe-es-widerspruch', verb: 'widersprechen', verbCase: 'dative', level: 'C1', kind: 'es', esPattern: 'es-first',
    prompt: 'Welcher Satz ist richtig?',
    options: ['Es wird dem Plan widersprochen', 'Dem Plan wird es widersprochen'],
    answers: ['Es wird dem Plan widersprochen'],
    translation: 'The plan is being contradicted.',
    explanation: 'Es wird dem Plan widersprochen — es nur ganz vorn. Mit dem Plan vorn heißt es schlicht: Dem Plan wird widersprochen.' },
]

/** The mich/mir minimal-pair verbs — every one appears in BOTH kinds below. */
export const REFLEXIVE_CONTRAST_VERBS = ['waschen', 'vorstellen', 'anziehen', 'kämmen', 'rasieren'] as const

export interface ReflexiveItem {
  id: string
  /** Infinitive label for contrast pairing and display — ordinary transitives, deliberately NOT cross-refd against DATIVE_VERBS. */
  verb: string
  level: DativeDrillLevel
  kind: 'dative' | 'accusative'
  prompt: string                 // one ___ where the reflexive goes (ich/du persons only)
  /** dative kind ONLY: the accusative object phrase, exactly as in prompt — the gate proves it is present. */
  accObject?: string
  options: string[]              // exactly 2: the person-matched mir/mich or dir/dich pair
  answers: string[]              // exactly 1
  translation: string
  explanation: string
}

export const REFLEXIVE_ITEMS: ReflexiveItem[] = [
  // ── kind 'dative': an accusative object is already there → reflexive goes dative ──
  { id: 'rf-haende', verb: 'waschen', level: 'B1', kind: 'dative',
    prompt: 'Ich wasche ___ vor dem Essen die Hände.', accObject: 'die Hände',
    options: ['mir', 'mich'], answers: ['mir'],
    translation: 'I wash my hands before dinner.',
    explanation: 'die Hände ist schon das Akkusativobjekt — das Reflexivpronomen weicht in den Dativ aus: Ich wasche mir die Hände. Vergleiche: Ich wasche mich (kein zweites Objekt → Akkusativ).' },
  { id: 'rf-zaehne', verb: 'putzen', level: 'B1', kind: 'dative',
    prompt: 'Du putzt ___ nach dem Frühstück die Zähne.', accObject: 'die Zähne',
    options: ['dir', 'dich'], answers: ['dir'],
    translation: 'You brush your teeth after breakfast.',
    explanation: 'die Zähne besetzt den Akkusativ — das Reflexivpronomen wird Dativ: Du putzt dir die Zähne.' },
  { id: 'rf-auto', verb: 'kaufen', level: 'B1', kind: 'dative',
    prompt: 'Ich kaufe ___ ein Auto.', accObject: 'ein Auto',
    options: ['mir', 'mich'], answers: ['mir'],
    translation: 'I am buying myself a car.',
    explanation: 'ein Auto ist das Akkusativobjekt; der Nutznießer-Reflexiv steht im Dativ: Ich kaufe mir ein Auto — *Ich kaufe mich ein Auto ist unmöglich.' },
  { id: 'rf-vorstellen-dat', verb: 'vorstellen', level: 'B2', kind: 'dative',
    prompt: 'Ich stelle ___ das neue Haus schon genau vor.', accObject: 'das neue Haus',
    options: ['mir', 'mich'], answers: ['mir'],
    translation: 'I can already picture the new house exactly.',
    explanation: 'sich (Dativ) etwas vorstellen = imagine: das neue Haus trägt den Akkusativ, also mir. Ich stelle mich vor (Akkusativ, ohne Objekt) hieße: ich stelle mich selbst vor.' },
  { id: 'rf-merken', verb: 'merken', level: 'B2', kind: 'dative',
    prompt: 'Ich merke ___ deine Telefonnummer.', accObject: 'deine Telefonnummer',
    options: ['mir', 'mich'], answers: ['mir'],
    translation: 'I will memorize your phone number.',
    explanation: 'sich (Dativ) etwas merken: deine Telefonnummer ist Akkusativ, das Reflexiv Dativ — Ich merke mir deine Telefonnummer.' },
  { id: 'rf-anziehen-dat', verb: 'anziehen', level: 'B1', kind: 'dative',
    prompt: 'Zieh ___ warme Schuhe an!', accObject: 'warme Schuhe',
    options: ['dir', 'dich'], answers: ['dir'],
    translation: 'Put on warm shoes!',
    explanation: 'warme Schuhe füllt den Akkusativ — das Reflexiv weicht aus: Zieh dir warme Schuhe an! Ohne Objekt: Zieh dich an!' },
  { id: 'rf-kaemmen-dat', verb: 'kämmen', level: 'B1', kind: 'dative',
    prompt: 'Ich kämme ___ die Haare.', accObject: 'die Haare',
    options: ['mir', 'mich'], answers: ['mir'],
    translation: 'I comb my hair.',
    explanation: 'die Haare ist Akkusativobjekt → Dativ-Reflexiv: Ich kämme mir die Haare. Ich kämme mich sagt dasselbe ohne den Körperteil.' },
  { id: 'rf-rasieren-dat', verb: 'rasieren', level: 'B2', kind: 'dative',
    prompt: 'Ich rasiere ___ den Bart ab.', accObject: 'den Bart',
    options: ['mir', 'mich'], answers: ['mir'],
    translation: 'I am shaving off my beard.',
    explanation: 'den Bart trägt den Akkusativ — Ich rasiere mir den Bart ab. Ohne Objekt bleibt das Reflexiv Akkusativ: Ich rasiere mich.' },
  { id: 'rf-leisten', verb: 'leisten', level: 'B2', kind: 'dative',
    prompt: 'Ich leiste ___ dieses Jahr einen langen Urlaub.', accObject: 'einen langen Urlaub',
    options: ['mir', 'mich'], answers: ['mir'],
    translation: 'This year I am treating myself to a long vacation.',
    explanation: 'sich (Dativ) etwas leisten: einen langen Urlaub ist Akkusativ — Ich leiste mir einen langen Urlaub.' },
  { id: 'rf-ueberlegen', verb: 'überlegen', level: 'B2', kind: 'dative',
    prompt: 'Ich überlege ___ deinen Vorschlag noch einmal.', accObject: 'deinen Vorschlag',
    options: ['mir', 'mich'], answers: ['mir'],
    translation: 'I will think your suggestion over once more.',
    explanation: 'sich (Dativ) etwas überlegen: deinen Vorschlag ist das Akkusativobjekt — Ich überlege mir deinen Vorschlag.' },
  { id: 'rf-ansehen', verb: 'ansehen', level: 'B2', kind: 'dative',
    prompt: 'Siehst du ___ den Film heute Abend an?', accObject: 'den Film',
    options: ['dir', 'dich'], answers: ['dir'],
    translation: 'Are you going to watch the film tonight?',
    explanation: 'sich (Dativ) etwas ansehen: den Film ist Akkusativ — Siehst du dir den Film an?' },
  { id: 'rf-einbilden', verb: 'einbilden', level: 'C1', kind: 'dative',
    prompt: 'Das bildest du ___ nur ein!', accObject: 'Das',
    options: ['dir', 'dich'], answers: ['dir'],
    translation: 'You are only imagining that!',
    explanation: 'sich (Dativ) etwas einbilden: das vorangestellte Das ist das Akkusativobjekt — Das bildest du dir nur ein!' },
  { id: 'rf-wuenschen', verb: 'wünschen', level: 'B1', kind: 'dative',
    prompt: 'Ich wünsche ___ ein Fahrrad zum Geburtstag.', accObject: 'ein Fahrrad',
    options: ['mir', 'mich'], answers: ['mir'],
    translation: 'I want a bicycle for my birthday.',
    explanation: 'ein Fahrrad ist Akkusativ — der Wünschende für sich selbst steht im Dativ: Ich wünsche mir ein Fahrrad.' },

  // ── kind 'accusative': no other object — the reflexive IS the accusative ──
  { id: 'rf-waschen-akk', verb: 'waschen', level: 'B1', kind: 'accusative',
    prompt: 'Ich wasche ___ jeden Morgen mit kaltem Wasser.',
    options: ['mir', 'mich'], answers: ['mich'],
    translation: 'I wash with cold water every morning.',
    explanation: 'Kein weiteres Objekt: das Reflexivpronomen IST das Akkusativobjekt — Ich wasche mich. Erst ein zweites Objekt (die Hände) drängt es in den Dativ.' },
  { id: 'rf-vorstellen-akk', verb: 'vorstellen', level: 'B2', kind: 'accusative',
    prompt: 'Ich stelle ___ kurz vor: Ich heiße Jana.',
    options: ['mir', 'mich'], answers: ['mich'],
    translation: 'Let me briefly introduce myself: my name is Jana.',
    explanation: 'sich (Akkusativ) vorstellen = sich selbst präsentieren: Ich stelle mich vor. Mit mir kippt die Bedeutung zu „sich etwas ausmalen“ — und bräuchte ein Akkusativobjekt.' },
  { id: 'rf-anziehen-akk', verb: 'anziehen', level: 'B1', kind: 'accusative',
    prompt: 'Zieh ___ schnell an, wir müssen los!',
    options: ['dir', 'dich'], answers: ['dich'],
    translation: 'Get dressed quickly, we have to go!',
    explanation: 'Ohne Kleidungsstück im Satz bleibt das Reflexiv Akkusativ: Zieh dich an! Mit Objekt: Zieh dir die Jacke an.' },
  { id: 'rf-kaemmen-akk', verb: 'kämmen', level: 'B1', kind: 'accusative',
    prompt: 'Ich kämme ___ vor dem Spiegel.',
    options: ['mir', 'mich'], answers: ['mich'],
    translation: 'I comb my hair in front of the mirror.',
    explanation: 'Kein zweites Objekt → Ich kämme mich. Sobald die Haare dazukommen, wird es mir: Ich kämme mir die Haare.' },
  { id: 'rf-rasieren-akk', verb: 'rasieren', level: 'B2', kind: 'accusative',
    prompt: 'Ich rasiere ___ nur alle zwei Tage.',
    options: ['mir', 'mich'], answers: ['mich'],
    translation: 'I only shave every two days.',
    explanation: 'Das Reflexiv ist hier selbst das Objekt: Ich rasiere mich. Mit Körperteil: Ich rasiere mir den Bart ab.' },
  { id: 'rf-freuen', verb: 'freuen', level: 'B1', kind: 'accusative',
    prompt: 'Freust du ___ auf das Wochenende?',
    options: ['dir', 'dich'], answers: ['dich'],
    translation: 'Are you looking forward to the weekend?',
    explanation: 'sich freuen ist immer Akkusativ-reflexiv: Freust du dich? Die Präpositionalgruppe auf das Wochenende ist KEIN Akkusativobjekt und drängt nichts in den Dativ.' },
  { id: 'rf-erinnern', verb: 'erinnern', level: 'B2', kind: 'accusative',
    prompt: 'Ich erinnere ___ gern an den Sommer.',
    options: ['mir', 'mich'], answers: ['mich'],
    translation: 'I like remembering the summer.',
    explanation: 'sich erinnern an + Akk: das Reflexiv bleibt Akkusativ (mich) — an den Sommer ist Präpositionalgruppe, kein Objekt.' },
  { id: 'rf-beeilen', verb: 'beeilen', level: 'B1', kind: 'accusative',
    prompt: 'Beeil ___, der Bus kommt!',
    options: ['dir', 'dich'], answers: ['dich'],
    translation: 'Hurry up, the bus is coming!',
    explanation: 'sich beeilen ist rein reflexiv, das Pronomen immer Akkusativ: Beeil dich!' },
  { id: 'rf-irren', verb: 'irren', level: 'B2', kind: 'accusative',
    prompt: 'Da irrst du ___.',
    options: ['dir', 'dich'], answers: ['dich'],
    translation: 'You are wrong there.',
    explanation: 'sich irren: kein weiteres Objekt, Reflexiv Akkusativ — Da irrst du dich.' },
  { id: 'rf-legen', verb: 'legen', level: 'B1', kind: 'accusative',
    prompt: 'Ich lege ___ kurz aufs Sofa.',
    options: ['mir', 'mich'], answers: ['mich'],
    translation: 'I will lie down on the sofa for a bit.',
    explanation: 'Ich lege mich aufs Sofa — das Reflexiv ist das Akkusativobjekt; aufs Sofa ist Richtungsangabe, kein Objekt.' },
]
