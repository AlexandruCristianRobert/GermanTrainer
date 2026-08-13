# Tier 1 — Big Pharma Internal IT: Interview Topic Map
### (Takeda, Amgen, Biogen, Pfizer, CSL Vifor, Novartis/Roche internal IT type roles)
Use each bullet as a **subject** for GermanTrainer sentence generation. Key German terms are in parentheses so the app can build B2–C1 sentences with real domain vocabulary.

---

## 1. Coding & .NET Technical (der technische Teil)

> Tier 1 rarely does live algorithm coding. Questions are conversational: "explain", "compare", "what would you do if". Depth over speed.

### 1.1 C# language fundamentals (die Programmiersprache)
- OOP pillars: inheritance, polymorphism, encapsulation, abstraction — often "explain it simply" (die Vererbung, die Kapselung)
- Interfaces vs abstract classes, when and why (die Schnittstelle)
- Value types vs reference types, struct vs class (der Werttyp, der Referenztyp)
- Generics and constraints (die generische Klasse)
- LINQ: deferred execution, IQueryable vs IEnumerable (die Abfrage)
- Exception handling strategy and custom exceptions (die Ausnahmebehandlung)
- Nullable reference types and defensive coding (die Nullreferenz)

### 1.2 Async & concurrency (die Nebenläufigkeit)
- async/await basics and common deadlocks (.Result, .Wait) (der Deadlock / die Verklemmung)
- Task vs Thread vs Task.Run (der Thread / der Ausführungsstrang)
- CancellationToken and graceful shutdown (der Abbruch)
- Thread safety, locks, concurrent collections (die Threadsicherheit)
- Background jobs and scheduled processing (der Hintergrundprozess)

### 1.3 Data access & databases (der Datenzugriff)
- Entity Framework Core: tracking, migrations, performance pitfalls (die Migration)
- SQL fundamentals: joins, indexes, transactions (die Transaktion, der Index)
- Stored procedures vs ORM in enterprise systems (die gespeicherte Prozedur)
- Handling large datasets and reporting queries (die Auswertung)
- Data archiving and retention (die Datenaufbewahrung)

### 1.4 Web & integration (die Integration)
- ASP.NET Core Web API design, REST principles (die Schnittstelle / die API)
- Authentication & authorization: OAuth2, Azure AD/Entra ID (die Authentifizierung, die Berechtigung)
- Integration patterns: message queues, file interfaces, ETL (die Warteschlange, der Datenaustausch)
- Interfacing with SAP / ERP systems (das ERP-System)
- API versioning and backward compatibility (die Abwärtskompatibilität)

### 1.5 Testing & code quality (die Codequalität)
- Unit testing, mocking, test coverage (der Unittest, die Testabdeckung)
- Integration and end-to-end tests (der Integrationstest)
- Code reviews: how you give and receive feedback (die Codeüberprüfung, das Feedback)
- Refactoring legacy code safely (die Umstrukturierung, der Altcode)
- Static analysis and coding standards (der Programmierstandard)

### 1.6 Architecture & design (die Architektur)
- Layered architecture and separation of concerns (die Schichtenarchitektur)
- Common design patterns: repository, factory, strategy, observer (das Entwurfsmuster)
- Monolith vs microservices in enterprise IT (der Monolith, der Microservice)
- Designing for maintainability over cleverness (die Wartbarkeit)
- Documentation of architecture decisions (die Architekturentscheidung)

### 1.7 DevOps, cloud & operations (der Betrieb)
- CI/CD pipelines: build, test, deploy stages (die Pipeline, die Bereitstellung)
- Azure basics: App Service, Functions, Key Vault, storage (die Cloud)
- Environments: dev, test/QA, validation, production (die Umgebung, die Produktionsumgebung)
- Monitoring, logging, alerting (die Überwachung, die Protokollierung)
- Incident response and root cause analysis (der Vorfall, die Ursachenanalyse)
- Windows Server / IIS hosting and on-prem constraints (der Server)

### 1.8 Legacy modernization (die Modernisierung)
- Migrating .NET Framework to modern .NET (die Migration)
- Taking over undocumented systems: first steps (die fehlende Dokumentation)
- Strangler pattern: replacing a system piece by piece (die schrittweise Ablösung)
- Risk assessment before touching a running system (die Risikobewertung)

---

## 2. Pharma & Regulated Industry (die regulierte Industrie)

> This is what separates you from other .NET candidates. Even basic fluency here is a strong signal.

### 2.1 GxP fundamentals (die gute Praxis)
- GMP — Good Manufacturing Practice (die gute Herstellungspraxis)
- GCP — Good Clinical Practice (die gute klinische Praxis)
- GLP — Good Laboratory Practice (die gute Laborpraxis)
- What makes a system "GxP-relevant" and why it matters for IT (das GxP-relevante System)

### 2.2 Computer System Validation — CSV (die Computersystemvalidierung)
- Why software must be validated in pharma (die Validierung)
- GAMP 5 categories of software (die Softwarekategorie)
- IQ / OQ / PQ — installation, operational, performance qualification (die Qualifizierung)
- User Requirements Specification and traceability matrix (die Anforderungsspezifikation, die Rückverfolgbarkeit)
- Risk-based validation approach (der risikobasierte Ansatz)

### 2.3 Electronic records & signatures (die elektronische Signatur)
- FDA 21 CFR Part 11 basics (die elektronische Aufzeichnung)
- EU Annex 11 (der Anhang 11)
- Audit trail: what must be logged and why (der Prüfpfad / der Audit-Trail)
- Access control and role management in validated systems (die Zugriffskontrolle, die Rollenverwaltung)

### 2.4 Data integrity (die Datenintegrität)
- ALCOA+ principles: attributable, legible, contemporaneous, original, accurate (die Nachvollziehbarkeit)
- Preventing data manipulation and silent edits (die Datenmanipulation)
- Backup, restore and disaster recovery in regulated systems (die Datensicherung, die Wiederherstellung)

### 2.5 Change & quality processes (das Qualitätsmanagement)
- Change control: how a change gets approved in pharma IT (die Änderungskontrolle)
- SOPs — standard operating procedures (die Standardarbeitsanweisung)
- Deviations and CAPA — corrective and preventive actions (die Abweichung, die Korrekturmaßnahme)
- Periodic review of validated systems (die regelmäßige Überprüfung)
- Working with QA as a developer (die Qualitätssicherung)
- Audits and inspections: what an inspector asks IT (das Audit, die Inspektion)

### 2.6 Regulators & framework (die Behörden)
- Swissmedic — Swiss regulator (die Zulassungsbehörde)
- EMA — European Medicines Agency (die europäische Arzneimittelagentur)
- FDA — US regulator (die US-Behörde)
- Drug approval process at a high level (das Zulassungsverfahren)

### 2.7 Pharma value chain & business context (die Wertschöpfungskette)
- Drug discovery and research (die Forschung, der Wirkstoff)
- Clinical trials: phases I–III, trial data (die klinische Studie, die Studienphase)
- Manufacturing and batch production (die Herstellung, die Charge)
- Supply chain, cold chain, serialization (die Lieferkette, die Serialisierung)
- Pharmacovigilance — drug safety after launch (die Arzneimittelsicherheit)
- Commercial / market access (der Marktzugang)

### 2.8 Typical pharma IT systems (die Systemlandschaft)
- LIMS — laboratory information management system (das Laborinformationssystem)
- MES — manufacturing execution system (das Produktionsleitsystem)
- ERP / SAP for supply chain and finance (das ERP-System)
- QMS and document management, e.g. Veeva (das Dokumentenmanagement)
- CTMS / eTMF — clinical trial systems (das Studienmanagementsystem)
- Data warehouses and reporting platforms (das Datenlager, das Berichtswesen)

---

## 3. Behavioral & Collaboration (der Verhaltensteil)

> Tier 1 interviews are 50%+ this. Prepare stories, not definitions. STAR structure: situation, task, action, result.

### 3.1 Stakeholders & communication (die Kommunikation)
- Explaining a technical problem to a non-technical scientist or manager (die Verständlichkeit)
- Gathering requirements from business users who don't know what they want (die Anforderungsaufnahme)
- Saying no to a stakeholder and offering alternatives (die Erwartungssteuerung)
- Working with external vendors and consultants (der Dienstleister, der Lieferant)

### 3.2 Teamwork in global organizations (die Zusammenarbeit)
- Working in cross-functional, international teams (das funktionsübergreifende Team)
- Time zones, remote collaboration, asynchronous communication (die Zeitzone, die Zusammenarbeit auf Distanz)
- Handling cultural differences in a global company (der kulturelle Unterschied)
- Knowledge transfer and documentation for colleagues (der Wissenstransfer)

### 3.3 Conflict & difficult situations (der Konflikt)
- Disagreeing with a technical decision — how you handled it (die Meinungsverschiedenheit)
- Receiving critical feedback on your code or work (die Kritik)
- A project that failed or was cancelled: what you learned (der Misserfolg, die Lektion)
- Dealing with pressure and tight deadlines (der Termindruck)

### 3.4 Ownership & problem solving (die Eigenverantwortung)
- Inheriting a system with no tests and no documentation: your first week (die Einarbeitung)
- Debugging a production incident under time pressure (die Fehlersuche, der Produktionsvorfall)
- Prioritizing when everything is urgent (die Priorisierung)
- A time you automated or improved a slow manual process (die Automatisierung, die Prozessverbesserung)

---

## 4. Ways of Working (die Arbeitsweise)

- Agile in a regulated environment: what changes, what stays (das agile Arbeiten)
- Scrum roles and ceremonies; your role in the team (der Sprint, das Daily)
- SAFe — scaled agile, common at Roche and Novartis (das skalierte Framework)
- Definition of Done including validation documents (die Abnahmekriterien)
- ITIL basics: incident, problem, change (der Vorfall, das Problem, die Änderung)
- Estimating work and communicating delays early (die Aufwandsschätzung, die Verzögerung)

---

## 5. Motivation & Company Fit (die Motivation)

> Interviewers consistently probe whether you researched the *specific team*, not just the company brand.

- Why pharma and not banking or a startup (der Branchenwechsel)
- Why this specific company: pipeline, products, recent news (das Produktportfolio)
- Why this specific team and what they build (die Teamrecherche)
- What "patient impact" means for an internal IT developer (der Nutzen für Patienten)
- Your five-year direction: technical expert vs lead (die berufliche Entwicklung)
- Why Switzerland, why now — relocation story (der Umzug, die Auswanderung)

---

## 6. HR & Practical Round (das HR-Gespräch)

> In Switzerland this round may partly happen in German — high-value sentence practice.

- Salary expectations and negotiation (die Gehaltsvorstellung, die Verhandlung)
- Notice period and possible start date (die Kündigungsfrist, der Eintrittstermin)
- Work permit as EU citizen — free movement, B permit (die Aufenthaltsbewilligung, die Personenfreizügigkeit)
- Workload percentage: 80% vs 100% contracts (das Arbeitspensum)
- 13th month salary, bonus, pension fund (der dreizehnte Monatslohn, die Pensionskasse)
- Home office policy and on-site days (das Homeoffice, die Präsenztage)
- Vacation days and Swiss employment basics (der Urlaubsanspruch / die Ferien)
- Questions you ask them at the end (die Rückfrage)

---

## Suggested GermanTrainer usage

- Feed **one leaf bullet** at a time as the subject; the parenthesized nouns are anchor vocabulary the generated sentence should contain.
- Generate three registers per subject: formal interview answer (Sie-Form), explanation to a colleague (du-Form), and a written follow-up email sentence.
- Highest payoff for B2→C1: sections **2 (pharma vocabulary)** and **6 (HR round)** — these are the parts most likely to actually happen in German.
