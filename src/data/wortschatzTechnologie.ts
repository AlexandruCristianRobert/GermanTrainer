import type { Vokabel } from './wortschatz'

export const WORTSCHATZ_TECHNOLOGIE: Vokabel[] = [
  {
    id: 'vk-technologie-endgeraet', feld: 'Technologie', kind: 'einzelwort',
    de: 'das Endgerät', en: 'device (end-user device such as a phone or laptop)', plural: 'Endgeräte',
    variants: [],
    saetze: [
      { de: 'Die App läuft nur auf neueren {{Endgeräten}} zuverlässig und ohne Abstürze.',
        en: 'The app only runs reliably and without crashes on newer devices.' },
      { de: 'Jeder Haushalt besitzt heute mindestens ein internetfähiges {{Endgerät}}.',
        en: 'Every household today owns at least one internet-capable device.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-technologie-sicherheitsluecke', feld: 'Technologie', kind: 'einzelwort',
    de: 'die Sicherheitslücke', en: 'security vulnerability (gap that attackers can exploit)', plural: 'Sicherheitslücken',
    variants: [],
    saetze: [
      { de: 'Der Hersteller hat die {{Sicherheitslücke}} erst nach mehreren Wochen geschlossen.',
        en: 'The manufacturer only closed the security vulnerability after several weeks.' },
      { de: 'In veralteten Programmen finden Angreifer besonders leicht {{Sicherheitslücken}}.',
        en: 'In outdated programs, attackers find security vulnerabilities particularly easily.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-technologie-algorithmus', feld: 'Technologie', kind: 'einzelwort',
    de: 'der Algorithmus', en: 'algorithm', plural: 'Algorithmen',
    variants: [],
    saetze: [
      { de: 'Welche Beiträge angezeigt werden, entscheidet ein undurchsichtiger {{Algorithmus}}.',
        en: 'An opaque algorithm decides which posts are displayed.' },
      { de: 'Die {{Algorithmen}} großer Plattformen bevorzugen nachweislich emotionale Inhalte.',
        en: 'The algorithms of large platforms demonstrably favour emotional content.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-technologie-sprachassistent', feld: 'Technologie', kind: 'einzelwort',
    de: 'der Sprachassistent', en: 'voice assistant (device you operate by speaking)', plural: 'Sprachassistenten',
    variants: [],
    saetze: [
      { de: 'Der {{Sprachassistent}} versteht Dialekte noch immer ausgesprochen schlecht.',
        en: 'The voice assistant still understands dialects extremely poorly.' },
      { de: 'Viele Nutzer schalten {{Sprachassistenten}} aus Sorge um ihre Privatsphäre ab.',
        en: 'Many users switch off voice assistants out of concern for their privacy.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-technologie-schnittstelle', feld: 'Technologie', kind: 'einzelwort',
    de: 'die Schnittstelle', en: 'interface (point where two systems connect)', plural: 'Schnittstellen',
    variants: [],
    saetze: [
      { de: 'Zwischen den beiden Programmen fehlt bis heute eine funktionierende {{Schnittstelle}}.',
        en: 'To this day there is no working interface between the two programs.' },
      { de: 'Offene {{Schnittstellen}} erleichtern kleinen Anbietern den Zugang zum Markt.',
        en: 'Open interfaces make it easier for small providers to enter the market.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-technologie-rechenzentrum', feld: 'Technologie', kind: 'einzelwort',
    de: 'das Rechenzentrum', en: 'data centre', plural: 'Rechenzentren',
    variants: [],
    saetze: [
      { de: 'Das neue {{Rechenzentrum}} verbraucht so viel Strom wie eine Kleinstadt.',
        en: 'The new data centre consumes as much electricity as a small town.' },
      { de: 'Große {{Rechenzentren}} entstehen bevorzugt dort, wo Strom günstig ist.',
        en: 'Large data centres are preferably built where electricity is cheap.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-technologie-verschluesselung', feld: 'Technologie', kind: 'einzelwort',
    de: 'die Verschlüsselung', en: 'encryption', plural: 'Verschlüsselungen',
    variants: [],
    saetze: [
      { de: 'Dank der {{Verschlüsselung}} kann niemand die Nachrichten unterwegs mitlesen.',
        en: 'Thanks to the encryption nobody can read the messages in transit.' },
      { de: 'Der Anbieter bietet inzwischen eine durchgängige {{Verschlüsselung}} aller Chats an.',
        en: 'The provider now offers end-to-end encryption of all chats.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-technologie-zugriff', feld: 'Technologie', kind: 'einzelwort',
    de: 'der Zugriff', en: 'access (to a system or to data)', plural: 'Zugriffe',
    variants: [],
    saetze: [
      { de: 'Ohne Passwort ist der {{Zugriff}} auf die Personaldaten nicht möglich.',
        en: 'Without a password, access to the personnel data is not possible.' },
      { de: 'Das Protokoll zeigt alle {{Zugriffe}} der letzten Woche auf die Datenbank.',
        en: 'The log shows all accesses to the database over the past week.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-technologie-aktualisieren', feld: 'Technologie', kind: 'einzelwort',
    de: 'aktualisieren', en: 'to update (bring software or data to the latest version)',
    variants: [],
    saetze: [
      { de: 'Das Betriebssystem lässt sich auch nachts automatisch {{aktualisieren}}.',
        en: 'The operating system can also be updated automatically at night.' },
      { de: 'Die Behörde hat ihre Webseite seit Monaten nicht {{aktualisiert}}.',
        en: 'The authority has not updated its website for months.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-technologie-abstuerzen', feld: 'Technologie', kind: 'einzelwort',
    de: 'abstürzen', en: 'to crash (of a program or device: to stop working suddenly)',
    variants: [],
    saetze: [
      { de: 'Wenn das Programm mitten in der Arbeit {{abstürzt}}, sind Daten verloren.',
        en: 'If the program crashes in the middle of your work, data is lost.' },
      { de: 'Der Rechner ist gestern zweimal ohne erkennbaren Grund {{abgestürzt}}.',
        en: 'The computer crashed twice yesterday for no apparent reason.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-technologie-benutzerfreundlich', feld: 'Technologie', kind: 'einzelwort',
    de: 'benutzerfreundlich', en: 'user-friendly (easy to operate)',
    variants: [],
    saetze: [
      { de: 'Die neue Oberfläche ist deutlich {{benutzerfreundlicher}} als die alte Version.',
        en: 'The new interface is considerably more user-friendly than the old version.' },
      { de: 'Behörden brauchen endlich {{benutzerfreundliche}} Formulare für ihre Online-Anträge.',
        en: 'Public authorities finally need user-friendly forms for their online applications.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-technologie-stoeranfaellig', feld: 'Technologie', kind: 'einzelwort',
    de: 'störanfällig', en: 'prone to breaking down (liable to malfunction)',
    variants: [],
    saetze: [
      { de: 'Die alte Software ist inzwischen ausgesprochen {{störanfällig}} geworden.',
        en: 'The old software has become extremely prone to breaking down.' },
      { de: 'Eine {{störanfällige}} Technik gefährdet im Krankenhaus wichtige Behandlungsabläufe.',
        en: 'Technology that is prone to breaking down endangers important treatment procedures in hospital.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-technologie-neuester-stand', feld: 'Technologie', kind: 'wortverbindung',
    de: 'auf dem neuesten Stand sein', en: 'to be up to date (have the latest version or knowledge)',
    rektion: 'auf + Dat',
    variants: ['auf dem neusten Stand sein'],
    saetze: [
      { de: 'Wer beruflich programmiert, muss technisch immer {{auf dem neuesten Stand sein}}.',
        en: 'Anyone who programs professionally always has to be technically up to date.' },
      { de: 'Die Firma will, dass alle Rechner {{auf dem neuesten Stand sind}}.',
        en: 'The company wants all computers to be up to date.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-technologie-technik-abhaengig', feld: 'Technologie', kind: 'wortverbindung',
    de: 'von der Technik abhängig sein', en: 'to be dependent on technology',
    rektion: 'von + Dat',
    variants: [],
    saetze: [
      { de: 'Ganze Branchen dürften künftig noch stärker {{von der Technik abhängig sein}}.',
        en: 'Whole sectors are likely to be even more dependent on technology in future.' },
      { de: 'Es stört mich, dass wir im Alltag so {{von der Technik abhängig sind}}.',
        en: 'It bothers me that we are so dependent on technology in everyday life.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-technologie-update-installieren', feld: 'Technologie', kind: 'wortverbindung',
    de: 'ein Update installieren', en: 'to install an update',
    variants: ['Updates installieren'],
    saetze: [
      { de: 'Man sollte {{ein Update installieren}}, sobald der Hersteller es bereitstellt.',
        en: 'You should install an update as soon as the manufacturer provides it.' },
      { de: 'Die IT-Abteilung hat über Nacht {{ein Update installiert}} und alles getestet.',
        en: 'The IT department installed an update overnight and tested everything.',
        blankVariants: ['Updates installiert'] }
    ],
    source: 'seed'
  },
  {
    id: 'vk-technologie-probleme-beheben', feld: 'Technologie', kind: 'wortverbindung',
    de: 'technische Probleme beheben', en: 'to fix technical problems',
    variants: [],
    saetze: [
      { de: 'Ein kleines Team muss hier täglich {{technische Probleme beheben}}.',
        en: 'A small team has to fix technical problems here every day.' },
      { de: 'Der Support hat {{technische Probleme behoben}}, ohne die Nutzer zu informieren.',
        en: 'Support fixed technical problems without informing the users.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-technologie-daten-weitergeben', feld: 'Technologie', kind: 'wortverbindung',
    de: 'Daten an Dritte weitergeben', en: 'to pass data on to third parties',
    rektion: 'an + Akk',
    variants: [],
    saetze: [
      { de: 'Viele kostenlose Apps dürfen {{Daten an Dritte weitergeben}}, ohne zu fragen.',
        en: 'Many free apps are allowed to pass data on to third parties without asking.' },
      { de: 'Der Anbieter hat jahrelang {{Daten an Dritte weitergegeben}} und dafür Geld erhalten.',
        en: 'For years the provider passed data on to third parties and was paid for it.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-technologie-ki-einsetzen', feld: 'Technologie', kind: 'wortverbindung',
    de: 'künstliche Intelligenz einsetzen', en: 'to use artificial intelligence',
    variants: [],
    saetze: [
      { de: 'Immer mehr Kanzleien wollen {{künstliche Intelligenz einsetzen}}, um Verträge zu prüfen.',
        en: 'More and more law firms want to use artificial intelligence to check contracts.' },
      { de: 'Die Redaktion hat bei der Recherche erstmals {{künstliche Intelligenz eingesetzt}}.',
        en: 'The editorial team used artificial intelligence in its research for the first time.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-technologie-daten-cloud-speichern', feld: 'Technologie', kind: 'wortverbindung',
    de: 'Daten in der Cloud speichern', en: 'to store data in the cloud',
    rektion: 'in + Dat',
    variants: [],
    saetze: [
      { de: 'Viele Firmen wollen {{Daten in der Cloud speichern}}, um Kosten zu sparen.',
        en: 'Many companies want to store data in the cloud in order to save costs.' },
      { de: 'Die Behörde hat jahrelang {{Daten in der Cloud gespeichert}}, obwohl Bedenken bestanden.',
        en: 'For years the authority stored data in the cloud, although there were concerns.' }
    ],
    source: 'seed'
  },
  {
    id: 'vk-technologie-schritt-halten', feld: 'Technologie', kind: 'wortverbindung',
    de: 'mit der Entwicklung Schritt halten', en: 'to keep pace with developments',
    rektion: 'mit + Dat',
    variants: [],
    saetze: [
      { de: 'Kleine Betriebe können kaum {{mit der Entwicklung Schritt halten}}.',
        en: 'Small companies can hardly keep pace with developments.' },
      { de: 'Die Schulen haben bei der Digitalisierung nie {{mit der Entwicklung Schritt gehalten}}.',
        en: 'When it came to digitalisation, the schools never kept pace with developments.' }
    ],
    source: 'seed'
  }
]
