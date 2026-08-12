//
// Schreiben Teil 1 (Forumsbeitrag) — the phrase bank filed under the seven
// Beitragsfunktionen. See CONTEXT.md → "Schreibmittel", "Forumsbeitrag",
// "Move".
//
// A Schreibmittel IS a kind of Redemittel, like a Vortragsmittel; this is the
// third phrase bank, not a rival concept — so the Redemittel yield counts it
// on its own separate tally and the cheatsheet gives it its own tab. Its ids
// share the same yield store as `rm-*` (Sprechen Teil 2) and `vm-*` (Sprechen
// Teil 1), hence the `sm-` prefix here.
//
// The Move set is disjoint from both Sprechen banks in the sense that matters
// (CONTEXT.md → "Move": "A Move never spans parts, and the sets are never
// counted together") — except that 'beispiel' is spelled the same as
// VORTRAG_MOVES' 'beispiel', because both a Vortrag and a Forumsbeitrag
// independently have a give-an-example Move (VORTRAG_MOVE_LABEL.beispiel.en
// is literally "Give evidence or an example"). The two never get summed or
// matched against each other's bank, so the shared spelling is harmless.

export const SCHREIB_MOVES = [
  'aufgreifen', 'meinung', 'begruendung', 'beispiel', 'gegenmeinung', 'alternative', 'fazit'
] as const

export type SchreibMove = (typeof SCHREIB_MOVES)[number]

export const SCHREIB_MOVE_LABEL: Record<SchreibMove, { de: string; en: string }> = {
  aufgreifen:    { de: 'Thema aufgreifen',           en: 'Take up the topic' },
  meinung:       { de: 'Meinung äußern',             en: 'State an opinion' },
  begruendung:   { de: 'Begründen',                  en: 'Justify' },
  beispiel:      { de: 'Beispiel geben',             en: 'Give an example' },
  gegenmeinung:  { de: 'Gegenmeinung einräumen',     en: 'Concede the counter-view' },
  alternative:   { de: 'Alternative vorschlagen',    en: 'Suggest an alternative' },
  fazit:         { de: 'Fazit ziehen',               en: 'Draw a conclusion' }
}

export interface Schreibmittel {
  id: string            // 'sm-aufgreifen-1'
  move: SchreibMove
  phraseDe: string
  noteEn: string
  // F5: literal needle override — see phraseNeedle() in useRedemittelMatch.
  // Only set on phrases whose "…" placeholder sits inside the derived
  // needle's first 24 characters. Unused below: every phrase here trails off
  // with "…" only at the very end, so the derived needle never crosses a gap.
  needle?: string
}

const P = (
  id: string, move: SchreibMove, phraseDe: string, noteEn: string, needle?: string
): Schreibmittel => ({ id, move, phraseDe, noteEn, needle })

export const SCHREIBEN_SCHREIBMITTEL: Schreibmittel[] = [
  P('sm-aufgreifen-1', 'aufgreifen', 'In letzter Zeit wird viel darüber diskutiert, ob …', 'opens by naming the debate'),
  P('sm-aufgreifen-2', 'aufgreifen', 'Immer wieder liest man in den Nachrichten, dass …', 'points to recurring media coverage'),
  P('sm-aufgreifen-3', 'aufgreifen', 'Kaum ein Thema beschäftigt die Öffentlichkeit so sehr wie …', 'frames the topic as widely discussed'),
  P('sm-aufgreifen-4', 'aufgreifen', 'Viele Menschen stellen sich heute die Frage, ob …', 'attributes the question to public opinion'),
  P('sm-aufgreifen-5', 'aufgreifen', 'Seit einiger Zeit sorgt die Frage für Diskussionen, ob …', 'notes the debate has been running for a while'),

  P('sm-meinung-1', 'meinung', 'Meiner Meinung nach spricht vieles dafür, dass …', 'states a position with room to argue'),
  P('sm-meinung-2', 'meinung', 'Ich bin der festen Überzeugung, dass …', 'states a firmly held conviction'),
  P('sm-meinung-3', 'meinung', 'Aus meiner Sicht überwiegen ganz klar die Vorteile, wenn …', 'weighs in favour of one side'),
  P('sm-meinung-4', 'meinung', 'Nach meinem Empfinden ist es sinnvoller, …', 'gives a softer, personal-feeling framing'),
  P('sm-meinung-5', 'meinung', 'Persönlich halte ich es für richtig, dass …', 'marks the opinion as explicitly personal'),

  P('sm-begruendung-1', 'begruendung', 'Ein wichtiges Argument dafür ist, dass …', 'introduces a main reason'),
  P('sm-begruendung-2', 'begruendung', 'Das lässt sich vor allem damit begründen, dass …', 'signals the justification that follows'),
  P('sm-begruendung-3', 'begruendung', 'Hinzu kommt, dass …', 'adds a further reason on top'),
  P('sm-begruendung-4', 'begruendung', 'Ein weiterer Grund liegt darin, dass …', 'introduces a second, distinct reason'),
  P('sm-begruendung-5', 'begruendung', 'Nicht zuletzt spielt auch eine Rolle, dass …', 'adds a reason without ranking it last'),

  P('sm-beispiel-1', 'beispiel', 'Ein Beispiel aus meinem Umfeld zeigt, dass …', 'grounds the claim in experience'),
  P('sm-beispiel-2', 'beispiel', 'So hat zum Beispiel ein Freund von mir erlebt, dass …', 'reports a specific person’s experience'),
  P('sm-beispiel-3', 'beispiel', 'Auch in meinem Heimatland lässt sich beobachten, dass …', 'gives an example from the writer’s own country'),
  P('sm-beispiel-4', 'beispiel', 'Ein konkreter Fall aus meinem Alltag verdeutlicht, dass …', 'makes the point concrete with a daily-life case'),
  P('sm-beispiel-5', 'beispiel', 'Erst letzte Woche habe ich selbst erfahren, dass …', 'anchors the example in a recent, personal event'),

  P('sm-gegenmeinung-1', 'gegenmeinung', 'Natürlich lässt sich einwenden, dass …', 'concedes before countering'),
  P('sm-gegenmeinung-2', 'gegenmeinung', 'Zwar mag es stimmen, dass …', 'grants a point before the rebuttal'),
  P('sm-gegenmeinung-3', 'gegenmeinung', 'Man könnte an dieser Stelle einwenden, dass …', 'names the objection as a third-party view'),
  P('sm-gegenmeinung-4', 'gegenmeinung', 'Es wäre allerdings falsch zu behaupten, dass …', 'concedes only a narrow, qualified point'),
  P('sm-gegenmeinung-5', 'gegenmeinung', 'Manche Kritiker führen dagegen an, dass …', 'attributes the counter-view to critics'),

  P('sm-alternative-1', 'alternative', 'Eine sinnvolle Alternative dazu wäre, …', 'proposes a different solution'),
  P('sm-alternative-2', 'alternative', 'Stattdessen wäre es denkbar, …', 'offers a substitute course of action'),
  P('sm-alternative-3', 'alternative', 'Denkbar wäre auch eine Lösung, bei der …', 'frames the alternative as conditional'),
  P('sm-alternative-4', 'alternative', 'Als Alternative böte sich an, …', 'names a concrete option on offer'),
  P('sm-alternative-5', 'alternative', 'Ein anderer Ansatz bestünde darin, …', 'introduces a differently framed approach'),

  P('sm-fazit-1', 'fazit', 'Zusammenfassend lässt sich sagen, dass …', 'signals the conclusion'),
  P('sm-fazit-2', 'fazit', 'Abschließend möchte ich betonen, dass …', 'closes while stressing the key point'),
  P('sm-fazit-3', 'fazit', 'Alles in allem überwiegen für mich die Argumente, dass …', 'sums up by weighing the arguments'),
  P('sm-fazit-4', 'fazit', 'Insgesamt bin ich der Ansicht, dass …', 'restates the overall position'),
  P('sm-fazit-5', 'fazit', 'Unter dem Strich spricht mehr dafür, dass …', 'closes with a balance-sheet framing')
]

export function schreibmittelForMove(move: SchreibMove): Schreibmittel[] {
  return SCHREIBEN_SCHREIBMITTEL.filter(p => p.move === move)
}
