//
// Sprechen Teil 1 (Vortrag) — the phrase bank, the five Gliederungspunkte, and
// the Redezeit constants. See CONTEXT.md → "Vortragsmittel", "Gliederungspunkt",
// "Rede", "Move".
//
// A Vortragsmittel IS a kind of Redemittel; this is the second phrase bank, not
// a rival concept. Its Move set is disjoint from the Discussion's six
// Gesprächszüge, which is why the two yields are never summed.

export const VORTRAG_MOVES = [
  'einstieg', 'gliederung', 'aspekt', 'kontrast', 'beispiel', 'abschluss', 'nachfrage'
] as const

export type VortragMove = (typeof VORTRAG_MOVES)[number]

export const VORTRAG_MOVE_LABEL: Record<VortragMove, { de: string; en: string }> = {
  einstieg:   { de: 'Thema eröffnen',     en: 'Open the topic' },
  gliederung: { de: 'Aufbau ankündigen',  en: 'Announce the structure' },
  aspekt:     { de: 'Aspekt einführen',   en: 'Introduce an aspect' },
  kontrast:   { de: 'Gegenüberstellen',   en: 'Contrast two sides' },
  beispiel:   { de: 'Belegen & erzählen', en: 'Give evidence or an example' },
  abschluss:  { de: 'Zusammenfassen',     en: 'Summarize and close' },
  nachfrage:  { de: 'Auf Nachfragen',     en: 'Answer a follow-up question' }
}

export interface Vortragsmittel {
  id: string            // 'vm-einstieg-1'
  move: VortragMove
  phraseDe: string
  noteEn: string
  // F5: literal needle override — see phraseNeedle() in useRedemittelMatch.
  // Only set on phrases whose "…" placeholder sits inside the derived
  // needle's first 24 characters, which would otherwise require the
  // placeholder's filled-in content to be absent from natural speech.
  needle?: string
}

const P = (
  id: string, move: VortragMove, phraseDe: string, noteEn: string, needle?: string
): Vortragsmittel => ({ id, move, phraseDe, noteEn, needle })

export const SPRECHEN_VORTRAGSMITTEL: Vortragsmittel[] = [
  P('vm-einstieg-1', 'einstieg', 'Ich möchte heute über das Thema … sprechen.', 'today I would like to speak about …'),
  P('vm-einstieg-2', 'einstieg', 'In meinem Vortrag geht es um …', 'my talk is about …'),
  P('vm-einstieg-3', 'einstieg', 'Das Thema beschäftigt mich, weil …', 'the topic concerns me because …'),
  P('vm-einstieg-4', 'einstieg', 'Dieses Thema ist zurzeit besonders aktuell, denn …', 'this topic is especially current, because …'),
  P('vm-einstieg-5', 'einstieg', 'Kaum ein Thema wird so kontrovers diskutiert wie …', 'few topics are debated as controversially as …'),

  P('vm-gliederung-1', 'gliederung', 'Ich habe meinen Vortrag in drei Teile gegliedert.', 'I have divided my talk into three parts.'),
  // F5: the derived needle stops mid-way through "und zum schluss" because
  // the two earlier placeholders sit inside its first 24 characters; the
  // override matches on the fixed closing text alone, e.g. "Zuerst
  // beschreibe ich die Lage, danach die Vorteile, und zum Schluss meine
  // Meinung."
  P('vm-gliederung-2', 'gliederung', 'Zuerst …, danach …, und zum Schluss …', 'first …, then …, and finally …', 'und zum schluss'),
  P('vm-gliederung-3', 'gliederung', 'Ich beginne mit einem kurzen Überblick.', 'I will begin with a brief overview.'),
  P('vm-gliederung-4', 'gliederung', 'Anschließend komme ich zu den Vor- und Nachteilen.', 'after that I come to the advantages and disadvantages.'),
  P('vm-gliederung-5', 'gliederung', 'Am Ende fasse ich meine Position kurz zusammen.', 'at the end I will briefly sum up my position.'),

  P('vm-aspekt-1', 'aspekt', 'Zunächst möchte ich auf … eingehen.', 'first I would like to address …'),
  P('vm-aspekt-2', 'aspekt', 'Ein weiterer wichtiger Punkt ist …', 'another important point is …'),
  P('vm-aspekt-3', 'aspekt', 'Damit komme ich zum zweiten Punkt: …', 'this brings me to my second point: …'),
  P('vm-aspekt-4', 'aspekt', 'In meinem Heimatland sieht die Situation so aus: …', 'in my home country the situation is as follows: …'),
  P('vm-aspekt-5', 'aspekt', 'Besonders auffällig ist dabei, dass …', 'what is particularly striking is that …'),

  // F5: the derived needle would be "einerseits andererseits" — adjacent only
  // because the placeholder is stripped, so it can never match a natural
  // sentence like "Einerseits ist das Ehrenamt praktisch, andererseits kostet
  // es Zeit." The override matches on the fixed word after the gap instead.
  P('vm-kontrast-1', 'kontrast', 'Einerseits …, andererseits …', 'on the one hand …, on the other …', 'andererseits'),
  // F5: same gap problem — "spricht, dass" is the fixed text between the two
  // placeholders, matching "Für das Ehrenamt spricht, dass man Verantwortung
  // lernt." regardless of what fills the first blank.
  P('vm-kontrast-2', 'kontrast', 'Für … spricht, dass …; dagegen spricht …', 'in favour of … is …; against it …', 'spricht dass'),
  P('vm-kontrast-3', 'kontrast', 'Der größte Vorteil liegt darin, dass …', 'the biggest advantage lies in the fact that …'),
  P('vm-kontrast-4', 'kontrast', 'Dem steht allerdings der Nachteil gegenüber, dass …', 'set against this, however, is the drawback that …'),
  P('vm-kontrast-5', 'kontrast', 'Man darf dabei aber nicht vergessen, dass …', 'one must not forget, though, that …'),

  P('vm-beispiel-1', 'beispiel', 'Ein Beispiel aus meinem eigenen Alltag: …', 'an example from my own daily life: …'),
  // F5: the derived needle reaches across the placeholder into "war", which
  // is fixed text on the OTHER side of the gap ("noch [blank] war"); the
  // override matches on the fixed opening alone, e.g. "Als ich noch
  // Studentin war, habe ich erlebt, dass niemand Zeit hatte."
  P('vm-beispiel-2', 'beispiel', 'Als ich noch … war, habe ich erlebt, dass …', 'when I was still …, I experienced that …', 'als ich noch'),
  P('vm-beispiel-3', 'beispiel', 'Untersuchungen zeigen, dass …', 'studies show that …'),
  P('vm-beispiel-4', 'beispiel', 'Das lässt sich gut an … erkennen.', 'this can be clearly seen in …'),
  P('vm-beispiel-5', 'beispiel', 'In meinem Bekanntenkreis ist es üblich, dass …', 'among the people I know it is common that …'),

  P('vm-abschluss-1', 'abschluss', 'Zusammenfassend möchte ich sagen, dass …', 'to sum up, I would like to say that …'),
  P('vm-abschluss-2', 'abschluss', 'Abschließend bleibt festzuhalten, dass …', 'in closing it remains to be noted that …'),
  P('vm-abschluss-3', 'abschluss', 'Meine persönliche Meinung dazu ist, dass …', 'my personal opinion on this is that …'),
  P('vm-abschluss-4', 'abschluss', 'Aus den genannten Gründen bin ich der Ansicht, dass …', 'for the reasons given I take the view that …'),
  P('vm-abschluss-5', 'abschluss', 'Vielen Dank für Ihre Aufmerksamkeit.', 'thank you for your attention.'),

  P('vm-nachfrage-1', 'nachfrage', 'Vielen Dank für Ihre Frage.', 'thank you for your question.'),
  P('vm-nachfrage-2', 'nachfrage', 'Das ist ein guter Punkt — ich würde sagen, …', 'that is a good point — I would say …'),
  P('vm-nachfrage-3', 'nachfrage', 'Wenn ich Sie richtig verstehe, meinen Sie …', 'if I understand you correctly, you mean …'),
  P('vm-nachfrage-4', 'nachfrage', 'Darauf bin ich im Vortrag nur kurz eingegangen, aber …', 'I only touched on that briefly in the talk, but …'),
  P('vm-nachfrage-5', 'nachfrage', 'Da muss ich kurz überlegen … Ich denke, …', 'I need a moment to think … I believe …')
]

export function vortragsmittelForMove(move: VortragMove): Vortragsmittel[] {
  return SPRECHEN_VORTRAGSMITTEL.filter(r => r.move === move)
}

/* ── The five Gliederungspunkte ── */

export const GLIEDERUNG_KEYS = [
  'einstieg', 'situation', 'aspekte', 'erfahrung', 'fazit'
] as const

export type GliederungKey = (typeof GLIEDERUNG_KEYS)[number]

export interface Gliederungspunkt {
  key: GliederungKey
  n: 1 | 2 | 3 | 4 | 5
  labelDe: string
  hintDe: string
  words: number
}

// Word targets are rebased from the prototype's 110 wpm / 445 words to 90 wpm /
// 360 — a rate a B2 speaker actually reaches, so a typed and a spoken Rede are
// asked for the same amount of content. See the spec, §2.
export const GLIEDERUNGSPUNKTE: Gliederungspunkt[] = [
  { key: 'einstieg',  n: 1, labelDe: 'Einstieg',           hintDe: 'Thema nennen, Aufbau ankündigen, sagen warum es relevant ist.', words: 45 },
  { key: 'situation', n: 2, labelDe: 'Situation',          hintDe: 'Wie sieht es in deinem Heimatland oder Umfeld aus?',            words: 75 },
  { key: 'aspekte',   n: 3, labelDe: 'Vor- und Nachteile', hintDe: 'Zwei Seiten gegenüberstellen, nicht nur aufzählen.',            words: 95 },
  { key: 'erfahrung', n: 4, labelDe: 'Eigene Erfahrung',   hintDe: 'Ein konkretes Beispiel aus deinem Leben.',                      words: 75 },
  { key: 'fazit',     n: 5, labelDe: 'Meinung & Abschluss', hintDe: 'Position beziehen, begründen, zusammenfassen.',                words: 70 }
]

export const VORTRAG_WPM = 90
export const VORTRAG_TARGET_WORDS = 360

/** Words → m:ss at VORTRAG_WPM. A display convention, not a claim about the learner. */
export function vortragClock(words: number): string {
  const total = Math.round((words / VORTRAG_WPM) * 60)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

/**
 * Which Move groups each Gliederungspunkt naturally wants.
 *
 * ADR-0014: this drives the hint drawer's OUTLINING ONLY. It must never drive
 * coverage — `situation` and `erfahrung` share the identical pair, `aspekt`
 * serves three points and `kontrast` two, so a phrase match cannot identify
 * points 2–4 at all. The live checklist uses the learner's own Vortragsplan
 * keyword instead.
 */
export const PUNKT_MOVES: Record<GliederungKey, VortragMove[]> = {
  einstieg:  ['einstieg', 'gliederung'],
  situation: ['aspekt', 'beispiel'],
  aspekte:   ['kontrast', 'aspekt'],
  erfahrung: ['beispiel', 'aspekt'],
  fazit:     ['abschluss', 'kontrast']
}

/* ── Rettungsleine: time-buying lines. Filling four minutes without dead air
      is the examined skill, so these are teaching material, not a crutch. ── */

export const RETTUNGSLEINEN: string[] = [
  'Da muss ich kurz überlegen …',
  'Um es kurz zusammenzufassen: …',
  'Kommen wir zum nächsten Punkt: …',
  'Was ich damit sagen will, ist …',
  'Ein Beispiel macht das deutlicher: …',
  'Lassen Sie mich das etwas genauer erklären.'
]

/* ── Konnektoren, grouped by the Stellung (word-order rule) each shares —
      F10: the old grouping was by rhetorical function, which mixed sentence
      openers (forcing V2) with mid-clause words (leaving normal word order)
      inside the same group, so a single insertion rule could not serve it. ── */

export interface Konnektor {
  wort: string
  frameDe: string   // the "…" is the learner's own continuation
}

export interface KonnektorGroup {
  labelDe: string
  stellungDe: string   // the Stellung rule every word in this group shares
  konnektoren: Konnektor[]
}

// Sentence-initial connectors: fronting them into position 1 pushes the verb
// to position 2 (the subject follows the verb). Shared by three of the four
// groups below — only the mid-clause group's Wortstellung differs.
const SATZANFANG_STELLUNG = 'Konnektor auf Position 1, Verb direkt danach'

export const KONNEKTOREN: KonnektorGroup[] = [
  {
    labelDe: 'Satzanfang — Verb an Position 2',
    stellungDe: SATZANFANG_STELLUNG,
    konnektoren: [
      { wort: 'Zunächst',        frameDe: 'Zunächst möchte ich …' },
      { wort: 'Anschließend',    frameDe: 'Anschließend komme ich zu …' },
      { wort: 'Außerdem',        frameDe: 'Außerdem ist …' },
      { wort: 'Trotzdem',        frameDe: 'Trotzdem bleibt …' },
      { wort: 'Deshalb',         frameDe: 'Deshalb finde ich …' },
      { wort: 'Zusammenfassend', frameDe: 'Zusammenfassend lässt sich sagen, dass …' }
    ]
  },
  {
    labelDe: 'Aufzählen',
    stellungDe: SATZANFANG_STELLUNG,
    konnektoren: [
      { wort: 'Erstens',                     frameDe: 'Erstens ist …' },
      { wort: 'Zweitens',                    frameDe: 'Zweitens zeigt …' },
      { wort: 'Zum einen / zum anderen',     frameDe: 'Zum einen … , zum anderen …' }
    ]
  },
  {
    labelDe: 'Gegenüberstellen',
    stellungDe: SATZANFANG_STELLUNG,
    konnektoren: [
      { wort: 'Einerseits / andererseits', frameDe: 'Einerseits … , andererseits …' },
      { wort: 'Dagegen',                   frameDe: 'Dagegen spricht …' },
      { wort: 'Im Gegensatz dazu',         frameDe: 'Im Gegensatz dazu ist …' }
    ]
  },
  {
    labelDe: 'Im Satz — normale Wortstellung',
    stellungDe: 'mitten im Satz, Wortstellung bleibt',
    konnektoren: [
      { wort: 'denn',         frameDe: '… , denn ich habe …' },
      { wort: 'nämlich',      frameDe: '… , ich habe nämlich …' },
      { wort: 'zum Beispiel', frameDe: '… , zum Beispiel …' }
    ]
  }
]
