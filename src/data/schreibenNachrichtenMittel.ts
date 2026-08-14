//
// Schreiben Teil 2 (halbformelle Nachricht) — the phrase bank filed under the
// eight Nachrichtfunktionen, plus the genre's fixed frame. See CONTEXT.md →
// "Nachrichtenmittel", "Move", "Schreibanlass".
//
// A Nachrichtenmittel IS a kind of Redemittel, like a Vortragsmittel or a
// Schreibmittel; this is the fourth phrase bank, not a rival concept — so the
// Redemittel yield counts it on its own separate tally. Its ids share the same
// yield store as `rm-*` (Sprechen Teil 2), `vm-*` (Sprechen Teil 1) and `sm-*`
// (Schreiben Teil 1), hence the `nm-` prefix here.
//
// The Move slugs are disjoint from all three existing banks — deliberately, and
// the test locks it: Teil 1 already owns 'begruendung', so the explain-move is
// 'situation'; the close-move is 'ausblick' to stay clear of the Vortrag bank's
// 'abschluss'.
//
// These Moves alone are Anlass-aware (CONTEXT.md → "Move"): each declares which
// Schreibanlässe it fits. Bezug, Situation and Ausblick fit every Nachricht;
// the five occasion-cores are spelled exactly like the Anlass they belong to,
// but several are apt beyond their own — a polite request belongs in almost any
// Nachricht, while a complaint belongs only in a Beschwerde. The Move nudge
// suggests only apt ones, because nudging an apology into a thank-you message
// would coach the genre wrong.
//
// The Rahmen-Paare at the bottom are part of this bank rather than a separate
// one (CONTEXT.md → "Nachrichtenmittel"): Anrede and Grußformel are matched —
// picking a formal Anrede and a warm Gruß is the classic register break — so
// they are stored as pairs, never as two independent lists.

import type { SchreibAnlass } from './schreibenAuftraege'

export const NACHRICHT_MOVES = [
  'bezug', 'situation', 'entschuldigung', 'bitte', 'beschwerde', 'vorschlag', 'dank', 'ausblick'
] as const

export type NachrichtMove = (typeof NACHRICHT_MOVES)[number]

export const NACHRICHT_MOVE_LABEL: Record<NachrichtMove, { de: string; en: string }> = {
  bezug:          { de: 'Bezug nehmen',              en: 'Refer to the occasion' },
  situation:      { de: 'Situation erklären',        en: 'Explain the situation' },
  entschuldigung: { de: 'Sich entschuldigen',        en: 'Apologize' },
  bitte:          { de: 'Höflich bitten',            en: 'Request politely' },
  beschwerde:     { de: 'Unzufriedenheit ausdrücken', en: 'Express dissatisfaction' },
  vorschlag:      { de: 'Vorschlag machen',          en: 'Propose' },
  dank:           { de: 'Danken',                    en: 'Thank' },
  ausblick:       { de: 'Verbindlich abschließen',   en: 'Close with commitment' }
}

/** 'alle' = fits every Nachricht; otherwise the Anlässe the Move is apt for (CONTEXT.md → Move). */
export const NACHRICHT_MOVE_ANLAESSE: Record<NachrichtMove, 'alle' | SchreibAnlass[]> = {
  bezug: 'alle',
  situation: 'alle',
  entschuldigung: ['entschuldigung', 'bitte'],
  bitte: ['bitte', 'entschuldigung', 'beschwerde', 'vorschlag'],
  beschwerde: ['beschwerde'],
  vorschlag: ['vorschlag', 'beschwerde', 'entschuldigung'],
  dank: ['dank', 'bitte', 'entschuldigung'],
  ausblick: 'alle'
}

/** The Moves apt for one Schreibanlass, in NACHRICHT_MOVES order. */
export function movesForAnlass(anlass: SchreibAnlass): NachrichtMove[] {
  return NACHRICHT_MOVES.filter(m => {
    const a = NACHRICHT_MOVE_ANLAESSE[m]
    return a === 'alle' || a.includes(anlass)
  })
}

export interface Nachrichtenmittel {
  id: string            // 'nm-bezug-1'
  move: NachrichtMove
  phraseDe: string
  noteEn: string
  // F5: literal needle override — see phraseNeedle() in useRedemittelMatch.
  // Only set on phrases whose "…" placeholder sits inside the derived needle's
  // first 24 characters. Unused below: the few phrases with a mid-sentence gap
  // ("… bedanken.", "… entschuldigen.") carry it well past character 24, so no
  // derived needle here ever crosses a gap.
  needle?: string
}

const P = (
  id: string, move: NachrichtMove, phraseDe: string, noteEn: string, needle?: string
): Nachrichtenmittel => ({ id, move, phraseDe, noteEn, needle })

export const SCHREIBEN_NACHRICHTENMITTEL: Nachrichtenmittel[] = [
  P('nm-bezug-1', 'bezug', 'ich wende mich an Sie, weil …', 'names why you are writing, right after the Anrede'),
  P('nm-bezug-2', 'bezug', 'Ich beziehe mich auf Ihre Nachricht vom …', 'links back to the message you are answering'),
  P('nm-bezug-3', 'bezug', 'Wie Sie bereits wissen, …', 'builds on what the recipient already knows'),
  P('nm-bezug-4', 'bezug', 'Sie hatten mich gebeten, …', 'recalls a request the recipient made earlier'),
  P('nm-bezug-5', 'bezug', 'Der Anlass meiner Nachricht ist folgender: …', 'announces the occasion before any detail'),

  P('nm-situation-1', 'situation', 'Der Grund dafür ist, dass …', 'introduces the explanation'),
  P('nm-situation-2', 'situation', 'Die Situation ist folgende: …', 'opens a short account of the circumstances'),
  P('nm-situation-3', 'situation', 'Leider hat sich herausgestellt, dass …', 'reports an unwelcome development'),
  P('nm-situation-4', 'situation', 'Hintergrund ist, dass …', 'gives the background in one compact frame'),
  P('nm-situation-5', 'situation', 'Das liegt vor allem daran, dass …', 'names the main cause among several'),

  P('nm-entschuldigung-1', 'entschuldigung', 'Bitte entschuldigen Sie, dass ich …', 'direct, polite apology'),
  P('nm-entschuldigung-2', 'entschuldigung', 'Ich bedauere sehr, dass …', 'expresses regret without over-apologizing'),
  P('nm-entschuldigung-3', 'entschuldigung', 'Es tut mir aufrichtig leid, dass …', 'a warmer, personal apology'),
  P('nm-entschuldigung-4', 'entschuldigung', 'Ich hoffe, Sie haben Verständnis dafür, dass …', 'asks for understanding rather than forgiveness'),
  P('nm-entschuldigung-5', 'entschuldigung', 'Ich möchte mich in aller Form für … entschuldigen.', 'the most formal register for a serious apology'),

  P('nm-bitte-1', 'bitte', 'Ich wäre Ihnen sehr dankbar, wenn Sie …', 'Konjunktiv II softens the request'),
  P('nm-bitte-2', 'bitte', 'Könnten Sie mir bitte mitteilen, ob …', 'Konjunktiv II plus an indirect question — asks for information'),
  P('nm-bitte-3', 'bitte', 'Wäre es möglich, dass …', 'Konjunktiv II makes the request impersonal and easy to refuse'),
  P('nm-bitte-4', 'bitte', 'Dürfte ich Sie in diesem Zusammenhang fragen, ob …', 'Konjunktiv II of dürfen — the most deferential ask'),
  P('nm-bitte-5', 'bitte', 'Würden Sie mir bitte kurz Bescheid geben, ob …', 'Konjunktiv II asks for a reply without demanding one'),

  P('nm-beschwerde-1', 'beschwerde', 'Leider muss ich Ihnen mitteilen, dass …', 'firm but courteous opener for a complaint'),
  P('nm-beschwerde-2', 'beschwerde', 'Mit dem Ergebnis bin ich leider nicht zufrieden, weil …', 'states dissatisfaction and reasons it in one sentence'),
  P('nm-beschwerde-3', 'beschwerde', 'Es ist für mich nicht nachvollziehbar, dass …', 'objects to the matter, not to the person'),
  P('nm-beschwerde-4', 'beschwerde', 'Wiederholt ist es vorgekommen, dass …', 'marks the problem as recurring, not a one-off'),
  P('nm-beschwerde-5', 'beschwerde', 'Auf folgendes Problem möchte ich Sie hinweisen: …', 'flags the problem factually before describing it'),

  P('nm-vorschlag-1', 'vorschlag', 'Ich möchte Ihnen daher vorschlagen, …', 'ties the proposal to the reason before it'),
  P('nm-vorschlag-2', 'vorschlag', 'Als Lösung könnte ich mir vorstellen, dass …', 'offers the idea as one option among others'),
  P('nm-vorschlag-3', 'vorschlag', 'Wie wäre es, wenn wir …', 'a lighter, collegial proposal'),
  P('nm-vorschlag-4', 'vorschlag', 'Eine Möglichkeit wäre, …', 'introduces an option without pressing for it'),
  P('nm-vorschlag-5', 'vorschlag', 'Ich schlage vor, dass wir …', 'the plainest proposal frame — clear and still polite'),

  P('nm-dank-1', 'dank', 'Ich möchte mich herzlich bei Ihnen für … bedanken.', 'carries the thanks with warmth, still formal'),
  P('nm-dank-2', 'dank', 'Vielen Dank für Ihre Unterstützung bei …', 'thanks for a concrete piece of help'),
  P('nm-dank-3', 'dank', 'Ich bin Ihnen sehr dankbar für …', 'names the thing you are grateful for'),
  P('nm-dank-4', 'dank', 'Es war für mich eine große Hilfe, dass …', 'says what the help actually made possible'),
  P('nm-dank-5', 'dank', 'Ich weiß Ihren Einsatz sehr zu schätzen.', 'appreciates the effort, not just the outcome'),

  P('nm-ausblick-1', 'ausblick', 'Über eine kurze Rückmeldung würde ich mich sehr freuen.', 'closes with a commitment-inviting line'),
  P('nm-ausblick-2', 'ausblick', 'Für Rückfragen stehe ich Ihnen jederzeit gern zur Verfügung.', 'the standard offer to answer follow-up questions'),
  P('nm-ausblick-3', 'ausblick', 'Ich melde mich bei Ihnen, sobald …', 'commits you to the next step yourself'),
  P('nm-ausblick-4', 'ausblick', 'Selbstverständlich richte ich mich nach Ihrem Terminvorschlag.', 'signals flexibility before the Grußformel'),
  P('nm-ausblick-5', 'ausblick', 'Vielen Dank im Voraus für Ihre Mühe.', 'thanks ahead of the favour — closes a request')
]

export function nachrichtenmittelForMove(move: NachrichtMove): Nachrichtenmittel[] {
  return SCHREIBEN_NACHRICHTENMITTEL.filter(p => p.move === move)
}

export interface RahmenPaar {
  id: string
  anredeDe: string      // always ends in a comma — the next line starts lowercase
  grussDe: string       // never takes a comma or a full stop
  noteEn: string
}

/**
 * The genre's fixed frame, stored as matched pairs: an Anrede and a Grußformel
 * of the same register. Mixing them (formal Anrede, warm Gruß) is the classic
 * register break a B2 Nachricht loses points for.
 */
export const RAHMEN_PAARE: RahmenPaar[] = [
  { id: 'rp-1', anredeDe: 'Sehr geehrte Frau …, / Sehr geehrter Herr …,', grussDe: 'Mit freundlichen Grüßen', noteEn: 'the default formal pair — always safe' },
  { id: 'rp-2', anredeDe: 'Liebe Frau …, / Lieber Herr …,', grussDe: 'Herzliche Grüße', noteEn: 'warm semi-formal — colleagues you know well' },
  { id: 'rp-3', anredeDe: 'Guten Tag, Frau …,', grussDe: 'Freundliche Grüße', noteEn: 'modern neutral — fine for most workplace mail' },
  { id: 'rp-4', anredeDe: 'Sehr geehrte Damen und Herren,', grussDe: 'Mit freundlichen Grüßen', noteEn: 'when no name is known — not for these tasks, which always name one' }
]
