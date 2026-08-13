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
    label: 'C# & .NET',
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
      'explain what a namespace is for',
      'explain what deferred execution means in LINQ and when a query actually runs',
      'explain the difference between IQueryable and IEnumerable',
      'explain what generics buy you and what a constraint does',
      'explain what nullable reference types protect against',
      'explain where an exception should be caught and where it should only be logged'
    ],
    nouns: [
      'Klasse', 'Eigenschaft', 'Methode', 'Objekt', 'Schnittstellentyp', 'Vererbung',
      'Namensraum', 'Konstruktor', 'Ausnahme', 'Abhängigkeit', 'Paket', 'Modul',
      'Anwendung', 'Dienst', 'Konfiguration', 'Ereignis', 'Rückgabewert', 'Parameter',
      'Argument', 'Aufzählung', 'Generikum', 'Schleife', 'Bedingung', 'Variable',
      'Konstante', 'Zeichenkette', 'Testfall', 'Einheitstest', 'Quellcode', 'Sammlung',
      'Bibliothek', 'Zuweisung', 'Umsetzung', 'Wartung',
      'Werttyp', 'Referenztyp', 'Ausnahmebehandlung', 'Nullreferenz', 'Abfrage'
    ],
    verbs: [
      'erstellen', 'testen', 'prüfen', 'ändern', 'anpassen', 'ersetzen', 'verwenden',
      'benutzen', 'beheben', 'erkennen', 'entfernen', 'schreiben', 'lesen',
      'beschreiben', 'planen', 'vergleichen'
    ]
  },
  {
    id: 'sql-server',
    label: 'Datenzugriff & SQL',
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
      'explain when a cache helps a slow query and when it hides the real problem',
      'explain what change tracking in an ORM does and when it hurts performance',
      'explain what a schema migration is and what makes one risky',
      'explain when a stored procedure beats the ORM in an enterprise system',
      'explain how a reporting query over a large table stays fast',
      'explain what data archiving and retention mean and why regulations drive them'
    ],
    nouns: [
      'Abfrage', 'Spalte', 'Zeile', 'Datensatz', 'Primärschlüssel', 'Fremdschlüssel',
      'Transaktion', 'Index', 'Tabelle', 'Datenbank', 'Sicherung', 'Sicht', 'Verbund',
      'Auswertung', 'Bericht', 'Zugriff', 'Sperre', 'Migration', 'Wiederherstellung',
      'Latenz', 'Cache', 'Zwischenspeicher', 'Bedingung', 'Anweisung', 'Datentyp',
      'Speicherung', 'Verbindung', 'Filter', 'Sortierung', 'Ausführungsplan', 'Kennzahl',
      'Archivierung', 'Datenaufbewahrung', 'Aufbewahrungsfrist'
    ],
    verbs: [
      'speichern', 'laden', 'suchen', 'finden', 'übertragen', 'sichern', 'vergleichen',
      'berechnen', 'erhöhen', 'senken', 'beschleunigen', 'prüfen', 'verbinden',
      'ändern', 'entfernen', 'ausführen'
    ]
  },
  {
    id: 'docker',
    label: 'DevOps & Betrieb',
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
      'explain what monitoring should watch on a running service',
      'explain the stages of a CI/CD pipeline and what each one catches',
      'explain why dev, test and production environments must stay separate',
      'explain the difference between logging and monitoring, and what an alert should mean',
      'explain how a root cause analysis after an incident works',
      'explain what a managed cloud service takes off your plate and what it does not'
    ],
    nouns: [
      'Container', 'Abbild', 'Bereitstellung', 'Umgebung', 'Laufzeitumgebung',
      'Konfigurationsdatei', 'Netzwerk', 'Server', 'Pipeline', 'Build', 'Skript',
      'Protokollierung', 'Fehlermeldung', 'Version', 'Verzeichnis', 'Dateipfad',
      'Prozess', 'Schnittstelle', 'Endpunkt', 'Anfrage', 'Antwort', 'Orchestrierung',
      'Virtualisierung', 'Mikrodienst', 'Neustart', 'Ausfall', 'Überwachung',
      'Instanz', 'Speicher', 'Zugriff', 'Registrierung', 'Ressource', 'Auslastung',
      'Vorfall', 'Ursachenanalyse', 'Warnmeldung'
    ],
    verbs: [
      'bereitstellen', 'ausführen', 'starten', 'installieren', 'einrichten', 'verbinden',
      'überwachen', 'verwalten', 'laden', 'löschen', 'bauen', 'melden', 'scheitern',
      'auftreten', 'reagieren', 'warten'
    ]
  },
  {
    id: 'gxp',
    label: 'GxP-Grundlagen',
    form: 'erklaerend',
    scenes: [
      'explain what GMP — good manufacturing practice — regulates and who enforces it',
      'explain the difference between GMP, GCP and GLP',
      'explain what makes an IT system GxP-relevant and what follows from that',
      'explain why a GxP-relevant system changes how a developer works day to day',
      'explain what the "good practice" rules ultimately protect',
      'explain what an IT change in a GxP environment needs before it goes live',
      'explain why "it works" is not enough in a regulated system'
    ],
    nouns: [
      'Herstellung', 'Hersteller', 'Produktion', 'Charge', 'Labor', 'Studie',
      'Vorschrift', 'Richtlinie', 'Validierung', 'Qualitätssicherung', 'Dokumentation',
      'Aufzeichnung', 'Abweichung', 'Schulung', 'Freigabe', 'Nachweis', 'Risiko',
      'Risikobewertung', 'Patientensicherheit', 'Arzneimittel', 'Wirkstoff', 'Medikament',
      'Behörde', 'Inspektion', 'Audit', 'Standardarbeitsanweisung', 'Genehmigung', 'Prozess'
    ],
    verbs: [
      'herstellen', 'prüfen', 'überprüfen', 'kontrollieren', 'testen', 'sichern',
      'melden', 'beschreiben', 'planen', 'verwenden', 'ändern', 'erkennen',
      'vergleichen', 'einrichten'
    ]
  },
  {
    id: 'validierung',
    label: 'Validierung (CSV)',
    form: 'erklaerend',
    scenes: [
      'explain why software in pharma must be validated',
      'explain the GAMP 5 software categories and why the category decides the validation effort',
      'explain the difference between IQ, OQ and PQ',
      'explain what a user requirements specification is for',
      'explain what a traceability matrix connects and why an inspector asks for it',
      'explain what a risk-based validation approach changes in practice',
      'explain what revalidation after a change involves'
    ],
    nouns: [
      'Validierung', 'Qualifizierung', 'Anforderungsspezifikation', 'Rückverfolgbarkeit',
      'Prüfplan', 'Abnahme', 'Testfall', 'Dokumentation', 'Nachweis', 'Risikobewertung',
      'Risiko', 'Standardarbeitsanweisung', 'Freigabe', 'Abweichung', 'Änderungskontrolle',
      'Konfiguration', 'Anwendung', 'Umgebung', 'Migration', 'Schulung', 'Aufzeichnung',
      'Qualitätssicherung', 'Audit', 'Prozess', 'Version', 'Softwarekategorie'
    ],
    verbs: [
      'prüfen', 'überprüfen', 'testen', 'planen', 'beschreiben', 'ausführen',
      'sichern', 'ändern', 'vergleichen', 'erstellen', 'verwenden', 'melden'
    ]
  },
  {
    id: 'audit-trail',
    label: 'Audit-Trail & E-Signatur',
    form: 'erklaerend',
    scenes: [
      'explain what FDA 21 CFR Part 11 demands of an electronic record',
      'explain what EU Annex 11 covers',
      'explain what an audit trail must log and why it must be tamper-proof',
      'explain the difference between an electronic signature and a scanned one',
      'explain how access control and role management work in a validated system',
      'explain why a shared account is unacceptable in a GxP system'
    ],
    nouns: [
      'Prüfpfad', 'Audit-Trail', 'Signatur', 'Aufzeichnung', 'Zugriffskontrolle',
      'Rollenverwaltung', 'Zugriff', 'Protokollierung', 'Manipulation', 'Datenintegrität',
      'Vorschrift', 'Richtlinie', 'Nachweis', 'Dokumentation', 'Freigabe', 'Datenbank',
      'Anwendung', 'Konfiguration', 'Version', 'Änderungskontrolle', 'Aufbewahrungsfrist',
      'Datenaufbewahrung', 'Genehmigung', 'Audit', 'Inspektion', 'Prozess'
    ],
    verbs: [
      'speichern', 'prüfen', 'überprüfen', 'sichern', 'melden', 'ändern', 'löschen',
      'verwalten', 'überwachen', 'erkennen', 'verwenden', 'einrichten'
    ]
  },
  {
    id: 'datenintegritaet',
    label: 'Datenintegrität',
    form: 'erklaerend',
    scenes: [
      'explain the ALCOA+ principles and what "attributable" means for a developer',
      'explain how a system prevents silent edits of recorded data',
      'explain the difference between a backup and an archive',
      'explain what a restore test proves that a backup alone does not',
      'explain what disaster recovery means for a validated system',
      'explain why deleting data in a regulated system is itself a regulated action'
    ],
    nouns: [
      'Datenintegrität', 'Rückverfolgbarkeit', 'Aufzeichnung', 'Manipulation', 'Prüfpfad',
      'Sicherung', 'Wiederherstellung', 'Datenbank', 'Datensatz', 'Speicherung',
      'Archivierung', 'Datenaufbewahrung', 'Aufbewahrungsfrist', 'Zugriff',
      'Zugriffskontrolle', 'Protokollierung', 'Nachweis', 'Risiko', 'Risikobewertung',
      'Vorschrift', 'Dokumentation', 'Qualitätssicherung', 'Validierung', 'Datenlager',
      'Bericht', 'Auswertung'
    ],
    verbs: [
      'speichern', 'sichern', 'löschen', 'ändern', 'prüfen', 'überprüfen',
      'kontrollieren', 'übertragen', 'erkennen', 'melden', 'verwalten', 'laden'
    ]
  },
  {
    id: 'qualitaetsprozesse',
    label: 'Change Control & Qualität',
    form: 'erklaerend',
    scenes: [
      'explain how a change gets approved in pharma IT — change control step by step',
      'explain what an SOP is and why IT work follows one',
      'explain the difference between a deviation and a CAPA',
      'explain what a periodic review of a validated system checks',
      'explain how a developer works with QA day to day',
      'explain what an inspector asks the IT department during an audit'
    ],
    nouns: [
      'Änderungskontrolle', 'Standardarbeitsanweisung', 'Abweichung', 'Korrekturmaßnahme',
      'Qualitätssicherung', 'Audit', 'Inspektion', 'Freigabe', 'Genehmigung', 'Prüfplan',
      'Nachweis', 'Dokumentation', 'Schulung', 'Prozess', 'Risikobewertung', 'Risiko',
      'Vorschrift', 'Richtlinie', 'Aufzeichnung', 'Validierung', 'Version', 'Migration',
      'Umgebung', 'Anwendung', 'Bereitstellung', 'Wartung'
    ],
    verbs: [
      'prüfen', 'überprüfen', 'ändern', 'planen', 'melden', 'beschreiben', 'beheben',
      'verbessern', 'verwalten', 'vergleichen', 'testen', 'bereitstellen'
    ]
  },
  {
    id: 'behoerden',
    label: 'Behörden & Zulassung',
    form: 'erklaerend',
    scenes: [
      'explain what Swissmedic regulates and how it relates to EMA and FDA',
      'explain the drug approval process at a high level',
      'explain why one product needs separate submissions in different regions',
      'explain what a regulator inspects at a pharma company',
      'explain what a marketing authorisation is',
      'explain why regulatory deadlines dominate pharma project planning'
    ],
    nouns: [
      'Behörde', 'Zulassungsbehörde', 'Zulassung', 'Zulassungsverfahren', 'Genehmigung',
      'Arzneimittel', 'Wirkstoff', 'Medikament', 'Studie', 'Studienphase', 'Wirksamkeit',
      'Nebenwirkung', 'Patientensicherheit', 'Vorschrift', 'Richtlinie', 'Inspektion',
      'Audit', 'Nachweis', 'Dokumentation', 'Marktzugang', 'Forschung', 'Hersteller',
      'Herstellung', 'Charge', 'Risiko', 'Prozess'
    ],
    verbs: [
      'prüfen', 'überprüfen', 'genehmigen', 'melden', 'beschreiben', 'planen',
      'vergleichen', 'verwenden', 'suchen', 'finden', 'erkennen', 'testen'
    ]
  },
  {
    id: 'wertschoepfung',
    label: 'Pharma-Wertschöpfungskette',
    form: 'erklaerend',
    scenes: [
      'explain the path from drug discovery to market at a high level',
      'explain what the three clinical trial phases each establish',
      'explain what a batch is and why batch records matter',
      'explain what serialization solves in the pharma supply chain',
      'explain what a cold chain is and what breaks it',
      'explain what pharmacovigilance watches after a drug is launched'
    ],
    nouns: [
      'Forschung', 'Wirkstoff', 'Arzneimittel', 'Medikament', 'Studie', 'Studienphase',
      'Patient', 'Patientensicherheit', 'Wirksamkeit', 'Nebenwirkung', 'Herstellung',
      'Produktion', 'Charge', 'Hersteller', 'Lieferkette', 'Kühlkette', 'Serialisierung',
      'Arzneimittelsicherheit', 'Marktzugang', 'Zulassung', 'Labor', 'Probe',
      'Qualitätssicherung', 'Freigabe', 'Risiko', 'Behörde'
    ],
    verbs: [
      'herstellen', 'liefern', 'testen', 'prüfen', 'übertragen', 'melden', 'sichern',
      'suchen', 'finden', 'planen', 'beschreiben', 'vergleichen', 'starten', 'überwachen'
    ]
  },
  {
    id: 'pharma-systeme',
    label: 'Pharma-IT-Systeme',
    form: 'erklaerend',
    scenes: [
      'explain what a LIMS does in a laboratory',
      'explain what an MES does on the shop floor',
      'explain how ERP, MES and LIMS divide the work between them',
      'explain what a document management system holds in pharma and who uses it',
      'explain what clinical trial systems like a CTMS manage',
      'explain why pharma IT is a landscape of interfaces rather than one system'
    ],
    nouns: [
      'Laborinformationssystem', 'Produktionsleitsystem', 'Dokumentenmanagement',
      'Berichtswesen', 'Datenlager', 'Labor', 'Probe', 'Charge', 'Produktion',
      'Herstellung', 'Schnittstelle', 'Anwendung', 'Datenbank', 'Datensatz', 'Bericht',
      'Auswertung', 'Konfiguration', 'Version', 'Migration', 'Bereitstellung', 'Zugriff',
      'Rollenverwaltung', 'Validierung', 'Lieferkette', 'Aufzeichnung', 'Prozess'
    ],
    verbs: [
      'verbinden', 'übertragen', 'speichern', 'laden', 'verwalten', 'überwachen',
      'bereitstellen', 'einrichten', 'ausführen', 'prüfen', 'melden', 'suchen'
    ]
  },
  {
    id: 'hr-runde',
    label: 'HR-Runde & Vertrag',
    form: 'persoenlich',
    scenes: [
      'state your salary expectation and leave room to negotiate',
      'state your notice period and your earliest possible start date',
      'state your work-permit situation as an EU citizen — free movement, B permit',
      'state whether you would take an 80% or a 100% contract, and why',
      'state what you expect regarding the 13th month salary and the pension fund',
      'state how many home-office days you hope for and what on-site presence you accept',
      'state your vacation expectation under a Swiss contract',
      'state one question you would ask the interviewers at the end'
    ],
    nouns: [
      'Gehaltsvorstellung', 'Verhandlung', 'Kündigungsfrist', 'Eintrittstermin',
      'Arbeitsvertrag', 'Probezeit', 'Vorstellungsgespräch', 'Rückfrage',
      'Berufserfahrung', 'Einarbeitung', 'Weiterbildung', 'Branchenwechsel',
      'Homeoffice', 'Präsenztag', 'Bonus', 'Urlaubsanspruch', 'Monatslohn',
      'Pensionskasse', 'Arbeitspensum', 'Aufenthaltsbewilligung',
      'Personenfreizügigkeit', 'Erwartung', 'Umzug', 'Stelle', 'Vertrag', 'Gehalt'
    ],
    verbs: [
      'verhandeln', 'erwarten', 'anbieten', 'fragen', 'suchen', 'finden', 'planen',
      'starten', 'warten', 'melden', 'vergleichen', 'verwenden', 'lesen', 'schreiben'
    ]
  },
  {
    id: 'async',
    label: 'Async & Nebenläufigkeit',
    form: 'erklaerend',
    scenes: [
      'explain what async/await does and what it does not do',
      'explain how a classic async deadlock arises (.Result, .Wait) and how to avoid it',
      'explain the difference between a Task and a Thread',
      'explain what a CancellationToken is for and what a graceful shutdown involves',
      'explain what thread safety means and what a lock costs',
      'explain when a concurrent collection beats a lock',
      'explain how a background job differs from a request handler'
    ],
    nouns: [
      'Thread', 'Deadlock', 'Threadsicherheit', 'Nebenläufigkeit', 'Hintergrundprozess',
      'Abbruch', 'Warteschlange', 'Sperre', 'Prozess', 'Aufgabe', 'Ausnahme',
      'Ausnahmebehandlung', 'Methode', 'Rückgabewert', 'Anfrage', 'Antwort',
      'Ressource', 'Auslastung', 'Server', 'Dienst', 'Ereignis', 'Fehlermeldung',
      'Neustart', 'Ausfall', 'Überwachung', 'Speicher'
    ],
    verbs: [
      'starten', 'warten', 'ausführen', 'beschleunigen', 'verbinden', 'prüfen',
      'melden', 'reagieren', 'scheitern', 'auftreten', 'überwachen', 'beheben'
    ]
  },
  {
    id: 'web-integration',
    label: 'Web-APIs & Integration',
    form: 'erklaerend',
    scenes: [
      'explain what makes an API RESTful and why consumers care',
      'explain the difference between authentication and authorization',
      'explain what OAuth2 solves at a high level',
      'explain what a message queue decouples and what it costs',
      'explain why enterprises still use file interfaces next to APIs',
      'explain what API versioning protects and what backward compatibility demands',
      'explain what interfacing with an ERP system like SAP typically involves'
    ],
    nouns: [
      'Schnittstelle', 'Endpunkt', 'Anfrage', 'Antwort', 'Warteschlange',
      'Authentifizierung', 'Berechtigung', 'Zugriff', 'Zugriffskontrolle',
      'Rollenverwaltung', 'Datenaustausch', 'Abwärtskompatibilität', 'Integration',
      'Übertragung', 'Version', 'Netzwerk', 'Server', 'Dienst', 'Konfiguration',
      'Anwendung', 'Fehlermeldung', 'Verbindung', 'Protokollierung', 'Datenbank',
      'Prozess', 'Ereignis'
    ],
    verbs: [
      'verbinden', 'übertragen', 'prüfen', 'sichern', 'melden', 'bereitstellen',
      'einrichten', 'verwenden', 'ändern', 'erstellen', 'ausführen', 'laden', 'speichern'
    ]
  },
  {
    id: 'testing',
    label: 'Testing & Codequalität',
    form: 'erklaerend',
    scenes: [
      'explain the difference between a unit test and an integration test',
      'explain what test coverage measures and what it does not',
      'explain what a mock replaces and when mocking goes too far',
      'explain how you give useful feedback in a code review',
      'explain how to refactor legacy code without breaking it',
      'explain what static analysis catches that reviews miss',
      'explain why coding standards matter more in a team than alone'
    ],
    nouns: [
      'Testfall', 'Einheitstest', 'Integrationstest', 'Testabdeckung',
      'Codeüberprüfung', 'Umstrukturierung', 'Altcode', 'Programmierstandard',
      'Codequalität', 'Quellcode', 'Feedback', 'Rückmeldung', 'Fehler',
      'Fehlermeldung', 'Wartbarkeit', 'Wartung', 'Verbesserung', 'Funktion',
      'Methode', 'Klasse', 'Zeichenkette', 'Sammlung', 'Bibliothek', 'Modul',
      'Paket', 'Werkzeug'
    ],
    verbs: [
      'testen', 'prüfen', 'überprüfen', 'verbessern', 'ändern', 'beheben',
      'erkennen', 'schreiben', 'lesen', 'beschreiben', 'vergleichen', 'ersetzen', 'anpassen'
    ]
  },
  {
    id: 'architektur',
    label: 'Architektur & Design',
    form: 'erklaerend',
    scenes: [
      'explain what a layered architecture separates and why',
      'explain the repository pattern and what it hides',
      'explain the difference between the strategy and the factory pattern',
      'explain when a monolith beats microservices in enterprise IT',
      'explain what designing for maintainability means in practice',
      'explain why architecture decisions should be written down and how',
      'explain what separation of concerns buys you when requirements change'
    ],
    nouns: [
      'Schichtenarchitektur', 'Entwurfsmuster', 'Monolith', 'Mikrodienst',
      'Wartbarkeit', 'Architekturentscheidung', 'Architektur', 'Komponente',
      'Abhängigkeit', 'Schnittstelle', 'Modul', 'Paket', 'Bibliothek', 'Klasse',
      'Dienst', 'Anwendung', 'Datenbank', 'Dokumentation', 'Umsetzung', 'Wartung',
      'Entscheidung', 'Anforderung', 'Verantwortung', 'Konfiguration', 'Prozess', 'Ereignis'
    ],
    verbs: [
      'planen', 'beschreiben', 'vergleichen', 'ersetzen', 'anpassen', 'erstellen',
      'verwenden', 'verbinden', 'prüfen', 'ändern', 'verwalten', 'bauen'
    ]
  },
  {
    id: 'legacy',
    label: 'Legacy & Modernisierung',
    form: 'erklaerend',
    scenes: [
      'explain how a migration from .NET Framework to modern .NET is approached',
      'explain your first steps when taking over an undocumented system',
      'explain the strangler pattern — replacing a system piece by piece',
      'explain what a risk assessment before touching a running system covers',
      'explain why a rewrite from scratch usually fails and what to do instead',
      'explain how to build a safety net of tests around code nobody understands'
    ],
    nouns: [
      'Modernisierung', 'Ablösung', 'Altsystem', 'Altcode', 'Risikobewertung',
      'Risiko', 'Migration', 'Dokumentation', 'Umstrukturierung', 'Testfall',
      'Einheitstest', 'Abhängigkeit', 'Quellcode', 'Version', 'Wartung',
      'Wartbarkeit', 'Anwendung', 'Datenbank', 'Schnittstelle', 'Ausfall',
      'Fehlermeldung', 'Neustart', 'Sicherung', 'Wiederherstellung', 'Fehlersuche'
    ],
    verbs: [
      'ersetzen', 'ändern', 'prüfen', 'testen', 'sichern', 'planen', 'beschreiben',
      'erkennen', 'beheben', 'verwalten', 'anpassen', 'entfernen'
    ]
  },
  {
    id: 'kommunikation',
    label: 'Stakeholder & Kommunikation',
    form: 'erzaehlend',
    scenes: [
      'tell about a time you explained a technical problem to a non-technical colleague',
      'tell about gathering requirements from business users who did not know what they wanted',
      'tell about a time you said no to a stakeholder and offered an alternative',
      'tell about working with an external vendor that tested your patience',
      'tell about a misunderstanding that better communication would have prevented',
      'tell about a time you had to deliver bad news about a project'
    ],
    nouns: [
      'Kommunikation', 'Missverständnis', 'Anforderung', 'Dienstleister', 'Lieferant',
      'Besprechung', 'Rückmeldung', 'Feedback', 'Alternative', 'Fachbegriff',
      'Zusammenarbeit', 'Erwartung', 'Lösung', 'Problem', 'Projekt', 'Termin',
      'Entscheidung', 'Kritik', 'Kompromiss', 'Verantwortung', 'Kollege', 'Team',
      'Rückfrage', 'Verhandlung', 'Verzögerung'
    ],
    verbs: [
      'erklären', 'beschreiben', 'fragen', 'vergleichen', 'planen', 'melden',
      'verhandeln', 'finden', 'suchen', 'verwenden', 'anbieten', 'erwarten', 'verbessern'
    ]
  },
  {
    id: 'teamarbeit',
    label: 'Globale Teamarbeit',
    form: 'erzaehlend',
    scenes: [
      'tell about working in a cross-functional international team',
      'tell about collaborating across time zones and what asynchronous communication changed',
      'tell about a cultural difference that surprised you in a global company',
      'tell about a knowledge transfer you ran for colleagues',
      'tell about onboarding a new team member remotely',
      'tell about a time remote collaboration broke down and how it was fixed'
    ],
    nouns: [
      'Team', 'Zeitzone', 'Zusammenarbeit', 'Wissenstransfer', 'Übergabe',
      'Verantwortung', 'Kollege', 'Besprechung', 'Kommunikation', 'Missverständnis',
      'Einarbeitung', 'Homeoffice', 'Präsenztag', 'Dokumentation', 'Aufgabe',
      'Projekt', 'Rolle', 'Planung', 'Fortschritt', 'Rückmeldung', 'Erwartung',
      'Weiterbildung', 'Termin', 'Verzögerung', 'Lösung'
    ],
    verbs: [
      'planen', 'beschreiben', 'erklären', 'fragen', 'melden', 'verbinden',
      'verwalten', 'verwenden', 'vergleichen', 'finden', 'suchen', 'schreiben'
    ]
  },
  {
    id: 'konflikt',
    label: 'Konflikt & Druck',
    form: 'erzaehlend',
    scenes: [
      'tell about disagreeing with a technical decision and how you handled it',
      'tell about receiving critical feedback on your code and what you did with it',
      'tell about a project that failed or was cancelled and what you learned',
      'tell about delivering under a tight deadline and what you deprioritized',
      'tell about a conflict in the team that you helped resolve',
      'tell about a time you were wrong in a technical argument and admitted it'
    ],
    nouns: [
      'Meinungsverschiedenheit', 'Kritik', 'Misserfolg', 'Lektion', 'Konflikt',
      'Kompromiss', 'Termindruck', 'Druck', 'Frist', 'Verzögerung', 'Priorität',
      'Entscheidung', 'Feedback', 'Rückmeldung', 'Fehler', 'Lösung', 'Problem',
      'Projekt', 'Team', 'Kollege', 'Verantwortung', 'Erwartung', 'Besprechung',
      'Kommunikation', 'Aufgabe'
    ],
    verbs: [
      'verhandeln', 'erklären', 'fragen', 'vergleichen', 'melden', 'beheben',
      'erkennen', 'verbessern', 'planen', 'finden', 'beschreiben', 'erwarten'
    ]
  },
  {
    id: 'eigenverantwortung',
    label: 'Ownership & Problemlösung',
    form: 'erzaehlend',
    scenes: [
      'tell about your first week with an inherited system that had no tests and no documentation',
      'tell about debugging a production incident under time pressure',
      'tell about prioritizing when everything was urgent at once',
      'tell about a slow manual process you automated',
      'tell about a problem you fixed before anyone noticed it',
      'tell about the proudest improvement you shipped on your own initiative'
    ],
    nouns: [
      'Eigenverantwortung', 'Fehlersuche', 'Produktionsvorfall', 'Vorfall',
      'Priorisierung', 'Priorität', 'Automatisierung', 'Prozessverbesserung',
      'Verbesserung', 'Initiative', 'Einarbeitung', 'Ursachenanalyse', 'Altsystem',
      'Dokumentation', 'Testfall', 'Fehlermeldung', 'Überwachung', 'Neustart',
      'Ausfall', 'Skript', 'Werkzeug', 'Termindruck', 'Lösung', 'Prozess', 'Aufgabe'
    ],
    verbs: [
      'beheben', 'erkennen', 'prüfen', 'testen', 'ändern', 'verbessern', 'planen',
      'melden', 'ausführen', 'starten', 'überwachen', 'sichern'
    ]
  },
  {
    id: 'arbeitsweise',
    label: 'Agile & ITIL',
    form: 'erklaerend',
    scenes: [
      'explain what stays agile and what changes in a regulated environment',
      'explain the Scrum roles and ceremonies and your place in them',
      'explain what SAFe adds on top of Scrum and why large pharma uses it',
      'explain a Definition of Done that includes validation documents',
      'explain the ITIL distinction between an incident, a problem and a change',
      'explain how you estimate work and communicate delays early'
    ],
    nouns: [
      'Arbeitsweise', 'Sprint', 'Retrospektive', 'Rolle', 'Planung',
      'Aufwandsschätzung', 'Schätzung', 'Verzögerung', 'Vorfall', 'Problem',
      'Änderung', 'Besprechung', 'Team', 'Priorisierung', 'Priorität',
      'Anforderung', 'Aufgabe', 'Validierung', 'Dokumentation', 'Freigabe',
      'Prozess', 'Termin', 'Fortschritt', 'Hindernis', 'Abnahme'
    ],
    verbs: [
      'planen', 'vergleichen', 'beschreiben', 'erklären', 'melden', 'prüfen',
      'verwalten', 'erwarten', 'verhandeln', 'anpassen', 'verwenden', 'starten'
    ]
  },
  {
    id: 'motivation',
    label: 'Motivation & Firmenwahl',
    form: 'persoenlich',
    scenes: [
      'state why you want pharma rather than banking or a startup',
      'state why this specific company attracts you — pipeline, products, recent news',
      'state why this specific team and what they build appeals to you',
      'state what patient impact means to you as an internal IT developer',
      'state your five-year direction — technical expert or lead',
      'state your relocation story — why Switzerland, why now'
    ],
    nouns: [
      'Motivation', 'Branchenwechsel', 'Produktportfolio', 'Nutzen', 'Patient',
      'Entwicklung', 'Ziel', 'Auswanderung', 'Umzug', 'Berufserfahrung', 'Stelle',
      'Unternehmen', 'Produkt', 'Forschung', 'Arzneimittel', 'Beitrag',
      'Schwerpunkt', 'Weiterbildung', 'Team', 'Projekt', 'Erwartung',
      'Verantwortung', 'Wirkstoff', 'Patientensicherheit', 'Marktzugang'
    ],
    verbs: [
      'erwarten', 'suchen', 'finden', 'planen', 'vergleichen', 'erklären',
      'anbieten', 'verwenden', 'lesen', 'schreiben', 'starten', 'fragen'
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
