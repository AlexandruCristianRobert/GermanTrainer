//
// Sprechen Teil 2 — Redemittel grouped by Move (see CONTEXT.md → "Move").
// Single source of truth: the cheatsheet renders ALL seven groups; the
// in-Discussion hint panel offers the six reactive HINT_MOVES ('opinion'
// is for opening a statement, which mid-discussion you rarely need).

export const MOVES = [
  'opinion', 'agree', 'disagree', 'partial', 'ask', 'example', 'summarize'
] as const

export type Move = (typeof MOVES)[number]

export const MOVE_LABEL: Record<Move, { de: string; en: string }> = {
  opinion:   { de: 'Meinung äußern',       en: 'State an opinion' },
  agree:     { de: 'Zustimmen',            en: 'Agree' },
  disagree:  { de: 'Widersprechen',        en: 'Disagree' },
  partial:   { de: 'Teilweise zustimmen',  en: 'Partially agree' },
  ask:       { de: 'Nachfragen',           en: 'Ask back' },
  example:   { de: 'Beispiel geben',       en: 'Give an example' },
  summarize: { de: 'Zusammenfassen',       en: 'Summarize / conclude' }
}

/** The six Moves offered by the in-Discussion hint panel, in display order. */
export const HINT_MOVES: Move[] = ['agree', 'disagree', 'partial', 'ask', 'example', 'summarize']

export interface Redemittel {
  id: string          // 'rm-agree-1'
  move: Move
  phraseDe: string
  noteEn: string      // short English gloss shown in the cheatsheet
}

const R = (id: string, move: Move, phraseDe: string, noteEn: string): Redemittel =>
  ({ id, move, phraseDe, noteEn })

export const SPRECHEN_REDEMITTEL: Redemittel[] = [
  // Meinung äußern
  R('rm-opinion-1', 'opinion', 'Meiner Meinung nach …', 'in my opinion …'),
  R('rm-opinion-2', 'opinion', 'Ich bin der Ansicht, dass …', 'I take the view that …'),
  R('rm-opinion-3', 'opinion', 'Ich bin davon überzeugt, dass …', 'I am convinced that …'),
  R('rm-opinion-4', 'opinion', 'Aus meiner Sicht …', 'from my point of view …'),
  R('rm-opinion-5', 'opinion', 'Für mich steht fest, dass …', 'for me it is clear that …'),
  R('rm-opinion-6', 'opinion', 'Ich finde es wichtig, dass …', 'I find it important that …'),
  // Zustimmen
  R('rm-agree-1', 'agree', 'Da stimme ich Ihnen völlig zu.', 'I completely agree with you.'),
  R('rm-agree-2', 'agree', 'Das sehe ich genauso.', 'I see it exactly the same way.'),
  R('rm-agree-3', 'agree', 'Da haben Sie vollkommen recht.', 'you are absolutely right.'),
  R('rm-agree-4', 'agree', 'Dem kann ich nur zustimmen.', 'I can only agree with that.'),
  R('rm-agree-5', 'agree', 'Genau das wollte ich auch sagen.', 'that is exactly what I wanted to say.'),
  R('rm-agree-6', 'agree', 'Das ist ein überzeugendes Argument.', 'that is a convincing argument.'),
  // Widersprechen
  R('rm-disagree-1', 'disagree', 'Da bin ich anderer Meinung.', 'I disagree.'),
  R('rm-disagree-2', 'disagree', 'Das sehe ich ganz anders.', 'I see that very differently.'),
  R('rm-disagree-3', 'disagree', 'Da muss ich Ihnen widersprechen.', 'I have to contradict you there.'),
  R('rm-disagree-4', 'disagree', 'Das überzeugt mich nicht, denn …', 'that does not convince me, because …'),
  R('rm-disagree-5', 'disagree', 'Ich halte das für problematisch, weil …', 'I consider that problematic, because …'),
  R('rm-disagree-6', 'disagree', 'Das stimmt so meiner Meinung nach nicht.', 'in my opinion that is not correct.'),
  // Teilweise zustimmen
  R('rm-partial-1', 'partial', 'Da haben Sie teilweise recht, aber …', 'you are partly right, but …'),
  R('rm-partial-2', 'partial', 'Einerseits stimmt das, andererseits …', 'on the one hand true, on the other …'),
  R('rm-partial-3', 'partial', 'Das mag sein, trotzdem …', 'that may be, nevertheless …'),
  R('rm-partial-4', 'partial', 'Im Prinzip ja, allerdings …', 'in principle yes, however …'),
  R('rm-partial-5', 'partial', 'Ich verstehe Ihren Punkt, dennoch …', 'I see your point, yet …'),
  R('rm-partial-6', 'partial', 'Bis zu einem gewissen Grad stimme ich zu, jedoch …', 'I agree to a certain degree, but …'),
  // Nachfragen
  R('rm-ask-1', 'ask', 'Wie sehen Sie das?', 'how do you see it?'),
  R('rm-ask-2', 'ask', 'Was halten Sie davon?', 'what do you think of that?'),
  R('rm-ask-3', 'ask', 'Sind Sie nicht auch der Meinung, dass …?', 'don\'t you also think that …?'),
  R('rm-ask-4', 'ask', 'Darf ich nachfragen, wie Sie das meinen?', 'may I ask what you mean by that?'),
  R('rm-ask-5', 'ask', 'Und wie sieht es Ihrer Meinung nach mit … aus?', 'and what about …, in your view?'),
  R('rm-ask-6', 'ask', 'Können Sie ein Beispiel dafür nennen?', 'can you give an example of that?'),
  // Beispiel geben
  R('rm-example-1', 'example', 'Ein gutes Beispiel dafür ist …', 'a good example of that is …'),
  R('rm-example-2', 'example', 'Nehmen wir zum Beispiel …', 'let\'s take for example …'),
  R('rm-example-3', 'example', 'Aus eigener Erfahrung kann ich sagen, dass …', 'from my own experience I can say …'),
  R('rm-example-4', 'example', 'Man sieht das deutlich an …', 'you can see that clearly in …'),
  R('rm-example-5', 'example', 'Denken Sie nur an …', 'just think of …'),
  R('rm-example-6', 'example', 'In meinem Umfeld habe ich erlebt, dass …', 'in my own circle I have seen that …'),
  // Zusammenfassen
  R('rm-summarize-1', 'summarize', 'Zusammenfassend lässt sich sagen, dass …', 'in summary one can say that …'),
  R('rm-summarize-2', 'summarize', 'Wir sind uns also einig, dass …', 'so we agree that …'),
  R('rm-summarize-3', 'summarize', 'Insgesamt denke ich, dass …', 'overall I think that …'),
  R('rm-summarize-4', 'summarize', 'Am Ende bleibt festzuhalten, dass …', 'in the end it remains to note that …'),
  R('rm-summarize-5', 'summarize', 'Wenn ich unsere Diskussion zusammenfasse, …', 'if I sum up our discussion, …'),
  R('rm-summarize-6', 'summarize', 'Unterm Strich bin ich der Meinung, dass …', 'the bottom line is I think that …')
]

export function phrasesForMove(move: Move): Redemittel[] {
  return SPRECHEN_REDEMITTEL.filter(r => r.move === move)
}
