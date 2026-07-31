//
// Sprechen Teil 2 — argument banks for the "thinking minute" prep screen
// (see docs/superpowers/specs/2026-08-01-sprechen-voiced-teil2-design.md,
// decision #7). Learners fail this exam part on CONTENT, not phrasing, so
// this bank — pro/contra angles plus topic vocabulary — is the core
// teaching asset shown before a Discussion starts.
//
// Three layers, cheapest-first (see resolveArgumentBank):
//   1. `cached`               — an AI-generated bank already saved for this
//                                exact Topic (Dexie, see useSprechenArguments.ts).
//   2. TOPIC_ARGUMENT_BANKS   — hand-authored, richer banks for a few flagship
//                                Topics (4 pro / 4 contra / 6 words).
//   3. TAG_ARGUMENT_BANKS     — one bank per TopicTag (3 pro / 3 contra / 6
//                                words) — the offline fallback: EVERY Topic
//                                resolves to content with zero AI calls.
//   4. Gesellschaft           — final fallback if a Topic's tags are somehow
//                                unrecognized (defensive; TopicTag is closed).

import { TOPIC_TAGS, type SprechenTopic, type TopicTag } from './sprechenTopics'

export interface ArgumentAngle {
  claim: string   // one short assertive German sentence (~60 chars)
  why: string     // one supporting sentence — a reason or concrete instance
}

export interface TopicWord {
  de: string   // with article, e.g. "der Fachkräftemangel"
  en: string   // natural English gloss
}

export interface ArgumentBank {
  pro: ArgumentAngle[]
  contra: ArgumentAngle[]
  words: TopicWord[]
}

/** Dexie row — `db.sprechenArgumentBanks`, primary key `topicId` (see src/db/index.ts). */
export interface CachedArgumentBank {
  topicId: string
  bank: ArgumentBank
  generatedAt: number
}

// ── Per-tag fallback banks (one for EACH TopicTag) ──────────────────

export const TAG_ARGUMENT_BANKS: Record<TopicTag, ArgumentBank> = {
  Umwelt: {
    pro: [
      { claim: 'Klimaschutz duldet keinen weiteren Aufschub mehr.', why: 'Extremwetter und schmelzende Gletscher zeigen schon heute die Folgen des Zögerns.' },
      { claim: 'Jeder Einzelne kann durch sein Verhalten etwas bewirken.', why: 'Kleine Veränderungen im Alltag summieren sich, wenn viele Menschen mitmachen.' },
      { claim: 'Umweltschutz spart langfristig Geld und wertvolle Ressourcen.', why: 'Wer heute in Energieeffizienz investiert, zahlt später deutlich weniger für Rohstoffe.' }
    ],
    contra: [
      { claim: 'Strenge Vorschriften belasten vor allem einkommensschwache Haushalte.', why: 'Höhere Preise für Energie oder Fleisch treffen Menschen mit wenig Geld am härtesten.' },
      { claim: 'Nationale Alleingänge bringen ohne internationale Zusammenarbeit wenig.', why: 'Klima kennt keine Grenzen, deshalb verpuffen einseitige Maßnahmen eines Landes leicht.' },
      { claim: 'Neue Technologien lösen viele Probleme oft schneller als Verbote.', why: 'Innovation setzt Anreize, während ein Verbot nur bestraft, ohne Alternativen zu schaffen.' }
    ],
    words: [
      { de: 'der Treibhausgasausstoß', en: 'greenhouse gas emissions' },
      { de: 'die Nachhaltigkeit', en: 'sustainability' },
      { de: 'der ökologische Fußabdruck', en: 'ecological footprint' },
      { de: 'die Artenvielfalt', en: 'biodiversity' },
      { de: 'die Klimaneutralität', en: 'climate neutrality' },
      { de: 'der Raubbau', en: 'overexploitation (of nature)' }
    ]
  },
  Arbeit: {
    pro: [
      { claim: 'Flexible Arbeitsmodelle steigern nachweislich die Zufriedenheit.', why: 'Wer die eigene Zeit besser einteilen kann, fühlt sich seinem Betrieb stärker verbunden.' },
      { claim: 'Weniger Druck am Arbeitsplatz verbessert die Produktivität.', why: 'Ausgeruhte Beschäftigte machen erwiesenermaßen weniger Fehler als überlastete.' },
      { claim: 'Mitarbeitende mit echtem Mitspracherecht bleiben ihrem Betrieb treu.', why: 'Wer Entscheidungen mitgestalten darf, kündigt aus Frust seltener innerlich.' }
    ],
    contra: [
      { claim: 'Nicht jede Branche kann sich flexible Regelungen leisten.', why: 'In Produktion oder Pflege hängt die Arbeit direkt von festen Schichten und Anwesenheit ab.' },
      { claim: 'Klare Strukturen und feste Zeiten schaffen Verlässlichkeit.', why: 'Kunden und Kollegen wissen so genau, wann sie jemanden erreichen können.' },
      { claim: 'Reformen dürfen kleine Betriebe wirtschaftlich nicht überfordern.', why: 'Ohne große Personalreserve lässt sich fehlende Arbeitszeit kaum einfach ausgleichen.' }
    ],
    words: [
      { de: 'der Fachkräftemangel', en: 'skilled-worker shortage' },
      { de: 'der Kündigungsschutz', en: 'protection against dismissal' },
      { de: 'die Überstunde', en: 'overtime hour' },
      { de: 'der Betriebsrat', en: 'works council' },
      { de: 'die Teilzeitarbeit', en: 'part-time work' },
      { de: 'der Berufseinstieg', en: 'career entry' }
    ]
  },
  Technologie: {
    pro: [
      { claim: 'Neue Technik erleichtert viele Aufgaben im Alltag spürbar.', why: 'Navigation, Übersetzung und Terminplanung laufen heute fast von selbst.' },
      { claim: 'Automatisierung schafft Freiraum für kreative Tätigkeiten.', why: 'Wer Routinearbeit an Maschinen abgibt, hat mehr Zeit für anspruchsvollere Aufgaben.' },
      { claim: 'Digitale Lösungen machen Wissen für alle leichter zugänglich.', why: 'Informationen, die früher teure Fachbücher erforderten, findet heute jeder online.' }
    ],
    contra: [
      { claim: 'Der Mensch verliert durch zu viel Technik wichtige Fähigkeiten.', why: 'Wer sich stets auf Navigationsgeräte verlässt, kann sich bald kaum noch orientieren.' },
      { claim: 'Nicht jeder hat den gleichen Zugang zu neuen Geräten.', why: 'Teure Technik vertieft die Kluft zwischen Menschen mit und ohne Geld.' },
      { claim: 'Abhängigkeit von Maschinen macht Nutzer bei Ausfällen verletzlich.', why: 'Ein Serverausfall legt heute ganze Betriebe und Haushalte gleichzeitig lahm.' }
    ],
    words: [
      { de: 'der Algorithmus', en: 'algorithm' },
      { de: 'die Automatisierung', en: 'automation' },
      { de: 'die Datensicherheit', en: 'data security' },
      { de: 'der Chatbot', en: 'chatbot' },
      { de: 'die Bildschirmzeit', en: 'screen time' },
      { de: 'die Vernetzung', en: 'interconnectedness' }
    ]
  },
  Bildung: {
    pro: [
      { claim: 'Individuelles Lernen fördert die Motivation der Schüler.', why: 'Wer im eigenen Tempo arbeitet, erlebt seltener Frust über zu schnellen Unterricht.' },
      { claim: 'Praxisnaher Unterricht bereitet besser auf den Beruf vor.', why: 'Projekte mit echten Aufgaben zeigen direkt, wozu das Gelernte später dient.' },
      { claim: 'Frühe Förderung gleicht soziale Unterschiede besser aus.', why: 'Kinder aus bildungsfernen Familien holen Rückstände so schon vor der Schule auf.' }
    ],
    contra: [
      { claim: 'Traditionelle Methoden haben sich über Jahrzehnte bewährt.', why: 'Viele erfolgreiche Generationen wurden genau mit diesem bewährten System unterrichtet.' },
      { claim: 'Einheitliche Standards sichern die Vergleichbarkeit von Abschlüssen.', why: 'Betriebe und Hochschulen brauchen ein verlässliches Maß, um Bewerber einzuschätzen.' },
      { claim: 'Reformen ohne ausreichende Mittel bringen Lehrkräfte an Grenzen.', why: 'Neue Konzepte scheitern oft an fehlender Zeit und zu großen Klassen.' }
    ],
    words: [
      { de: 'der Lehrplan', en: 'curriculum' },
      { de: 'die Chancengleichheit', en: 'equal opportunity' },
      { de: 'der Schulabschluss', en: 'school-leaving qualification' },
      { de: 'die Leistungsbeurteilung', en: 'performance assessment' },
      { de: 'der Frontalunterricht', en: 'teacher-centered instruction' },
      { de: 'die Lernfreude', en: 'joy of learning' }
    ]
  },
  Gesundheit: {
    pro: [
      { claim: 'Vorsorge verhindert viele schwere Krankheiten frühzeitig.', why: 'Regelmäßige Untersuchungen entdecken Probleme, bevor sie ernsthaft gefährlich werden.' },
      { claim: 'Ein gesunder Lebensstil verbessert die Lebensqualität spürbar.', why: 'Wer sich bewegt und ausgewogen isst, fühlt sich nachweislich energiereicher.' },
      { claim: 'Aufklärung hilft Menschen, bewusstere Entscheidungen zu treffen.', why: 'Wer die Folgen kennt, wählt seltener ungesunde Gewohnheiten aus reiner Gewohnheit.' }
    ],
    contra: [
      { claim: 'Der Staat sollte nicht über die private Lebensweise bestimmen.', why: 'Wie jemand isst oder sich bewegt, bleibt zunächst eine persönliche Entscheidung.' },
      { claim: 'Nicht jeder hat die Mittel für einen teuren gesunden Lebensstil.', why: 'Bio-Lebensmittel und Fitnessstudios kosten mehr, als sich viele Haushalte leisten können.' },
      { claim: 'Übertriebene Vorschriften wirken bevormundend und schrecken ab.', why: 'Wer sich ständig kontrolliert fühlt, ignoriert gut gemeinte Ratschläge erst recht.' }
    ],
    words: [
      { de: 'die Vorsorgeuntersuchung', en: 'preventive checkup' },
      { de: 'der Bewegungsmangel', en: 'lack of exercise' },
      { de: 'die Eigenverantwortung', en: 'personal responsibility' },
      { de: 'das Gesundheitsbewusstsein', en: 'health awareness' },
      { de: 'die Krankenkasse', en: 'health insurance fund' },
      { de: 'die Suchtgefahr', en: 'risk of addiction' }
    ]
  },
  Medien: {
    pro: [
      { claim: 'Vielfältige Medien informieren schnell über wichtige Themen.', why: 'Wer mehrere Quellen vergleicht, versteht komplexe Ereignisse deutlich besser.' },
      { claim: 'Kritischer Medienkonsum schärft das eigene Urteilsvermögen.', why: 'Wer Quellen hinterfragt, lässt sich seltener von einseitigen Darstellungen täuschen.' },
      { claim: 'Öffentliche Debatten profitieren von einer freien Presse.', why: 'Unabhängiger Journalismus deckt Missstände auf, die sonst verborgen blieben.' }
    ],
    contra: [
      { claim: 'Ständige Erreichbarkeit über Medien erzeugt unnötigen Stress.', why: 'Wer jede Nachricht sofort liest, kommt kaum noch zur echten Ruhe.' },
      { claim: 'Falschmeldungen verbreiten sich in sozialen Netzwerken rasend schnell.', why: 'Ein reißerischer Beitrag erreicht oft mehr Leser als die spätere Richtigstellung.' },
      { claim: 'Reißerische Schlagzeilen verzerren häufig die eigentliche Realität.', why: 'Wer nur die Überschrift liest, bekommt selten das ganze, differenzierte Bild.' }
    ],
    words: [
      { de: 'die Desinformation', en: 'disinformation' },
      { de: 'der Boulevardjournalismus', en: 'tabloid journalism' },
      { de: 'die Medienkompetenz', en: 'media literacy' },
      { de: 'die Filterblase', en: 'filter bubble' },
      { de: 'die Reichweite', en: 'reach (audience size)' },
      { de: 'die Aufmerksamkeitsspanne', en: 'attention span' }
    ]
  },
  Gesellschaft: {
    pro: [
      { claim: 'Solidarität hält eine Gesellschaft auch in Krisen zusammen.', why: 'Wer sich gegenseitig hilft, übersteht schwierige Zeiten spürbar leichter.' },
      { claim: 'Mehr Mitbestimmung stärkt das Vertrauen in Institutionen.', why: 'Wer Entscheidungen mitgestalten darf, akzeptiert das Ergebnis als Betroffener eher.' },
      { claim: 'Vielfalt bereichert das gesellschaftliche Zusammenleben.', why: 'Unterschiedliche Perspektiven führen häufig zu kreativeren, besseren Lösungen.' }
    ],
    contra: [
      { claim: 'Traditionelle Werte geben vielen Menschen wichtigen Halt.', why: 'Vertraute Regeln und Rituale erleichtern die Orientierung in unsicheren Zeiten.' },
      { claim: 'Zu viele neue Regeln überfordern den gesellschaftlichen Konsens.', why: 'Schnelle Veränderungen lassen manchen Menschen kaum Zeit, sich daran zu gewöhnen.' },
      { claim: 'Freiwilliges Engagement wirkt oft nachhaltiger als staatlicher Zwang.', why: 'Wer aus eigenem Antrieb hilft, bleibt meist länger motiviert als unter Vorschrift.' }
    ],
    words: [
      { de: 'der gesellschaftliche Zusammenhalt', en: 'social cohesion' },
      { de: 'der Generationenkonflikt', en: 'generational conflict' },
      { de: 'das Ehrenamt', en: 'volunteer work' },
      { de: 'die Solidargemeinschaft', en: 'solidarity community' },
      { de: 'der soziale Wandel', en: 'social change' },
      { de: 'die Toleranz', en: 'tolerance' }
    ]
  },
  Reisen: {
    pro: [
      { claim: 'Reisen erweitert den eigenen Horizont und fördert Offenheit.', why: 'Wer fremde Länder besucht, hinterfragt eigene Gewohnheiten öfter kritisch.' },
      { claim: 'Fremde Kulturen kennenzulernen fördert gegenseitiges Verständnis.', why: 'Persönliche Begegnungen bauen Vorurteile ab, die aus reiner Unkenntnis entstehen.' },
      { claim: 'Der Tourismus sichert in vielen Regionen wichtige Arbeitsplätze.', why: 'Hotels, Restaurants und Guides leben in beliebten Zielen fast ausschließlich davon.' }
    ],
    contra: [
      { claim: 'Massentourismus zerstört vielerorts die Natur vor Ort.', why: 'Zu viele Besucher gleichzeitig schädigen Strände, Riffe und empfindliche Landschaften.' },
      { claim: 'Ferne Reisen belasten das Klima durch hohen Kerosinverbrauch.', why: 'Ein einziger Langstreckenflug verursacht mehr Emissionen als ein ganzes Jahr Autofahren.' },
      { claim: 'Authentische Erfahrungen bleiben im durchgeplanten Pauschalurlaub oft aus.', why: 'Wer nur zwischen Hotel und Pool pendelt, sieht wenig vom echten Alltag vor Ort.' }
    ],
    words: [
      { de: 'der Massentourismus', en: 'mass tourism' },
      { de: 'der Kerosinverbrauch', en: 'jet-fuel consumption' },
      { de: 'die Fernreise', en: 'long-haul trip' },
      { de: 'das Reiseziel', en: 'destination' },
      { de: 'die Gastfreundschaft', en: 'hospitality' },
      { de: 'der Pauschalurlaub', en: 'package holiday' }
    ]
  },
  Konsum: {
    pro: [
      { claim: 'Bewusster Konsum schont die Umwelt und den eigenen Geldbeutel.', why: 'Wer weniger, aber gezielter kauft, spart langfristig Geld und Ressourcen.' },
      { claim: 'Qualität statt Menge spart über die Zeit deutlich Geld.', why: 'Ein langlebiges Produkt muss seltener ersetzt werden als billige Wegwerfware.' },
      { claim: 'Transparente Herkunft stärkt das Vertrauen der Kundschaft.', why: 'Wer weiß, woher ein Produkt stammt, kauft es mit deutlich besserem Gewissen.' }
    ],
    contra: [
      { claim: 'Jeder sollte selbst entscheiden dürfen, was er kauft.', why: 'Konsum bleibt eine private Entscheidung, die niemand von außen vorschreiben sollte.' },
      { claim: 'Strenge Vorschriften treiben die Preise für alle nach oben.', why: 'Zusätzliche Auflagen für Hersteller landen am Ende meist bei den Kunden.' },
      { claim: 'Nicht jeder kann sich teure, nachhaltige Alternativen leisten.', why: 'Fair produzierte Ware kostet oft ein Vielfaches der günstigen Massenware.' }
    ],
    words: [
      { de: 'die Kaufkraft', en: 'purchasing power' },
      { de: 'die Wegwerfmentalität', en: 'throwaway mentality' },
      { de: 'der Konsumzwang', en: 'compulsion to consume' },
      { de: 'die Lieferkette', en: 'supply chain' },
      { de: 'das Sonderangebot', en: 'special offer' },
      { de: 'der Konsumrausch', en: 'buying frenzy' }
    ]
  },
  Familie: {
    pro: [
      { claim: 'Flexible Familienmodelle passen sich dem modernen Leben an.', why: 'Patchwork- oder Zweiverdienerfamilien brauchen heute andere Lösungen als früher.' },
      { claim: 'Gemeinsame Zeit stärkt den Zusammenhalt in der Familie.', why: 'Feste Rituale wie das Abendessen geben Kindern spürbar Halt und Nähe.' },
      { claim: 'Gleichberechtigte Aufgabenteilung entlastet beide Elternteile.', why: 'Wer sich Haushalt und Erziehung teilt, hat mehr Zeit für Beruf und Erholung.' }
    ],
    contra: [
      { claim: 'Klare Rollen bieten Kindern verlässliche Orientierung und Sicherheit.', why: 'Feste Zuständigkeiten geben besonders jüngeren Kindern spürbaren Halt im Alltag.' },
      { claim: 'Nicht jede Familie kann sich flexible Lösungen leisten.', why: 'Zwei Vollzeitjobs mit freier Zeiteinteilung sind für viele Familien reine Theorie.' },
      { claim: 'Traditionen verbinden Generationen und schaffen echte Zugehörigkeit.', why: 'Gemeinsame Feste und Gewohnheiten geben Familienmitgliedern über Jahre Identität.' }
    ],
    words: [
      { de: 'die Kinderbetreuung', en: 'childcare' },
      { de: 'die Patchworkfamilie', en: 'blended family' },
      { de: 'der Generationenvertrag', en: 'intergenerational contract' },
      { de: 'das Familienbild', en: 'model/image of family' },
      { de: 'die Erziehung', en: 'upbringing' },
      { de: 'die Geschwisterbeziehung', en: 'sibling relationship' }
    ]
  }
}

// ── Richer per-Topic banks (4 pro / 4 contra / 6 words) ─────────────
// Exactly four flagship Topics — one per module quadrant — get bespoke
// content instead of falling back to their tag's bank.

export const TOPIC_ARGUMENT_BANKS: Record<string, ArgumentBank> = {
  'st-arbeit-vier-tage-woche': {
    pro: [
      { claim: 'Eine Vier-Tage-Woche steigert die Produktivität pro Stunde.', why: 'Studien zeigen, dass konzentriertere Arbeitszeit Erschöpfung und Fehler deutlich reduziert.' },
      { claim: 'Mehr freie Zeit verbessert die Vereinbarkeit von Beruf und Familie.', why: 'Eltern gewinnen einen zusätzlichen Tag für Kinder, Haushalt und eigene Erholung.' },
      { claim: 'Kürzere Wochen machen Arbeitgeber im Wettbewerb attraktiver.', why: 'Gerade jüngere Bewerber achten heute stärker auf Arbeitszeit als auf reines Gehalt.' },
      { claim: 'Weniger Arbeitstage senken Stress und langfristig die Krankheitsquote.', why: 'Ein zusätzlicher Erholungstag pro Woche wirkt nachweislich vorbeugend gegen Burnout.' }
    ],
    contra: [
      { claim: 'Nicht jede Branche schafft die gleiche Leistung in vier Tagen.', why: 'Im Handwerk oder in der Pflege hängt die Arbeit direkt von Anwesenheit ab.' },
      { claim: 'Verdichtete Arbeitstage erhöhen den Druck während der Kernzeit.', why: 'Wer das Pensum von fünf Tagen in vier schaffen muss, arbeitet oft hektischer.' },
      { claim: 'Kleine Betriebe können sich zusätzliches Personal oft nicht leisten.', why: 'Ohne höhere Kosten lässt sich die fehlende Arbeitszeit selten einfach kompensieren.' },
      { claim: 'Kundenkontakt und Erreichbarkeit leiden unter kürzeren Betriebstagen.', why: 'Manche Dienstleistungen erwarten von Kunden weiterhin Erreichbarkeit an fünf Tagen.' }
    ],
    words: [
      { de: 'die Arbeitszeitverkürzung', en: 'reduction of working hours' },
      { de: 'das Arbeitspensum', en: 'workload' },
      { de: 'die Arbeitsverdichtung', en: 'work intensification' },
      { de: 'die Kernarbeitszeit', en: 'core working hours' },
      { de: 'der Erholungstag', en: 'recovery day' },
      { de: 'die Produktivitätssteigerung', en: 'productivity increase' }
    ]
  },
  'st-tech-ki-im-alltag': {
    pro: [
      { claim: 'Künstliche Intelligenz erleichtert viele lästige Alltagsaufgaben.', why: 'Vom Kalender bis zur Navigation übernimmt KI heute lästige Routinearbeiten zuverlässig.' },
      { claim: 'KI-gestützte Diagnosen erkennen manche Krankheiten früher als Menschen.', why: 'In der Radiologie entdecken Algorithmen oft winzige Auffälligkeiten, die Ärzten entgehen.' },
      { claim: 'Automatisierte Übersetzung erleichtert Kommunikation über Sprachgrenzen.', why: 'Reisende und Firmen verständigen sich heute in Echtzeit ohne menschliche Dolmetscher.' },
      { claim: 'KI entlastet Beschäftigte von eintönigen, repetitiven Tätigkeiten.', why: 'Routineaufgaben in Verwaltung und Produktion übernehmen zunehmend intelligente Systeme.' }
    ],
    contra: [
      { claim: 'Künstliche Intelligenz gefährdet zahlreiche einfache Arbeitsplätze.', why: 'Ganze Berufsfelder wie einfache Bürotätigkeiten könnten mittelfristig überflüssig werden.' },
      { claim: 'Algorithmen treffen Entscheidungen oft intransparent und fehlerhaft.', why: 'Niemand kann immer nachvollziehen, warum ein System zu welchem Ergebnis kommt.' },
      { claim: 'Ständiger KI-Einsatz lässt eigenes kritisches Denken verkümmern.', why: 'Wer sich blind auf Vorschläge verlässt, hinterfragt Antworten immer seltener selbst.' },
      { claim: 'Persönliche Daten sind bei KI-Systemen oft schlecht geschützt.', why: 'Große Sprachmodelle verarbeiten riesige Datenmengen, deren Herkunft selten transparent ist.' }
    ],
    words: [
      { de: 'die Voreingenommenheit', en: 'bias' },
      { de: 'die Entscheidungsfindung', en: 'decision-making' },
      { de: 'das Sprachmodell', en: 'language model' },
      { de: 'die Nachvollziehbarkeit', en: 'traceability/transparency' },
      { de: 'der Datenschutz', en: 'data protection' },
      { de: 'die Mustererkennung', en: 'pattern recognition' }
    ]
  },
  'st-bildung-schulnoten': {
    pro: [
      { claim: 'Schulnoten erzeugen unnötigen Leistungsdruck und Angst.', why: 'Viele Schüler lernen für die Note statt aus echtem Interesse am Stoff.' },
      { claim: 'Ausführliches Feedback zeigt Stärken besser als eine einzelne Zahl.', why: 'Eine Eins oder Vier sagt wenig darüber, woran ein Schüler konkret arbeiten sollte.' },
      { claim: 'Noten fördern Konkurrenz statt Zusammenarbeit unter Mitschülern.', why: 'Wer nur die eigene Note im Blick hat, teilt Wissen seltener mit anderen.' },
      { claim: 'Ohne Notendruck trauen sich Schüler eher, Fehler zu machen.', why: 'Fehler gehören zum Lernen dazu, werden aber bei Notenangst oft vermieden.' }
    ],
    contra: [
      { claim: 'Noten geben Schülern und Eltern eine klare Orientierung.', why: 'Ohne Zahlen wüssten viele Familien kaum, wie gut ein Kind wirklich steht.' },
      { claim: 'Ein einheitliches System macht Abschlüsse bundesweit vergleichbar.', why: 'Universitäten und Betriebe verlassen sich bei der Auswahl auf vergleichbare Noten.' },
      { claim: 'Noten motivieren viele Schüler zu zusätzlicher Anstrengung.', why: 'Der Wunsch nach einer besseren Note treibt manche erst zum konzentrierten Lernen.' },
      { claim: 'Ausführliches Feedback für jeden Schüler kostet Lehrkräfte enorm viel Zeit.', why: 'Bei großen Klassen bleibt für individuelle Rückmeldungen kaum Zeit übrig.' }
    ],
    words: [
      { de: 'die Notengebung', en: 'grading' },
      { de: 'der Leistungsdruck', en: 'performance pressure' },
      { de: 'das Zeugnis', en: 'school report' },
      { de: 'die Bewertungsskala', en: 'rating scale' },
      { de: 'die Rückmeldung', en: 'feedback' },
      { de: 'die Versetzung', en: 'grade promotion' }
    ]
  },
  'st-umwelt-autofreie-innenstadt': {
    pro: [
      { claim: 'Autofreie Innenstädte verbessern die Luftqualität spürbar.', why: 'Weniger Abgase bedeuten weniger Feinstaub und weniger Atemwegserkrankungen in der Stadt.' },
      { claim: 'Ohne Verkehrslärm werden Innenstädte deutlich lebenswerter.', why: 'Cafés und Plätze laden erst ohne ständigen Motorenlärm wirklich zum Verweilen ein.' },
      { claim: 'Mehr Platz für Fußgänger und Radfahrer erhöht die Sicherheit.', why: 'Unfälle mit Fußgängern passieren überwiegend dort, wo Autos und Menschen Straßen teilen.' },
      { claim: 'Der lokale Einzelhandel profitiert von mehr Laufkundschaft.', why: 'Menschen bummeln länger und kaufen mehr, wenn kein Verkehr die Straßen dominiert.' }
    ],
    contra: [
      { claim: 'Nicht jeder erreicht die Innenstadt bequem mit Bus oder Bahn.', why: 'Gerade auf dem Land oder mit Behinderung bleibt das Auto oft unverzichtbar.' },
      { claim: 'Handwerker und Lieferdienste sind für ihre Arbeit auf Autos angewiesen.', why: 'Werkzeug und Waren lassen sich nicht immer mit dem Fahrrad transportieren.' },
      { claim: 'Ein Fahrverbot verlagert den Verkehr nur in die Außenbezirke.', why: 'Anwohner an den neuen Stadtgrenzen leiden dann stärker unter Lärm und Abgasen.' },
      { claim: 'Geschäfte fürchten sinkende Kundenzahlen ohne Parkplätze in der Nähe.', why: 'Viele Kunden kaufen dort, wo sie mit dem Auto bequem parken können.' }
    ],
    words: [
      { de: 'die Fußgängerzone', en: 'pedestrian zone' },
      { de: 'die Feinstaubbelastung', en: 'particulate-matter pollution' },
      { de: 'der Individualverkehr', en: 'private motor traffic' },
      { de: 'die Verkehrsberuhigung', en: 'traffic calming' },
      { de: 'der Lieferverkehr', en: 'delivery traffic' },
      { de: 'die Aufenthaltsqualität', en: 'quality of public space' }
    ]
  }
}

// ── Resolution ───────────────────────────────────────────────────────

/**
 * Cheapest-first resolution for a Topic's argument bank.
 * Precedence: a `cached` bank passed in wins ('cached'), else
 * TOPIC_ARGUMENT_BANKS[topic.id] ('topic'), else the first of topic.tags
 * present in TAG_ARGUMENT_BANKS (scope = that tag), else the Gesellschaft
 * bank (defensive fallback — TopicTag is a closed union so this should be
 * unreachable in practice).
 */
export function resolveArgumentBank(
  topic: Pick<SprechenTopic, 'id' | 'tags'>,
  cached?: ArgumentBank
): { bank: ArgumentBank; scope: 'cached' | 'topic' | TopicTag } {
  if (cached) return { bank: cached, scope: 'cached' }

  const topicBank = TOPIC_ARGUMENT_BANKS[topic.id]
  if (topicBank) return { bank: topicBank, scope: 'topic' }

  for (const tag of topic.tags) {
    const tagBank = TAG_ARGUMENT_BANKS[tag]
    if (tagBank) return { bank: tagBank, scope: tag }
  }

  return { bank: TAG_ARGUMENT_BANKS.Gesellschaft, scope: 'Gesellschaft' }
}

// Re-exported so callers/tests can iterate the full tag set without a
// second import from sprechenTopics.ts.
export { TOPIC_TAGS }
