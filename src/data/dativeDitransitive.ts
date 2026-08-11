// Dativ module — family VI (Zwei Objekte). T7: which object takes which case
// (article pick). T8: object order — DAT before AKK by default, AKK before DAT
// when both are pronouns, the pronoun first in mixed pairs. The OBJECT-ORDER
// GATE recomputes each item's correct ordering from its structured fields.

import type { DativeDrillLevel } from './dativeExperiencer'

export interface DitransitiveItem {
  id: string
  verb: string              // VERBS.german, case 'dative+accusative'
  level: DativeDrillLevel
  gapRole: 'dative' | 'accusative'
  prompt: string            // one ___ on an article/determiner of one object
  options: string[]         // exactly 2
  answers: string[]         // exactly 1
  translation: string
  explanation: string
}

export const DITRANSITIVE_ITEMS: DitransitiveItem[] = [
  { id: 'dt-geben-d', verb: 'geben', level: 'A2', gapRole: 'dative',
    prompt: 'Ich gebe ___ Kind das Buch.', options: ['dem', 'das'], answers: ['dem'],
    translation: 'I give the child the book.',
    explanation: 'Der Empfänger steht im Dativ (dem Kind), die Sache im Akkusativ (das Buch).' },
  { id: 'dt-geben-a', verb: 'geben', level: 'A2', gapRole: 'accusative',
    prompt: 'Ich gebe dem Kind ___ Buch.', options: ['das', 'dem'], answers: ['das'],
    translation: 'I give the child the book.',
    explanation: 'Die gegebene Sache ist Akkusativ: das Buch. Der Dativ (dem Kind) ist schon vergeben.' },
  { id: 'dt-schenken-d', verb: 'schenken', level: 'A2', gapRole: 'dative',
    prompt: 'Wir schenken ___ Mutter einen Gutschein.', options: ['der', 'die'], answers: ['der'],
    translation: 'We are giving (our) mother a voucher.',
    explanation: 'Die Beschenkte ist Dativ: der Mutter. die Mutter wäre Akkusativ — der gehört dem Gutschein nicht.' },
  { id: 'dt-schenken-a', verb: 'schenken', level: 'A2', gapRole: 'accusative',
    prompt: 'Wir schenken der Mutter ___ Gutschein.', options: ['einen', 'einem'], answers: ['einen'],
    translation: 'We are giving (our) mother a voucher.',
    explanation: 'Die geschenkte Sache ist Akkusativ: einen Gutschein.' },
  { id: 'dt-zeigen-d', verb: 'zeigen', level: 'A2', gapRole: 'dative',
    prompt: 'Er zeigt ___ Besucherin den Weg.', options: ['der', 'die'], answers: ['der'],
    translation: 'He shows the visitor the way.',
    explanation: 'Wem gezeigt wird → Dativ: der Besucherin. Was gezeigt wird → Akkusativ: den Weg.' },
  { id: 'dt-zeigen-a', verb: 'zeigen', level: 'A2', gapRole: 'accusative',
    prompt: 'Sie zeigt dem Gast ___ Zimmer.', options: ['das', 'dem'], answers: ['das'],
    translation: 'She shows the guest the room.',
    explanation: 'Das Gezeigte ist Akkusativ: das Zimmer.' },
  { id: 'dt-erklaeren-d', verb: 'erklären', level: 'A2', gapRole: 'dative',
    prompt: 'Die Lehrerin erklärt ___ Schülern die Regel.', options: ['den', 'die'], answers: ['den'],
    translation: 'The teacher explains the rule to the pupils.',
    explanation: 'Dativ Plural: den Schülern (+n). die Schülern ist keine mögliche Form.' },
  { id: 'dt-erklaeren-a', verb: 'erklären', level: 'A2', gapRole: 'accusative',
    prompt: 'Die Lehrerin erklärt den Schülern ___ Regel.', options: ['die', 'der'], answers: ['die'],
    translation: 'The teacher explains the rule to the pupils.',
    explanation: 'Das Erklärte ist Akkusativ: die Regel.' },
  { id: 'dt-empfehlen-d', verb: 'empfehlen', level: 'B1', gapRole: 'dative',
    prompt: 'Der Kellner empfiehlt ___ Gästen den Fisch.', options: ['den', 'die'], answers: ['den'],
    translation: 'The waiter recommends the fish to the guests.',
    explanation: 'Wem empfohlen wird → Dativ Plural: den Gästen.' },
  { id: 'dt-empfehlen-a', verb: 'empfehlen', level: 'B1', gapRole: 'accusative',
    prompt: 'Der Kellner empfiehlt den Gästen ___ Fisch.', options: ['den', 'dem'], answers: ['den'],
    translation: 'The waiter recommends the fish to the guests.',
    explanation: 'Das Empfohlene ist Akkusativ: den Fisch (maskulin). Zwei Mal den in einem Satz — einmal Dativ Plural, einmal Akkusativ Singular.' },
  { id: 'dt-bringen-d', verb: 'bringen', level: 'A2', gapRole: 'dative',
    prompt: 'Bringst du ___ Oma die Zeitung?', options: ['der', 'die'], answers: ['der'],
    translation: 'Will you bring grandma the newspaper?',
    explanation: 'Die Empfängerin ist Dativ: der Oma.' },
  { id: 'dt-bringen-a', verb: 'bringen', level: 'A2', gapRole: 'accusative',
    prompt: 'Bringst du der Oma ___ Zeitung?', options: ['die', 'der'], answers: ['die'],
    translation: 'Will you bring grandma the newspaper?',
    explanation: 'Das Gebrachte ist Akkusativ: die Zeitung.' },
  { id: 'dt-schicken-d', verb: 'schicken', level: 'A2', gapRole: 'dative',
    prompt: 'Ich schicke ___ Freund ein Paket.', options: ['meinem', 'meinen'], answers: ['meinem'],
    translation: 'I am sending my friend a package.',
    explanation: 'Der Empfänger ist Dativ: meinem Freund. meinen Freund wäre Akkusativ — der gehört dem Paket.' },
  { id: 'dt-schicken-a', verb: 'schicken', level: 'A2', gapRole: 'accusative',
    prompt: 'Ich schicke meinem Freund ___ Paket.', options: ['ein', 'einem'], answers: ['ein'],
    translation: 'I am sending my friend a package.',
    explanation: 'Die geschickte Sache ist Akkusativ: ein Paket (Neutrum, endungslos).' },
  { id: 'dt-erzaehlen-d', verb: 'erzählen', level: 'A2', gapRole: 'dative',
    prompt: 'Der Opa erzählt ___ Enkeln eine Geschichte.', options: ['den', 'die'], answers: ['den'],
    translation: 'Grandpa tells the grandchildren a story.',
    explanation: 'Wem erzählt wird → Dativ Plural: den Enkeln.' },
  { id: 'dt-leihen-d', verb: 'leihen', level: 'B1', gapRole: 'dative',
    prompt: 'Leihst du ___ Kollegin dein Fahrrad?', options: ['der', 'die'], answers: ['der'],
    translation: 'Will you lend the colleague your bicycle?',
    explanation: 'Die Person, der geliehen wird, ist Dativ: der Kollegin.' },
  { id: 'dt-wuenschen-d', verb: 'wünschen', level: 'A2', gapRole: 'dative',
    prompt: 'Wir wünschen ___ Team viel Erfolg.', options: ['dem', 'das'], answers: ['dem'],
    translation: 'We wish the team every success.',
    explanation: 'Wem gewünscht wird → Dativ: dem Team. Der Erfolg ist die Akkusativ-Sache.' },
  { id: 'dt-versprechen-a', verb: 'versprechen', level: 'B1', gapRole: 'accusative',
    prompt: 'Er verspricht seiner Tochter ___ Hund.', options: ['einen', 'einem'], answers: ['einen'],
    translation: 'He promises his daughter a dog.',
    explanation: 'Das Versprochene ist Akkusativ: einen Hund. seiner Tochter trägt den Dativ schon.' },
  { id: 'dt-erlauben-d', verb: 'erlauben', level: 'B1', gapRole: 'dative',
    prompt: 'Die Eltern erlauben ___ Sohn die Reise.', options: ['dem', 'den'], answers: ['dem'],
    translation: 'The parents allow their son the trip.',
    explanation: 'erlauben: die Person im Dativ (dem Sohn), das Erlaubte im Akkusativ (die Reise).' },
  { id: 'dt-verbieten-d', verb: 'verbieten', level: 'B1', gapRole: 'dative',
    prompt: 'Der Arzt verbietet ___ Patientin das Rauchen.', options: ['der', 'die'], answers: ['der'],
    translation: 'The doctor forbids the patient to smoke.',
    explanation: 'verbieten spiegelt erlauben: Person im Dativ (der Patientin), Sache im Akkusativ (das Rauchen).' },
  { id: 'dt-anbieten-a', verb: 'anbieten', level: 'B1', gapRole: 'accusative',
    prompt: 'Sie bietet dem Besucher ___ Kaffee an.', options: ['einen', 'einem'], answers: ['einen'],
    translation: 'She offers the visitor a coffee.',
    explanation: 'Das Angebotene ist Akkusativ: einen Kaffee.' },
  { id: 'dt-mitbringen-d', verb: 'mitbringen', level: 'A2', gapRole: 'dative',
    prompt: 'Ich bringe ___ Kindern Schokolade mit.', options: ['den', 'die'], answers: ['den'],
    translation: 'I am bringing the children chocolate.',
    explanation: 'Die Empfänger sind Dativ Plural: den Kindern.' },
  { id: 'dt-vorschlagen-d', verb: 'vorschlagen', level: 'B1', gapRole: 'dative',
    prompt: 'Er schlägt ___ Chefin einen neuen Termin vor.', options: ['der', 'die'], answers: ['der'],
    translation: 'He suggests a new date to the boss.',
    explanation: 'Wem vorgeschlagen wird → Dativ: der Chefin.' },
  { id: 'dt-beibringen-d', verb: 'beibringen', level: 'B2', gapRole: 'dative',
    prompt: 'Die Trainerin bringt ___ Anfängern das Schwimmen bei.', options: ['den', 'die'], answers: ['den'],
    translation: 'The coach teaches the beginners how to swim.',
    explanation: 'beibringen: die Lernenden im Dativ (den Anfängern), das Gelehrte im Akkusativ.' },
  { id: 'dt-vorstellen-a', verb: 'vorstellen', level: 'B1', gapRole: 'accusative',
    prompt: 'Ich stelle dir ___ neuen Kollegen vor.', options: ['den', 'dem'], answers: ['den'],
    translation: 'Let me introduce the new colleague to you.',
    explanation: 'Der Vorgestellte ist die Akkusativ-Sache des Satzes: den neuen Kollegen (n-Nomen). dir trägt den Dativ.' },
  { id: 'dt-verkaufen-d', verb: 'verkaufen', level: 'B1', gapRole: 'dative',
    prompt: 'Der Händler verkauft ___ Studentin ein gebrauchtes Fahrrad.', options: ['der', 'die'], answers: ['der'],
    translation: 'The dealer sells the student a used bicycle.',
    explanation: 'Die Käuferin ist Dativ: der Studentin.' },
]

/** Object pronouns the ORDER GATE recognizes — a phrase equal to one of these counts as a pronoun. */
export const OBJECT_PRONOUNS = ['mir', 'dir', 'ihm', 'ihr', 'ihnen', 'uns', 'euch', 'es', 'ihn', 'sie'] as const

export interface ObjectOrderItem {
  id: string
  verb: string              // VERBS.german, case 'dative+accusative'
  level: DativeDrillLevel
  kind: 'nn' | 'pp' | 'mixed'
  stem: string              // opening up to the two objects, e.g. 'Ich gebe'
  datPhrase: string
  akkPhrase: string
  pronounRole?: 'dative' | 'accusative'   // mixed only: which phrase is the pronoun
  punct: string             // '.' or '?'
  translation: string
  explanation: string
}

/** The rule, executable: AKK first iff both objects are pronouns, or the single pronoun is accusative. */
export function objectOrderAnswer(i: ObjectOrderItem): string {
  const akkFirst = i.kind === 'pp' || (i.kind === 'mixed' && i.pronounRole === 'accusative')
  return akkFirst ? `${i.akkPhrase} ${i.datPhrase}` : `${i.datPhrase} ${i.akkPhrase}`
}

export const OBJECT_ORDER_ITEMS: ObjectOrderItem[] = [
  // nn — two nouns: DAT before AKK (neutral order)
  { id: 'oo-nn-geben', verb: 'geben', level: 'B1', kind: 'nn',
    stem: 'Ich gebe', datPhrase: 'dem Kind', akkPhrase: 'das Buch', punct: '.',
    translation: 'I give the child the book.',
    explanation: 'Zwei Nomen: Dativ vor Akkusativ — Ich gebe dem Kind das Buch.' },
  { id: 'oo-nn-schenken', verb: 'schenken', level: 'B1', kind: 'nn',
    stem: 'Er schenkt', datPhrase: 'seiner Freundin', akkPhrase: 'einen Ring', punct: '.',
    translation: 'He gives his girlfriend a ring.',
    explanation: 'Neutral: der Empfänger (Dativ) zuerst, dann die Sache (Akkusativ).' },
  { id: 'oo-nn-zeigen', verb: 'zeigen', level: 'B1', kind: 'nn',
    stem: 'Wir zeigen', datPhrase: 'den Gästen', akkPhrase: 'die Wohnung', punct: '.',
    translation: 'We show the guests the apartment.',
    explanation: 'Zwei Nomen: den Gästen (Dativ) vor die Wohnung (Akkusativ).' },
  { id: 'oo-nn-erklaeren', verb: 'erklären', level: 'B1', kind: 'nn',
    stem: 'Die Lehrerin erklärt', datPhrase: 'der Klasse', akkPhrase: 'die Grammatik', punct: '.',
    translation: 'The teacher explains the grammar to the class.',
    explanation: 'Neutral: Dativ (der Klasse) vor Akkusativ (die Grammatik).' },
  { id: 'oo-nn-schicken', verb: 'schicken', level: 'B1', kind: 'nn',
    stem: 'Ich schicke', datPhrase: 'meiner Tante', akkPhrase: 'eine Postkarte', punct: '.',
    translation: 'I send my aunt a postcard.',
    explanation: 'Zwei Nomen: meiner Tante (Dativ) zuerst.' },
  { id: 'oo-nn-empfehlen', verb: 'empfehlen', level: 'B1', kind: 'nn',
    stem: 'Der Arzt empfiehlt', datPhrase: 'dem Patienten', akkPhrase: 'eine Kur', punct: '.',
    translation: 'The doctor recommends a health cure to the patient.',
    explanation: 'Neutral: dem Patienten (Dativ) vor eine Kur (Akkusativ).' },
  { id: 'oo-nn-leihen', verb: 'leihen', level: 'B1', kind: 'nn',
    stem: 'Sie leiht', datPhrase: 'ihrem Bruder', akkPhrase: 'das Auto', punct: '.',
    translation: 'She lends her brother the car.',
    explanation: 'Zwei Nomen: ihrem Bruder (Dativ) vor das Auto (Akkusativ).' },

  // pp — two pronouns: AKK before DAT (Ich gebe es ihm)
  { id: 'oo-pp-geben', verb: 'geben', level: 'B1', kind: 'pp',
    stem: 'Ich gebe', datPhrase: 'ihm', akkPhrase: 'es', punct: '.',
    translation: 'I give it to him.',
    explanation: 'Zwei Pronomen drehen die Folge um: Akkusativ vor Dativ — Ich gebe es ihm, nie *Ich gebe ihm es.' },
  { id: 'oo-pp-schenken', verb: 'schenken', level: 'B1', kind: 'pp',
    stem: 'Wir schenken', datPhrase: 'ihr', akkPhrase: 'ihn', punct: '.',
    translation: 'We give it (the ring) to her.',
    explanation: 'Beide Objekte pronominal → Akkusativ (ihn) vor Dativ (ihr).' },
  { id: 'oo-pp-zeigen', verb: 'zeigen', level: 'B1', kind: 'pp',
    stem: 'Er zeigt', datPhrase: 'uns', akkPhrase: 'sie', punct: '.',
    translation: 'He shows it (the apartment) to us.',
    explanation: 'Pronomen + Pronomen: sie (Akk) vor uns (Dat).' },
  { id: 'oo-pp-erklaeren', verb: 'erklären', level: 'B1', kind: 'pp',
    stem: 'Sie erklärt', datPhrase: 'mir', akkPhrase: 'sie', punct: '.',
    translation: 'She explains it (the rule) to me.',
    explanation: 'Beide pronominal → Akkusativ zuerst: Sie erklärt sie mir.' },
  { id: 'oo-pp-bringen', verb: 'bringen', level: 'B1', kind: 'pp',
    stem: 'Ich bringe', datPhrase: 'dir', akkPhrase: 'es', punct: '.',
    translation: 'I will bring it to you.',
    explanation: 'es (Akk) vor dir (Dat): Ich bringe es dir.' },
  { id: 'oo-pp-schicken', verb: 'schicken', level: 'B1', kind: 'pp',
    stem: 'Wir schicken', datPhrase: 'euch', akkPhrase: 'sie', punct: '.',
    translation: 'We will send them (the photos) to you.',
    explanation: 'Beide pronominal → sie (Akk) vor euch (Dat).' },
  { id: 'oo-pp-leihen', verb: 'leihen', level: 'B1', kind: 'pp',
    stem: 'Er leiht', datPhrase: 'ihnen', akkPhrase: 'es', punct: '.',
    translation: 'He lends it (the bicycle) to them.',
    explanation: 'es (Akk) vor ihnen (Dat): Er leiht es ihnen.' },

  // mixed — one pronoun, one noun: the pronoun comes first, whatever its case
  { id: 'oo-mx-es-kind', verb: 'geben', level: 'B2', kind: 'mixed',
    stem: 'Ich gebe', datPhrase: 'dem Kind', akkPhrase: 'es', pronounRole: 'accusative', punct: '.',
    translation: 'I give it to the child.',
    explanation: 'Pronomen vor Nomen: es (Akk-Pronomen) steht vor dem Kind — Ich gebe es dem Kind.' },
  { id: 'oo-mx-ihm-buch', verb: 'geben', level: 'B2', kind: 'mixed',
    stem: 'Ich gebe', datPhrase: 'ihm', akkPhrase: 'das Buch', pronounRole: 'dative', punct: '.',
    translation: 'I give him the book.',
    explanation: 'Pronomen vor Nomen: ihm (Dat-Pronomen) vor das Buch.' },
  { id: 'oo-mx-ihn-mutter', verb: 'schenken', level: 'B2', kind: 'mixed',
    stem: 'Sie schenkt', datPhrase: 'ihrer Mutter', akkPhrase: 'ihn', pronounRole: 'accusative', punct: '.',
    translation: 'She gives it (the scarf) to her mother.',
    explanation: 'Das Pronomen geht voran: Sie schenkt ihn ihrer Mutter.' },
  { id: 'oo-mx-ihr-fotos', verb: 'zeigen', level: 'B2', kind: 'mixed',
    stem: 'Wir zeigen', datPhrase: 'ihr', akkPhrase: 'die Fotos', pronounRole: 'dative', punct: '.',
    translation: 'We show her the photos.',
    explanation: 'ihr (Dat-Pronomen) vor die Fotos (Nomen).' },
  { id: 'oo-mx-sie-kindern', verb: 'erzählen', level: 'B2', kind: 'mixed',
    stem: 'Der Opa erzählt', datPhrase: 'den Kindern', akkPhrase: 'sie', pronounRole: 'accusative', punct: '.',
    translation: 'Grandpa tells it (the story) to the children.',
    explanation: 'sie (Akk-Pronomen) vor den Kindern: Der Opa erzählt sie den Kindern.' },
  { id: 'oo-mx-sie-chef', verb: 'schicken', level: 'B2', kind: 'mixed',
    stem: 'Ich schicke', datPhrase: 'meinem Chef', akkPhrase: 'sie', pronounRole: 'accusative', punct: '.',
    translation: 'I send them (the documents) to my boss.',
    explanation: 'Pronomen zuerst: Ich schicke sie meinem Chef.' },
  { id: 'oo-mx-mir-zeitung', verb: 'bringen', level: 'B2', kind: 'mixed',
    stem: 'Bringst du', datPhrase: 'mir', akkPhrase: 'die Zeitung', pronounRole: 'dative', punct: '?',
    translation: 'Will you bring me the newspaper?',
    explanation: 'mir (Dat-Pronomen) vor die Zeitung: Bringst du mir die Zeitung?' },
]
