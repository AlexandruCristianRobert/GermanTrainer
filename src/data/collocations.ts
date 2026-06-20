// src/data/collocations.ts
//
// Curated static seed of German collocations where a verb, adjective, or noun
// governs a FIXED preposition + case (Verben/Adjektive/Nomen mit Präposition).
// Accuracy is a shipping gate: a wrong preposition or case teaches wrong German,
// so only confident, high-frequency, exam-relevant entries are included here.
// Genitive-governing collocations are deliberately excluded (Akk/Dat only).

export type CollocationRole = 'verb' | 'adjective' | 'noun'
export type CollocationCase = 'accusative' | 'dative'
export type CollocationLevel = 'B1' | 'B2' | 'C1'

export interface Collocation {
  /** Unique kebab-case id, includes the prep, e.g. "warten-auf", "sich-freuen-auf". */
  id: string
  /** German headword as displayed: reflexive verbs include "sich"; nouns include their article. */
  word: string
  /** Disambiguating English gloss, e.g. "to wait for", "to look forward to". */
  english: string
  role: CollocationRole
  /** The governed preposition, lowercase, e.g. "auf". */
  preposition: string
  case: CollocationCase
  level: CollocationLevel
  /** Short natural German sentence (<= ~10 words) that USES the collocation; the preposition MUST appear. */
  example: string
  /** Other acceptable prepositions, only when genuinely interchangeable (rare). */
  alternatives?: string[]
  /** Brief meaning/usage note when helpful. */
  notes?: string
}

export const COLLOCATION_ROLES = ['verb', 'adjective', 'noun'] as const
export const COLLOCATION_CASES = ['accusative', 'dative'] as const
export const COLLOCATION_LEVELS = ['B1', 'B2', 'C1'] as const

export const COLLOCATIONS: Collocation[] = [
  // ───────────────────────── Verbs — preposition "an" ─────────────────────────
  { id: "denken-an", word: "denken", english: "to think of/about", role: "verb", preposition: "an", case: "accusative", level: "B1", example: "Ich denke oft an meine Kindheit." },
  { id: "sich-erinnern-an", word: "sich erinnern", english: "to remember", role: "verb", preposition: "an", case: "accusative", level: "B1", example: "Erinnerst du dich an den Urlaub?" },
  { id: "glauben-an", word: "glauben", english: "to believe in", role: "verb", preposition: "an", case: "accusative", level: "B1", example: "Sie glaubt fest an den Erfolg." },
  { id: "sich-gewoehnen-an", word: "sich gewöhnen", english: "to get used to", role: "verb", preposition: "an", case: "accusative", level: "B1", example: "Ich gewöhne mich ans neue Klima." },
  { id: "sich-wenden-an", word: "sich wenden", english: "to turn to (someone)", role: "verb", preposition: "an", case: "accusative", level: "B2", example: "Wenden Sie sich an den Kundendienst." },
  { id: "denken-an-zukunft", word: "denken", english: "to bear in mind", role: "verb", preposition: "an", case: "accusative", level: "B2", example: "Denk auch an die Zukunft deiner Kinder." },
  { id: "sich-erinnern-an-detail", word: "sich erinnern", english: "to recall a detail", role: "verb", preposition: "an", case: "accusative", level: "B2", example: "Er erinnert sich genau an jedes Detail." },
  { id: "schreiben-an", word: "schreiben", english: "to write to", role: "verb", preposition: "an", case: "accusative", level: "B1", example: "Sie schreibt einen Brief an die Behörde." },
  { id: "sich-erinnern-an-namen", word: "sich erinnern", english: "to remember a name", role: "verb", preposition: "an", case: "accusative", level: "B2", example: "Ich erinnere mich nicht an seinen Namen." },
  { id: "appellieren-an", word: "appellieren", english: "to appeal to", role: "verb", preposition: "an", case: "accusative", level: "C1", example: "Der Redner appelliert an unsere Vernunft." },
  { id: "sich-raechen-an", word: "sich rächen", english: "to take revenge on", role: "verb", preposition: "an", case: "dative", level: "C1", example: "Er will sich an seinem Rivalen rächen." },
  { id: "teilnehmen-an", word: "teilnehmen", english: "to take part in", role: "verb", preposition: "an", case: "dative", level: "B1", example: "Wir nehmen am Wettbewerb teil." },
  { id: "arbeiten-an", word: "arbeiten", english: "to work on", role: "verb", preposition: "an", case: "dative", level: "B1", example: "Sie arbeitet an einem neuen Roman." },
  { id: "leiden-an", word: "leiden", english: "to suffer from (illness)", role: "verb", preposition: "an", case: "dative", level: "B2", example: "Er leidet an einer chronischen Krankheit." },
  { id: "sterben-an", word: "sterben", english: "to die of", role: "verb", preposition: "an", case: "dative", level: "B2", example: "Viele Menschen sterben an Krebs." },
  { id: "sich-beteiligen-an", word: "sich beteiligen", english: "to participate in", role: "verb", preposition: "an", case: "dative", level: "B2", example: "Alle beteiligen sich am Projekt." },
  { id: "erkennen-an", word: "erkennen", english: "to recognise by", role: "verb", preposition: "an", case: "dative", level: "B2", example: "Ich erkenne ihn an seiner Stimme." },
  { id: "zweifeln-an", word: "zweifeln", english: "to doubt", role: "verb", preposition: "an", case: "dative", level: "B2", example: "Sie zweifelt an seiner Ehrlichkeit." },
  { id: "hindern-an", word: "hindern", english: "to prevent from", role: "verb", preposition: "an", case: "dative", level: "B2", example: "Nichts hindert ihn an der Abreise." },
  { id: "sich-orientieren-an", word: "sich orientieren", english: "to orient oneself by", role: "verb", preposition: "an", case: "dative", level: "C1", example: "Wir orientieren uns an den Vorgaben." },
  { id: "fehlen-an", word: "fehlen", english: "to lack", role: "verb", preposition: "an", case: "dative", level: "B2", example: "Es fehlt ihm an Geduld." },
  { id: "mitwirken-an", word: "mitwirken", english: "to collaborate on", role: "verb", preposition: "an", case: "dative", level: "C1", example: "Viele Künstler wirken am Film mit." },
  { id: "scheitern-an", word: "scheitern", english: "to fail because of", role: "verb", preposition: "an", case: "dative", level: "B2", example: "Der Plan scheitert an der Finanzierung." },
  { id: "sich-festhalten-an", word: "sich festhalten", english: "to hold on to", role: "verb", preposition: "an", case: "dative", level: "B2", example: "Halt dich am Geländer fest." },

  // ───────────────────────── Verbs — preposition "auf" ─────────────────────────
  { id: "warten-auf", word: "warten", english: "to wait for", role: "verb", preposition: "auf", case: "accusative", level: "B1", example: "Ich warte schon lange auf den Bus." },
  { id: "sich-freuen-auf", word: "sich freuen", english: "to look forward to", role: "verb", preposition: "auf", case: "accusative", level: "B1", example: "Wir freuen uns aufs Wochenende." },
  { id: "sich-verlassen-auf", word: "sich verlassen", english: "to rely on", role: "verb", preposition: "auf", case: "accusative", level: "B1", example: "Du kannst dich auf mich verlassen." },
  { id: "achten-auf", word: "achten", english: "to pay attention to", role: "verb", preposition: "auf", case: "accusative", level: "B1", example: "Bitte achte auf die Verkehrsschilder." },
  { id: "sich-konzentrieren-auf", word: "sich konzentrieren", english: "to concentrate on", role: "verb", preposition: "auf", case: "accusative", level: "B1", example: "Sie konzentriert sich auf die Prüfung." },
  { id: "sich-vorbereiten-auf", word: "sich vorbereiten", english: "to prepare for", role: "verb", preposition: "auf", case: "accusative", level: "B1", example: "Er bereitet sich auf das Interview vor." },
  { id: "antworten-auf", word: "antworten", english: "to answer (a question)", role: "verb", preposition: "auf", case: "accusative", level: "B1", example: "Sie antwortet nicht auf meine Frage." },
  { id: "hoffen-auf", word: "hoffen", english: "to hope for", role: "verb", preposition: "auf", case: "accusative", level: "B1", example: "Wir hoffen auf besseres Wetter." },
  { id: "verzichten-auf", word: "verzichten", english: "to do without", role: "verb", preposition: "auf", case: "accusative", level: "B2", example: "Ich verzichte auf den Nachtisch." },
  { id: "reagieren-auf", word: "reagieren", english: "to react to", role: "verb", preposition: "auf", case: "accusative", level: "B2", example: "Er reagiert gereizt auf die Kritik." },
  { id: "aufpassen-auf", word: "aufpassen", english: "to look after", role: "verb", preposition: "auf", case: "accusative", level: "B1", example: "Kannst du auf die Kinder aufpassen?" },
  { id: "sich-beziehen-auf", word: "sich beziehen", english: "to refer to", role: "verb", preposition: "auf", case: "accusative", level: "B2", example: "Ich beziehe mich auf Ihr Schreiben." },
  { id: "ankommen-auf", word: "ankommen", english: "to depend on", role: "verb", preposition: "auf", case: "accusative", level: "B2", example: "Es kommt aufs Wetter an." },
  { id: "sich-einlassen-auf", word: "sich einlassen", english: "to get involved in", role: "verb", preposition: "auf", case: "accusative", level: "C1", example: "Lass dich nicht auf dieses Risiko ein." },
  { id: "verweisen-auf", word: "verweisen", english: "to refer to", role: "verb", preposition: "auf", case: "accusative", level: "C1", example: "Der Autor verweist auf frühere Studien." },
  { id: "sich-beschraenken-auf", word: "sich beschränken", english: "to limit oneself to", role: "verb", preposition: "auf", case: "accusative", level: "C1", example: "Wir beschränken uns aufs Wesentliche." },
  { id: "schwoeren-auf", word: "schwören", english: "to swear by", role: "verb", preposition: "auf", case: "accusative", level: "C1", example: "Sie schwört auf dieses Hausmittel." },
  { id: "stolz-machen-auf", word: "aufmerksam machen", english: "to draw attention to", role: "verb", preposition: "auf", case: "accusative", level: "B2", example: "Er macht mich auf den Fehler aufmerksam." },
  { id: "zaehlen-auf", word: "zählen", english: "to count on", role: "verb", preposition: "auf", case: "accusative", level: "B2", example: "Ich zähle auf deine Unterstützung." },
  { id: "sich-stuetzen-auf", word: "sich stützen", english: "to be based on", role: "verb", preposition: "auf", case: "accusative", level: "C1", example: "Die These stützt sich auf neue Daten." },
  { id: "anspielen-auf", word: "anspielen", english: "to allude to", role: "verb", preposition: "auf", case: "accusative", level: "C1", example: "Er spielt auf einen alten Streit an." },
  { id: "bestehen-auf", word: "bestehen", english: "to insist on", role: "verb", preposition: "auf", case: "dative", level: "B2", example: "Sie besteht auf ihrem Recht." },
  { id: "beruhen-auf", word: "beruhen", english: "to be based on", role: "verb", preposition: "auf", case: "dative", level: "C1", example: "Das Gerücht beruht auf einem Irrtum." },
  { id: "basieren-auf", word: "basieren", english: "to be based on", role: "verb", preposition: "auf", case: "dative", level: "B2", example: "Der Film basiert auf einem Roman." },

  // ───────────────────────── Verbs — preposition "über" ─────────────────────────
  { id: "sich-freuen-ueber", word: "sich freuen", english: "to be glad about", role: "verb", preposition: "über", case: "accusative", level: "B1", example: "Ich freue mich über dein Geschenk." },
  { id: "sich-aergern-ueber", word: "sich ärgern", english: "to be annoyed about", role: "verb", preposition: "über", case: "accusative", level: "B1", example: "Sie ärgert sich über den Stau." },
  { id: "nachdenken-ueber", word: "nachdenken", english: "to think about", role: "verb", preposition: "über", case: "accusative", level: "B1", example: "Ich denke über einen Umzug nach." },
  { id: "sprechen-ueber", word: "sprechen", english: "to talk about", role: "verb", preposition: "über", case: "accusative", level: "B1", example: "Wir sprechen über die Zukunft." },
  { id: "sich-beschweren-ueber", word: "sich beschweren", english: "to complain about", role: "verb", preposition: "über", case: "accusative", level: "B1", example: "Er beschwert sich über den Lärm." },
  { id: "sich-informieren-ueber", word: "sich informieren", english: "to find out about", role: "verb", preposition: "über", case: "accusative", level: "B1", example: "Ich informiere mich über die Reise." },
  { id: "sich-wundern-ueber", word: "sich wundern", english: "to be surprised at", role: "verb", preposition: "über", case: "accusative", level: "B2", example: "Sie wundert sich über sein Verhalten." },
  { id: "lachen-ueber", word: "lachen", english: "to laugh about", role: "verb", preposition: "über", case: "accusative", level: "B1", example: "Alle lachen über den Witz." },
  { id: "diskutieren-ueber", word: "diskutieren", english: "to discuss", role: "verb", preposition: "über", case: "accusative", level: "B1", example: "Sie diskutieren über die Politik." },
  { id: "berichten-ueber", word: "berichten", english: "to report on", role: "verb", preposition: "über", case: "accusative", level: "B2", example: "Die Zeitung berichtet über den Unfall." },
  { id: "sich-beklagen-ueber", word: "sich beklagen", english: "to complain about", role: "verb", preposition: "über", case: "accusative", level: "B2", example: "Er beklagt sich über die Hitze." },
  { id: "klagen-ueber", word: "klagen", english: "to complain of", role: "verb", preposition: "über", case: "accusative", level: "B2", example: "Sie klagt über starke Kopfschmerzen." },
  { id: "verfuegen-ueber", word: "verfügen", english: "to have at one's disposal", role: "verb", preposition: "über", case: "accusative", level: "C1", example: "Die Firma verfügt über viel Kapital." },
  { id: "herrschen-ueber", word: "herrschen", english: "to rule over", role: "verb", preposition: "über", case: "accusative", level: "C1", example: "Der König herrschte über das Land." },
  { id: "staunen-ueber", word: "staunen", english: "to marvel at", role: "verb", preposition: "über", case: "accusative", level: "B2", example: "Die Kinder staunen über das Feuerwerk." },
  { id: "urteilen-ueber", word: "urteilen", english: "to judge", role: "verb", preposition: "über", case: "accusative", level: "C1", example: "Man sollte nicht vorschnell über andere urteilen." },
  { id: "schimpfen-ueber", word: "schimpfen", english: "to grumble about", role: "verb", preposition: "über", case: "accusative", level: "B2", example: "Er schimpft ständig über das Wetter." },
  { id: "informieren-ueber-trans", word: "informieren", english: "to inform about", role: "verb", preposition: "über", case: "accusative", level: "B2", example: "Wir informieren Sie über die Änderungen." },
  { id: "nachdenken-ueber-loesung", word: "grübeln", english: "to ponder over", role: "verb", preposition: "über", case: "accusative", level: "C1", example: "Sie grübelt über die schwierige Frage." },

  // ───────────────────────── Verbs — preposition "von" ─────────────────────────
  { id: "traeumen-von", word: "träumen", english: "to dream of", role: "verb", preposition: "von", case: "dative", level: "B1", example: "Er träumt von einer langen Reise." },
  { id: "erzaehlen-von", word: "erzählen", english: "to tell about", role: "verb", preposition: "von", case: "dative", level: "B1", example: "Sie erzählt von ihrem Urlaub." },
  { id: "abhaengen-von", word: "abhängen", english: "to depend on", role: "verb", preposition: "von", case: "dative", level: "B2", example: "Alles hängt von deiner Entscheidung ab." },
  { id: "sich-erholen-von", word: "sich erholen", english: "to recover from", role: "verb", preposition: "von", case: "dative", level: "B1", example: "Ich erhole mich von der Krankheit." },
  { id: "sich-verabschieden-von", word: "sich verabschieden", english: "to say goodbye to", role: "verb", preposition: "von", case: "dative", level: "B1", example: "Wir verabschieden uns von den Gästen." },
  { id: "halten-von", word: "halten", english: "to think of (opinion)", role: "verb", preposition: "von", case: "dative", level: "B1", example: "Was hältst du von diesem Vorschlag?" },
  { id: "ueberzeugen-von", word: "überzeugen", english: "to convince of", role: "verb", preposition: "von", case: "dative", level: "B2", example: "Er überzeugt mich von seinem Plan." },
  { id: "profitieren-von", word: "profitieren", english: "to benefit from", role: "verb", preposition: "von", case: "dative", level: "B2", example: "Alle profitieren von der neuen Regel." },
  { id: "ausgehen-von", word: "ausgehen", english: "to assume", role: "verb", preposition: "von", case: "dative", level: "B2", example: "Ich gehe von deinem Einverständnis aus." },
  { id: "absehen-von", word: "absehen", english: "to refrain from", role: "verb", preposition: "von", case: "dative", level: "C1", example: "Wir sehen von einer Strafe ab." },
  { id: "leben-von", word: "leben", english: "to live on", role: "verb", preposition: "von", case: "dative", level: "B1", example: "Sie lebt von ihrer Rente." },
  { id: "wissen-von", word: "wissen", english: "to know about", role: "verb", preposition: "von", case: "dative", level: "B2", example: "Ich weiß nichts von diesem Treffen." },
  { id: "sich-ernaehren-von", word: "sich ernähren", english: "to live off (food)", role: "verb", preposition: "von", case: "dative", level: "B2", example: "Pandas ernähren sich von Bambus." },
  { id: "sich-distanzieren-von", word: "sich distanzieren", english: "to distance oneself from", role: "verb", preposition: "von", case: "dative", level: "C1", example: "Die Partei distanziert sich von der Aussage." },
  { id: "zeugen-von", word: "zeugen", english: "to be evidence of", role: "verb", preposition: "von", case: "dative", level: "C1", example: "Die Arbeit zeugt von großem Talent." },
  { id: "schwaermen-von", word: "schwärmen", english: "to rave about", role: "verb", preposition: "von", case: "dative", level: "B2", example: "Sie schwärmt von ihrem neuen Job." },
  { id: "berichten-von", word: "berichten", english: "to report of", role: "verb", preposition: "von", case: "dative", level: "B2", example: "Zeugen berichten von einem lauten Knall." },
  { id: "handeln-von", word: "handeln", english: "to be about (a text)", role: "verb", preposition: "von", case: "dative", level: "B2", example: "Das Buch handelt von einer Familie." },

  // ───────────────────────── Verbs — preposition "mit" ─────────────────────────
  { id: "rechnen-mit", word: "rechnen", english: "to count on / expect", role: "verb", preposition: "mit", case: "dative", level: "B2", example: "Wir rechnen mit Regen am Abend." },
  { id: "sich-beschaeftigen-mit", word: "sich beschäftigen", english: "to deal with", role: "verb", preposition: "mit", case: "dative", level: "B1", example: "Er beschäftigt sich mit alter Musik." },
  { id: "anfangen-mit", word: "anfangen", english: "to start with", role: "verb", preposition: "mit", case: "dative", level: "B1", example: "Wir fangen mit der Übung an." },
  { id: "aufhoeren-mit", word: "aufhören", english: "to stop doing", role: "verb", preposition: "mit", case: "dative", level: "B1", example: "Er hört mit dem Rauchen auf." },
  { id: "sich-treffen-mit", word: "sich treffen", english: "to meet with", role: "verb", preposition: "mit", case: "dative", level: "B1", example: "Ich treffe mich mit einer Freundin." },
  { id: "telefonieren-mit", word: "telefonieren", english: "to talk on the phone with", role: "verb", preposition: "mit", case: "dative", level: "B1", example: "Sie telefoniert mit ihrer Mutter." },
  { id: "sich-streiten-mit", word: "sich streiten", english: "to quarrel with", role: "verb", preposition: "mit", case: "dative", level: "B1", example: "Er streitet sich oft mit dem Bruder." },
  { id: "sich-unterhalten-mit", word: "sich unterhalten", english: "to chat with", role: "verb", preposition: "mit", case: "dative", level: "B1", example: "Wir unterhalten uns mit den Nachbarn." },
  { id: "vergleichen-mit", word: "vergleichen", english: "to compare with", role: "verb", preposition: "mit", case: "dative", level: "B2", example: "Vergleiche die Preise mit der Konkurrenz." },
  { id: "sich-abfinden-mit", word: "sich abfinden", english: "to come to terms with", role: "verb", preposition: "mit", case: "dative", level: "C1", example: "Sie findet sich mit der Lage ab." },
  { id: "sich-begnuegen-mit", word: "sich begnügen", english: "to make do with", role: "verb", preposition: "mit", case: "dative", level: "C1", example: "Wir begnügen uns mit dem Nötigsten." },
  { id: "umgehen-mit", word: "umgehen", english: "to handle / deal with", role: "verb", preposition: "mit", case: "dative", level: "B2", example: "Sie geht gut mit Kindern um." },
  { id: "sich-auseinandersetzen-mit", word: "sich auseinandersetzen", english: "to engage with", role: "verb", preposition: "mit", case: "dative", level: "C1", example: "Er setzt sich mit dem Thema auseinander." },
  { id: "drohen-mit", word: "drohen", english: "to threaten with", role: "verb", preposition: "mit", case: "dative", level: "B2", example: "Sie droht mit einer Klage." },
  { id: "beginnen-mit", word: "beginnen", english: "to begin with", role: "verb", preposition: "mit", case: "dative", level: "B1", example: "Der Kurs beginnt mit einer Vorstellung." },
  { id: "rechnen-mit-folge", word: "rechnen", english: "to reckon with", role: "verb", preposition: "mit", case: "dative", level: "B2", example: "Mit so einem Erfolg hatte niemand gerechnet." },
  { id: "sich-verbinden-mit", word: "sich verbinden", english: "to associate with", role: "verb", preposition: "mit", case: "dative", level: "C1", example: "Mit dieser Stadt verbinde ich schöne Erinnerungen." },

  // ───────────────────────── Verbs — preposition "für" ─────────────────────────
  { id: "sich-interessieren-fuer", word: "sich interessieren", english: "to be interested in", role: "verb", preposition: "für", case: "accusative", level: "B1", example: "Sie interessiert sich für Kunst." },
  { id: "sich-entscheiden-fuer", word: "sich entscheiden", english: "to decide on", role: "verb", preposition: "für", case: "accusative", level: "B1", example: "Ich entscheide mich für das blaue Kleid." },
  { id: "sich-bedanken-fuer", word: "sich bedanken", english: "to thank for", role: "verb", preposition: "für", case: "accusative", level: "B1", example: "Wir bedanken uns für die Einladung." },
  { id: "sich-entschuldigen-fuer", word: "sich entschuldigen", english: "to apologise for", role: "verb", preposition: "für", case: "accusative", level: "B1", example: "Er entschuldigt sich für die Verspätung." },
  { id: "sorgen-fuer", word: "sorgen", english: "to take care of / ensure", role: "verb", preposition: "für", case: "accusative", level: "B1", example: "Die Eltern sorgen für die Kinder." },
  { id: "sich-eignen-fuer", word: "sich eignen", english: "to be suitable for", role: "verb", preposition: "für", case: "accusative", level: "B2", example: "Der Film eignet sich für Kinder." },
  { id: "sich-einsetzen-fuer", word: "sich einsetzen", english: "to stand up for", role: "verb", preposition: "für", case: "accusative", level: "B2", example: "Sie setzt sich für den Umweltschutz ein." },
  { id: "kaempfen-fuer", word: "kämpfen", english: "to fight for", role: "verb", preposition: "für", case: "accusative", level: "B1", example: "Wir kämpfen für unsere Rechte." },
  { id: "sich-begeistern-fuer", word: "sich begeistern", english: "to be enthusiastic about", role: "verb", preposition: "für", case: "accusative", level: "B2", example: "Er begeistert sich für klassische Musik." },
  { id: "sich-bewerben-fuer", word: "sich bewerben", english: "to apply for (a post)", role: "verb", preposition: "für", case: "accusative", level: "B2", example: "Sie bewirbt sich für das Stipendium.", alternatives: ["um"] },
  { id: "stimmen-fuer", word: "stimmen", english: "to vote for", role: "verb", preposition: "für", case: "accusative", level: "B2", example: "Die meisten stimmen für den Vorschlag." },
  { id: "halten-fuer", word: "halten", english: "to consider (to be)", role: "verb", preposition: "für", case: "accusative", level: "B2", example: "Ich halte ihn für sehr begabt." },
  { id: "danken-fuer", word: "danken", english: "to thank for", role: "verb", preposition: "für", case: "accusative", level: "B1", example: "Ich danke dir für deine Hilfe." },
  { id: "ausgeben-fuer", word: "ausgeben", english: "to spend on", role: "verb", preposition: "für", case: "accusative", level: "B1", example: "Sie gibt viel Geld für Bücher aus." },
  { id: "plaedieren-fuer", word: "plädieren", english: "to plead for", role: "verb", preposition: "für", case: "accusative", level: "C1", example: "Der Anwalt plädiert für einen Freispruch." },
  { id: "buergen-fuer", word: "bürgen", english: "to vouch for", role: "verb", preposition: "für", case: "accusative", level: "C1", example: "Ich bürge für seine Zuverlässigkeit." },
  { id: "schwaermen-fuer", word: "schwärmen", english: "to have a crush on", role: "verb", preposition: "für", case: "accusative", level: "B2", example: "Sie schwärmt für ihren Lehrer." },

  // ───────────────────────── Verbs — preposition "vor" ─────────────────────────
  { id: "sich-fuerchten-vor", word: "sich fürchten", english: "to be afraid of", role: "verb", preposition: "vor", case: "dative", level: "B1", example: "Das Kind fürchtet sich vor dem Hund." },
  { id: "Angst-haben-vor", word: "sich ängstigen", english: "to be frightened of", role: "verb", preposition: "vor", case: "dative", level: "B2", example: "Sie ängstigt sich vor der Operation." },
  { id: "warnen-vor", word: "warnen", english: "to warn of", role: "verb", preposition: "vor", case: "dative", level: "B2", example: "Die Polizei warnt vor dem Glatteis." },
  { id: "schuetzen-vor", word: "schützen", english: "to protect from", role: "verb", preposition: "vor", case: "dative", level: "B2", example: "Die Creme schützt vor der Sonne." },
  { id: "sich-schuetzen-vor", word: "sich schützen", english: "to protect oneself from", role: "verb", preposition: "vor", case: "dative", level: "B2", example: "Wir schützen uns vor dem Regen." },
  { id: "fliehen-vor", word: "fliehen", english: "to flee from", role: "verb", preposition: "vor", case: "dative", level: "B2", example: "Sie fliehen vor dem Krieg." },
  { id: "sich-verstecken-vor", word: "sich verstecken", english: "to hide from", role: "verb", preposition: "vor", case: "dative", level: "B1", example: "Das Kind versteckt sich vor dem Vater." },
  { id: "sich-ekeln-vor", word: "sich ekeln", english: "to be disgusted by", role: "verb", preposition: "vor", case: "dative", level: "C1", example: "Ich ekele mich vor Spinnen." },
  { id: "kapitulieren-vor", word: "kapitulieren", english: "to capitulate to", role: "verb", preposition: "vor", case: "dative", level: "C1", example: "Er kapituliert vor der Übermacht." },
  { id: "zittern-vor", word: "zittern", english: "to tremble with", role: "verb", preposition: "vor", case: "dative", level: "B2", example: "Sie zittert vor Kälte." },
  { id: "erschrecken-vor", word: "erschrecken", english: "to be startled by", role: "verb", preposition: "vor", case: "dative", level: "B2", example: "Ich erschrecke vor dem lauten Knall." },

  // ───────────────────────── Verbs — preposition "um" ─────────────────────────
  { id: "sich-kuemmern-um", word: "sich kümmern", english: "to take care of", role: "verb", preposition: "um", case: "accusative", level: "B1", example: "Sie kümmert sich um die alten Eltern." },
  { id: "sich-bewerben-um", word: "sich bewerben", english: "to apply for (a job)", role: "verb", preposition: "um", case: "accusative", level: "B2", example: "Er bewirbt sich um eine neue Stelle." },
  { id: "sich-sorgen-um", word: "sich sorgen", english: "to worry about", role: "verb", preposition: "um", case: "accusative", level: "B2", example: "Die Mutter sorgt sich um ihr Kind." },
  { id: "bitten-um", word: "bitten", english: "to ask for", role: "verb", preposition: "um", case: "accusative", level: "B1", example: "Darf ich Sie um Hilfe bitten?" },
  { id: "kaempfen-um", word: "kämpfen", english: "to fight for (to win)", role: "verb", preposition: "um", case: "accusative", level: "B2", example: "Die Teams kämpfen um den Titel." },
  { id: "sich-bemuehen-um", word: "sich bemühen", english: "to make an effort for", role: "verb", preposition: "um", case: "accusative", level: "B2", example: "Sie bemüht sich um eine Lösung." },
  { id: "sich-handeln-um", word: "sich handeln", english: "to be a matter of", role: "verb", preposition: "um", case: "accusative", level: "B2", example: "Es handelt sich um einen Irrtum." },
  { id: "sich-streiten-um", word: "sich streiten", english: "to argue over", role: "verb", preposition: "um", case: "accusative", level: "B2", example: "Sie streiten sich ums Erbe." },
  { id: "sich-drehen-um", word: "sich drehen", english: "to be about (revolve around)", role: "verb", preposition: "um", case: "accusative", level: "B2", example: "Alles dreht sich ums Geld." },
  { id: "beneiden-um", word: "beneiden", english: "to envy for", role: "verb", preposition: "um", case: "accusative", level: "C1", example: "Ich beneide dich um deine Ruhe." },
  { id: "bangen-um", word: "bangen", english: "to fear for", role: "verb", preposition: "um", case: "accusative", level: "C1", example: "Sie bangt um seinen Arbeitsplatz." },
  { id: "trauern-um", word: "trauern", english: "to mourn for", role: "verb", preposition: "um", case: "accusative", level: "B2", example: "Das Land trauert um den Verstorbenen." },

  // ───────────────────────── Verbs — preposition "nach" ─────────────────────────
  { id: "fragen-nach", word: "fragen", english: "to ask about/for", role: "verb", preposition: "nach", case: "dative", level: "B1", example: "Sie fragt nach dem Weg zum Bahnhof." },
  { id: "suchen-nach", word: "suchen", english: "to search for", role: "verb", preposition: "nach", case: "dative", level: "B1", example: "Er sucht nach seinem Schlüssel." },
  { id: "riechen-nach", word: "riechen", english: "to smell of", role: "verb", preposition: "nach", case: "dative", level: "B1", example: "Die Küche riecht nach frischem Brot." },
  { id: "schmecken-nach", word: "schmecken", english: "to taste of", role: "verb", preposition: "nach", case: "dative", level: "B1", example: "Der Tee schmeckt nach Zitrone." },
  { id: "sich-sehnen-nach", word: "sich sehnen", english: "to long for", role: "verb", preposition: "nach", case: "dative", level: "B2", example: "Ich sehne mich nach Ruhe." },
  { id: "streben-nach", word: "streben", english: "to strive for", role: "verb", preposition: "nach", case: "dative", level: "C1", example: "Er strebt nach Anerkennung." },
  { id: "sich-erkundigen-nach", word: "sich erkundigen", english: "to inquire about", role: "verb", preposition: "nach", case: "dative", level: "B2", example: "Sie erkundigt sich nach den Preisen." },
  { id: "greifen-nach", word: "greifen", english: "to reach for", role: "verb", preposition: "nach", case: "dative", level: "B2", example: "Das Kind greift nach dem Spielzeug." },
  { id: "verlangen-nach", word: "verlangen", english: "to crave / call for", role: "verb", preposition: "nach", case: "dative", level: "C1", example: "Der Patient verlangt nach Wasser." },
  { id: "rufen-nach", word: "rufen", english: "to call for", role: "verb", preposition: "nach", case: "dative", level: "B2", example: "Das Baby ruft nach der Mutter." },
  { id: "sich-richten-nach", word: "sich richten", english: "to go by / comply with", role: "verb", preposition: "nach", case: "dative", level: "B2", example: "Wir richten uns nach den Regeln." },
  { id: "schreien-nach", word: "schreien", english: "to scream for", role: "verb", preposition: "nach", case: "dative", level: "B2", example: "Die Möwen schreien nach Futter." },

  // ───────────────────────── Verbs — preposition "in" ─────────────────────────
  { id: "sich-verlieben-in", word: "sich verlieben", english: "to fall in love with", role: "verb", preposition: "in", case: "accusative", level: "B1", example: "Er verliebt sich in die neue Kollegin." },
  { id: "sich-verwandeln-in", word: "sich verwandeln", english: "to transform into", role: "verb", preposition: "in", case: "accusative", level: "B2", example: "Die Raupe verwandelt sich in einen Schmetterling." },
  { id: "einwilligen-in", word: "einwilligen", english: "to consent to", role: "verb", preposition: "in", case: "accusative", level: "C1", example: "Sie willigt in die Operation ein." },
  { id: "sich-vertiefen-in", word: "sich vertiefen", english: "to immerse oneself in", role: "verb", preposition: "in", case: "accusative", level: "C1", example: "Er vertieft sich ins Buch." },
  { id: "investieren-in", word: "investieren", english: "to invest in", role: "verb", preposition: "in", case: "accusative", level: "B2", example: "Wir investieren in erneuerbare Energie." },
  { id: "geraten-in", word: "geraten", english: "to get into (a state)", role: "verb", preposition: "in", case: "accusative", level: "B2", example: "Wir geraten in eine schwierige Lage." },
  { id: "sich-einmischen-in", word: "sich einmischen", english: "to interfere in", role: "verb", preposition: "in", case: "accusative", level: "C1", example: "Misch dich nicht in fremde Angelegenheiten ein." },
  { id: "sich-irren-in", word: "sich irren", english: "to be mistaken about", role: "verb", preposition: "in", case: "dative", level: "B2", example: "Du irrst dich in der Person." },
  { id: "bestehen-in", word: "bestehen", english: "to consist in", role: "verb", preposition: "in", case: "dative", level: "C1", example: "Das Problem besteht in der Finanzierung." },

  // ───────────────────────── Verbs — preposition "bei" ─────────────────────────
  { id: "helfen-bei", word: "helfen", english: "to help with", role: "verb", preposition: "bei", case: "dative", level: "B1", example: "Kannst du mir bei den Hausaufgaben helfen?" },
  { id: "sich-bedanken-bei", word: "sich bedanken", english: "to thank (someone)", role: "verb", preposition: "bei", case: "dative", level: "B1", example: "Ich bedanke mich bei meinen Kollegen." },
  { id: "sich-entschuldigen-bei", word: "sich entschuldigen", english: "to apologise to", role: "verb", preposition: "bei", case: "dative", level: "B1", example: "Er entschuldigt sich bei der Lehrerin." },
  { id: "sich-beschweren-bei", word: "sich beschweren", english: "to complain to", role: "verb", preposition: "bei", case: "dative", level: "B2", example: "Sie beschwert sich beim Chef." },
  { id: "sich-bewerben-bei", word: "sich bewerben", english: "to apply at (a company)", role: "verb", preposition: "bei", case: "dative", level: "B2", example: "Ich bewerbe mich bei einer großen Firma." },
  { id: "sich-erkundigen-bei", word: "sich erkundigen", english: "to inquire with (someone)", role: "verb", preposition: "bei", case: "dative", level: "B2", example: "Erkundige dich beim Amt nach der Frist." },
  { id: "bleiben-bei", word: "bleiben", english: "to stick to/with", role: "verb", preposition: "bei", case: "dative", level: "B2", example: "Ich bleibe bei meiner Meinung." },
  { id: "sich-bedanken-bei-form", word: "danken", english: "to thank (formal)", role: "verb", preposition: "bei", case: "dative", level: "B2", example: "Wir danken Ihnen für die Geduld bei dieser Sache." },

  // ───────────────────────── Verbs — preposition "zu" ─────────────────────────
  { id: "gehoeren-zu", word: "gehören", english: "to belong to / be part of", role: "verb", preposition: "zu", case: "dative", level: "B1", example: "Dieses Zimmer gehört zur Wohnung." },
  { id: "passen-zu", word: "passen", english: "to go with / suit", role: "verb", preposition: "zu", case: "dative", level: "B1", example: "Die Krawatte passt gut zum Hemd." },
  { id: "einladen-zu", word: "einladen", english: "to invite to", role: "verb", preposition: "zu", case: "dative", level: "B1", example: "Sie lädt uns zu ihrer Party ein." },
  { id: "gratulieren-zu", word: "gratulieren", english: "to congratulate on", role: "verb", preposition: "zu", case: "dative", level: "B1", example: "Ich gratuliere dir zu deinem Geburtstag." },
  { id: "fuehren-zu", word: "führen", english: "to lead to", role: "verb", preposition: "zu", case: "dative", level: "B2", example: "Der Fehler führt zu großen Problemen." },
  { id: "beitragen-zu", word: "beitragen", english: "to contribute to", role: "verb", preposition: "zu", case: "dative", level: "B2", example: "Jeder trägt zum Erfolg bei." },
  { id: "sich-entschliessen-zu", word: "sich entschließen", english: "to resolve to", role: "verb", preposition: "zu", case: "dative", level: "B2", example: "Er entschließt sich zu einem Neuanfang." },
  { id: "zwingen-zu", word: "zwingen", english: "to force to", role: "verb", preposition: "zu", case: "dative", level: "B2", example: "Niemand zwingt dich zu dieser Arbeit." },
  { id: "ermutigen-zu", word: "ermutigen", english: "to encourage to", role: "verb", preposition: "zu", case: "dative", level: "B2", example: "Sie ermutigt mich zu mehr Mut." },
  { id: "neigen-zu", word: "neigen", english: "to tend towards", role: "verb", preposition: "zu", case: "dative", level: "C1", example: "Er neigt zu Übertreibungen." },
  { id: "dienen-zu", word: "dienen", english: "to serve for", role: "verb", preposition: "zu", case: "dative", level: "B2", example: "Dieses Gerät dient zu nichts Gutem." },
  { id: "raten-zu", word: "raten", english: "to advise (to do)", role: "verb", preposition: "zu", case: "dative", level: "B2", example: "Der Arzt rät zu mehr Bewegung." },
  { id: "ueberreden-zu", word: "überreden", english: "to talk into", role: "verb", preposition: "zu", case: "dative", level: "B2", example: "Sie überredet ihn zu einem Ausflug." },
  { id: "verhelfen-zu", word: "verhelfen", english: "to help (someone) to get", role: "verb", preposition: "zu", case: "dative", level: "C1", example: "Der Trainer verhilft ihr zu großem Ruhm." },
  { id: "sich-aeussern-zu", word: "sich äußern", english: "to comment on", role: "verb", preposition: "zu", case: "dative", level: "C1", example: "Der Minister äußert sich zu den Vorwürfen." },
  { id: "sich-bekennen-zu", word: "sich bekennen", english: "to profess / admit to", role: "verb", preposition: "zu", case: "dative", level: "C1", example: "Sie bekennt sich zu ihrer Verantwortung." },
  { id: "sich-eignen-zu", word: "taugen", english: "to be fit for", role: "verb", preposition: "zu", case: "dative", level: "C1", example: "Er taugt nicht zu schwerer Arbeit." },

  // ───────────────────────── Verbs — preposition "gegen" ─────────────────────────
  { id: "protestieren-gegen", word: "protestieren", english: "to protest against", role: "verb", preposition: "gegen", case: "accusative", level: "B2", example: "Die Bürger protestieren gegen das Gesetz." },
  { id: "kaempfen-gegen", word: "kämpfen", english: "to fight against", role: "verb", preposition: "gegen", case: "accusative", level: "B1", example: "Wir kämpfen gegen die Ungerechtigkeit." },
  { id: "sich-wehren-gegen", word: "sich wehren", english: "to defend oneself against", role: "verb", preposition: "gegen", case: "accusative", level: "B2", example: "Sie wehrt sich gegen die Vorwürfe." },
  { id: "verstossen-gegen", word: "verstoßen", english: "to violate", role: "verb", preposition: "gegen", case: "accusative", level: "C1", example: "Das verstößt gegen die Regeln." },
  { id: "stimmen-gegen", word: "stimmen", english: "to vote against", role: "verb", preposition: "gegen", case: "accusative", level: "B2", example: "Viele Abgeordnete stimmen gegen den Antrag." },
  { id: "sich-entscheiden-gegen", word: "sich entscheiden", english: "to decide against", role: "verb", preposition: "gegen", case: "accusative", level: "B2", example: "Sie entscheidet sich gegen den Umzug." },
  { id: "spielen-gegen", word: "spielen", english: "to play against", role: "verb", preposition: "gegen", case: "accusative", level: "B1", example: "Unsere Mannschaft spielt gegen den Tabellenführer." },
  { id: "vorgehen-gegen", word: "vorgehen", english: "to take action against", role: "verb", preposition: "gegen", case: "accusative", level: "C1", example: "Die Polizei geht gegen die Banden vor." },

  // ───────────────────────── Verbs — preposition "aus" ─────────────────────────
  { id: "bestehen-aus", word: "bestehen", english: "to consist of", role: "verb", preposition: "aus", case: "dative", level: "B2", example: "Das Team besteht aus fünf Personen." },
  { id: "sich-ergeben-aus", word: "sich ergeben", english: "to result from", role: "verb", preposition: "aus", case: "dative", level: "C1", example: "Aus dieser Lage ergibt sich ein Problem." },
  { id: "folgen-aus", word: "folgen", english: "to follow from", role: "verb", preposition: "aus", case: "dative", level: "C1", example: "Aus den Daten folgt eine klare Tendenz." },
  { id: "lernen-aus", word: "lernen", english: "to learn from", role: "verb", preposition: "aus", case: "dative", level: "B2", example: "Wir lernen aus unseren Fehlern." },

  // ───────────────────────── Verbs — preposition "unter" ─────────────────────────
  { id: "leiden-unter", word: "leiden", english: "to suffer under/from (conditions)", role: "verb", preposition: "unter", case: "dative", level: "B2", example: "Sie leidet unter dem Stress." },
  { id: "verstehen-unter", word: "verstehen", english: "to understand by (mean)", role: "verb", preposition: "unter", case: "dative", level: "B2", example: "Was verstehst du unter Freiheit?" },
  { id: "sich-vorstellen-unter", word: "sich vorstellen", english: "to imagine by", role: "verb", preposition: "unter", case: "dative", level: "B2", example: "Was stellst du dir unter diesem Begriff vor?" },

  // ───────────────────────── Verbs — batch 2 (mixed prepositions) ─────────────────────────
  { id: "berichten-ueber-medien", word: "schreiben", english: "to write about", role: "verb", preposition: "über", case: "accusative", level: "B2", example: "Der Journalist schreibt über die Wahl." },
  { id: "sich-aufregen-ueber", word: "sich aufregen", english: "to get worked up about", role: "verb", preposition: "über", case: "accusative", level: "B2", example: "Reg dich nicht über jede Kleinigkeit auf." },
  { id: "weinen-ueber", word: "weinen", english: "to cry over", role: "verb", preposition: "über", case: "accusative", level: "B2", example: "Sie weint über den Verlust." },
  { id: "sich-lustig-machen-ueber", word: "sich lustig machen", english: "to make fun of", role: "verb", preposition: "über", case: "accusative", level: "B2", example: "Mach dich nicht über ihn lustig." },
  { id: "fluchen-ueber", word: "fluchen", english: "to curse about", role: "verb", preposition: "über", case: "accusative", level: "C1", example: "Er flucht über den langsamen Verkehr." },
  { id: "sich-empoeren-ueber", word: "sich empören", english: "to be outraged about", role: "verb", preposition: "über", case: "accusative", level: "C1", example: "Viele empören sich über die Entscheidung." },
  { id: "spotten-ueber", word: "spotten", english: "to mock", role: "verb", preposition: "über", case: "accusative", level: "C1", example: "Sie spottet über seine Ideen." },

  { id: "sich-bewerben-um-amt", word: "kandidieren", english: "to run for (office)", role: "verb", preposition: "für", case: "accusative", level: "C1", example: "Sie kandidiert für das Amt der Bürgermeisterin." },
  { id: "sich-entscheiden-fuer-weg", word: "votieren", english: "to vote in favour of", role: "verb", preposition: "für", case: "accusative", level: "C1", example: "Die Mehrheit votiert für den Kompromiss." },
  { id: "garantieren-fuer", word: "garantieren", english: "to guarantee for", role: "verb", preposition: "für", case: "accusative", level: "B2", example: "Wir garantieren für die Qualität." },
  { id: "sich-schaemen-fuer", word: "sich schämen", english: "to be ashamed of", role: "verb", preposition: "für", case: "accusative", level: "B2", example: "Er schämt sich für sein Verhalten.", alternatives: ["über"] },
  { id: "verantwortlich-sein-fuer", word: "haften", english: "to be liable for", role: "verb", preposition: "für", case: "accusative", level: "C1", example: "Der Hersteller haftet für Schäden." },

  { id: "denken-an-aufgabe", word: "sich wenden", english: "to address (turn to a topic)", role: "verb", preposition: "an", case: "accusative", level: "B2", example: "Bitte wende dich an die richtige Stelle." },
  { id: "sich-klammern-an", word: "sich klammern", english: "to cling to", role: "verb", preposition: "an", case: "accusative", level: "C1", example: "Sie klammert sich an die Hoffnung." },
  { id: "grenzen-an", word: "grenzen", english: "to border on", role: "verb", preposition: "an", case: "accusative", level: "C1", example: "Der Garten grenzt an den Wald." },
  { id: "liefern-an", word: "liefern", english: "to deliver to", role: "verb", preposition: "an", case: "accusative", level: "B2", example: "Die Firma liefert an viele Kunden." },
  { id: "vermieten-an", word: "vermieten", english: "to rent out to", role: "verb", preposition: "an", case: "accusative", level: "B2", example: "Sie vermietet die Wohnung an Studenten." },
  { id: "verkaufen-an", word: "verkaufen", english: "to sell to", role: "verb", preposition: "an", case: "accusative", level: "B2", example: "Er verkauft sein Auto an einen Nachbarn." },
  { id: "sich-beteiligen-an-firma", word: "sich beteiligen", english: "to hold a stake in", role: "verb", preposition: "an", case: "dative", level: "C1", example: "Der Investor beteiligt sich am Start-up." },
  { id: "wachsen-an", word: "wachsen", english: "to grow through (a challenge)", role: "verb", preposition: "an", case: "dative", level: "C1", example: "Man wächst an seinen Aufgaben." },
  { id: "verdienen-an", word: "verdienen", english: "to earn from", role: "verb", preposition: "an", case: "dative", level: "B2", example: "Der Händler verdient an jedem Verkauf." },

  { id: "deuten-auf", word: "deuten", english: "to point to / indicate", role: "verb", preposition: "auf", case: "accusative", level: "B2", example: "Alle Zeichen deuten auf einen Sieg." },
  { id: "hinweisen-auf", word: "hinweisen", english: "to point out", role: "verb", preposition: "auf", case: "accusative", level: "B2", example: "Ich weise Sie auf die Risiken hin." },
  { id: "sich-berufen-auf", word: "sich berufen", english: "to invoke / cite", role: "verb", preposition: "auf", case: "accusative", level: "C1", example: "Er beruft sich auf das Gesetz." },
  { id: "abzielen-auf", word: "abzielen", english: "to aim at", role: "verb", preposition: "auf", case: "accusative", level: "C1", example: "Die Reform zielt auf mehr Gerechtigkeit ab." },
  { id: "sich-freuen-auf-besuch", word: "sich gefasst machen", english: "to brace oneself for", role: "verb", preposition: "auf", case: "accusative", level: "C1", example: "Mach dich auf schlechte Nachrichten gefasst." },
  { id: "anstossen-auf", word: "anstoßen", english: "to toast to", role: "verb", preposition: "auf", case: "accusative", level: "B2", example: "Wir stoßen auf das neue Jahr an." },
  { id: "trinken-auf", word: "trinken", english: "to drink to", role: "verb", preposition: "auf", case: "accusative", level: "B2", example: "Lasst uns auf die Gesundheit trinken." },
  { id: "sich-spezialisieren-auf", word: "sich spezialisieren", english: "to specialise in", role: "verb", preposition: "auf", case: "accusative", level: "B2", example: "Die Klinik spezialisiert sich auf Kinder." },
  { id: "blicken-auf", word: "blicken", english: "to look out on", role: "verb", preposition: "auf", case: "accusative", level: "B2", example: "Das Zimmer blickt auf den Garten." },
  { id: "schimpfen-auf", word: "schimpfen", english: "to rail against", role: "verb", preposition: "auf", case: "accusative", level: "B2", example: "Er schimpft auf die Regierung." },
  { id: "neugierig-sein-auf", word: "gespannt sein", english: "to be eager for", role: "verb", preposition: "auf", case: "accusative", level: "B2", example: "Ich bin gespannt auf das Ergebnis." },

  { id: "schmecken-nach-meer", word: "duften", english: "to be fragrant of", role: "verb", preposition: "nach", case: "dative", level: "B2", example: "Der Garten duftet nach Rosen." },
  { id: "klingen-nach", word: "klingen", english: "to sound like", role: "verb", preposition: "nach", case: "dative", level: "B2", example: "Das klingt nach einem guten Plan." },
  { id: "aussehen-nach", word: "aussehen", english: "to look like (it will)", role: "verb", preposition: "nach", case: "dative", level: "B2", example: "Es sieht nach Regen aus." },
  { id: "streben-nach-erfolg", word: "trachten", english: "to strive after", role: "verb", preposition: "nach", case: "dative", level: "C1", example: "Er trachtet nach Macht." },
  { id: "sich-richten-nach-wetter", word: "sich richten", english: "to depend on (adapt to)", role: "verb", preposition: "nach", case: "dative", level: "B2", example: "Die Kleidung richtet sich nach dem Wetter." },

  { id: "warnen-vor-gefahr", word: "zurueckschrecken", english: "to shrink back from", role: "verb", preposition: "vor", case: "dative", level: "C1", example: "Sie schreckt vor nichts zurück." },
  { id: "fliehen-vor-laerm", word: "weichen", english: "to yield to / give way", role: "verb", preposition: "vor", case: "dative", level: "C1", example: "Er weicht vor der Gefahr zurück." },
  { id: "Respekt-haben-vor", word: "Halt machen", english: "to stop before", role: "verb", preposition: "vor", case: "dative", level: "C1", example: "Die Krankheit macht vor niemandem Halt." },

  { id: "sich-trennen-von", word: "sich trennen", english: "to separate / part from", role: "verb", preposition: "von", case: "dative", level: "B1", example: "Sie trennt sich von ihrem Partner." },
  { id: "ueberzeugen-von-idee", word: "abraten", english: "to advise against", role: "verb", preposition: "von", case: "dative", level: "B2", example: "Der Arzt rät von der Reise ab." },
  { id: "befreien-von", word: "befreien", english: "to free from", role: "verb", preposition: "von", case: "dative", level: "B2", example: "Die Therapie befreit ihn von den Schmerzen." },
  { id: "abweichen-von", word: "abweichen", english: "to deviate from", role: "verb", preposition: "von", case: "dative", level: "C1", example: "Das Ergebnis weicht von der Norm ab." },
  { id: "zehren-von", word: "zehren", english: "to live off (reserves)", role: "verb", preposition: "von", case: "dative", level: "C1", example: "Sie zehrt von ihren Ersparnissen." },
  { id: "ablenken-von", word: "ablenken", english: "to distract from", role: "verb", preposition: "von", case: "dative", level: "B2", example: "Die Musik lenkt mich von der Arbeit ab." },
  { id: "ausnehmen-von", word: "ausgehen", english: "to set out from (assume)", role: "verb", preposition: "von", case: "dative", level: "B2", example: "Wir gehen vom schlimmsten Fall aus." },

  { id: "schreiben-mit", word: "schreiben", english: "to write with", role: "verb", preposition: "mit", case: "dative", level: "B1", example: "Sie schreibt mit einem Füller." },
  { id: "spielen-mit", word: "spielen", english: "to play with", role: "verb", preposition: "mit", case: "dative", level: "B1", example: "Das Kind spielt mit dem Ball." },
  { id: "reden-mit", word: "reden", english: "to talk with", role: "verb", preposition: "mit", case: "dative", level: "B1", example: "Ich muss mit dir reden." },
  { id: "verbinden-mit", word: "verbinden", english: "to connect with", role: "verb", preposition: "mit", case: "dative", level: "B2", example: "Bitte verbinden Sie mich mit der Zentrale." },
  { id: "sich-verstehen-mit", word: "sich verstehen", english: "to get along with", role: "verb", preposition: "mit", case: "dative", level: "B1", example: "Ich verstehe mich gut mit den Kollegen." },
  { id: "sich-versoehnen-mit", word: "sich versöhnen", english: "to reconcile with", role: "verb", preposition: "mit", case: "dative", level: "B2", example: "Sie versöhnt sich mit ihrer Schwester." },
  { id: "sich-anfreunden-mit", word: "sich anfreunden", english: "to make friends with", role: "verb", preposition: "mit", case: "dative", level: "B2", example: "Er freundet sich mit den Nachbarn an." },
  { id: "sich-identifizieren-mit", word: "sich identifizieren", english: "to identify with", role: "verb", preposition: "mit", case: "dative", level: "C1", example: "Viele identifizieren sich mit dem Helden." },
  { id: "sich-befassen-mit", word: "sich befassen", english: "to occupy oneself with", role: "verb", preposition: "mit", case: "dative", level: "C1", example: "Die Kommission befasst sich mit dem Fall." },

  { id: "antworten-auf-brief", word: "eingehen", english: "to respond to / address", role: "verb", preposition: "auf", case: "accusative", level: "B2", example: "Der Lehrer geht auf jede Frage ein." },
  { id: "sich-stuerzen-auf", word: "sich stürzen", english: "to pounce on", role: "verb", preposition: "auf", case: "accusative", level: "C1", example: "Die Kinder stürzen sich auf die Geschenke." },
  { id: "hoffen-auf-besserung", word: "setzen", english: "to bet/rely on", role: "verb", preposition: "auf", case: "accusative", level: "B2", example: "Wir setzen auf erneuerbare Energien." },
  { id: "schiessen-auf", word: "schießen", english: "to shoot at", role: "verb", preposition: "auf", case: "accusative", level: "B2", example: "Der Jäger schießt auf das Wild." },
  { id: "zugehen-auf", word: "zugehen", english: "to approach (someone)", role: "verb", preposition: "auf", case: "accusative", level: "B2", example: "Sie geht freundlich auf die Gäste zu." },

  { id: "sich-rebellieren-gegen", word: "rebellieren", english: "to rebel against", role: "verb", preposition: "gegen", case: "accusative", level: "C1", example: "Die Jugend rebelliert gegen die Tradition." },
  { id: "klagen-gegen", word: "klagen", english: "to sue / take legal action against", role: "verb", preposition: "gegen", case: "accusative", level: "C1", example: "Der Mieter klagt gegen den Vermieter." },
  { id: "verteidigen-gegen", word: "verteidigen", english: "to defend against", role: "verb", preposition: "gegen", case: "accusative", level: "B2", example: "Die Burg wird gegen die Feinde verteidigt." },

  { id: "verwenden-zu", word: "verwenden", english: "to use for (a purpose)", role: "verb", preposition: "zu", case: "dative", level: "B2", example: "Das Geld wird zu guten Zwecken verwendet." },
  { id: "kommen-zu", word: "kommen", english: "to come to (an outcome)", role: "verb", preposition: "zu", case: "dative", level: "B2", example: "Es kommt zu einer Einigung." },
  { id: "auffordern-zu", word: "auffordern", english: "to call upon to", role: "verb", preposition: "zu", case: "dative", level: "B2", example: "Der Chef fordert uns zu mehr Eile auf." },
  { id: "verurteilen-zu", word: "verurteilen", english: "to sentence to", role: "verb", preposition: "zu", case: "dative", level: "B2", example: "Das Gericht verurteilt ihn zu einer Geldstrafe." },
  { id: "ernennen-zu", word: "ernennen", english: "to appoint as", role: "verb", preposition: "zu", case: "dative", level: "C1", example: "Man ernennt sie zu seiner Nachfolgerin." },
  { id: "werden-zu", word: "werden", english: "to turn into", role: "verb", preposition: "zu", case: "dative", level: "B2", example: "Das Wasser wird zu Eis." },
  { id: "zaehlen-zu", word: "zählen", english: "to be counted among", role: "verb", preposition: "zu", case: "dative", level: "B2", example: "Er zählt zu den besten Spielern." },
  { id: "Stellung-nehmen-zu", word: "Stellung nehmen", english: "to take a stance on", role: "verb", preposition: "zu", case: "dative", level: "C1", example: "Sie nimmt Stellung zum Vorwurf." },

  { id: "fragen-nach-meinung", word: "sich umsehen", english: "to look around for", role: "verb", preposition: "nach", case: "dative", level: "B2", example: "Wir sehen uns nach einer Wohnung um." },
  { id: "tasten-nach", word: "tasten", english: "to grope for", role: "verb", preposition: "nach", case: "dative", level: "C1", example: "Er tastet im Dunkeln nach dem Schalter." },
  { id: "schauen-nach", word: "schauen", english: "to check on", role: "verb", preposition: "nach", case: "dative", level: "B2", example: "Kannst du nach dem Baby schauen?" },

  { id: "geraten-in-not", word: "verfallen", english: "to lapse into", role: "verb", preposition: "in", case: "accusative", level: "C1", example: "Sie verfällt in alte Gewohnheiten." },
  { id: "einteilen-in", word: "einteilen", english: "to divide into", role: "verb", preposition: "in", case: "accusative", level: "B2", example: "Wir teilen die Klasse in Gruppen ein." },
  { id: "uebersetzen-in", word: "übersetzen", english: "to translate into", role: "verb", preposition: "in", case: "accusative", level: "B2", example: "Sie übersetzt den Roman in viele Sprachen." },
  { id: "einfuehren-in", word: "einführen", english: "to introduce into", role: "verb", preposition: "in", case: "accusative", level: "B2", example: "Der Mentor führt sie ins Thema ein." },

  { id: "schliessen-aus", word: "schließen", english: "to conclude from", role: "verb", preposition: "aus", case: "dative", level: "C1", example: "Aus seinem Schweigen schließe ich Zustimmung." },
  { id: "machen-aus", word: "machen", english: "to make out of", role: "verb", preposition: "aus", case: "dative", level: "B2", example: "Aus Mehl macht man Brot." },
  { id: "entstehen-aus", word: "entstehen", english: "to arise from", role: "verb", preposition: "aus", case: "dative", level: "B2", example: "Aus der Idee entsteht ein Projekt." },

  { id: "verstehen-unter-begriff", word: "fallen", english: "to fall under (a category)", role: "verb", preposition: "unter", case: "accusative", level: "C1", example: "Das fällt nicht unter diese Regel." },
  { id: "stehen-unter-druck", word: "stehen", english: "to be under (pressure)", role: "verb", preposition: "unter", case: "dative", level: "B2", example: "Sie steht unter großem Druck." },

  // ───────────────────────── Verbs — batch 3 (mixed prepositions) ─────────────────────────
  { id: "sich-bewerben-auf", word: "sich bewerben", english: "to apply for (an advertised post)", role: "verb", preposition: "auf", case: "accusative", level: "B2", example: "Sie bewirbt sich auf die ausgeschriebene Stelle." },
  { id: "antworten-mit", word: "reagieren", english: "to respond by/with", role: "verb", preposition: "mit", case: "dative", level: "B2", example: "Er reagiert mit einem Lächeln." },
  { id: "vertrauen-auf", word: "vertrauen", english: "to trust in", role: "verb", preposition: "auf", case: "accusative", level: "B2", example: "Wir vertrauen auf unsere Erfahrung." },
  { id: "sich-verlassen-auf-wort", word: "bauen", english: "to count/build on", role: "verb", preposition: "auf", case: "accusative", level: "B2", example: "Ich baue auf deine Unterstützung." },
  { id: "sich-konzentrieren-auf-ziel", word: "fokussieren", english: "to focus on", role: "verb", preposition: "auf", case: "accusative", level: "C1", example: "Wir fokussieren aufs Wesentliche." },
  { id: "sich-vorbereiten-auf-rede", word: "einstellen", english: "to prepare/adjust for", role: "verb", preposition: "auf", case: "accusative", level: "B2", example: "Stell dich auf eine lange Nacht ein." },
  { id: "verweisen-an", word: "verweisen", english: "to refer (someone) to", role: "verb", preposition: "an", case: "accusative", level: "C1", example: "Der Arzt verweist mich an einen Spezialisten." },
  { id: "sich-binden-an", word: "sich binden", english: "to commit to", role: "verb", preposition: "an", case: "accusative", level: "C1", example: "Sie will sich nicht an einen Vertrag binden." },
  { id: "appellieren-an-gewissen", word: "erinnern", english: "to remind (someone) of", role: "verb", preposition: "an", case: "accusative", level: "B2", example: "Das Lied erinnert mich an den Sommer." },
  { id: "sich-anpassen-an", word: "sich anpassen", english: "to adapt to", role: "verb", preposition: "an", case: "accusative", level: "B2", example: "Tiere passen sich an die Umgebung an." },
  { id: "sich-gewoehnen-an-laerm", word: "sich gewöhnen", english: "to grow accustomed to", role: "verb", preposition: "an", case: "accusative", level: "B2", example: "Man gewöhnt sich an den Lärm der Stadt." },
  { id: "denken-ueber", word: "denken", english: "to have an opinion about", role: "verb", preposition: "über", case: "accusative", level: "B2", example: "Was denkst du über diesen Vorschlag?" },
  { id: "sich-Gedanken-machen-ueber", word: "nachgrübeln", english: "to brood over", role: "verb", preposition: "über", case: "accusative", level: "C1", example: "Sie grübelt lange über die Entscheidung nach." },
  { id: "sich-taeuschen-ueber", word: "sich täuschen", english: "to be mistaken about", role: "verb", preposition: "über", case: "accusative", level: "B2", example: "Er täuscht sich über die Lage." },
  { id: "sich-unterhalten-ueber", word: "sich unterhalten", english: "to converse about", role: "verb", preposition: "über", case: "accusative", level: "B2", example: "Wir unterhalten uns über die Reise." },
  { id: "abstimmen-ueber", word: "abstimmen", english: "to vote on", role: "verb", preposition: "über", case: "accusative", level: "B2", example: "Das Parlament stimmt über das Gesetz ab." },
  { id: "entscheiden-ueber", word: "entscheiden", english: "to decide on/about", role: "verb", preposition: "über", case: "accusative", level: "B2", example: "Der Richter entscheidet über den Fall." },
  { id: "sich-streiten-ueber", word: "sich streiten", english: "to argue about (a topic)", role: "verb", preposition: "über", case: "accusative", level: "B2", example: "Sie streiten über Politik." },
  { id: "siegen-ueber", word: "siegen", english: "to triumph over", role: "verb", preposition: "über", case: "accusative", level: "B2", example: "Die Mannschaft siegt über den Gegner." },
  { id: "warten-mit", word: "warten", english: "to wait with (postpone)", role: "verb", preposition: "mit", case: "dative", level: "B2", example: "Wir warten mit dem Essen auf dich." },
  { id: "ringen-mit", word: "ringen", english: "to struggle with", role: "verb", preposition: "mit", case: "dative", level: "C1", example: "Sie ringt mit einer schweren Entscheidung." },
  { id: "kaempfen-mit", word: "kämpfen", english: "to struggle/grapple with", role: "verb", preposition: "mit", case: "dative", level: "B2", example: "Er kämpft mit den Folgen des Unfalls." },
  { id: "experimentieren-mit", word: "experimentieren", english: "to experiment with", role: "verb", preposition: "mit", case: "dative", level: "B2", example: "Die Köchin experimentiert mit Gewürzen." },
  { id: "rechnen-mit-zahlen", word: "jonglieren", english: "to juggle with", role: "verb", preposition: "mit", case: "dative", level: "C1", example: "Der Künstler jongliert mit drei Bällen." },
  { id: "sich-schmuecken-mit", word: "sich schmücken", english: "to adorn oneself with", role: "verb", preposition: "mit", case: "dative", level: "C1", example: "Sie schmückt sich mit Gold." },
  { id: "sich-brüsten-mit", word: "sich brüsten", english: "to boast about", role: "verb", preposition: "mit", case: "dative", level: "C1", example: "Er brüstet sich mit seinem Erfolg." },
  { id: "urteilen-nach", word: "urteilen", english: "to judge by", role: "verb", preposition: "nach", case: "dative", level: "B2", example: "Man sollte nicht nach dem Aussehen urteilen." },
  { id: "benennen-nach", word: "benennen", english: "to name after", role: "verb", preposition: "nach", case: "dative", level: "B2", example: "Sie benennen das Kind nach dem Großvater." },
  { id: "fragen-nach-preis", word: "sich erkundigen", english: "to inquire after", role: "verb", preposition: "nach", case: "dative", level: "B2", example: "Sie erkundigt sich nach dem Befinden." },
  { id: "sich-trennen-von-dingen", word: "sich lösen", english: "to detach from", role: "verb", preposition: "von", case: "dative", level: "C1", example: "Er kann sich nicht von alten Ideen lösen." },
  { id: "sich-verabschieden-von-traum", word: "Abstand nehmen", english: "to back away from", role: "verb", preposition: "von", case: "dative", level: "C1", example: "Wir nehmen Abstand vom Plan." },
  { id: "ueberzeugen-von-qualitaet", word: "abbringen", english: "to dissuade from", role: "verb", preposition: "von", case: "dative", level: "C1", example: "Nichts bringt sie von ihrem Ziel ab." },
  { id: "leben-von-gehalt", word: "leben", english: "to subsist on", role: "verb", preposition: "von", case: "dative", level: "B2", example: "Die Familie lebt von einem Gehalt." },
  { id: "sich-erholen-von-stress", word: "genesen", english: "to recover/convalesce from", role: "verb", preposition: "von", case: "dative", level: "C1", example: "Sie genest langsam von der Krankheit." },
  { id: "sich-freuen-auf-urlaub", word: "sich freuen", english: "to look forward to (an event)", role: "verb", preposition: "auf", case: "accusative", level: "B1", example: "Die Kinder freuen sich auf die Ferien." },
  { id: "sich-einigen-auf", word: "sich einigen", english: "to agree on", role: "verb", preposition: "auf", case: "accusative", level: "B2", example: "Wir einigen uns auf einen Termin." },
  { id: "sich-kuemmern-um-detail", word: "sich kümmern", english: "to see to", role: "verb", preposition: "um", case: "accusative", level: "B1", example: "Ich kümmere mich um die Rechnung." },
  { id: "sich-bewerben-um-stipendium", word: "ersuchen", english: "to petition for", role: "verb", preposition: "um", case: "accusative", level: "C1", example: "Sie ersucht um eine Verlängerung." },
  { id: "bitten-um-rat", word: "bitten", english: "to ask for (advice)", role: "verb", preposition: "um", case: "accusative", level: "B2", example: "Er bittet seinen Vater um Rat." },
  { id: "werben-um", word: "werben", english: "to court / canvass for", role: "verb", preposition: "um", case: "accusative", level: "C1", example: "Die Partei wirbt um Wählerstimmen." },
  { id: "gehoeren-zu-gruppe", word: "gehören", english: "to be among", role: "verb", preposition: "zu", case: "dative", level: "B2", example: "Sie gehört zu meinen besten Freundinnen." },
  { id: "gratulieren-zu-erfolg", word: "beglückwünschen", english: "to congratulate on", role: "verb", preposition: "zu", case: "dative", level: "C1", example: "Wir beglückwünschen Sie zu Ihrem Sieg." },
  { id: "bitten-zu-tisch", word: "bitten", english: "to summon to (table)", role: "verb", preposition: "zu", case: "dative", level: "C1", example: "Der Gastgeber bittet zu Tisch." },
  { id: "sich-berufen-fuehlen-zu", word: "sich berufen fühlen", english: "to feel called to", role: "verb", preposition: "zu", case: "dative", level: "C1", example: "Sie fühlt sich zu Höherem berufen." },
  { id: "fuehren-zu-erfolg", word: "beitragen", english: "to add to / contribute", role: "verb", preposition: "zu", case: "dative", level: "B2", example: "Gute Laune trägt zu besserer Gesundheit bei." },
  { id: "passen-zu-stil", word: "passen", english: "to match (style)", role: "verb", preposition: "zu", case: "dative", level: "B1", example: "Diese Schuhe passen nicht zum Kleid." },
  { id: "sich-entwickeln-zu", word: "sich entwickeln", english: "to develop into", role: "verb", preposition: "zu", case: "dative", level: "B2", example: "Das Dorf entwickelt sich zu einer Stadt." },
  { id: "verhandeln-ueber", word: "verhandeln", english: "to negotiate about", role: "verb", preposition: "über", case: "accusative", level: "B2", example: "Die Parteien verhandeln über den Vertrag." },
  { id: "stolpern-ueber", word: "stolpern", english: "to stumble over", role: "verb", preposition: "über", case: "accusative", level: "B2", example: "Sie stolpert über einen Stein." },
  { id: "stossen-auf", word: "stoßen", english: "to come across", role: "verb", preposition: "auf", case: "accusative", level: "B2", example: "Wir stoßen auf ein unerwartetes Problem." },
  { id: "treffen-auf", word: "treffen", english: "to encounter", role: "verb", preposition: "auf", case: "accusative", level: "B2", example: "Die Wanderer treffen auf einen Bären." },
  { id: "antworten-auf-mail", word: "verzichten", english: "to forgo", role: "verb", preposition: "auf", case: "accusative", level: "B2", example: "Wir verzichten auf eine große Feier." },
  { id: "sich-verlieben-in-stadt", word: "sich verlieben", english: "to fall for (a place)", role: "verb", preposition: "in", case: "accusative", level: "B2", example: "Sie verliebt sich in die alte Stadt." },
  { id: "sich-flüchten-in", word: "sich flüchten", english: "to take refuge in", role: "verb", preposition: "in", case: "accusative", level: "C1", example: "Er flüchtet sich in die Arbeit." },
  { id: "eingreifen-in", word: "eingreifen", english: "to intervene in", role: "verb", preposition: "in", case: "accusative", level: "C1", example: "Der Staat greift in den Markt ein." },

  // ───────────────────────── Adjectives — preposition "auf" (Akk) ─────────────────────────
  { id: "stolz-auf", word: "stolz", english: "proud of", role: "adjective", preposition: "auf", case: "accusative", level: "B1", example: "Die Eltern sind stolz auf ihre Tochter." },
  { id: "neugierig-auf", word: "neugierig", english: "curious about", role: "adjective", preposition: "auf", case: "accusative", level: "B1", example: "Ich bin neugierig auf das Ergebnis." },
  { id: "gespannt-auf", word: "gespannt", english: "eager / excited for", role: "adjective", preposition: "auf", case: "accusative", level: "B2", example: "Wir sind gespannt auf den Film." },
  { id: "eifersuechtig-auf", word: "eifersüchtig", english: "jealous of", role: "adjective", preposition: "auf", case: "accusative", level: "B2", example: "Er ist eifersüchtig auf ihren Erfolg." },
  { id: "boese-auf", word: "böse", english: "angry at", role: "adjective", preposition: "auf", case: "accusative", level: "B1", example: "Sie ist böse auf ihren Bruder." },
  { id: "wuetend-auf", word: "wütend", english: "furious at", role: "adjective", preposition: "auf", case: "accusative", level: "B2", example: "Der Chef ist wütend auf den Praktikanten." },
  { id: "angewiesen-auf", word: "angewiesen", english: "dependent / reliant on", role: "adjective", preposition: "auf", case: "accusative", level: "C1", example: "Sie ist auf fremde Hilfe angewiesen." },
  { id: "stolz-auf-leistung", word: "scharf", english: "keen on", role: "adjective", preposition: "auf", case: "accusative", level: "B2", example: "Er ist scharf auf den neuen Job." },
  { id: "aufmerksam-auf", word: "aufmerksam", english: "aware of (alerted to)", role: "adjective", preposition: "auf", case: "accusative", level: "B2", example: "Sie wurde auf den Fehler aufmerksam." },
  { id: "vorbereitet-auf", word: "vorbereitet", english: "prepared for", role: "adjective", preposition: "auf", case: "accusative", level: "B2", example: "Wir sind gut auf die Prüfung vorbereitet." },

  // ───────────────────────── Adjectives — preposition "über" (Akk) ─────────────────────────
  { id: "froh-ueber", word: "froh", english: "glad about", role: "adjective", preposition: "über", case: "accusative", level: "B1", example: "Ich bin froh über die gute Nachricht." },
  { id: "gluecklich-ueber", word: "glücklich", english: "happy about", role: "adjective", preposition: "über", case: "accusative", level: "B1", example: "Sie ist glücklich über das Geschenk." },
  { id: "traurig-ueber", word: "traurig", english: "sad about", role: "adjective", preposition: "über", case: "accusative", level: "B1", example: "Er ist traurig über den Abschied." },
  { id: "wuetend-ueber", word: "verärgert", english: "annoyed about", role: "adjective", preposition: "über", case: "accusative", level: "B2", example: "Sie ist verärgert über die Verspätung." },
  { id: "erstaunt-ueber", word: "erstaunt", english: "astonished at", role: "adjective", preposition: "über", case: "accusative", level: "B2", example: "Alle sind erstaunt über sein Wissen." },
  { id: "entsetzt-ueber", word: "entsetzt", english: "horrified at", role: "adjective", preposition: "über", case: "accusative", level: "C1", example: "Wir sind entsetzt über die Nachricht." },
  { id: "besorgt-ueber", word: "besorgt", english: "worried about", role: "adjective", preposition: "über", case: "accusative", level: "B2", example: "Die Ärztin ist besorgt über die Werte.", alternatives: ["um"] },
  { id: "enttaeuscht-ueber", word: "enttäuscht", english: "disappointed about", role: "adjective", preposition: "über", case: "accusative", level: "B2", example: "Er ist enttäuscht über das Ergebnis.", alternatives: ["von"] },
  { id: "empoert-ueber", word: "empört", english: "outraged at", role: "adjective", preposition: "über", case: "accusative", level: "C1", example: "Die Bürger sind empört über die Preise." },
  { id: "gluecklich-ueber-erfolg", word: "erfreut", english: "pleased about", role: "adjective", preposition: "über", case: "accusative", level: "B2", example: "Wir sind erfreut über Ihren Besuch." },

  // ───────────────────────── Adjectives — preposition "von" (Dat) ─────────────────────────
  { id: "abhaengig-von", word: "abhängig", english: "dependent on", role: "adjective", preposition: "von", case: "dative", level: "B2", example: "Er ist abhängig von der Hilfe anderer." },
  { id: "ueberzeugt-von", word: "überzeugt", english: "convinced of", role: "adjective", preposition: "von", case: "dative", level: "B2", example: "Sie ist überzeugt von ihrem Plan." },
  { id: "begeistert-von", word: "begeistert", english: "enthusiastic about", role: "adjective", preposition: "von", case: "dative", level: "B2", example: "Die Kinder sind begeistert vom Zirkus." },
  { id: "enttaeuscht-von", word: "enttäuscht", english: "disappointed by/in", role: "adjective", preposition: "von", case: "dative", level: "B2", example: "Ich bin enttäuscht von dir." },
  { id: "frei-von", word: "frei", english: "free of", role: "adjective", preposition: "von", case: "dative", level: "B2", example: "Das Produkt ist frei von Zucker." },
  { id: "muede-von", word: "müde", english: "tired from", role: "adjective", preposition: "von", case: "dative", level: "B2", example: "Sie ist müde von der langen Reise." },
  { id: "fasziniert-von", word: "fasziniert", english: "fascinated by", role: "adjective", preposition: "von", case: "dative", level: "B2", example: "Er ist fasziniert von der Technik." },
  { id: "unabhaengig-von", word: "unabhängig", english: "independent of", role: "adjective", preposition: "von", case: "dative", level: "B2", example: "Sie ist finanziell unabhängig von ihren Eltern." },
  { id: "betroffen-von", word: "betroffen", english: "affected by", role: "adjective", preposition: "von", case: "dative", level: "C1", example: "Viele Regionen sind von der Dürre betroffen." },
  { id: "ueberrascht-von", word: "überrascht", english: "surprised by", role: "adjective", preposition: "von", case: "dative", level: "B2", example: "Ich war überrascht von seiner Reaktion." },

  // ───────────────────────── Adjectives — preposition "für" (Akk) ─────────────────────────
  { id: "verantwortlich-fuer", word: "verantwortlich", english: "responsible for", role: "adjective", preposition: "für", case: "accusative", level: "B2", example: "Sie ist verantwortlich für das Projekt." },
  { id: "dankbar-fuer", word: "dankbar", english: "grateful for", role: "adjective", preposition: "für", case: "accusative", level: "B1", example: "Ich bin dankbar für deine Hilfe." },
  { id: "typisch-fuer", word: "typisch", english: "typical of", role: "adjective", preposition: "für", case: "accusative", level: "B2", example: "Das ist typisch für ihn." },
  { id: "wichtig-fuer", word: "wichtig", english: "important for", role: "adjective", preposition: "für", case: "accusative", level: "B1", example: "Sport ist wichtig für die Gesundheit." },
  { id: "geeignet-fuer", word: "geeignet", english: "suitable for", role: "adjective", preposition: "für", case: "accusative", level: "B2", example: "Der Film ist nicht für Kinder geeignet." },
  { id: "offen-fuer", word: "offen", english: "open to", role: "adjective", preposition: "für", case: "accusative", level: "B2", example: "Wir sind offen für neue Ideen." },
  { id: "bekannt-fuer", word: "bekannt", english: "famous/known for", role: "adjective", preposition: "für", case: "accusative", level: "B2", example: "Die Stadt ist bekannt für ihre Brücken.", alternatives: ["bei"] },
  { id: "charakteristisch-fuer", word: "charakteristisch", english: "characteristic of", role: "adjective", preposition: "für", case: "accusative", level: "C1", example: "Dieser Stil ist charakteristisch für die Epoche." },
  { id: "notwendig-fuer", word: "notwendig", english: "necessary for", role: "adjective", preposition: "für", case: "accusative", level: "B2", example: "Wasser ist notwendig für das Leben." },
  { id: "nuetzlich-fuer", word: "nützlich", english: "useful for", role: "adjective", preposition: "für", case: "accusative", level: "B1", example: "Das Programm ist nützlich für Anfänger." },
  { id: "schaedlich-fuer", word: "schädlich", english: "harmful to", role: "adjective", preposition: "für", case: "accusative", level: "B2", example: "Rauchen ist schädlich für die Lunge." },
  { id: "entscheidend-fuer", word: "entscheidend", english: "decisive for", role: "adjective", preposition: "für", case: "accusative", level: "C1", example: "Der erste Eindruck ist entscheidend für den Erfolg." },

  // ───────────────────────── Adjectives — preposition "an" (Dat) ─────────────────────────
  { id: "interessiert-an", word: "interessiert", english: "interested in", role: "adjective", preposition: "an", case: "dative", level: "B2", example: "Sie ist interessiert an Geschichte." },
  { id: "reich-an", word: "reich", english: "rich in", role: "adjective", preposition: "an", case: "dative", level: "B2", example: "Obst ist reich an Vitaminen." },
  { id: "arm-an", word: "arm", english: "poor in", role: "adjective", preposition: "an", case: "dative", level: "B2", example: "Die Wüste ist arm an Wasser." },
  { id: "beteiligt-an", word: "beteiligt", english: "involved in", role: "adjective", preposition: "an", case: "dative", level: "C1", example: "Er war am Projekt beteiligt." },
  { id: "schuld-an", word: "schuld", english: "to blame for", role: "adjective", preposition: "an", case: "dative", level: "B2", example: "Du bist schuld am Unfall." },
  { id: "gewoehnt-an", word: "gewöhnt", english: "accustomed to", role: "adjective", preposition: "an", case: "accusative", level: "B2", example: "Ich bin an die Kälte gewöhnt.", notes: "gewöhnt an governs the accusative" },

  // ───────────────────────── Adjectives — preposition "vor" (Dat) ─────────────────────────
  { id: "sicher-vor", word: "sicher", english: "safe from", role: "adjective", preposition: "vor", case: "dative", level: "B2", example: "Hier sind wir sicher vor dem Regen." },
  { id: "blass-vor", word: "blass", english: "pale with (emotion)", role: "adjective", preposition: "vor", case: "dative", level: "C1", example: "Sie war blass vor Angst." },

  // ───────────────────────── Adjectives — preposition "zu" (Dat) ─────────────────────────
  { id: "freundlich-zu", word: "freundlich", english: "friendly to", role: "adjective", preposition: "zu", case: "dative", level: "B1", example: "Sie ist immer freundlich zu den Gästen." },
  { id: "nett-zu", word: "nett", english: "nice to", role: "adjective", preposition: "zu", case: "dative", level: "B1", example: "Sei bitte nett zu deiner Schwester." },
  { id: "hoeflich-zu", word: "höflich", english: "polite to", role: "adjective", preposition: "zu", case: "dative", level: "B2", example: "Er ist höflich zu allen Kunden." },
  { id: "grausam-zu", word: "grausam", english: "cruel to", role: "adjective", preposition: "zu", case: "dative", level: "C1", example: "Man darf nicht grausam zu Tieren sein." },
  { id: "bereit-zu", word: "bereit", english: "ready for / willing to", role: "adjective", preposition: "zu", case: "dative", level: "B2", example: "Sie ist bereit zu einem Kompromiss." },
  { id: "faehig-zu", word: "fähig", english: "capable of", role: "adjective", preposition: "zu", case: "dative", level: "C1", example: "Er ist zu großen Leistungen fähig." },

  // ───────────────────────── Adjectives — preposition "mit" (Dat) ─────────────────────────
  { id: "zufrieden-mit", word: "zufrieden", english: "satisfied with", role: "adjective", preposition: "mit", case: "dative", level: "B1", example: "Ich bin zufrieden mit dem Ergebnis." },
  { id: "einverstanden-mit", word: "einverstanden", english: "in agreement with", role: "adjective", preposition: "mit", case: "dative", level: "B2", example: "Bist du mit dem Vorschlag einverstanden?" },
  { id: "verheiratet-mit", word: "verheiratet", english: "married to", role: "adjective", preposition: "mit", case: "dative", level: "B1", example: "Sie ist mit einem Arzt verheiratet." },
  { id: "vergleichbar-mit", word: "vergleichbar", english: "comparable with", role: "adjective", preposition: "mit", case: "dative", level: "B2", example: "Das ist nicht vergleichbar mit damals." },
  { id: "befreundet-mit", word: "befreundet", english: "friends with", role: "adjective", preposition: "mit", case: "dative", level: "B2", example: "Ich bin seit Jahren mit ihr befreundet." },
  { id: "fertig-mit", word: "fertig", english: "finished with", role: "adjective", preposition: "mit", case: "dative", level: "B1", example: "Bist du schon fertig mit den Aufgaben?" },
  { id: "beschaeftigt-mit", word: "beschäftigt", english: "busy with", role: "adjective", preposition: "mit", case: "dative", level: "B2", example: "Sie ist mit der Vorbereitung beschäftigt." },
  { id: "vertraut-mit", word: "vertraut", english: "familiar with", role: "adjective", preposition: "mit", case: "dative", level: "C1", example: "Er ist mit der Materie gut vertraut." },
  { id: "solidarisch-mit", word: "solidarisch", english: "in solidarity with", role: "adjective", preposition: "mit", case: "dative", level: "C1", example: "Wir sind solidarisch mit den Streikenden." },
  { id: "einig-mit", word: "einig", english: "in agreement with", role: "adjective", preposition: "mit", case: "dative", level: "C1", example: "Ich bin mir mit ihm einig über den Preis." },

  // ───────────────────────── Adjectives — preposition "in" (Dat) ─────────────────────────
  { id: "verliebt-in", word: "verliebt", english: "in love with", role: "adjective", preposition: "in", case: "accusative", level: "B1", example: "Er ist verliebt in seine Nachbarin.", notes: "verliebt in governs the accusative" },
  { id: "gut-in", word: "gut", english: "good at", role: "adjective", preposition: "in", case: "dative", level: "B1", example: "Sie ist gut in Mathematik." },
  { id: "geuebt-in", word: "geübt", english: "practised in", role: "adjective", preposition: "in", case: "dative", level: "C1", example: "Er ist geübt in der Diskussion." },

  // ───────────────────────── Adjectives — preposition "gegen" (Akk) ─────────────────────────
  { id: "allergisch-gegen", word: "allergisch", english: "allergic to", role: "adjective", preposition: "gegen", case: "accusative", level: "B2", example: "Sie ist allergisch gegen Nüsse." },
  { id: "immun-gegen", word: "immun", english: "immune to", role: "adjective", preposition: "gegen", case: "accusative", level: "C1", example: "Er ist immun gegen das Virus." },
  { id: "machtlos-gegen", word: "machtlos", english: "powerless against", role: "adjective", preposition: "gegen", case: "accusative", level: "C1", example: "Wir sind machtlos gegen das Wetter." },
  { id: "empfindlich-gegen", word: "empfindlich", english: "sensitive to", role: "adjective", preposition: "gegen", case: "accusative", level: "B2", example: "Die Pflanze ist empfindlich gegen Frost.", alternatives: ["gegenüber"] },

  // ───────────────────────── Nouns — preposition "vor" (Dat) ─────────────────────────
  { id: "die-angst-vor", word: "die Angst", english: "fear of", role: "noun", preposition: "vor", case: "dative", level: "B1", example: "Ihre Angst vor der Prüfung war groß." },
  { id: "die-furcht-vor", word: "die Furcht", english: "dread of", role: "noun", preposition: "vor", case: "dative", level: "C1", example: "Die Furcht vor dem Tod ist menschlich." },
  { id: "der-respekt-vor", word: "der Respekt", english: "respect for", role: "noun", preposition: "vor", case: "dative", level: "B2", example: "Er hat großen Respekt vor seinem Lehrer." },
  { id: "der-schutz-vor", word: "der Schutz", english: "protection from", role: "noun", preposition: "vor", case: "dative", level: "B2", example: "Die Creme bietet Schutz vor der Sonne." },
  { id: "die-warnung-vor", word: "die Warnung", english: "warning of", role: "noun", preposition: "vor", case: "dative", level: "B2", example: "Es gab eine Warnung vor dem Sturm." },
  { id: "die-flucht-vor", word: "die Flucht", english: "flight from", role: "noun", preposition: "vor", case: "dative", level: "C1", example: "Die Flucht vor dem Krieg dauerte Wochen." },

  // ───────────────────────── Nouns — preposition "auf" (Akk) ─────────────────────────
  { id: "die-hoffnung-auf", word: "die Hoffnung", english: "hope for", role: "noun", preposition: "auf", case: "accusative", level: "B2", example: "Die Hoffnung auf Frieden bleibt." },
  { id: "die-lust-auf", word: "die Lust", english: "desire for", role: "noun", preposition: "auf", case: "accusative", level: "B1", example: "Ich habe Lust auf ein Eis." },
  { id: "der-anspruch-auf", word: "der Anspruch", english: "claim to / entitlement to", role: "noun", preposition: "auf", case: "accusative", level: "C1", example: "Sie hat Anspruch auf Urlaub." },
  { id: "die-antwort-auf", word: "die Antwort", english: "answer to", role: "noun", preposition: "auf", case: "accusative", level: "B1", example: "Die Antwort auf die Frage ist einfach." },
  { id: "die-vorbereitung-auf", word: "die Vorbereitung", english: "preparation for", role: "noun", preposition: "auf", case: "accusative", level: "B2", example: "Die Vorbereitung auf den Test war hart." },
  { id: "die-ruecksicht-auf", word: "die Rücksicht", english: "consideration for", role: "noun", preposition: "auf", case: "accusative", level: "C1", example: "Nimm Rücksicht auf die anderen Gäste." },
  { id: "der-einfluss-auf", word: "der Einfluss", english: "influence on", role: "noun", preposition: "auf", case: "accusative", level: "B2", example: "Das Wetter hat Einfluss auf die Stimmung." },
  { id: "die-reaktion-auf", word: "die Reaktion", english: "reaction to", role: "noun", preposition: "auf", case: "accusative", level: "B2", example: "Seine Reaktion auf die Kritik war ruhig." },
  { id: "die-aussicht-auf", word: "die Aussicht", english: "prospect of", role: "noun", preposition: "auf", case: "accusative", level: "C1", example: "Die Aussicht auf Erfolg motiviert sie." },
  { id: "der-verzicht-auf", word: "der Verzicht", english: "renunciation of", role: "noun", preposition: "auf", case: "accusative", level: "C1", example: "Der Verzicht auf Fleisch fällt ihm leicht." },

  // ───────────────────────── Nouns — preposition "über" (Akk) ─────────────────────────
  { id: "die-freude-ueber", word: "die Freude", english: "joy about", role: "noun", preposition: "über", case: "accusative", level: "B1", example: "Die Freude über das Geschenk war riesig." },
  { id: "der-aerger-ueber", word: "der Ärger", english: "annoyance about", role: "noun", preposition: "über", case: "accusative", level: "B2", example: "Der Ärger über den Stau war groß." },
  { id: "die-information-ueber", word: "die Information", english: "information about", role: "noun", preposition: "über", case: "accusative", level: "B1", example: "Wir suchen Informationen über die Stadt." },
  { id: "die-diskussion-ueber", word: "die Diskussion", english: "discussion about", role: "noun", preposition: "über", case: "accusative", level: "B2", example: "Die Diskussion über das Thema war hitzig." },
  { id: "die-kontrolle-ueber", word: "die Kontrolle", english: "control over", role: "noun", preposition: "über", case: "accusative", level: "B2", example: "Sie verliert die Kontrolle über das Auto." },
  { id: "der-bericht-ueber", word: "der Bericht", english: "report about", role: "noun", preposition: "über", case: "accusative", level: "B2", example: "Der Bericht über den Unfall ist lang." },
  { id: "die-klage-ueber", word: "die Klage", english: "complaint about", role: "noun", preposition: "über", case: "accusative", level: "C1", example: "Die Klagen über den Lärm häufen sich." },
  { id: "die-empoerung-ueber", word: "die Empörung", english: "outrage about", role: "noun", preposition: "über", case: "accusative", level: "C1", example: "Die Empörung über das Urteil war groß." },
  { id: "das-urteil-ueber", word: "das Urteil", english: "judgement about", role: "noun", preposition: "über", case: "accusative", level: "C1", example: "Sein Urteil über das Buch ist hart." },

  // ───────────────────────── Nouns — preposition "an" (Akk/Dat) ─────────────────────────
  { id: "die-erinnerung-an", word: "die Erinnerung", english: "memory of", role: "noun", preposition: "an", case: "accusative", level: "B2", example: "Die Erinnerung an den Urlaub ist schön." },
  { id: "der-glaube-an", word: "der Glaube", english: "belief in", role: "noun", preposition: "an", case: "accusative", level: "B2", example: "Sein Glaube an die Zukunft ist stark." },
  { id: "die-frage-an", word: "die Frage", english: "question for/to", role: "noun", preposition: "an", case: "accusative", level: "B1", example: "Ich habe eine Frage an den Lehrer." },
  { id: "der-appell-an", word: "der Appell", english: "appeal to", role: "noun", preposition: "an", case: "accusative", level: "C1", example: "Der Appell an die Vernunft blieb ungehört." },
  { id: "das-interesse-an", word: "das Interesse", english: "interest in", role: "noun", preposition: "an", case: "dative", level: "B2", example: "Sie zeigt großes Interesse an Kunst." },
  { id: "die-teilnahme-an", word: "die Teilnahme", english: "participation in", role: "noun", preposition: "an", case: "dative", level: "B2", example: "Die Teilnahme am Kurs ist freiwillig." },
  { id: "der-mangel-an", word: "der Mangel", english: "lack of", role: "noun", preposition: "an", case: "dative", level: "B2", example: "Es herrscht ein Mangel an Fachkräften." },
  { id: "der-zweifel-an", word: "der Zweifel", english: "doubt about", role: "noun", preposition: "an", case: "dative", level: "B2", example: "Es gibt Zweifel an seiner Aussage." },
  { id: "die-freude-an", word: "die Freude", english: "enjoyment of", role: "noun", preposition: "an", case: "dative", level: "B2", example: "Sie hat Freude an der Musik." },
  { id: "der-reichtum-an", word: "der Reichtum", english: "abundance of", role: "noun", preposition: "an", case: "dative", level: "C1", example: "Der Reichtum an Ideen beeindruckt mich." },

  // ───────────────────────── Nouns — preposition "für" (Akk) ─────────────────────────
  { id: "der-grund-fuer", word: "der Grund", english: "reason for", role: "noun", preposition: "für", case: "accusative", level: "B1", example: "Was ist der Grund für die Verspätung?" },
  { id: "das-interesse-fuer", word: "das Interesse", english: "interest in (for)", role: "noun", preposition: "für", case: "accusative", level: "B2", example: "Sein Interesse für Sport ist groß.", alternatives: ["an"] },
  { id: "das-beispiel-fuer", word: "das Beispiel", english: "example of", role: "noun", preposition: "für", case: "accusative", level: "B1", example: "Das ist ein gutes Beispiel für Teamarbeit." },
  { id: "die-verantwortung-fuer", word: "die Verantwortung", english: "responsibility for", role: "noun", preposition: "für", case: "accusative", level: "B2", example: "Sie trägt die Verantwortung für das Team." },
  { id: "das-verstaendnis-fuer", word: "das Verständnis", english: "understanding for", role: "noun", preposition: "für", case: "accusative", level: "B2", example: "Ich habe Verständnis für deine Lage." },
  { id: "die-garantie-fuer", word: "die Garantie", english: "guarantee for", role: "noun", preposition: "für", case: "accusative", level: "B2", example: "Es gibt keine Garantie für den Erfolg." },
  { id: "der-beweis-fuer", word: "der Beweis", english: "proof of", role: "noun", preposition: "für", case: "accusative", level: "B2", example: "Das ist ein Beweis für seine Schuld." },
  { id: "die-voraussetzung-fuer", word: "die Voraussetzung", english: "prerequisite for", role: "noun", preposition: "für", case: "accusative", level: "C1", example: "Fleiß ist die Voraussetzung für Erfolg." },
  { id: "die-begeisterung-fuer", word: "die Begeisterung", english: "enthusiasm for", role: "noun", preposition: "für", case: "accusative", level: "B2", example: "Ihre Begeisterung für das Fach ist ansteckend." },
  { id: "die-nachfrage-nach", word: "die Nachfrage", english: "demand for", role: "noun", preposition: "nach", case: "dative", level: "B2", example: "Die Nachfrage nach Wohnungen steigt." },
  { id: "die-sorge-fuer", word: "die Sorge", english: "care for", role: "noun", preposition: "für", case: "accusative", level: "C1", example: "Die Sorge für die Familie steht im Mittelpunkt." },
  { id: "das-talent-fuer", word: "das Talent", english: "talent for", role: "noun", preposition: "für", case: "accusative", level: "B2", example: "Sie hat ein Talent für Sprachen." },

  // ───────────────────────── Nouns — preposition "von" (Dat) ─────────────────────────
  { id: "der-traum-von", word: "der Traum", english: "dream of", role: "noun", preposition: "von", case: "dative", level: "B2", example: "Der Traum von einem Haus wird wahr." },
  { id: "die-abhaengigkeit-von", word: "die Abhängigkeit", english: "dependence on", role: "noun", preposition: "von", case: "dative", level: "C1", example: "Die Abhängigkeit von Öl ist gefährlich." },
  { id: "die-vorstellung-von", word: "die Vorstellung", english: "idea / notion of", role: "noun", preposition: "von", case: "dative", level: "B2", example: "Sie hat eine klare Vorstellung von ihrem Ziel." },
  { id: "der-abschied-von", word: "der Abschied", english: "farewell from", role: "noun", preposition: "von", case: "dative", level: "B2", example: "Der Abschied von den Freunden war schwer." },

  // ───────────────────────── Nouns — preposition "nach" (Dat) ─────────────────────────
  { id: "die-suche-nach", word: "die Suche", english: "search for", role: "noun", preposition: "nach", case: "dative", level: "B2", example: "Die Suche nach dem Schlüssel dauert an." },
  { id: "die-sehnsucht-nach", word: "die Sehnsucht", english: "longing for", role: "noun", preposition: "nach", case: "dative", level: "C1", example: "Die Sehnsucht nach Heimat wuchs." },
  { id: "das-streben-nach", word: "das Streben", english: "striving for", role: "noun", preposition: "nach", case: "dative", level: "C1", example: "Das Streben nach Glück ist universell." },
  { id: "die-frage-nach", word: "die Frage", english: "question of", role: "noun", preposition: "nach", case: "dative", level: "B2", example: "Die Frage nach dem Sinn bleibt offen." },
  { id: "der-wunsch-nach", word: "der Wunsch", english: "wish for", role: "noun", preposition: "nach", case: "dative", level: "B2", example: "Der Wunsch nach Ruhe ist verständlich." },
  { id: "das-verlangen-nach", word: "das Verlangen", english: "craving for", role: "noun", preposition: "nach", case: "dative", level: "C1", example: "Das Verlangen nach Zucker ist stark." },

  // ───────────────────────── Nouns — preposition "zu" (Dat) ─────────────────────────
  { id: "die-einladung-zu", word: "die Einladung", english: "invitation to", role: "noun", preposition: "zu", case: "dative", level: "B1", example: "Danke für die Einladung zum Fest." },
  { id: "die-beziehung-zu", word: "die Beziehung", english: "relationship to", role: "noun", preposition: "zu", case: "dative", level: "B2", example: "Sie hat eine gute Beziehung zu ihren Eltern." },
  { id: "der-mut-zu", word: "der Mut", english: "courage for", role: "noun", preposition: "zu", case: "dative", level: "B2", example: "Ihm fehlt der Mut zu einem Neuanfang." },
  { id: "die-bereitschaft-zu", word: "die Bereitschaft", english: "willingness to", role: "noun", preposition: "zu", case: "dative", level: "C1", example: "Die Bereitschaft zu Kompromissen fehlt." },
  { id: "der-kontakt-zu", word: "der Kontakt", english: "contact with", role: "noun", preposition: "zu", case: "dative", level: "B2", example: "Der Kontakt zu alten Freunden ist wichtig.", alternatives: ["mit"] },
  { id: "der-zugang-zu", word: "der Zugang", english: "access to", role: "noun", preposition: "zu", case: "dative", level: "B2", example: "Alle haben Zugang zum Internet." },
  { id: "der-anlass-zu", word: "der Anlass", english: "occasion for", role: "noun", preposition: "zu", case: "dative", level: "C1", example: "Es gibt keinen Anlass zu großer Sorge." },
  { id: "der-beitrag-zu", word: "der Beitrag", english: "contribution to", role: "noun", preposition: "zu", case: "dative", level: "B2", example: "Sie leistet einen Beitrag zum Erfolg." },
  { id: "die-neigung-zu", word: "die Neigung", english: "tendency towards", role: "noun", preposition: "zu", case: "dative", level: "C1", example: "Er hat eine Neigung zu Übertreibung." },
  { id: "die-faehigkeit-zu", word: "die Fähigkeit", english: "ability to", role: "noun", preposition: "zu", case: "dative", level: "C1", example: "Die Fähigkeit zu echtem Mitgefühl ist selten." },
  { id: "der-uebergang-zu", word: "der Übergang", english: "transition to", role: "noun", preposition: "zu", case: "dative", level: "C1", example: "Der Übergang zu sauberer Energie ist nötig." },

  // ───────────────────────── Nouns — preposition "mit" (Dat) ─────────────────────────
  { id: "die-zufriedenheit-mit", word: "die Zufriedenheit", english: "satisfaction with", role: "noun", preposition: "mit", case: "dative", level: "C1", example: "Die Zufriedenheit mit dem Service ist hoch." },
  { id: "der-vergleich-mit", word: "der Vergleich", english: "comparison with", role: "noun", preposition: "mit", case: "dative", level: "B2", example: "Im Vergleich mit dem Vorjahr ist es besser." },
  { id: "das-problem-mit", word: "das Problem", english: "problem with", role: "noun", preposition: "mit", case: "dative", level: "B1", example: "Ich habe ein Problem mit dem Drucker." },
  { id: "die-schwierigkeit-mit", word: "die Schwierigkeit", english: "difficulty with", role: "noun", preposition: "mit", case: "dative", level: "B2", example: "Sie hat Schwierigkeiten mit der Grammatik." },
  { id: "der-streit-mit", word: "der Streit", english: "argument with", role: "noun", preposition: "mit", case: "dative", level: "B2", example: "Der Streit mit dem Nachbarn eskaliert." },
  { id: "der-umgang-mit", word: "der Umgang", english: "handling of / dealing with", role: "noun", preposition: "mit", case: "dative", level: "B2", example: "Der Umgang mit Geld will gelernt sein." },
  { id: "die-erfahrung-mit", word: "die Erfahrung", english: "experience with", role: "noun", preposition: "mit", case: "dative", level: "B2", example: "Ich habe gute Erfahrungen mit der Firma gemacht." },

  // ───────────────────────── Nouns — preposition "in" (Akk) ─────────────────────────
  { id: "das-vertrauen-in", word: "das Vertrauen", english: "trust in", role: "noun", preposition: "in", case: "accusative", level: "B2", example: "Sie hat Vertrauen in ihre Fähigkeiten." },
  { id: "die-einsicht-in", word: "die Einsicht", english: "insight into", role: "noun", preposition: "in", case: "accusative", level: "C1", example: "Er gewinnt Einsicht ins Problem." },
  { id: "der-einblick-in", word: "der Einblick", english: "insight into", role: "noun", preposition: "in", case: "accusative", level: "C1", example: "Das Praktikum gibt Einblick in den Beruf." },

  // ───────────────────────── Nouns — preposition "gegen" (Akk) ─────────────────────────
  { id: "der-protest-gegen", word: "der Protest", english: "protest against", role: "noun", preposition: "gegen", case: "accusative", level: "B2", example: "Der Protest gegen das Gesetz wächst." },
  { id: "der-kampf-gegen", word: "der Kampf", english: "fight against", role: "noun", preposition: "gegen", case: "accusative", level: "B2", example: "Der Kampf gegen die Armut geht weiter." },
  { id: "das-mittel-gegen", word: "das Mittel", english: "remedy against", role: "noun", preposition: "gegen", case: "accusative", level: "B2", example: "Es gibt kein Mittel gegen diese Krankheit." },
  { id: "die-allergie-gegen", word: "die Allergie", english: "allergy to", role: "noun", preposition: "gegen", case: "accusative", level: "B2", example: "Sie hat eine Allergie gegen Pollen." },
  { id: "der-widerstand-gegen", word: "der Widerstand", english: "resistance against", role: "noun", preposition: "gegen", case: "accusative", level: "C1", example: "Der Widerstand gegen die Reform ist stark." },

  // ───────────────────────── Nouns — additional ─────────────────────────
  { id: "die-bitte-um", word: "die Bitte", english: "request for", role: "noun", preposition: "um", case: "accusative", level: "B2", example: "Seine Bitte um Hilfe wurde gehört." },
  { id: "der-kampf-um", word: "der Kampf", english: "fight for (to win)", role: "noun", preposition: "um", case: "accusative", level: "B2", example: "Der Kampf um den Titel ist spannend." },
  { id: "die-sorge-um", word: "die Sorge", english: "worry about", role: "noun", preposition: "um", case: "accusative", level: "B2", example: "Die Sorge um die Kinder lässt sie nicht schlafen." },
  { id: "die-trauer-um", word: "die Trauer", english: "grief for", role: "noun", preposition: "um", case: "accusative", level: "C1", example: "Die Trauer um den Verstorbenen ist groß." },
  { id: "die-kritik-an", word: "die Kritik", english: "criticism of", role: "noun", preposition: "an", case: "dative", level: "B2", example: "Die Kritik am Plan ist berechtigt." },
  { id: "die-erinnerung-an-person", word: "die Erinnerung", english: "memory of (a person)", role: "noun", preposition: "an", case: "accusative", level: "B2", example: "Die Erinnerung an meine Großmutter ist lebendig." },
  { id: "die-angst-um", word: "die Angst", english: "fear for (someone)", role: "noun", preposition: "um", case: "accusative", level: "B2", example: "Die Angst um ihren Sohn war groß." },
]
