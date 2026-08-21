import type { Vokabel } from './wortschatz'

export const WORTSCHATZ_UMWELT: Vokabel[] = [
  {
    id: 'vk-umwelt-massnahme-ergreifen', feld: 'Umwelt', kind: 'wortverbindung',
    de: 'eine Maßnahme ergreifen', en: 'to take a measure',
    variants: ['Maßnahmen ergreifen'],
    saetze: [
      { de: 'Die Stadt hat endlich {{eine Maßnahme ergriffen}}, um den Lärm zu senken.',
        en: 'The city finally took a measure to reduce the noise.' },
      { de: 'Gegen die steigenden Emissionen müssen wir {{Maßnahmen ergreifen}}.',
        en: 'We must take measures against rising emissions.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-umwelt-verpackung', feld: 'Umwelt', kind: 'einzelwort',
    de: 'die Verpackung', en: 'packaging', plural: 'Verpackungen',
    variants: [],
    saetze: [
      { de: 'Viele Produkte stecken in unnötig großer {{Verpackung}}.',
        en: 'Many products come in needlessly large packaging.' },
      { de: 'Der Laden verzichtet vollständig auf {{Verpackungen}} aus Plastik.',
        en: 'The shop completely does without plastic packaging.' }
    ],
    source: 'seed'
  }
]
