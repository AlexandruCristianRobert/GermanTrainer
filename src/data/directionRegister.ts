// src/data/directionRegister.ts
//
// Authored dataset for the Direction Words REGISTER drill (Phase 3 T4). Each
// item is one phrase to be judged on THREE levels:
//
//   • 'standard' — a correct full hin-/her- compound, bare hin/her, or
//                  question word (wohin/woher), fine in speech AND in
//                  writing. Contains no r-form.
//   • 'spoken'   — grammatical in colloquial German but NOT written standard:
//                  the r-forms (rein/raus/rauf/runter/rüber) that collapse
//                  hin-/her- pairs ("Komm rüber!" = herüber/hinüber), and the
//                  wo-split ("Wo willst du denn hin?" for "Wohin willst du?").
//   • 'wrong'    — ungrammatical in EVERY register: hin/her fused onto an
//                  r-form that already replaced it (*hinrein, *herraus — the
//                  r-form alone is the spoken equivalent), the nonexistent
//                  *rab (the 'ab' pair has no r-form), "hier" used for motion
//                  toward the speaker (should be "her"), a doubled-letter
//                  spelling slip (*Herrein), and the classic kommen/gehen
//                  perspective mismatch (kommen wants her-, gehen wants hin-;
//                  CONTEXT.md: Perspective adverb).
//
// The phrase field shows the error RAW — no asterisk. Verdict truth is the
// shipping gate: read every phrase in its claimed register; one phenomenon
// per item. For 'spoken' r-form items the explanation names BOTH full forms
// the r-form collapses. For 'wrong' items the explanation names the
// phenomenon AND gives the corrected form in double quotes in the English
// half. Invariants live in tests/data/directionRegister.test.ts.

import type { DirectionLevel } from './directionWords'

export type DwRegisterVerdict = 'standard' | 'spoken' | 'wrong'

export interface DwRegisterItem {
  /** Unique id, `dwr-<n>`. */
  id: string
  /** The full phrase shown raw (wrong items contain the error, no asterisk). */
  phrase: string
  /** standard = correct & written; spoken = colloquial only; wrong = never grammatical. */
  verdict: DwRegisterVerdict
  /** German+English line naming the phenomenon; for 'wrong', the corrected form. */
  explanation: string
  level: DirectionLevel
  /** The [Adverb pair] element the item hinges on ('ein'|'aus'|'auf'|'unter'|'über'|'ab'), or null for pair-independent items (bare hin/her, 'Komm hier', wo-splits). */
  pair: string | null
}

export const DIRECTION_REGISTER: DwRegisterItem[] = [
  // ─────────────────────────── standard (13) ───────────────────────────
  // Correct full compounds, bare hin/her, question words, idioms, and
  // lexicalized verbs. Fine in speech and in writing. No r-forms.
  { id: 'dwr-1', verdict: 'standard', level: 'A2', pair: 'ein',
    phrase: 'Er ging leise ins Zimmer hinein.',
    explanation: 'Volle Zusammensetzung „hinein" — Standard, auch geschrieben. / Full compound "hinein"; standard, also written.' },
  { id: 'dwr-2', verdict: 'standard', level: 'A2', pair: 'aus',
    phrase: 'Die Kinder liefen fröhlich aus dem Haus hinaus.',
    explanation: 'Volle Zusammensetzung „hinaus" — Standard, auch geschrieben. / Full compound "hinaus"; standard, also written.' },
  { id: 'dwr-3', verdict: 'standard', level: 'B1', pair: 'auf',
    phrase: 'Der Kletterer stieg langsam den Berg hinauf.',
    explanation: 'Volle Zusammensetzung „hinauf" — Standard, auch geschrieben. / Full compound "hinauf"; standard, also written.' },
  { id: 'dwr-4', verdict: 'standard', level: 'A2', pair: 'unter',
    phrase: 'Sie ging langsam die Treppe hinunter.',
    explanation: 'Volle Zusammensetzung „hinunter" — Standard, auch geschrieben. / Full compound "hinunter"; standard, also written.' },
  { id: 'dwr-5', verdict: 'standard', level: 'B1', pair: 'über',
    phrase: 'Die Familie ging über die Brücke hinüber.',
    explanation: 'Volle Zusammensetzung „hinüber" — Standard, auch geschrieben. / Full compound "hinüber"; standard, also written.' },
  { id: 'dwr-6', verdict: 'standard', level: 'B2', pair: 'ab',
    phrase: 'Der Wanderer stieg vorsichtig den steilen Hang hinab.',
    explanation: 'Volle Zusammensetzung „hinab" — gehobenes Register, Standard, auch geschrieben. / Full compound "hinab"; elevated register, standard, also written.' },
  { id: 'dwr-7', verdict: 'standard', level: 'A2', pair: 'ein',
    phrase: 'Kommen Sie bitte herein!',
    explanation: 'Volle Zusammensetzung „herein" — Standard, auch geschrieben. / Full compound "herein"; standard, also written.' },
  { id: 'dwr-8', verdict: 'standard', level: 'A2', pair: null,
    phrase: 'Wohin fahren Sie im Urlaub?',
    explanation: 'Fragewort „wohin" nach dem Ziel — Standard, auch geschrieben. / Question word "wohin" asking the goal; standard, also written.' },
  { id: 'dwr-9', verdict: 'standard', level: 'A2', pair: null,
    phrase: 'Komm her, ich zeige dir etwas Schönes!',
    explanation: 'Bewegung zum Sprecher — „her" ist hier korrekt. / Motion toward the speaker; "her" is correct here.' },
  { id: 'dwr-10', verdict: 'standard', level: 'B1', pair: null,
    phrase: 'Woher kommst du ursprünglich?',
    explanation: 'Fragewort „woher" nach der Herkunft — Standard, auch geschrieben. / Question word "woher" asking the origin; standard, also written.' },
  { id: 'dwr-11', verdict: 'standard', level: 'B1', pair: null,
    phrase: 'Wir haben lange hin und her überlegt, bevor wir uns entschieden haben.',
    explanation: 'Redewendung „hin und her" (unentschlossen) — Standard. / Idiom "hin und her" (back and forth, undecided); standard.' },
  { id: 'dwr-12', verdict: 'standard', level: 'B2', pair: null,
    phrase: 'Die Firma stellt hochwertige Möbel her.',
    explanation: 'Lexikalisiertes „herstellen" (produzieren) — „her" trägt keine Richtung mehr. / Lexicalized "herstellen" (to manufacture); "her" no longer carries direction.' },
  { id: 'dwr-13', verdict: 'standard', level: 'C1', pair: null,
    phrase: 'Sie wies ausdrücklich auf das Problem hin.',
    explanation: 'Lexikalisiertes „hinweisen auf" (aufmerksam machen) — „hin" trägt keine Richtung mehr. / Lexicalized "hinweisen auf" (to point out); "hin" no longer carries direction.' },

  // ─────────────────────────── spoken (13) ───────────────────────────
  // r-forms in natural colloquial lines (each explanation names both full
  // forms the r-form collapses), and wo-splits.
  { id: 'dwr-14', verdict: 'spoken', level: 'A2', pair: 'ein',
    phrase: 'Ich muss noch schnell rein, bevor es losgeht.',
    explanation: '„rein" = herein (oder hinein) — gesprochen normal, geschrieben „herein"/„hinein". / "rein" collapses "herein/hinein"; fine in speech, written standard keeps the full form.' },
  { id: 'dwr-15', verdict: 'spoken', level: 'A2', pair: 'aus',
    phrase: 'Ich geh mal kurz raus.',
    explanation: '„raus" = heraus (oder hinaus) — gesprochen normal, geschrieben „heraus"/„hinaus". / "raus" collapses "heraus/hinaus"; fine in speech, written standard keeps the full form.' },
  { id: 'dwr-16', verdict: 'spoken', level: 'B1', pair: 'auf',
    phrase: 'Kommst du mit rauf? Ich zeig dir die neue Wohnung.',
    explanation: '„rauf" = herauf (oder hinauf) — gesprochen normal, geschrieben „herauf"/„hinauf". / "rauf" collapses "herauf/hinauf"; fine in speech, written standard keeps the full form.' },
  { id: 'dwr-17', verdict: 'spoken', level: 'A2', pair: 'unter',
    phrase: 'Kommst du mit runter?',
    explanation: '„runter" = herunter (oder hinunter) — gesprochen normal, geschrieben „herunter"/„hinunter". / "runter" collapses "herunter/hinunter"; fine in speech, written standard keeps the full form.' },
  { id: 'dwr-18', verdict: 'spoken', level: 'A2', pair: 'über',
    phrase: 'Komm rüber, das Essen wird kalt!',
    explanation: '„rüber" = herüber (oder hinüber) — gesprochen völlig normal, geschrieben „herüber". / "rüber" collapses "herüber/hinüber"; fine in speech, written standard keeps the full form.' },
  { id: 'dwr-19', verdict: 'spoken', level: 'B1', pair: 'ein',
    phrase: 'Willst du nicht auch mal rein?',
    explanation: '„rein" = herein (oder hinein) — gesprochen normal. / "rein" collapses "herein/hinein"; fine in speech, written standard keeps the full form.' },
  { id: 'dwr-20', verdict: 'spoken', level: 'B1', pair: 'aus',
    phrase: 'Wir müssen jetzt leider raus, der Bus kommt gleich.',
    explanation: '„raus" = heraus (oder hinaus) — gesprochen normal. / "raus" collapses "heraus/hinaus"; fine in speech, written standard keeps the full form.' },
  { id: 'dwr-21', verdict: 'spoken', level: 'B2', pair: 'auf',
    phrase: 'Sie will unbedingt noch mal rauf, um die Aussicht zu genießen.',
    explanation: '„rauf" = herauf (oder hinauf) — gesprochen normal. / "rauf" collapses "herauf/hinauf"; fine in speech, written standard keeps the full form.' },
  { id: 'dwr-22', verdict: 'spoken', level: 'B2', pair: 'unter',
    phrase: 'Er will nicht runter, er hat noch Angst vor der Leiter.',
    explanation: '„runter" = herunter (oder hinunter) — gesprochen normal. / "runter" collapses "herunter/hinunter"; fine in speech, written standard keeps the full form.' },
  { id: 'dwr-23', verdict: 'spoken', level: 'A2', pair: null,
    phrase: 'Wo willst du denn hin?',
    explanation: 'Gesprochene Spaltung von „wohin". Standard: „Wohin willst du denn?" / Colloquial split of "wohin"; spoken only.' },
  { id: 'dwr-24', verdict: 'spoken', level: 'B1', pair: null,
    phrase: 'Wo kommt ihr eigentlich her?',
    explanation: 'Gesprochene Spaltung von „woher". Standard: „Woher kommt ihr eigentlich?" / Colloquial split of "woher"; spoken only.' },
  { id: 'dwr-25', verdict: 'spoken', level: 'B2', pair: null,
    phrase: 'Wo soll das ganze Zeug denn hin?',
    explanation: 'Gesprochene Spaltung von „wohin". Standard: „Wohin soll das ganze Zeug denn?" / Colloquial split of "wohin"; spoken only.' },
  { id: 'dwr-26', verdict: 'spoken', level: 'C1', pair: null,
    phrase: "Wo geht's hier eigentlich lang?",
    explanation: 'Umgangssprachliche Wegfrage „wo … lang" (= entlang) — nur gesprochen. / Colloquial "wo … lang" (= entlang, "which way"); spoken only.' },

  // ─────────────────────────── wrong (13) ───────────────────────────
  // Ungrammatical in every register. Phrase shown raw, no asterisk.
  { id: 'dwr-27', verdict: 'wrong', level: 'B1', pair: 'ein',
    phrase: 'Er ist schnell hinrein gegangen.',
    explanation: '„hinrein" existiert nicht — „rein" ERSETZT hinein/herein. / "hinrein" does not exist; the r-form already replaced the full compound — spoken "rein" alone is fine; written correct: "hinein".' },
  { id: 'dwr-28', verdict: 'wrong', level: 'B1', pair: 'aus',
    phrase: 'Sie ist hinraus gerannt, um ihn noch zu erwischen.',
    explanation: '„hinraus" existiert nicht — „raus" ERSETZT hinaus/heraus. / "hinraus" does not exist; the r-form already replaced the full compound — spoken "raus" alone is fine; written correct: "hinaus".' },
  { id: 'dwr-29', verdict: 'wrong', level: 'B1', pair: 'auf',
    phrase: 'Er ist die Leiter schnell hinrauf geklettert.',
    explanation: '„hinrauf" existiert nicht — „rauf" ERSETZT hinauf/herauf. / "hinrauf" does not exist; the r-form already replaced the full compound — spoken "rauf" alone is fine; written correct: "hinauf".' },
  { id: 'dwr-30', verdict: 'wrong', level: 'B1', pair: 'unter',
    phrase: 'Sie ist die Treppe hinrunter gefallen.',
    explanation: '„hinrunter" existiert nicht — „runter" ERSETZT hinunter/herunter. / "hinrunter" does not exist; the r-form already replaced the full compound — spoken "runter" alone is fine; written correct: "hinunter".' },
  { id: 'dwr-31', verdict: 'wrong', level: 'B1', pair: 'über',
    phrase: 'Er ist schnell hinrüber gelaufen, um ihr zu helfen.',
    explanation: '„hinrüber" existiert nicht — „rüber" ERSETZT hinüber/herüber. / "hinrüber" does not exist; the r-form already replaced the full compound — spoken "rüber" alone is fine; written correct: "hinüber".' },
  { id: 'dwr-32', verdict: 'wrong', level: 'B2', pair: 'ab',
    phrase: 'Sie ist die Böschung schnell rab gerutscht.',
    explanation: '„rab" existiert nicht — zu „ab" gibt es keine R-Form. / "rab" does not exist; "ab" has no colloquial r-form — correct: "hinab".' },
  { id: 'dwr-33', verdict: 'wrong', level: 'A2', pair: null,
    phrase: 'Komm hier, ich zeige dir etwas!',
    explanation: '„hier" ist ein Ort, keine Bewegung — die Bewegung zum Sprecher heißt „her". / "hier" is a place, not a motion; correct: "Komm her".' },
  { id: 'dwr-34', verdict: 'wrong', level: 'A2', pair: 'ein',
    phrase: 'Herrein, ich hab schon auf dich gewartet!',
    explanation: 'Doppeltes „r" ist ein Schreibfehler — es heißt „Herein". / Doubled "r" is a spelling error; correct: "Herein".' },
  { id: 'dwr-35', verdict: 'wrong', level: 'B2', pair: 'unter',
    phrase: 'Bleib unten, ich komme gleich hinunter!',
    explanation: '„kommen" verlangt die Perspektive zum Sprecher, also „her-", nicht „hin-". / "kommen" requires the toward-speaker perspective ("her-"), not "hin-" — correct: "herunter".' },
  { id: 'dwr-36', verdict: 'wrong', level: 'B2', pair: 'ein',
    phrase: 'Er ist gerade hereingegangen, um sein Fahrrad zu holen, während alle draußen warteten.',
    explanation: '„gehen" verlangt die Perspektive weg vom Sprecher, also „hin-", nicht „her-". / "gehen" requires the away-from-speaker perspective ("hin-"), not "her-" — correct: "hineingegangen".' },
  { id: 'dwr-37', verdict: 'wrong', level: 'B2', pair: null,
    phrase: 'Geh mal eben her und hilf mir!',
    explanation: '„gehen" (weg) passt nicht zu „her" (zum Sprecher) — Verb und Partikel widersprechen sich. (süddt. ugs. „geh her" gilt nicht als Standard) / "gehen" (away) clashes with "her" (toward the speaker) — correct: "Komm her".' },
  { id: 'dwr-38', verdict: 'wrong', level: 'C1', pair: 'aus',
    phrase: 'Sie ist herraus gerannt, als sie den Lärm hörte.',
    explanation: '„herraus" existiert nicht — „raus" ERSETZT bereits heraus/hinaus. / "herraus" does not exist; "raus" already replaced the full compound — spoken "raus" alone is fine; written correct: "heraus".' },
  { id: 'dwr-39', verdict: 'wrong', level: 'C1', pair: 'auf',
    phrase: 'Komm doch herrauf, das Wetter ist super!',
    explanation: '„herrauf" existiert nicht — „rauf" ERSETZT bereits herauf/hinauf. / "herrauf" does not exist; "rauf" already replaced the full compound — spoken "rauf" alone is fine; written correct: "herauf".' },
]
