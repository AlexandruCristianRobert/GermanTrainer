// Dativ module — family V (Zwillinge): near-synonym pairs on opposite sides of
// the case line. TWIN GATE (tests/data/dativeTwins.test.ts): the dative member
// carries case 'dative' (or 'varies' for glauben) in VERBS; the twin exists in
// VERBS and is NOT dative — an invented contrast cannot ship. gehören zu is a
// particle twin (same verb + zu); glauben is its own twin (person Dat / thing Akk).

import type { DativeDrillLevel } from './dativeExperiencer'

export interface TwinPair {
  pairId: string
  dativeVerb: string      // VERBS.german, case 'dative' (or 'varies': glauben)
  twin: string            // VERBS.german, the non-dative member
  twinParticle?: string   // 'zu' for gehören zu
  contrast: string        // one-line meaning/case contrast (cheatsheet table row)
}

export const TWIN_PAIRS: TwinPair[] = [
  { pairId: 'antworten-beantworten', dativeVerb: 'antworten', twin: 'beantworten',
    contrast: 'antworten + Dat (der Person antworten) · beantworten + Akk (die Frage beantworten)' },
  { pairId: 'folgen-verfolgen', dativeVerb: 'folgen', twin: 'verfolgen',
    contrast: 'folgen + Dat (hinterhergehen) · verfolgen + Akk (jagen, verfolgen)' },
  { pairId: 'zuhoeren-hoeren', dativeVerb: 'zuhören', twin: 'hören',
    contrast: 'zuhören + Dat (aufmerksam lauschen) · hören + Akk (bloß wahrnehmen)' },
  { pairId: 'glauben-dat-akk', dativeVerb: 'glauben', twin: 'glauben',
    contrast: 'glauben + Dat für Personen (ich glaube dir) · + Akk für Sachen (ich glaube die Geschichte nicht)' },
  { pairId: 'gehoeren-gehoeren-zu', dativeVerb: 'gehören', twin: 'gehören', twinParticle: 'zu',
    contrast: 'gehören + Dat = Besitz (das Rad gehört mir) · gehören zu = Zugehörigkeit (Belgien gehört zur EU)' },
  { pairId: 'helfen-unterstuetzen', dativeVerb: 'helfen', twin: 'unterstützen',
    contrast: 'helfen + Dat · unterstützen + Akk — gleiche Idee, andere Seite der Kasusgrenze' },
  { pairId: 'begegnen-treffen', dativeVerb: 'begegnen', twin: 'treffen',
    contrast: 'begegnen + Dat, Perfekt mit sein (zufällig) · treffen + Akk, mit haben (auch verabredet)' },
  { pairId: 'raten-beraten', dativeVerb: 'raten', twin: 'beraten',
    contrast: 'raten + Dat (jemandem einen Rat geben) · beraten + Akk (jemanden fachlich beraten)' },
]

export interface TwinItem {
  id: string
  pairId: string
  level: DativeDrillLevel
  kind: 'verb-choice' | 'object-choice'
  prompt: string          // one ___ gap
  options: string[]       // exactly 2
  answers: string[]       // exactly 1
  translation: string
  explanation: string
}

export const TWIN_ITEMS: TwinItem[] = [
  // antworten | beantworten
  { id: 'tw-antworte-lehrer', pairId: 'antworten-beantworten', level: 'B1', kind: 'verb-choice',
    prompt: 'Ich ___ dem Lehrer sofort.', options: ['antworte', 'beantworte'], answers: ['antworte'],
    translation: 'I answer the teacher right away.',
    explanation: 'dem Lehrer ist Dativ → antworten (= [eine Antwort] geben + Dat). beantworten nimmt die Sache im Akkusativ.' },
  { id: 'tw-beantworte-mail', pairId: 'antworten-beantworten', level: 'B1', kind: 'verb-choice',
    prompt: 'Ich ___ die E-Mail heute Abend.', options: ['beantworte', 'antworte'], answers: ['beantworte'],
    translation: 'I will answer the email tonight.',
    explanation: 'die E-Mail ist Akkusativ-Sache → beantworten. antworten ginge nur mit Dativ-Person (oder auf + Akk).' },
  { id: 'tw-frage-akk', pairId: 'antworten-beantworten', level: 'B1', kind: 'object-choice',
    prompt: 'Sie beantwortet ___ Frage ruhig.', options: ['die', 'der'], answers: ['die'],
    translation: 'She answers the question calmly.',
    explanation: 'beantworten regiert den Akkusativ: die Frage. der Frage wäre der Dativ des Zwillings antworten.' },

  // folgen | verfolgen
  { id: 'tw-hund-folgt', pairId: 'folgen-verfolgen', level: 'B1', kind: 'verb-choice',
    prompt: 'Der Hund ___ dem Kind bis zur Schule.', options: ['folgt', 'verfolgt'], answers: ['folgt'],
    translation: 'The dog follows the child all the way to school.',
    explanation: 'dem Kind ist Dativ → folgen. verfolgen (+ Akk) hieße jagen.' },
  { id: 'tw-polizei-verfolgt', pairId: 'folgen-verfolgen', level: 'B1', kind: 'verb-choice',
    prompt: 'Die Polizei ___ den Dieb durch die Stadt.', options: ['verfolgt', 'folgt'], answers: ['verfolgt'],
    translation: 'The police pursue the thief through the city.',
    explanation: 'den Dieb ist Akkusativ → verfolgen (jagen). folgen bräuchte den Dativ: dem Dieb.' },
  { id: 'tw-reiseleiterin', pairId: 'folgen-verfolgen', level: 'B1', kind: 'object-choice',
    prompt: 'Wir folgen ___ Reiseleiterin.', options: ['der', 'die'], answers: ['der'],
    translation: 'We follow the tour guide.',
    explanation: 'folgen regiert den Dativ: der Reiseleiterin. die Reiseleiterin (Akk) gehört zu verfolgen.' },

  // zuhören | hören
  { id: 'tw-lehrerin-zu', pairId: 'zuhoeren-hoeren', level: 'B1', kind: 'object-choice',
    prompt: 'Die Schüler hören ___ aufmerksam zu.', options: ['der Lehrerin', 'die Lehrerin'], answers: ['der Lehrerin'],
    translation: 'The pupils listen attentively to the teacher.',
    explanation: 'zuhören (aufmerksames Lauschen) regiert den Dativ: der Lehrerin. die Lehrerin hören hieße nur: ihre Stimme wahrnehmen.' },
  { id: 'tw-musik-akk', pairId: 'zuhoeren-hoeren', level: 'B1', kind: 'object-choice',
    prompt: 'Ich höre ___ am liebsten im Zug.', options: ['Musik', 'der Musik'], answers: ['Musik'],
    translation: 'I like listening to music best on the train.',
    explanation: 'hören nimmt den bloßen Akkusativ: Musik hören. der Musik zuhören ginge — aber dann mit zuhören.' },
  { id: 'tw-kurz-zuhoeren', pairId: 'zuhoeren-hoeren', level: 'B1', kind: 'verb-choice',
    prompt: 'Kannst du mir bitte kurz ___?', options: ['zuhören', 'hören'], answers: ['zuhören'],
    translation: 'Can you please listen to me for a moment?',
    explanation: 'mir ist Dativ → zuhören. *mir hören ist unmöglich; hören nähme mich (Akk) und hieße etwas anderes.' },

  // glauben +Dat | +Akk
  { id: 'tw-glaube-mann', pairId: 'glauben-dat-akk', level: 'B2', kind: 'object-choice',
    prompt: 'Ich glaube ___ nicht.', options: ['dem Mann', 'den Mann'], answers: ['dem Mann'],
    translation: 'I do not believe the man.',
    explanation: 'Personen, denen man glaubt, stehen im Dativ: dem Mann. den Mann glauben gibt es nicht.' },
  { id: 'tw-glaube-geschichte', pairId: 'glauben-dat-akk', level: 'B2', kind: 'object-choice',
    prompt: 'Ich glaube ___ Geschichte nicht.', options: ['die', 'der'], answers: ['die'],
    translation: 'I do not believe the story.',
    explanation: 'Sachen, die man glaubt, stehen im Akkusativ: die Geschichte. Der Dativ ist für die Person reserviert.' },
  { id: 'tw-glaubst-du', pairId: 'glauben-dat-akk', level: 'B2', kind: 'object-choice',
    prompt: 'Glaubst du ___ etwa nicht?', options: ['mir', 'mich'], answers: ['mir'],
    translation: 'Do you not believe me?',
    explanation: 'Ich bin eine Person → Dativ mir. *Glaubst du mich ist der englische Sog (believe me).' },

  // gehören +Dat | gehören zu
  { id: 'tw-fahrrad', pairId: 'gehoeren-gehoeren-zu', level: 'B2', kind: 'object-choice',
    prompt: 'Das Fahrrad gehört ___ Schwester.', options: ['meiner', 'zu meiner'], answers: ['meiner'],
    translation: 'The bicycle belongs to my sister.',
    explanation: 'Besitz = gehören + bloßer Dativ: meiner Schwester. gehören zu hieße Teil-von-etwas-Sein.' },
  { id: 'tw-belgien', pairId: 'gehoeren-gehoeren-zu', level: 'B2', kind: 'object-choice',
    prompt: 'Belgien gehört ___ Europäischen Union.', options: ['zur', 'der'], answers: ['zur'],
    translation: 'Belgium is part of the European Union.',
    explanation: 'Zugehörigkeit (Mitglied sein) = gehören zu. Belgien gehört der EU hieße: die EU besitzt Belgien.' },
  { id: 'tw-schluessel', pairId: 'gehoeren-gehoeren-zu', level: 'B2', kind: 'object-choice',
    prompt: 'Dieser Schlüssel gehört ___ Hausmeister.', options: ['dem', 'zum'], answers: ['dem'],
    translation: 'This key belongs to the caretaker.',
    explanation: 'Der Hausmeister BESITZT den Schlüssel → bloßer Dativ. zum Hausmeister gehören würde ihn zum Inventar erklären.' },

  // helfen | unterstützen
  { id: 'tw-umzug', pairId: 'helfen-unterstuetzen', level: 'B1', kind: 'object-choice',
    prompt: 'Kannst du ___ beim Umzug helfen?', options: ['mir', 'mich'], answers: ['mir'],
    translation: 'Can you help me with the move?',
    explanation: 'helfen + Dat: mir. *mich helfen ist der englische Sog (help me) — der Akkusativ gehört zu unterstützen.' },
  { id: 'tw-verein', pairId: 'helfen-unterstuetzen', level: 'B2', kind: 'object-choice',
    prompt: 'Der Verein unterstützt ___ mit Geld.', options: ['junge Familien', 'jungen Familien'], answers: ['junge Familien'],
    translation: 'The club supports young families financially.',
    explanation: 'unterstützen + Akk: junge Familien. jungen Familien (Dativ) gehört zum Zwilling helfen.' },
  { id: 'tw-nachbarin', pairId: 'helfen-unterstuetzen', level: 'B1', kind: 'verb-choice',
    prompt: 'Ich ___ meiner Nachbarin im Garten.', options: ['helfe', 'unterstütze'], answers: ['helfe'],
    translation: 'I help my neighbor in the garden.',
    explanation: 'meiner Nachbarin ist Dativ → helfen. unterstützen bräuchte den Akkusativ: meine Nachbarin.' },

  // begegnen | treffen
  { id: 'tw-freund-begegnet', pairId: 'begegnen-treffen', level: 'B2', kind: 'object-choice',
    prompt: 'Gestern bin ich ___ alten Freund begegnet.', options: ['einem', 'einen'], answers: ['einem'],
    translation: 'Yesterday I ran into an old friend.',
    explanation: 'begegnen + Dat (und Perfekt mit sein): einem alten Freund. einen alten Freund gehört zu treffen.' },
  { id: 'tw-freund-treffe', pairId: 'begegnen-treffen', level: 'B1', kind: 'object-choice',
    prompt: 'Ich treffe ___ Freund morgen im Café.', options: ['einen', 'einem'], answers: ['einen'],
    translation: 'I am meeting a friend at the café tomorrow.',
    explanation: 'treffen + Akk: einen Freund. Der Dativ (einem Freund) gehört zu begegnen.' },
  { id: 'tw-professor', pairId: 'begegnen-treffen', level: 'B2', kind: 'verb-choice',
    prompt: 'Im Park bin ich zufällig meinem Professor ___.', options: ['begegnet', 'getroffen'], answers: ['begegnet'],
    translation: 'In the park I ran into my professor by chance.',
    explanation: 'bin + meinem Professor (Dativ) verlangen begegnen. treffen bräuchte habe + meinen Professor.' },

  // raten | beraten
  { id: 'tw-patientin', pairId: 'raten-beraten', level: 'B2', kind: 'object-choice',
    // Subject is feminine on purpose: a masculine "Der Arzt" would put a
    // standalone "Der" in the prompt and trip the answer-leak gate on 'der'.
    prompt: 'Die Ärztin rät ___ Patientin zu mehr Bewegung.', options: ['der', 'die'], answers: ['der'],
    translation: 'The doctor advises the patient to exercise more.',
    explanation: 'raten + Dat (= [einen Rat] geben): der Patientin. die Patientin (Akk) gehört zu beraten.' },
  { id: 'tw-kunden', pairId: 'raten-beraten', level: 'B2', kind: 'object-choice',
    prompt: 'Die Anwältin berät ___ Kunden ausführlich.', options: ['den', 'dem'], answers: ['den'],
    translation: 'The lawyer advises the client in detail.',
    explanation: 'beraten + Akk: den Kunden. dem Kunden (Dativ) gehört zum Zwilling raten.' },
  { id: 'tw-situation', pairId: 'raten-beraten', level: 'B2', kind: 'verb-choice',
    prompt: 'Was würdest du mir in dieser Situation ___?', options: ['raten', 'beraten'], answers: ['raten'],
    translation: 'What would you advise me (to do) in this situation?',
    explanation: 'mir ist Dativ → raten. beraten nähme mich (Akk): du könntest mich beraten.' },
]
