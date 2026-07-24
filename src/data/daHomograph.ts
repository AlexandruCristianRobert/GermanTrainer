// src/data/daHomograph.ts
//
// Authored dataset for the Da-compound HOMOGRAPH drill (T18). Each item is one
// sentence that uses an ambiguous word — damit / darum / dabei / dagegen /
// danach / davor — in EXACTLY ONE of its two readings:
//
//   • 'compound'  — the word is a pronominal adverb "preposition + Sache":
//                   damit = mit + it, darum = um + it (bitten/es geht um),
//                   dabei = bei + it (present at it / on one's person),
//                   dagegen = gegen + it, danach = nach + it, davor = vor + it.
//   • 'connector' — the word is a free conjunction/adverb linking clauses:
//                   damit = purpose "so that", darum = "therefore" (= deshalb),
//                   dabei = concessive "and yet", dagegen = "by contrast"
//                   (= hingegen), danach/davor = temporal "afterwards/before that".
//
// Accuracy is a shipping gate: read every sentence aloud in BOTH readings; one
// reading must be impossible or absurd. The compound reading is blocked when the
// word cannot be a governed prepositional object; the connector reading is blocked
// when the word is not in a clause-linking position (e.g. the purpose reading of
// "damit" needs a verb-final subordinate clause, which the compound items never
// have). Invariants live in tests/data/daHomograph.test.ts.

import type { CollocationLevel } from './collocations'

export interface HomographWord {
  /** The ambiguous word, e.g. 'damit'. */
  word: string
  /** German+EN label for the "preposition + Sache" reading. */
  compoundLabel: string
  /** German+EN label for the conjunction/adverb reading. */
  connectorLabel: string
}

/** The two readings a homograph item can carry. */
export type HomographReading = 'compound' | 'connector'

export interface HomographItem {
  /** Unique id, `hg-<word>-<n>`. */
  id: string
  /** The ambiguous word; must be present verbatim in the sentence. */
  word: string
  /** One sentence using the word in exactly ONE reading. */
  sentence: string
  /** Which reading the sentence admits. */
  reading: HomographReading
  /** One German+English teaching line naming the reading and why. */
  explanation: string
  level: CollocationLevel
}

/** The ambiguous words with the labels the two-button pick shows. */
export const HOMOGRAPH_WORDS: HomographWord[] = [
  { word: 'damit',
    compoundLabel: 'mit + Sache — "with it"',
    connectorLabel: 'Konjunktion — "so that / in order that"' },
  { word: 'darum',
    compoundLabel: 'um + Sache — "for / about it"',
    connectorLabel: 'Adverb — "therefore / that’s why"' },
  { word: 'dabei',
    compoundLabel: 'bei + Sache — "with / present at it"',
    connectorLabel: 'Adverb — "and yet / although"' },
  { word: 'dagegen',
    compoundLabel: 'gegen + Sache — "against it"',
    connectorLabel: 'Adverb — "by contrast / however"' },
  { word: 'danach',
    compoundLabel: 'nach + Sache — "for / by it"',
    connectorLabel: 'Adverb — "afterwards / then"' },
  { word: 'davor',
    compoundLabel: 'vor + Sache — "of / from it"',
    connectorLabel: 'Adverb — "before that / beforehand"' },
]

export const DA_HOMOGRAPH: HomographItem[] = [
  // ═══════════════════════════ damit ═══════════════════════════
  // compound: instrumental "mit + Sache". connector: purpose conjunction (verb-final).
  { id: 'hg-damit-1', word: 'damit', reading: 'compound', level: 'B1',
    sentence: 'Hier ist ein scharfes Messer — was soll ich damit?',
    explanation: 'Instrumentales "damit" = "mit dem Messer" (Präposition + Sache), keine Konjunktion. / Here "damit" = mit + the thing (instrumental), not the "so that" conjunction.' },
  { id: 'hg-damit-2', word: 'damit', reading: 'compound', level: 'B1',
    sentence: 'Sie kaufte einen breiten Pinsel und strich damit die ganze Wand.',
    explanation: 'Instrumentales "damit" = "mit dem Pinsel". / "damit" = with the brush (instrumental), not the conjunction.' },
  { id: 'hg-damit-3', word: 'damit', reading: 'compound', level: 'B1',
    sentence: 'Das ist mein neues Handy; damit mache ich alle meine Fotos.',
    explanation: 'Instrumentales "damit" = "mit dem Handy". / "damit" = with the phone (instrumental).' },
  { id: 'hg-damit-4', word: 'damit', reading: 'compound', level: 'B2',
    sentence: 'Der Hammer lag griffbereit da, also schlug er den Nagel damit ein.',
    explanation: 'Instrumentales "damit" = "mit dem Hammer"; das Verb steht in Position 2, kein Absichtssatz. / "damit" = with the hammer; the verb is V2, so no purpose clause.' },
  { id: 'hg-damit-5', word: 'damit', reading: 'compound', level: 'B2',
    sentence: 'Du hast mir einen guten Rat gegeben, und damit hast du mir sehr geholfen.',
    explanation: 'Instrumentales "damit" verweist auf den Rat = "mit dem Rat". / "damit" points back to the advice = "with that".' },
  { id: 'hg-damit-6', word: 'damit', reading: 'connector', level: 'B1',
    sentence: 'Ich schreibe dir alles genau auf, damit du nichts vergisst.',
    explanation: 'Finales "damit" leitet einen Absichtssatz ein (Verb am Ende: "vergisst"). / "damit" is the purpose conjunction "so that" (verb-final clause).' },
  { id: 'hg-damit-7', word: 'damit', reading: 'connector', level: 'B1',
    sentence: 'Wir stehen extra früh auf, damit wir den ersten Zug noch erreichen.',
    explanation: 'Finales "damit" = "so that" (Verb am Ende: "erreichen"). / Purpose conjunction; note the clause-final verb.' },
  { id: 'hg-damit-8', word: 'damit', reading: 'connector', level: 'B2',
    sentence: 'Sie sprach betont langsam, damit alle im Saal sie verstehen konnten.',
    explanation: 'Finales "damit" = Absicht "so that" (Verb am Ende: "konnten"). / Purpose conjunction, verb-final.' },
  { id: 'hg-damit-9', word: 'damit', reading: 'connector', level: 'B2',
    sentence: 'Man senkte die Preise deutlich, damit wieder mehr Kunden ins Geschäft kommen.',
    explanation: 'Finales "damit" = Absicht (Verb am Ende: "kommen"). / Purpose conjunction "so that", verb-final.' },
  { id: 'hg-damit-10', word: 'damit', reading: 'connector', level: 'C1',
    sentence: 'Der Vertrag wurde neu formuliert, damit keine Missverständnisse mehr entstehen.',
    explanation: 'Finales "damit" leitet den Zwecksatz ein (Verb am Ende: "entstehen"). / Purpose conjunction, verb-final.' },

  // ═══════════════════════════ darum ═══════════════════════════
  // compound: "um + Sache" (streiten/bitten um, es geht um, sich kümmern um).
  // connector: causal adverb "deshalb / that's why".
  { id: 'hg-darum-1', word: 'darum', reading: 'compound', level: 'B2',
    sentence: 'Das Erbe war beträchtlich, und die Geschwister stritten sich jahrelang darum.',
    explanation: '"sich streiten um" — "darum" = "um das Erbe" (Präposition + Sache). / "darum" = over the inheritance (um-object), not "therefore".' },
  { id: 'hg-darum-2', word: 'darum', reading: 'compound', level: 'B1',
    sentence: 'Wenn du Hilfe brauchst, dann bitte mich einfach darum.',
    explanation: '"bitten um" — "darum" = "um Hilfe" (Objekt von bitten). / "darum" is the object of "bitten um", not the adverb "therefore".' },
  { id: 'hg-darum-3', word: 'darum', reading: 'compound', level: 'B2',
    sentence: 'In dieser Sitzung geht es vor allem darum, endlich die Kosten zu senken.',
    explanation: '"es geht um" — "darum" kündigt den zu-Satz an. / "es geht um" — "darum" announces the following clause, not causal.' },
  { id: 'hg-darum-4', word: 'darum', reading: 'compound', level: 'B1',
    sentence: 'Mach dir keine Sorgen um die Anmeldung — ich kümmere mich darum.',
    explanation: '"sich kümmern um" — "darum" = "um die Anmeldung". / "darum" is the um-object of "sich kümmern", not "therefore".' },
  { id: 'hg-darum-5', word: 'darum', reading: 'compound', level: 'C1',
    sentence: 'Es ging in der ganzen Debatte nie um Geld, sondern immer nur darum, recht zu behalten.',
    explanation: '"es geht um" — "darum" verweist auf den zu-Satz "recht zu behalten". / "darum" points to the zu-clause (um-object), not causal.' },
  { id: 'hg-darum-6', word: 'darum', reading: 'connector', level: 'B1',
    sentence: 'Es hatte tagelang stark geschneit; darum fielen viele Züge aus.',
    explanation: 'Kausales "darum" = "deshalb" (Verb in Position 2: "fielen"). / "darum" = "therefore" (causal adverb), not an um-object.' },
  { id: 'hg-darum-7', word: 'darum', reading: 'connector', level: 'B1',
    sentence: 'Du hast mir damals sehr geholfen — darum bin ich dir bis heute dankbar.',
    explanation: 'Kausales "darum" = "deshalb". / "darum" = "that’s why" (causal adverb).' },
  { id: 'hg-darum-8', word: 'darum', reading: 'connector', level: 'B2',
    sentence: 'Sie fühlte sich schon morgens richtig krank, darum blieb sie einfach zu Hause.',
    explanation: 'Kausales "darum" = "deshalb". / Causal adverb "therefore".' },
  { id: 'hg-darum-9', word: 'darum', reading: 'connector', level: 'B2',
    sentence: 'Die Hauptstraße war komplett gesperrt; darum mussten wir einen weiten Umweg fahren.',
    explanation: 'Kausales "darum" = "deshalb". / Causal adverb "therefore".' },
  { id: 'hg-darum-10', word: 'darum', reading: 'connector', level: 'C1',
    sentence: 'Der Zeuge widersprach sich mehrfach, darum schenkte ihm das Gericht keinen Glauben.',
    explanation: 'Kausales "darum" = "deshalb / aus diesem Grund". / Causal adverb "therefore".' },

  // ═══════════════════════════ dabei ═══════════════════════════
  // compound: "bei + Sache" (dabeihaben / present at it). connector: concessive "and yet".
  { id: 'hg-dabei-1', word: 'dabei', reading: 'compound', level: 'B1',
    sentence: 'Ich wollte gerade bezahlen, hatte aber leider kein Bargeld dabei.',
    explanation: '"dabeihaben" — "dabei" = "bei mir" (Bargeld bei sich). / "dabei" = on me/with me (dabeihaben), not concessive.' },
  { id: 'hg-dabei-2', word: 'dabei', reading: 'compound', level: 'B1',
    sentence: 'Als das entscheidende Tor fiel, waren wir zum Glück selbst im Stadion dabei.',
    explanation: '"dabei sein" = anwesend/beteiligt sein. / "dabei" = present/there, not the connector.' },
  { id: 'hg-dabei-3', word: 'dabei', reading: 'compound', level: 'B2',
    sentence: 'Das Konzert war großartig — schade, dass du gestern nicht dabei warst.',
    explanation: '"dabei sein" = anwesend sein. / "dabei" = there/present, not "and yet".' },
  { id: 'hg-dabei-4', word: 'dabei', reading: 'compound', level: 'B2',
    sentence: 'Wir organisieren am Samstag ein Picknick; seid ihr auch dabei?',
    explanation: '"dabei sein" = mitmachen. / "dabei" = in / joining in, not the connector.' },
  { id: 'hg-dabei-5', word: 'dabei', reading: 'compound', level: 'C1',
    sentence: 'Sie hat ihren Ausweis nie dabei, wenn die Kontrolle wirklich kommt.',
    explanation: '"dabeihaben" — "dabei" = "bei sich". / "dabei" = on her (dabeihaben), not concessive.' },
  { id: 'hg-dabei-6', word: 'dabei', reading: 'connector', level: 'B2',
    sentence: 'Er tut immer so streng, dabei ist er der freundlichste Mensch, den ich kenne.',
    explanation: 'Konzessives "dabei" = "und dabei doch / obwohl". / "dabei" = "and yet" (concessive adverb), not "bei etwas".' },
  { id: 'hg-dabei-7', word: 'dabei', reading: 'connector', level: 'B2',
    sentence: 'Das Ganze klingt furchtbar kompliziert, dabei ist es in Wahrheit ganz einfach.',
    explanation: 'Konzessives "dabei" = "dennoch / und dabei doch". / "dabei" = "and yet" (concessive).' },
  { id: 'hg-dabei-8', word: 'dabei', reading: 'connector', level: 'C1',
    sentence: 'Sie beklagt sich ständig über ihre Arbeit, dabei liebt sie ihren Beruf über alles.',
    explanation: 'Konzessives "dabei" = "obwohl / und dabei doch". / "dabei" = "and yet" (concessive).' },
  { id: 'hg-dabei-9', word: 'dabei', reading: 'connector', level: 'C1',
    sentence: 'Alle hielten ihn sofort für schuldig, dabei war er völlig unschuldig.',
    explanation: 'Konzessives "dabei" = "und dabei doch". / "dabei" = "and yet" (concessive), not a bei-object.' },

  // ═══════════════════════════ dagegen ═══════════════════════════
  // compound: "gegen + Sache" (dagegen sein, etwas dagegen haben, Mittel dagegen).
  // connector: contrastive adverb "by contrast / hingegen".
  { id: 'hg-dagegen-1', word: 'dagegen', reading: 'compound', level: 'B1',
    sentence: 'Dieser Plan ist wirklich schlecht durchdacht; ich bin ganz klar dagegen.',
    explanation: '"gegen etwas sein" — "dagegen" = "gegen den Plan". / "dagegen" = against it (gegen-object), not "by contrast".' },
  { id: 'hg-dagegen-2', word: 'dagegen', reading: 'compound', level: 'B1',
    sentence: 'Wenn du hier drinnen rauchen möchtest, habe ich nichts dagegen.',
    explanation: '"etwas dagegen haben" — "dagegen" = "gegen das Rauchen". / "dagegen" is the gegen-object of "etwas dagegen haben".' },
  { id: 'hg-dagegen-3', word: 'dagegen', reading: 'compound', level: 'B2',
    sentence: 'Mein Kopf tut furchtbar weh — hast du zufällig eine Tablette dagegen?',
    explanation: '"ein Mittel gegen etwas" — "dagegen" = "gegen die Kopfschmerzen". / "dagegen" = for/against it (a remedy), not "by contrast".' },
  { id: 'hg-dagegen-4', word: 'dagegen', reading: 'compound', level: 'B2',
    sentence: 'Als die Fabrik schließen sollte, protestierten die Arbeiter lautstark dagegen.',
    explanation: '"protestieren gegen" — "dagegen" = "gegen die Schließung". / "dagegen" is the gegen-object of "protestieren".' },
  { id: 'hg-dagegen-5', word: 'dagegen', reading: 'compound', level: 'C1',
    sentence: 'Man hat mir vieles vorgeworfen, aber ich konnte mich mit guten Argumenten dagegen wehren.',
    explanation: '"sich wehren gegen" — "dagegen" = "gegen die Vorwürfe". / "dagegen" is the gegen-object of "sich wehren".' },
  { id: 'hg-dagegen-6', word: 'dagegen', reading: 'connector', level: 'B2',
    sentence: 'Mein Bruder liebt laute Partys; ich dagegen bleibe lieber mit einem Buch zu Hause.',
    explanation: 'Kontrastives "dagegen" = "hingegen". / "dagegen" = "by contrast" (contrastive adverb), not a gegen-object.' },
  { id: 'hg-dagegen-7', word: 'dagegen', reading: 'connector', level: 'B2',
    sentence: 'Der Sommer war unerträglich heiß, der Winter dagegen blieb erstaunlich mild.',
    explanation: 'Kontrastives "dagegen" = "hingegen". / "dagegen" = "by contrast".' },
  { id: 'hg-dagegen-8', word: 'dagegen', reading: 'connector', level: 'C1',
    sentence: 'In der Großstadt ist es ständig laut; auf dem Land dagegen herrscht himmlische Ruhe.',
    explanation: 'Kontrastives "dagegen" = "hingegen". / "dagegen" = "by contrast".' },
  { id: 'hg-dagegen-9', word: 'dagegen', reading: 'connector', level: 'C1',
    sentence: 'Die erste Halbzeit war zäh und langweilig; die zweite dagegen war ausgesprochen spannend.',
    explanation: 'Kontrastives "dagegen" = "hingegen / im Gegensatz dazu". / "dagegen" = "by contrast".' },

  // ═══════════════════════════ danach ═══════════════════════════
  // compound: "nach + Sache" — forced by a following clause with a verb that
  // governs "nach" and does NOT license a bare clause (sehnen/streben nach), so
  // the temporal reading is impossible; connector: temporal adverb "afterwards".
  { id: 'hg-danach-1', word: 'danach', reading: 'compound', level: 'B2',
    sentence: 'Die ganze Familie sehnte sich danach, endlich wieder einmal gemeinsam zu verreisen.',
    explanation: '"sich sehnen nach" — "danach" kündigt den zu-Satz an (Objekt, nie Zeitangabe: "sehnen" braucht das Ziel). / "danach" is the nach-object announcing the zu-clause, not temporal.' },
  { id: 'hg-danach-2', word: 'danach', reading: 'compound', level: 'C1',
    sentence: 'Sie strebte ihr Leben lang danach, wirklich finanziell unabhängig zu werden.',
    explanation: '"streben nach" — "danach" kündigt den zu-Satz an; "streben" nimmt keinen blanken zu-Satz, also keine Zeitangabe. / "danach" is the nach-object; temporal reading impossible.' },
  { id: 'hg-danach-3', word: 'danach', reading: 'compound', level: 'C1',
    sentence: 'Er war so erschöpft und sehnte sich nur noch danach, dass endlich wieder Ruhe einkehrt.',
    explanation: '"sich sehnen nach" — "danach" verweist auf den dass-Satz. / "danach" is the nach-object announcing the dass-clause, not "afterwards".' },
  { id: 'hg-danach-4', word: 'danach', reading: 'connector', level: 'B1',
    sentence: 'Wir gingen zuerst gemütlich essen; danach sahen wir uns noch einen Film an.',
    explanation: 'Temporales "danach" = "anschließend / dann". / "danach" = "afterwards" (temporal adverb), no verb governs "nach".' },
  { id: 'hg-danach-5', word: 'danach', reading: 'connector', level: 'B1',
    sentence: 'Sie machte zuerst ihr Abitur; danach begann sie ein Studium in München.',
    explanation: 'Temporales "danach" = "anschließend". / "danach" = "afterwards" (temporal).' },
  { id: 'hg-danach-6', word: 'danach', reading: 'connector', level: 'B2',
    sentence: 'Erst kommt bei ihm immer die Arbeit, danach erst das Vergnügen.',
    explanation: 'Temporales "danach" = "dann". / "danach" = "then" (temporal adverb).' },
  { id: 'hg-danach-7', word: 'danach', reading: 'connector', level: 'B2',
    sentence: 'Er trainierte fast zwei Stunden lang und war danach vollkommen erschöpft.',
    explanation: 'Temporales "danach" = "anschließend". / "danach" = "afterwards" (temporal).' },

  // ═══════════════════════════ davor ═══════════════════════════
  // compound: "vor + Sache", forced by a following clause (davor, zu.../dass...).
  // connector: temporal adverb "before that / beforehand".
  { id: 'hg-davor-1', word: 'davor', reading: 'compound', level: 'B2',
    sentence: 'Viele Menschen haben große Angst davor, im Alter einmal ganz allein zu sein.',
    explanation: '"Angst haben vor" — "davor" kündigt den zu-Satz an. / "davor" is the vor-object announcing the zu-clause, not "beforehand".' },
  { id: 'hg-davor-2', word: 'davor', reading: 'compound', level: 'B2',
    sentence: 'Das kleine Kind fürchtete sich davor, allein im dunklen Zimmer zu schlafen.',
    explanation: '"sich fürchten vor" — "davor" verweist auf den zu-Satz. / "davor" is the vor-object announcing the zu-clause.' },
  { id: 'hg-davor-3', word: 'davor', reading: 'compound', level: 'C1',
    sentence: 'Der Wetterdienst warnt eindringlich davor, bei diesem Sturm aufs offene Meer hinauszufahren.',
    explanation: '"warnen vor" — "davor" kündigt den zu-Satz an. / "davor" is the vor-object announcing the zu-clause.' },
  { id: 'hg-davor-4', word: 'davor', reading: 'compound', level: 'C1',
    sentence: 'Sie schreckte auch davor nicht zurück, ihren eigenen Chef offen zu kritisieren.',
    explanation: '"zurückschrecken vor" — "davor" verweist auf den zu-Satz. / "davor" is the vor-object announcing the zu-clause.' },
  { id: 'hg-davor-5', word: 'davor', reading: 'connector', level: 'B1',
    sentence: 'Wir sind 2019 nach Berlin gezogen; davor haben wir zehn Jahre in Hamburg gewohnt.',
    explanation: 'Temporales "davor" = "vorher / zuvor". / "davor" = "before that" (temporal adverb), no verb governs "vor".' },
  { id: 'hg-davor-6', word: 'davor', reading: 'connector', level: 'B2',
    sentence: 'Der Film fängt erst um acht an; davor treffen wir uns noch kurz auf einen Kaffee.',
    explanation: 'Temporales "davor" = "vorher". / "davor" = "beforehand" (temporal).' },
  { id: 'hg-davor-7', word: 'davor', reading: 'connector', level: 'B2',
    sentence: 'Heute ist sie eine bekannte Ärztin; die Jahre davor hatte sie unglaublich hart studiert.',
    explanation: 'Temporales "davor" = "vorher / zuvor". / "davor" = "before that" (temporal).' },
  { id: 'hg-davor-8', word: 'davor', reading: 'connector', level: 'C1',
    sentence: 'Kurz davor hatte es noch in Strömen geregnet, doch dann riss der Himmel plötzlich auf.',
    explanation: 'Temporales "davor" = "kurz zuvor". / "davor" = "just before that" (temporal).' },
]
