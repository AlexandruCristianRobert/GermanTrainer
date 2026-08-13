# A Katalog references Domains, and the founding Domains are absorbed into Tier 1 Pharma

A [Katalog](../../CONTEXT.md) groups [Domain](../../CONTEXT.md)s for one interview target — the
first is *Tier 1 Pharma* (big-pharma internal IT), built from the topic map in
`docs/tier1-pharma-interview-topics.md`. The map's three levels land on the existing model as:
sub-section → Domain, leaf bullet → scene, section → a named heading inside the Katalog that is
not selectable and carries no data. Two structural decisions follow, and both were contested.

**A Katalog references its Domains rather than owning them.** Membership is a list of Domain ids,
many-to-many — the same reference discipline a Domain already applies to its nouns and verbs.
The forcing case is the future the feature was asked for: a Tier 2 target (banks, consultancies)
will ask the *same* C# fundamentals, and its Katalog must point at the same Domain rather than
fork it. Ownership would have made every new target a copy-paste of the technical sections,
drifting apart from day one.

**The founding Domains are absorbed, not duplicated.** The topic map's section 1 overlaps the
three ADR-0018 Domains almost verbatim (`dotnet` already carries *"explain the difference between
an interface and an abstract class"*; the map's 1.1 lists the same subject). So `dotnet` extends
into *1.1 C# & .NET Grundlagen*, `sql-server` into *1.3 Datenzugriff & SQL*, and `docker` into
*1.7 DevOps & Betrieb* — same ids, extended scenes and vocabulary, new labels. Keeping them as
standalone chips beside near-identical Katalog Domains was rejected: two .NET scene lists would
drift, and the setup would show two chips meaning the same thing. Once absorbed, no ungrouped
Domain list remains, and the Fachgebiet block presents Domains through the Katalog's sections
(collapsible, chips within — the flat chip row does not survive ~23 Domains on a phone).

**Anchor vocabulary seeds pools; nothing binds a noun to a scene.** The topic map calls its
parenthesized terms "anchor vocabulary the generated sentence should contain". A per-scene
noun requirement was rejected: sub-section granularity already makes every Domain pool
scene-coherent, the scene text itself pulls its topical words into the sentence unforced, and a
binding mechanism would fight the per-card noun count and weak-point sampling for no measurable
gain. The parentheses are therefore a *floor* for each Domain's noun list, authored beyond the
map to ADR-0018's register discipline.

## Consequences

- **A Domain id is forever shared property.** Renaming or splitting one now breaks every Katalog
  that references it, not just one setup file. `domainsByIds` still drops unknown ids, so
  persisted setups survive — but the absorbed ids (`dotnet`, `sql-server`, `docker`) must not
  change during absorption, only their labels and contents.
- **Sections are presentation, not model.** No data hangs off a section; selection, generation,
  run meta (`packedDomains`) and weak points all keep speaking Domain. Adding, renaming, or
  re-ordering sections is a label edit.
- **No Katalog picker until a second Katalog exists.** The Katalog name renders as a static
  header; a picker is additive when Tier 2 ships. Building it now was rejected as UI for a
  future that is not here.
- **The verb pool is protected from the Katalog.** Field verbs the pool lacks (*validieren*,
  *dokumentieren*) are **not** added to `verbs.ts` — [Verb level](../../CONTEXT.md)s are
  frequency batches (ADR-0009) and niche additions would pollute them. A Domain's verb list names
  only verbs that already exist; a missing field verb simply appears in generated German as an
  incidental verb — highlighted and hinted, never drilled.
- **New nouns join one new Themengruppe and three existing ones.** Section 2's vocabulary seeds a
  new `Pharma` group (drillable everywhere nouns are drilled, not only here); Swiss-employment
  terms join `Switzerland`; behavioral/HR-general terms join `Work`; new technical terms join
  `Programming`. The ADR-0018 caveat applies at this scale: re-categorization may silently move
  a learner's hand-added noun (*die Charge*, *die Abweichung* are ordinary German words too).
- **Delivery is split by payoff, mechanism-first.** Release 1 ships the full mechanism (Katalog,
  [Darstellungsform](../../CONTEXT.md) with all three prompt branches, accordion UI, `Pharma`
  group) with section 2, section 6, and the three absorptions; Release 2 is pure content
  authoring (1.2, 1.4–1.6, 1.8, 3.1–3.4, 4, 5). Anything structural is discovered in Release 1.
