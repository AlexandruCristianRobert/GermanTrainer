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

export interface Domain {
  /** kebab id — persisted in setup settings and in run meta as packedDomains */
  id: string
  /** chip and card-badge label */
  label: string
  /** English scene lines; one is drawn per card and replaces the generic
   *  scene-setters in PACKED_SCENE_ANGLES. */
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
    scenes: [
      'set it in a code review of a new service class',
      'set it while refactoring a class that has grown too large',
      'set it during a sprint planning about a new feature',
      'set it while a unit test suite keeps failing',
      'set it while onboarding a new colleague to the codebase',
      'set it while upgrading a package that broke the build'
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
    scenes: [
      'set it while a query in production has become slow',
      'set it during a database migration on a Friday evening',
      'set it while restoring a backup after a failure',
      'set it while designing a table for a new report',
      'set it while a transaction is blocking other users',
      'set it while going through an execution plan with a colleague'
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
    scenes: [
      'set it during a deployment that failed late at night',
      'set it while a container keeps restarting',
      'set it while writing a configuration file for a new environment',
      'set it during a rollout to the production cluster',
      'set it while the monitoring dashboard shows an outage',
      'set it while a colleague cannot reach the service endpoint'
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
