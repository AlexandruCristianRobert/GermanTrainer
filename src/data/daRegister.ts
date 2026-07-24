// src/data/daRegister.ts
//
// Authored dataset for the Da-compound REGISTER drill (T19). Each item is one
// phrase to be judged on THREE levels:
//
//   • 'standard' — an ordinary, correct da-/wo-compound sentence, fine in speech
//                  AND in writing.
//   • 'spoken'   — grammatical in colloquial German but NOT written standard:
//                  the north-German split ("Da weiß ich nichts von."), the
//                  doubling/split with -r- ("Da freu ich mich schon drauf.",
//                  "dadrauf"), the "was"-for-"wo" question ("Auf was wartest du?"),
//                  and the wo-split ("Wo träumst du von?").
//   • 'wrong'    — ungrammatical in EVERY register: mis-formed compounds
//                  (*daauf, *darmit, *woauf, *wormit), a wo-compound asking after
//                  a PERSON, a da-compound standing for a person, and "prep + es/wen"
//                  where the da-compound is obligatory (*auf es for a thing).
//
// The phrase field shows the error RAW — no asterisk. Verdict truth is the
// shipping gate: read every phrase in its claimed register. For 'wrong' items the
// explanation names the phenomenon AND gives the corrected form. Invariants live
// in tests/data/daRegister.test.ts.

import type { CollocationLevel } from './collocations'

export type RegisterVerdict = 'standard' | 'spoken' | 'wrong'

export interface RegisterItem {
  /** Unique id, `rg-<n>`. */
  id: string
  /** The full phrase shown raw (wrong items contain the error, no asterisk). */
  phrase: string
  /** standard = correct & written; spoken = colloquial only; wrong = never grammatical. */
  verdict: RegisterVerdict
  /** German+English line naming the phenomenon; for 'wrong', the corrected form. */
  explanation: string
  level: CollocationLevel
}

export const DA_REGISTER: RegisterItem[] = [
  // ─────────────────────────── standard (12) ───────────────────────────
  // Ordinary correct da-/wo-compounds; fine in speech and in writing.
  { id: 'rg-1', verdict: 'standard', level: 'B1',
    phrase: 'Ich freue mich schon sehr darauf, dich bald wiederzusehen.',
    explanation: 'Korrektes "darauf" für eine Sache/einen Sachverhalt — Standard, auch geschrieben. / Correct da-compound; standard, also written.' },
  { id: 'rg-2', verdict: 'standard', level: 'B1',
    phrase: 'Wovon handelt eigentlich dieses neue Buch?',
    explanation: 'Korrektes wo-Kompositum "wovon" nach einer Sache — Standard. / Correct wo-compound for a thing; standard.' },
  { id: 'rg-3', verdict: 'standard', level: 'B2',
    phrase: 'Damit hätte ich in diesem Moment wirklich nicht gerechnet.',
    explanation: '"rechnen mit" → "damit" für eine Sache — Standard. / Correct "damit" (mit + thing); standard.' },
  { id: 'rg-4', verdict: 'standard', level: 'B1',
    phrase: 'Mach dir keine Sorgen — ich kümmere mich später in Ruhe darum.',
    explanation: '"sich kümmern um" → "darum" für eine Sache — Standard. / Correct "darum"; standard.' },
  { id: 'rg-5', verdict: 'standard', level: 'B1',
    phrase: 'Worauf wartest du eigentlich noch?',
    explanation: 'Korrektes "worauf" — nach einer Sache gefragt, Standard. / Correct wo-compound asking about a thing; standard.' },
  { id: 'rg-6', verdict: 'standard', level: 'B1',
    phrase: 'Sie hat mir das ganze Angebot erklärt, aber ich interessiere mich nicht dafür.',
    explanation: '"sich interessieren für" → "dafür" für eine Sache — Standard. / Correct "dafür"; standard.' },
  { id: 'rg-7', verdict: 'standard', level: 'B1',
    phrase: 'Woran denkst du gerade so angestrengt?',
    explanation: '"denken an" → "woran" für eine Sache — Standard. / Correct "woran"; standard.' },
  { id: 'rg-8', verdict: 'standard', level: 'B2',
    phrase: 'Davon habe ich ehrlich gesagt noch nie etwas gehört.',
    explanation: '"hören von" → "davon" für eine Sache — Standard. / Correct "davon"; standard.' },
  { id: 'rg-9', verdict: 'standard', level: 'B2',
    phrase: 'Man wollte den alten Park bebauen, doch die Anwohner waren alle dagegen.',
    explanation: '"gegen etwas sein" → "dagegen" für eine Sache — Standard. / Correct "dagegen"; standard.' },
  { id: 'rg-10', verdict: 'standard', level: 'B2',
    phrase: 'Worüber habt ihr denn so lange und so heftig gesprochen?',
    explanation: '"sprechen über" → "worüber" für eine Sache — Standard. / Correct "worüber"; standard.' },
  { id: 'rg-11', verdict: 'standard', level: 'C1',
    phrase: 'Dazu fällt mir im Augenblick leider überhaupt nichts mehr ein.',
    explanation: '"einfallen zu" → "dazu" für eine Sache — Standard. / Correct "dazu"; standard.' },
  { id: 'rg-12', verdict: 'standard', level: 'C1',
    phrase: 'Sie hat mir sehr geholfen, und ich habe mich herzlich dafür bedankt.',
    explanation: '"sich bedanken für" → "dafür" für eine Sache — Standard. / Correct "dafür"; standard.' },

  // ─────────────────────────── spoken (12) ───────────────────────────
  // Colloquial and attested, but NOT written standard.
  { id: 'rg-13', verdict: 'spoken', level: 'B2',
    phrase: 'Da weiß ich leider gar nichts von.',
    explanation: 'Norddeutsche Spaltung "da … von" statt "davon" — nur gesprochen. Standard: "Davon weiß ich nichts." / North-German split of the compound; spoken only.' },
  { id: 'rg-14', verdict: 'spoken', level: 'B2',
    phrase: 'Da hab ich in dem Moment gar nicht dran gedacht.',
    explanation: 'Gesprochene Spaltung "da … dran" statt "daran". Standard: "Daran habe ich nicht gedacht." / Colloquial split of "daran"; spoken only.' },
  { id: 'rg-15', verdict: 'spoken', level: 'B2',
    phrase: 'Da freu ich mich jetzt schon riesig drauf.',
    explanation: 'Gesprochene Spaltung "da … drauf" statt "darauf". Standard: "Darauf freue ich mich." / Colloquial split of "darauf"; spoken only.' },
  { id: 'rg-16', verdict: 'spoken', level: 'B2',
    phrase: 'Auf was wartest du hier eigentlich die ganze Zeit?',
    explanation: '"auf was" statt "worauf" — umgangssprachlich verbreitet, nicht geschrieben. Standard: "Worauf wartest du?" / "was" for "wo(r)+prep"; spoken only.' },
  { id: 'rg-17', verdict: 'spoken', level: 'B2',
    phrase: 'Über was habt ihr euch denn so lange unterhalten?',
    explanation: '"über was" statt "worüber" — umgangssprachlich. Standard: "Worüber habt ihr euch unterhalten?" / "was" for "worüber"; spoken only.' },
  { id: 'rg-18', verdict: 'spoken', level: 'C1',
    phrase: 'Wo redet ihr da eigentlich schon wieder von?',
    explanation: 'Süddeutsche/umgangssprachliche wo-Spaltung "wo … von" statt "wovon". Standard: "Wovon redet ihr?" / wo-split; spoken only.' },
  { id: 'rg-19', verdict: 'spoken', level: 'C1',
    phrase: 'Da kann ich doch nun wirklich nichts für.',
    explanation: 'Gesprochene Spaltung "da … für" ("dafür können" = schuld sein). Standard: "Dafür kann ich nichts." / Colloquial split of "dafür"; spoken only.' },
  { id: 'rg-20', verdict: 'spoken', level: 'C1',
    phrase: 'Von seinem Gerede halte ich wenig — da halt ich echt nichts von.',
    explanation: 'Gesprochene Spaltung "da … von" ("etwas davon halten"). Standard: "Davon halte ich nichts." / Colloquial split of "davon"; spoken only.' },
  { id: 'rg-21', verdict: 'spoken', level: 'C1',
    phrase: 'Ich freu mich schon so dadrauf, endlich Urlaub zu haben.',
    explanation: 'Verdopplung "dadrauf" (da + drauf) statt "darauf" — umgangssprachlich. Standard: "darauf". / Doubled "dadrauf"; spoken only.' },
  { id: 'rg-22', verdict: 'spoken', level: 'B2',
    phrase: 'Mit was hast du denn diese Flasche aufgemacht?',
    explanation: '"mit was" statt "womit" — umgangssprachlich. Standard: "Womit hast du die Flasche aufgemacht?" / "was" for "womit"; spoken only.' },
  { id: 'rg-23', verdict: 'spoken', level: 'C1',
    phrase: 'Wo denkst du eigentlich die ganze Zeit dran?',
    explanation: 'Umgangssprachliche wo-Spaltung "wo … dran" statt "woran". Standard: "Woran denkst du?" / wo-split of "woran"; spoken only.' },
  { id: 'rg-24', verdict: 'spoken', level: 'B2',
    phrase: 'Auf so eine lange Sitzung hab ich echt keine Lust drauf.',
    explanation: 'Gesprochene Doppelung: "auf …" + zusätzliches "drauf". Standard: "Auf so eine Sitzung habe ich keine Lust." / Colloquial resumptive "drauf"; spoken only.' },

  // ─────────────────────────── wrong (12) ───────────────────────────
  // Ungrammatical in EVERY register. Explanation gives the corrected form.
  { id: 'rg-25', verdict: 'wrong', level: 'B1',
    phrase: 'Daauf kann ich mich hundertprozentig verlassen.',
    explanation: 'Falsche Form: vor Vokal braucht das Kompositum das Binde-r → "darauf", nie "daauf". / Wrong: the linking -r- is required before a vowel — "darauf".' },
  { id: 'rg-26', verdict: 'wrong', level: 'B1',
    phrase: 'Darmit bin ich überhaupt nicht einverstanden.',
    explanation: 'Falsche Form: vor Konsonant kein Binde-r → "damit", nie "darmit". / Wrong: no linking -r- before a consonant — "damit".' },
  { id: 'rg-27', verdict: 'wrong', level: 'B1',
    phrase: 'Woauf freust du dich eigentlich am meisten?',
    explanation: 'Falsche Form: vor Vokal braucht das Kompositum das Binde-r → "worauf", nie "woauf". / Wrong: linking -r- required — "worauf".' },
  { id: 'rg-28', verdict: 'wrong', level: 'B2',
    phrase: 'Wormit hast du die Flasche geöffnet?',
    explanation: 'Falsche Form: vor Konsonant kein Binde-r → "womit", nie "wormit". / Wrong: no linking -r- before a consonant — "womit".' },
  { id: 'rg-29', verdict: 'wrong', level: 'B2',
    phrase: 'Darfür interessiere ich mich schon seit Jahren.',
    explanation: 'Falsche Form: vor Konsonant kein Binde-r → "dafür", nie "darfür". / Wrong: no linking -r- before a consonant — "dafür".' },
  { id: 'rg-30', verdict: 'wrong', level: 'B2',
    phrase: 'Darvon habe ich wirklich nicht das Geringste gewusst.',
    explanation: 'Falsche Form: vor Konsonant kein Binde-r → "davon", nie "darvon". / Wrong: no linking -r- before a consonant — "davon".' },
  { id: 'rg-31', verdict: 'wrong', level: 'B2',
    phrase: 'Worauf wartest du? — Auf meinen großen Bruder.',
    explanation: 'Nach einer Person fragt man nicht mit "worauf", sondern mit "Präposition + wen": "Auf wen wartest du?". / A wo-compound cannot ask after a person — use "Auf wen …".' },
  { id: 'rg-32', verdict: 'wrong', level: 'B2',
    phrase: 'Suchst du deine kleine Schwester? — Ja, ich frage überall danach.',
    explanation: 'Ein da-Kompositum kann keine Person vertreten: nicht "danach", sondern "nach ihr". / A da-compound cannot stand for a person — use "nach ihr".' },
  { id: 'rg-33', verdict: 'wrong', level: 'B1',
    phrase: 'Wo ist nur mein Handy? Ich suche schon den ganzen Tag nach es.',
    explanation: 'Für eine Sache ist "nach es" falsch; das da-Kompositum ist Pflicht: "danach". / For a thing "nach es" is wrong — the da-compound is obligatory: "danach".' },
  { id: 'rg-34', verdict: 'wrong', level: 'B1',
    phrase: 'Vergiss das Licht nicht — denk bitte an es, bevor du gehst!',
    explanation: 'Für eine Sache ist "an es" falsch; das da-Kompositum ist Pflicht: "denk daran". / For a thing "an es" is wrong — use the da-compound "daran".' },
  { id: 'rg-35', verdict: 'wrong', level: 'B1',
    phrase: 'Daüber müssen wir dringend noch einmal in Ruhe reden.',
    explanation: 'Falsche Form: vor Vokal braucht das Kompositum das Binde-r → "darüber", nie "daüber". / Wrong: the linking -r- is required before a vowel — "darüber".' },
  { id: 'rg-36', verdict: 'wrong', level: 'C1',
    phrase: 'Kennst du die neue Kollegin? — Ja, ich habe gestern lange damit gesprochen.',
    explanation: 'Ein da-Kompositum kann keine Person vertreten: nicht "damit" (= mit der Kollegin), sondern "mit ihr". / A da-compound cannot stand for a person — use "mit ihr".' },
]
