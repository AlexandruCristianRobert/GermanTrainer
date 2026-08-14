//
// Schreiben Teil 2 — Inhalts-Baukästen for a Nachricht (see CONTEXT.md →
// "Schreibauftrag", Inhalts-Baukasten paragraph).
//
// A Schreibauftrag resolves *building blocks*, not a pro/contra argument
// bank: plausible Gründe, Lösungs- und Vorschlag-Ideen, and Textwortschatz.
// Teil 1's ArgumentBank has no place here because a Nachricht argues
// nothing — it apologizes, asks, complains, suggests or thanks, and the
// learner needs material for the four Inhaltspunkte, not two sides of a
// controversy. Each entry is phrased so it can be lifted into the Nachricht
// almost unchanged: „eine Probephase von zwei Monaten vorschlagen", never
// „eine Lösung finden".
//
// Three-layer resolution, cheapest-first (mirrors resolveArgumentBank in
// sprechenArguments.ts):
//   1. `cached`             — an AI-generated bank already saved for this
//                             exact Auftrag (Dexie table `schreibenBaukaesten`;
//                             the caching layer arrives in a later task).
//   2. AUFTRAG_BAUKAESTEN   — hand-authored, richer banks for the five
//                             flagship Aufträge (4 Gründe / 4 Lösungen / 6 words).
//   3. ANLASS_BAUKAESTEN    — one bank per Schreibanlass (3/3/6) — the
//                             offline fallback: EVERY Auftrag resolves to
//                             content with zero AI calls, seeded and
//                             AI-generated alike, which is why the per-Anlass
//                             entries stay generic enough for all four seeds
//                             of their occasion.
//
// BaukastenIdee (gruende/loesungen) and TopicWord (words) are the field types
// composing NachrichtBaukasten — only NachrichtBaukasten itself is named
// below, since every object literal here is checked against it structurally.
import type { NachrichtBaukasten } from './schreibenNachricht'
import type { SchreibAnlass, Schreibauftrag } from './schreibenAuftraege'

// ── Per-Anlass fallback banks (one for EACH Schreibanlass) ──────────

export const ANLASS_BAUKAESTEN: Record<SchreibAnlass, NachrichtBaukasten> = {
  entschuldigung: {
    gruende: [
      { ideaDe: 'ein unaufschiebbarer Arzttermin, der sich nicht verlegen lässt', noteEn: 'medical — always accepted, no details owed' },
      { ideaDe: 'eine kurzfristige familiäre Verpflichtung (Kinderbetreuung, Pflegefall)', noteEn: 'family duty — name it briefly, no drama' },
      { ideaDe: 'eine Terminüberschneidung mit einem früher zugesagten Termin', noteEn: 'prior commitment — shows reliability, not chaos' }
    ],
    loesungen: [
      { ideaDe: 'das Protokoll oder die Unterlagen anfordern und selbstständig nacharbeiten', noteEn: 'shows initiative to catch up' },
      { ideaDe: 'einen Ersatztermin oder ein kurzes Gespräch in der Folgewoche vorschlagen', noteEn: 'offer a concrete alternative' },
      { ideaDe: 'eine Kollegin oder einen Kollegen um Vertretung bitten', noteEn: 'the task still gets done' }
    ],
    words: [
      { de: 'die Absage', en: 'cancellation' }, { de: 'der Termin', en: 'appointment' },
      { de: 'das Verständnis', en: 'understanding' }, { de: 'die Vertretung', en: 'stand-in / cover' },
      { de: 'das Protokoll', en: 'minutes' }, { de: 'der Ersatztermin', en: 'alternative date' }
    ]
  },

  bitte: {
    gruende: [
      { ideaDe: 'ein familiärer Grund, etwa die Betreuung eines Kindes oder eines Angehörigen', noteEn: 'private reason — one clause is enough, stay factual' },
      { ideaDe: 'ein fester Termin oder eine Frist, die den Zeitpunkt Ihrer Bitte erklärt', noteEn: 'a date makes the request urgent without pressure' },
      { ideaDe: 'fehlende Angaben, die Sie für Ihre Planung oder Anmeldung dringend brauchen', noteEn: 'missing information — the standard ground for an enquiry' }
    ],
    loesungen: [
      { ideaDe: 'anbieten, alle Unterlagen und Nachweise vorab zusammenzustellen und zu schicken', noteEn: 'saves the recipient work — easier to say yes' },
      { ideaDe: 'einen konkreten Termin für ein kurzes Gespräch oder eine Rückmeldung vorschlagen', noteEn: 'a named date is easier to answer than „bald"' },
      { ideaDe: 'darlegen, wie Ihre Aufgaben während der gewünschten Änderung geregelt sind', noteEn: 'proves the request costs the team nothing' }
    ],
    words: [
      { de: 'das Anliegen', en: 'matter / request' }, { de: 'die Bitte', en: 'request' },
      { de: 'die Genehmigung', en: 'approval' }, { de: 'die Auskunft', en: 'information' },
      { de: 'die Frist', en: 'deadline' }, { de: 'die Rückmeldung', en: 'reply / feedback' }
    ]
  },

  beschwerde: {
    gruende: [
      { ideaDe: 'der Zustand hat sich seit einem klaren Zeitpunkt oder Wechsel deutlich verschlechtert', noteEn: 'anchor the complaint in a date — sachlich, not emotional' },
      { ideaDe: 'die Mängel treten regelmäßig auf und betreffen nicht nur Sie allein', noteEn: 'repetition plus affected colleagues gives it weight' },
      { ideaDe: 'die Störung kostet Arbeitszeit und führt zu vermeidbarem Mehraufwand', noteEn: 'name the concrete cost — that is what gets acted on' }
    ],
    loesungen: [
      { ideaDe: 'eine konkrete Nachbesserung mit Frist erbitten, etwa bis zum Monatsende', noteEn: 'a dated demand is answerable' },
      { ideaDe: 'ein kurzes Gespräch vor Ort vorschlagen, um sich die Lage gemeinsam anzusehen', noteEn: 'invites the recipient in instead of accusing' },
      { ideaDe: 'um eine schriftliche Zwischeninformation zum Stand der Bearbeitung bitten', noteEn: 'keeps the matter open, politely' }
    ],
    words: [
      { de: 'die Beschwerde', en: 'complaint' }, { de: 'der Mangel', en: 'defect / shortcoming' },
      { de: 'die Wartezeit', en: 'waiting time' }, { de: 'der Mehraufwand', en: 'extra work' },
      { de: 'die Nachbesserung', en: 'remedy / putting right' }, { de: 'die Abhilfe', en: 'redress' }
    ]
  },

  vorschlag: {
    gruende: [
      { ideaDe: 'eine Lücke im Ablauf, die im Arbeitsalltag immer wieder Zeit und Nerven kostet', noteEn: 'name the gap first — a proposal needs a problem' },
      { ideaDe: 'ein Wunsch, den mehrere Kolleginnen und Kollegen bereits geäußert haben', noteEn: 'shared interest makes a yes easy' },
      { ideaDe: 'ein sichtbarer Nutzen für den Betrieb: weniger Kosten, weniger Reibung', noteEn: 'benefit for the recipient, not only for you' }
    ],
    loesungen: [
      { ideaDe: 'den Vorschlag zunächst als Versuch für ein halbes Jahr anlegen und dann auswerten', noteEn: 'a pilot lowers the bar for approval' },
      { ideaDe: 'einen festen Ansprechpartner und einen einfachen Ablaufplan vorschlagen', noteEn: 'concrete structure beats a vague idea' },
      { ideaDe: 'anbieten, die Organisation und die Terminplanung selbst zu übernehmen', noteEn: 'you carry the work — the strongest closing move' }
    ],
    words: [
      { de: 'der Vorschlag', en: 'suggestion' }, { de: 'die Anregung', en: 'idea / prompting' },
      { de: 'der Nutzen', en: 'benefit' }, { de: 'die Umsetzung', en: 'implementation' },
      { de: 'der Ablauf', en: 'procedure / course of events' }, { de: 'die Beteiligung', en: 'participation' }
    ]
  },

  dank: {
    gruende: [
      { ideaDe: 'die geduldige Erklärung der Abläufe, die Ihnen den Einstieg sehr erleichtert hat', noteEn: 'thanks stays vague unless you name one thing' },
      { ideaDe: 'die Bereitschaft, zusätzliche Aufgaben oder Termine für Sie zu übernehmen', noteEn: 'name the extra effort, not just „die Hilfe"' },
      { ideaDe: 'ein Rat oder eine Rückmeldung, die Ihre Arbeit sichtbar verändert hat', noteEn: 'shows the help actually had an effect' }
    ],
    loesungen: [
      { ideaDe: 'anbieten, das Gelernte im Team weiterzugeben, etwa in einer kurzen Runde', noteEn: 'passes the benefit on — what a Vorgesetzter likes to read' },
      { ideaDe: 'sich revanchieren: bei nächster Gelegenheit selbst die Vertretung übernehmen', noteEn: 'reciprocity, concretely offered' },
      { ideaDe: 'Interesse an einer weiteren Zusammenarbeit oder Begleitung ausdrücken', noteEn: 'keeps the door open for next time' }
    ],
    words: [
      { de: 'der Dank', en: 'thanks' }, { de: 'die Unterstützung', en: 'support' },
      { de: 'die Zusammenarbeit', en: 'cooperation' }, { de: 'die Erfahrung', en: 'experience' },
      { de: 'die Gelegenheit', en: 'opportunity' }, { de: 'die Einarbeitung', en: 'onboarding' }
    ]
  }
}

// ── Flagship banks (richer: 4 Gründe / 4 Lösungen / 6 words) ────────
// Each one is written for its Auftrag's actual situation and covers that
// Auftrag's four Inhaltspunkte — the fallback above cannot, because it must
// serve all four seeds of its Anlass plus every AI-generated Auftrag.

export const AUFTRAG_BAUKAESTEN: Record<string, NachrichtBaukasten> = {
  // Entschuldigung — Herr Semder, Abteilungsleiter; Besprechung am Freitag
  // gegen einen unaufschiebbaren Arzttermin.
  'wa-besprechung-absagen': {
    gruende: [
      { ideaDe: 'ein Facharzttermin am Freitagvormittag, auf den Sie seit Monaten warten', noteEn: 'specialist appointment with a long wait — nobody asks you to move it' },
      { ideaDe: 'die Untersuchung lässt sich weder auf den Nachmittag noch auf einen anderen Tag legen', noteEn: 'say why it cannot be shifted — that is the real explanation' },
      { ideaDe: 'einen neuen Termin bekämen Sie erst in mehreren Monaten', noteEn: 'the cost of rescheduling makes the absence reasonable' },
      { ideaDe: 'von der Überschneidung mit der Besprechung haben Sie erst jetzt erfahren', noteEn: 'explains the short notice without sounding careless' }
    ],
    loesungen: [
      { ideaDe: 'um das Protokoll und die Unterlagen bitten und sie am Montag durcharbeiten', noteEn: 'Inhaltspunkt 4, with a date attached' },
      { ideaDe: 'Ihre Punkte vorab schriftlich einreichen, damit sie in der Sitzung vorliegen', noteEn: 'your input still reaches the meeting' },
      { ideaDe: 'eine Kollegin bitten, Sie in der Besprechung zu vertreten und Ihnen zu berichten', noteEn: 'a stand-in keeps your topics represented' },
      { ideaDe: 'ein kurzes Gespräch am Montagmorgen für die offenen Fragen vorschlagen', noteEn: 'a concrete way to catch up — Inhaltspunkt 3' }
    ],
    words: [
      { de: 'die Besprechung', en: 'meeting' }, { de: 'die Absage', en: 'cancellation' },
      { de: 'der Arzttermin', en: 'medical appointment' }, { de: 'das Protokoll', en: 'minutes' },
      { de: 'die Vertretung', en: 'stand-in / cover' }, { de: 'das Verständnis', en: 'understanding' }
    ]
  },

  // Bitte — Frau Kling, Vorgesetzte; zwei Homeoffice-Tage pro Woche aus
  // familiären Gründen.
  'wa-homeoffice-antrag': {
    gruende: [
      { ideaDe: 'die Betreuung Ihres Kindes an zwei Nachmittagen, seit die Kita früher schließt', noteEn: 'concrete family reason with a cause — credible, not a plea' },
      { ideaDe: 'der Weg ins Büro kostet täglich fast zwei Stunden, die der Arbeit zugutekommen könnten', noteEn: 'commute time reframed as a gain for the employer' },
      { ideaDe: 'Ihre Aufgaben sind vor allem Recherche und Dokumentation und brauchen ruhige Zeit', noteEn: 'the work itself suits remote days' },
      { ideaDe: 'die Pflege eines Angehörigen verlangt Ihre Anwesenheit zu festen Zeiten', noteEn: 'alternative reason if childcare does not fit your story' }
    ],
    loesungen: [
      { ideaDe: 'eine Probephase von zwei Monaten vorschlagen und danach gemeinsam auswerten', noteEn: 'the classic de-risker: it makes a yes reversible' },
      { ideaDe: 'feste Bürotage für die Teamsitzungen zusagen, etwa Montag und Donnerstag', noteEn: 'leaves the fixed team meetings untouched' },
      { ideaDe: 'Erreichbarkeit in der Kernzeit und einen kurzen Tagesabschluss per Mail zusagen', noteEn: 'answers the trust question before it is asked' },
      { ideaDe: 'um ein kurzes Gespräch in der nächsten Woche bitten, um Einzelheiten zu klären', noteEn: 'Inhaltspunkt 4 — ask with a time frame' }
    ],
    words: [
      { de: 'das Homeoffice', en: 'working from home' }, { de: 'die Vereinbarkeit', en: 'balancing family and work' },
      { de: 'die Kernarbeitszeit', en: 'core working hours' }, { de: 'die Erreichbarkeit', en: 'availability' },
      { de: 'die Probephase', en: 'trial period' }, { de: 'die Absprache', en: 'arrangement' }
    ]
  },

  // Beschwerde — Herr Vogel, Verwaltungsleiter; Kantine seit dem
  // Anbieterwechsel: kaltes Essen, kaum Vegetarisches, lange Wartezeiten.
  'wa-kantine-qualitaet': {
    gruende: [
      { ideaDe: 'seit dem Wechsel des Anbieters im September ist das Essen oft nur lauwarm', noteEn: 'date the change — it makes the complaint checkable' },
      { ideaDe: 'vegetarische Gerichte stehen höchstens noch einmal pro Woche auf dem Speiseplan', noteEn: 'a concrete count beats „kaum noch"' },
      { ideaDe: 'die Wartezeit an der Essensausgabe beträgt inzwischen regelmäßig zwanzig Minuten', noteEn: 'numbers instead of adjectives — stays sachlich' },
      { ideaDe: 'von der halben Stunde Mittagspause bleibt kaum Zeit zum Essen und Erholen', noteEn: 'the consequence — Inhaltspunkt 3' }
    ],
    loesungen: [
      { ideaDe: 'täglich mindestens ein warmes vegetarisches Gericht in den Speiseplan aufnehmen', noteEn: 'a concrete and cheap demand' },
      { ideaDe: 'die Warmhaltezeiten prüfen und die Ausgabe in der Spitzenzeit doppelt besetzen', noteEn: 'names the cause, not only the symptom' },
      { ideaDe: 'eine kurze Befragung der Belegschaft zur Zufriedenheit mit dem Anbieter anregen', noteEn: 'shows you speak for more than yourself' },
      { ideaDe: 'um eine Rückmeldung bis Monatsende und ein Gespräch mit dem Anbieter bitten', noteEn: 'Inhaltspunkt 4 — polite, but with a deadline' }
    ],
    words: [
      { de: 'die Betriebskantine', en: 'staff canteen' }, { de: 'der Anbieter', en: 'provider / caterer' },
      { de: 'der Speiseplan', en: 'menu' }, { de: 'die Wartezeit', en: 'waiting time' },
      { de: 'die Mittagspause', en: 'lunch break' }, { de: 'die Nachbesserung', en: 'remedy / putting right' }
    ]
  },

  // Vorschlag — Frau Neumann, Abteilungsleiterin; Ideen für den jährlichen
  // Teamausflug, auch für Kolleginnen und Kollegen mit Kindern geeignet.
  'wa-teamausflug': {
    gruende: [
      { ideaDe: 'mehrere Kolleginnen und Kollegen haben kleine Kinder und brauchen ein Ziel ohne lange Anfahrt', noteEn: 'the constraint that shapes the whole proposal' },
      { ideaDe: 'ein Ausflug in der Region lässt sich ohne Übernachtung und mit kleinem Budget planen', noteEn: 'cost and logistics — what a manager weighs first' },
      { ideaDe: 'viele im Team arbeiten erst seit kurzem zusammen und kennen sich kaum', noteEn: 'the real purpose of a team day — Inhaltspunkt 3' },
      { ideaDe: 'ein Programm im Freien passt für alle Altersgruppen und braucht keine Vorkenntnisse', noteEn: 'inclusive by design — nobody has to sit out' }
    ],
    loesungen: [
      { ideaDe: 'eine Wanderung im Naturpark mit anschließendem Grillen an der Schutzhütte vorschlagen', noteEn: 'a destination plus an activity — Inhaltspunkt 2' },
      { ideaDe: 'den Ausflug an einem Freitag von zehn bis sechzehn Uhr planen', noteEn: 'a schedule families can plan around' },
      { ideaDe: 'eine kurze Kennenlernrunde und eine Führung als festen Programmpunkt einplanen', noteEn: 'gives the day a structure' },
      { ideaDe: 'anbieten, Angebote einzuholen, den Bus zu buchen und eine Abfrage im Team zu starten', noteEn: 'concrete help, three verbs — Inhaltspunkt 4' }
    ],
    words: [
      { de: 'der Teamausflug', en: 'team outing' }, { de: 'das Ziel', en: 'destination' },
      { de: 'der Ablauf', en: 'schedule / order of the day' }, { de: 'die Anfahrt', en: 'journey there' },
      { de: 'die Organisation', en: 'organizing' }, { de: 'die Teilnahme', en: 'participation' }
    ]
  },

  // Dank — Herr Winter, Vorgesetzter; Rückmeldung zur dreitägigen
  // Fortbildung zur Gesprächsführung, inklusive offener Kritik.
  'wa-dank-fortbildung': {
    gruende: [
      { ideaDe: 'die Übungen zur Gesprächsführung mit Videoaufnahme und direkter Rückmeldung', noteEn: 'name the single most useful element' },
      { ideaDe: 'konkrete Formulierungen für schwierige Gespräche mit unzufriedenen Kunden', noteEn: 'transferable to the daily job — Inhaltspunkt 2' },
      { ideaDe: 'der Austausch mit Teilnehmenden aus anderen Betrieben und deren Lösungen', noteEn: 'value beyond the syllabus' },
      { ideaDe: 'weniger überzeugt hat der theoretische Vormittag, der wenig Neues brachte', noteEn: 'the honest criticism — Inhaltspunkt 3, still polite' }
    ],
    loesungen: [
      { ideaDe: 'anbieten, die wichtigsten Techniken in einer halben Stunde im Team vorzustellen', noteEn: 'Inhaltspunkt 4 with a format and a duration' },
      { ideaDe: 'eine kurze Handreichung mit Formulierungshilfen für die Abteilung erstellen', noteEn: 'something that outlasts the course' },
      { ideaDe: 'vorschlagen, schwierige Kundengespräche künftig im Team kurz nachzubesprechen', noteEn: 'turns the training into a habit' },
      { ideaDe: 'anregen, den praktischen Teil auch weiteren Kolleginnen und Kollegen zu ermöglichen', noteEn: 'recommends the course while grading it honestly' }
    ],
    words: [
      { de: 'die Fortbildung', en: 'training course' }, { de: 'die Gesprächsführung', en: 'conducting conversations' },
      { de: 'die Rückmeldung', en: 'feedback' }, { de: 'der Praxisbezug', en: 'relevance to practice' },
      { de: 'der Erfahrungsaustausch', en: 'exchange of experience' }, { de: 'die Teilnahme', en: 'participation' }
    ]
  }
}

/**
 * Resolves the Inhalts-Baukasten for one Schreibauftrag, cheapest layer
 * first: an AI-generated bank cached for this exact Auftrag, then the
 * hand-authored flagship bank, then the per-Anlass fallback — which always
 * exists, so custom (AI-generated) Aufträge resolve offline too. `scope`
 * tells the UI which layer answered.
 */
export function resolveBaukasten(
  auftrag: Pick<Schreibauftrag, 'id' | 'anlass'>,
  cached?: NachrichtBaukasten
): { bank: NachrichtBaukasten; scope: 'cached' | 'auftrag' | SchreibAnlass } {
  if (cached) return { bank: cached, scope: 'cached' }
  const flagship = AUFTRAG_BAUKAESTEN[auftrag.id]
  if (flagship) return { bank: flagship, scope: 'auftrag' }
  return { bank: ANLASS_BAUKAESTEN[auftrag.anlass], scope: auftrag.anlass }
}
