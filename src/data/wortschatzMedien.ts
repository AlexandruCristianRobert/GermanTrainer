import type { Vokabel } from './wortschatz'

export const WORTSCHATZ_MEDIEN: Vokabel[] = [
  // ── Einzelwörter: Nomen ─────────────────────────────────────────
  {
    id: 'vk-medien-schlagzeile', feld: 'Medien', kind: 'einzelwort',
    de: 'die Schlagzeile', en: 'headline (of a newspaper article)', plural: 'Schlagzeilen',
    variants: [],
    saetze: [
      { de: 'Die {{Schlagzeile}} verspricht mehr, als der Artikel am Ende hält.',
        en: 'The headline promises more than the article ultimately delivers.' },
      { de: 'Reißerische {{Schlagzeilen}} sollen vor allem Klicks erzeugen, nicht informieren.',
        en: 'Sensationalist headlines are meant above all to generate clicks, not to inform.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-medien-kommentar', feld: 'Medien', kind: 'einzelwort',
    de: 'der Kommentar', en: 'comment (a reader\'s remark below an article)', plural: 'Kommentare',
    variants: [],
    saetze: [
      { de: 'Unter dem Beitrag stehen inzwischen über tausend {{Kommentare}}.',
        en: 'There are now more than a thousand comments below the post.' },
      { de: 'Ein anonymer {{Kommentar}} zählt für mich weniger als eine namentliche Meinung.',
        en: 'For me an anonymous comment counts for less than a named opinion.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-medien-falschmeldung', feld: 'Medien', kind: 'einzelwort',
    de: 'die Falschmeldung', en: 'false report (a fake news item)', plural: 'Falschmeldungen',
    variants: [],
    saetze: [
      { de: '{{Falschmeldungen}} verbreiten sich in sozialen Netzwerken schneller als Berichtigungen.',
        en: 'False reports spread faster on social networks than corrections do.' },
      { de: 'Die Redaktion musste eine {{Falschmeldung}} noch am selben Abend zurücknehmen.',
        en: 'The editorial team had to retract a false report the same evening.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-medien-redaktion', feld: 'Medien', kind: 'einzelwort',
    de: 'die Redaktion', en: 'editorial team (the journalists producing a paper or programme)', plural: 'Redaktionen',
    variants: [],
    saetze: [
      { de: 'Die {{Redaktion}} prüft jeden Leserbrief vor der Veröffentlichung.',
        en: 'The editorial team checks every letter to the editor before publication.' },
      { de: 'Kleine {{Redaktionen}} können sich aufwendige Recherchen kaum noch leisten.',
        en: 'Small editorial teams can hardly afford elaborate investigative work any more.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-medien-zuschauer', feld: 'Medien', kind: 'einzelwort',
    de: 'der Zuschauer', en: 'viewer (member of a television audience)', plural: 'Zuschauer',
    variants: [],
    saetze: [
      { de: 'Bei jüngeren {{Zuschauern}} kommt das neue Format überhaupt nicht an.',
        en: 'The new format does not go down at all with younger viewers.' },
      { de: 'Ein aufmerksamer {{Zuschauer}} bemerkte den Fehler und schrieb der Redaktion.',
        en: 'An attentive viewer noticed the mistake and wrote to the editorial team.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-medien-reichweite', feld: 'Medien', kind: 'einzelwort',
    de: 'die Reichweite', en: 'reach (size of the audience a post or outlet gets)', plural: 'Reichweiten',
    variants: [],
    saetze: [
      { de: 'Der Beitrag erzielte eine {{Reichweite}} von mehreren Millionen Nutzern.',
        en: 'The post achieved a reach of several million users.' },
      { de: 'Große {{Reichweiten}} bedeuten nicht automatisch eine hohe journalistische Qualität.',
        en: 'Large audience figures do not automatically mean high journalistic quality.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-medien-sendung', feld: 'Medien', kind: 'einzelwort',
    de: 'die Sendung', en: 'programme (a broadcast show)', plural: 'Sendungen',
    variants: [],
    saetze: [
      { de: 'Die {{Sendung}} läuft seit zwanzig Jahren jeden Sonntagabend.',
        en: 'The programme has been on every Sunday evening for twenty years.' },
      { de: 'Politische {{Sendungen}} erreichen junge Menschen kaum noch im Fernsehen.',
        en: 'Political programmes hardly reach young people on television any more.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-medien-streamingplattform', feld: 'Medien', kind: 'einzelwort',
    de: 'die Streamingplattform', en: 'streaming platform', plural: 'Streamingplattformen',
    variants: [],
    saetze: [
      { de: 'Immer mehr Haushalte kündigen das Abo einer {{Streamingplattform}} wieder.',
        en: 'More and more households are cancelling their subscription to a streaming platform.' },
      { de: '{{Streamingplattformen}} produzieren inzwischen eigene Dokumentationen und konkurrieren mit den Sendern.',
        en: 'Streaming platforms now produce their own documentaries and compete with the broadcasters.' }
    ],
    source: 'seed'
  },

  // ── Einzelwörter: Verben ────────────────────────────────────────
  {
    id: 'vk-medien-recherchieren', feld: 'Medien', kind: 'einzelwort',
    de: 'recherchieren', en: 'to research (dig up facts for a report)',
    variants: [],
    saetze: [
      { de: 'Die Journalistin {{recherchierte}} monatelang, bevor sie den Artikel veröffentlichte.',
        en: 'The journalist did research for months before publishing the article.' },
      { de: 'Unter dem Druck der Aktualität lässt sich kaum sorgfältig {{recherchieren}}.',
        en: 'Under the pressure of breaking news it is hardly possible to research carefully.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-medien-verbreiten', feld: 'Medien', kind: 'einzelwort',
    de: 'verbreiten', en: 'to spread (news or rumours, pass them on widely)',
    variants: [],
    saetze: [
      { de: 'Nutzer {{verbreiten}} Gerüchte oft, ohne sie vorher zu prüfen.',
        en: 'Users often spread rumours without checking them first.' },
      { de: 'Das Video wurde innerhalb weniger Stunden tausendfach {{verbreitet}}.',
        en: 'The video was spread a thousandfold within a few hours.' }
    ],
    source: 'seed'
  },

  // ── Einzelwörter: Adjektive ─────────────────────────────────────
  {
    id: 'vk-medien-serioes', feld: 'Medien', kind: 'einzelwort',
    de: 'seriös', en: 'reputable (trustworthy, of a source or outlet)',
    variants: [],
    saetze: [
      { de: '{{Seriöse}} Medien trennen deutlich zwischen Bericht und Meinung.',
        en: 'Reputable media clearly separate reporting from opinion.' },
      { de: 'Die Seite wirkt auf den ersten Blick durchaus {{seriös}}.',
        en: 'At first glance the site looks quite reputable.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-medien-einseitig', feld: 'Medien', kind: 'einzelwort',
    de: 'einseitig', en: 'one-sided (biased in its coverage)',
    variants: [],
    saetze: [
      { de: 'Die Berichterstattung über den Streit war auffallend {{einseitig}}.',
        en: 'The coverage of the dispute was strikingly one-sided.' },
      { de: 'Wer nur eine Zeitung liest, bekommt ein {{einseitiges}} Bild.',
        en: 'Anyone who reads only one newspaper gets a one-sided picture.' }
    ],
    source: 'seed'
  },

  // ── Wortverbindungen ────────────────────────────────────────────
  {
    id: 'vk-medien-ueber-thema-berichten', feld: 'Medien', kind: 'wortverbindung',
    de: 'über ein Thema berichten', en: 'to report on a topic', rektion: 'über + Akk',
    variants: ['über Themen berichten'],
    saetze: [
      { de: 'Zeitungen sollten auch dann {{über ein Thema berichten}}, wenn es unbequem ist.',
        en: 'Newspapers should report on a topic even when it is inconvenient.' },
      { de: 'Es ist die Aufgabe der Presse, sachlich {{über ein Thema zu berichten}}.',
        en: 'It is the job of the press to report on a topic objectively.',
        blankVariants: ['über Themen zu berichten'] }
    ],
    source: 'seed'
  },
  {
    id: 'vk-medien-einfluss-nehmen', feld: 'Medien', kind: 'wortverbindung',
    de: 'Einfluss auf die Meinungsbildung nehmen', en: 'to influence how public opinion forms', rektion: 'auf + Akk',
    variants: [],
    saetze: [
      { de: 'Algorithmen können erheblichen {{Einfluss auf die Meinungsbildung nehmen}}.',
        en: 'Algorithms can considerably influence how public opinion forms.' },
      { de: 'Die Kampagne hat massiv {{Einfluss auf die Meinungsbildung genommen}}.',
        en: 'The campaign massively influenced how public opinion formed.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-medien-an-glaubwuerdigkeit-verlieren', feld: 'Medien', kind: 'wortverbindung',
    de: 'an Glaubwürdigkeit verlieren', en: 'to lose credibility', rektion: 'an + Dat',
    variants: [],
    saetze: [
      { de: 'Ein Sender, der Fehler verschweigt, wird {{an Glaubwürdigkeit verlieren}}.',
        en: 'A broadcaster that conceals mistakes will lose credibility.' },
      { de: 'Die Zeitung hat durch den erfundenen Bericht stark {{an Glaubwürdigkeit verloren}}.',
        en: 'The newspaper lost a great deal of credibility through the fabricated report.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-medien-meinung-nachricht-unterscheiden', feld: 'Medien', kind: 'wortverbindung',
    de: 'zwischen Meinung und Nachricht unterscheiden', en: 'to distinguish opinion from news', rektion: 'zwischen + Dat',
    variants: [],
    saetze: [
      { de: 'Viele Leser können online kaum noch {{zwischen Meinung und Nachricht unterscheiden}}.',
        en: 'Online, many readers can hardly distinguish opinion from news any more.' },
      { de: 'In der Schule lernt man, {{zwischen Meinung und Nachricht zu unterscheiden}}.',
        en: 'At school one learns to distinguish opinion from news.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-medien-behauptung-ueberpruefen', feld: 'Medien', kind: 'wortverbindung',
    de: 'eine Behauptung überprüfen', en: 'to verify a claim',
    variants: ['Behauptungen überprüfen'],
    saetze: [
      { de: 'Vor dem Teilen sollte man {{eine Behauptung überprüfen}}.',
        en: 'Before sharing, one should verify a claim.' },
      { de: 'Die Redaktion hat alle strittigen {{Behauptungen überprüft}} und drei richtiggestellt.',
        en: 'The editorial team verified all disputed claims and corrected three of them.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-medien-beitrag-teilen', feld: 'Medien', kind: 'wortverbindung',
    de: 'einen Beitrag teilen', en: 'to share a post (on social media)',
    variants: ['Beiträge teilen'],
    saetze: [
      { de: 'Bevor Sie {{einen Beitrag teilen}}, prüfen Sie bitte die Quelle.',
        en: 'Before you share a post, please check the source.' },
      { de: 'Viele Jugendliche haben ungeprüft {{Beiträge geteilt}} und sich später entschuldigt.',
        en: 'Many young people shared posts without checking them and apologised later.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-medien-werbung-schalten', feld: 'Medien', kind: 'wortverbindung',
    de: 'Werbung schalten', en: 'to place advertising (buy ad space)',
    variants: [],
    saetze: [
      { de: 'Kleine Zeitungen überleben nur, wenn Firmen weiterhin {{Werbung schalten}}.',
        en: 'Small newspapers survive only if companies continue to place advertising.' },
      { de: 'Der Konzern hat vor der Wahl in allen Netzwerken {{Werbung geschaltet}}.',
        en: 'Before the election the corporation placed advertising on all networks.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-medien-interview-fuehren', feld: 'Medien', kind: 'wortverbindung',
    de: 'ein Interview führen', en: 'to conduct an interview',
    variants: ['Interviews führen'],
    saetze: [
      { de: 'Die Reporterin durfte {{ein Interview führen}}, aber nur unter Auflagen.',
        en: 'The reporter was allowed to conduct an interview, but only under conditions.' },
      { de: 'Für die Reportage hat er über zwanzig {{Interviews geführt}}.',
        en: 'For the feature he conducted more than twenty interviews.' }
    ],
    source: 'seed'
  }
]
