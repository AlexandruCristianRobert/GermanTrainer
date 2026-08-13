// src/data/domains.ts
//
// Curated Domain (de "Fachgebiet") bank for the Sentence quiz
// (CONTEXT.md → "Domain", ADR-0018). A Domain is a subject-matter field a
// [Packed card] can be written in.
//
// Its word lists are REFERENCES, never definitions:
//   - `nouns` are bare German words resolved against the seeded noun store, so
//     plural write-back, word hints and weak points keep working unchanged.
//   - `verbs` are infinitives resolved against verbs.ts, so level, Typ and
//     Rektion are never invented per Domain.
// tests/data/domains.test.ts asserts every listed word resolves — a typo fails
// CI instead of silently shrinking a Domain at runtime.
//
// Register (ADR-0018): the field's real German. Anglicisms where practitioners
// use them (der Container, das Repository, der Commit), German where they use
// German (die Bereitstellung, die Abfrage, der Primärschlüssel).

/** How a Domain's cards speak (CONTEXT.md → "Darstellungsform", ADR-0021):
 *  erklaerend = explain/contrast a concept (present tense, generic subject,
 *  no anecdote — the ADR-0018 register); erzaehlend = a 1–3-sentence STAR
 *  story fragment (first person, past tense); persoenlich = a first-person
 *  present-tense statement of the speaker's own position or circumstances. */
export type Darstellungsform = 'erklaerend' | 'erzaehlend' | 'persoenlich'

export interface Domain {
  /** kebab id — persisted in setup settings and in run meta as packedDomains */
  id: string
  /** chip and card-badge label */
  label: string
  /** Declared once per Domain, never per card (ADR-0021). */
  form: Darstellungsform
  /** English framings — the concept ONE card explains. Drawn one per card, in
   *  place of the generic scene-setters in PACKED_SCENE_ANGLES: a targeted card
   *  defines or contrasts something in the field the way a practitioner answers
   *  it in a technical interview, it does not narrate a day at that job
   *  (ADR-0018). Named `scenes` because it fills the scene-setting slot. */
  scenes: string[]
  /** bare German nouns, no article — must exist in nouns.seed.json */
  nouns: string[]
  /** German infinitives — must exist in verbs.ts */
  verbs: string[]
}

export const DOMAINS: Domain[] = [
  {
    id: 'dotnet',
    label: '.NET',
    form: 'erklaerend',
    scenes: [
      'explain the difference between an interface and an abstract class',
      'explain the difference between a value type and a reference type',
      'explain what dependency injection solves and what it costs',
      'explain the difference between a property and a field',
      'explain how an exception should be handled and where it should not be caught',
      'explain the difference between inheritance and composition, and when each one fits',
      'explain what a unit test proves and what it cannot prove',
      'explain the difference between asynchronous work and parallel work',
      'explain the difference between a library and a framework',
      'explain what a constructor is responsible for',
      'explain the difference between an enum and a set of constants',
      'explain what a namespace is for'
    ],
    nouns: [
      'Klasse', 'Eigenschaft', 'Methode', 'Objekt', 'Schnittstellentyp', 'Vererbung',
      'Namensraum', 'Konstruktor', 'Ausnahme', 'Abhängigkeit', 'Paket', 'Modul',
      'Anwendung', 'Dienst', 'Konfiguration', 'Ereignis', 'Rückgabewert', 'Parameter',
      'Argument', 'Aufzählung', 'Generikum', 'Schleife', 'Bedingung', 'Variable',
      'Konstante', 'Zeichenkette', 'Testfall', 'Einheitstest', 'Quellcode', 'Sammlung',
      'Bibliothek', 'Zuweisung', 'Umsetzung', 'Wartung'
    ],
    verbs: [
      'erstellen', 'testen', 'prüfen', 'ändern', 'anpassen', 'ersetzen', 'verwenden',
      'benutzen', 'beheben', 'erkennen', 'entfernen', 'schreiben', 'lesen',
      'beschreiben', 'planen', 'vergleichen'
    ]
  },
  {
    id: 'sql-server',
    label: 'SQL Server',
    form: 'erklaerend',
    scenes: [
      'explain the difference between a function and a stored procedure',
      'explain what an index does and when it costs more than it saves',
      'explain the difference between a clustered and a non-clustered index',
      'explain what a transaction guarantees',
      'explain the difference between a primary key and a foreign key',
      'explain the difference between a view and a table',
      'explain what an execution plan tells you',
      'explain the difference between an inner join and an outer join',
      'explain how a deadlock arises and what a lock has to do with it',
      'explain the difference between a full backup and a differential one',
      'explain the difference between deleting rows and truncating a table',
      'explain when a cache helps a slow query and when it hides the real problem'
    ],
    nouns: [
      'Abfrage', 'Spalte', 'Zeile', 'Datensatz', 'Primärschlüssel', 'Fremdschlüssel',
      'Transaktion', 'Index', 'Tabelle', 'Datenbank', 'Sicherung', 'Sicht', 'Verbund',
      'Auswertung', 'Bericht', 'Zugriff', 'Sperre', 'Migration', 'Wiederherstellung',
      'Latenz', 'Cache', 'Zwischenspeicher', 'Bedingung', 'Anweisung', 'Datentyp',
      'Speicherung', 'Verbindung', 'Filter', 'Sortierung', 'Ausführungsplan', 'Kennzahl'
    ],
    verbs: [
      'speichern', 'laden', 'suchen', 'finden', 'übertragen', 'sichern', 'vergleichen',
      'berechnen', 'erhöhen', 'senken', 'beschleunigen', 'prüfen', 'verbinden',
      'ändern', 'entfernen', 'ausführen'
    ]
  },
  {
    id: 'docker',
    label: 'Docker',
    form: 'erklaerend',
    scenes: [
      'explain the difference between an image and a container',
      'explain the difference between a container and a virtual machine',
      'explain what a volume is for and what happens without one',
      'explain why the order of the layers in an image matters',
      'explain the difference between exposing a port and publishing one',
      'explain what orchestration solves that a single container cannot',
      'explain the difference between stopping a container and removing it',
      'explain what a registry is for',
      'explain how a container gets its configuration',
      'explain the difference between a restart policy and a health check',
      'explain why a container should stay stateless',
      'explain what monitoring should watch on a running service'
    ],
    nouns: [
      'Container', 'Abbild', 'Bereitstellung', 'Umgebung', 'Laufzeitumgebung',
      'Konfigurationsdatei', 'Netzwerk', 'Server', 'Pipeline', 'Build', 'Skript',
      'Protokollierung', 'Fehlermeldung', 'Version', 'Verzeichnis', 'Dateipfad',
      'Prozess', 'Schnittstelle', 'Endpunkt', 'Anfrage', 'Antwort', 'Orchestrierung',
      'Virtualisierung', 'Mikrodienst', 'Neustart', 'Ausfall', 'Überwachung',
      'Instanz', 'Speicher', 'Zugriff', 'Registrierung', 'Ressource', 'Auslastung'
    ],
    verbs: [
      'bereitstellen', 'ausführen', 'starten', 'installieren', 'einrichten', 'verbinden',
      'überwachen', 'verwalten', 'laden', 'löschen', 'bauen', 'melden', 'scheitern',
      'auftreten', 'reagieren', 'warten'
    ]
  }
]

export function domainById(id: string): Domain | undefined {
  return DOMAINS.find(d => d.id === id)
}

/** Resolve ids to Domains in DOMAINS order, dropping anything unknown — a
 *  persisted setting must never resurrect a Domain that has been removed. */
export function domainsByIds(ids: readonly string[]): Domain[] {
  const wanted = new Set(ids)
  return DOMAINS.filter(d => wanted.has(d.id))
}
