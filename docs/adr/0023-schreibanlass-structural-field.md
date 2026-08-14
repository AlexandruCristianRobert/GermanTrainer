# Schreibanlass is a structural field where the Aufgabenmuster stayed a lens

Schreiben Teil 2 groups its [Schreibauftrag](../../CONTEXT.md)s by
[Schreibanlass](../../CONTEXT.md) — five communicative occasions (Entschuldigung & Absage,
Bitte & Anfrage, Beschwerde & Problem melden, Vorschlag & Anregung, Dank & Rückmeldung) — and the
Anlass is **first-class**: stored on every Auftrag, seeded and AI-generated alike; required and
validated in the generator contract; a Setup filter; the key that picks the
[Musternachricht](../../CONTEXT.md) and resolves the Inhalts-Baukasten fallback; and the basis of
[Move](../../CONTEXT.md) aptness. Teil 1's [Aufgabenmuster](../../CONTEXT.md) is deliberately the
opposite — a study lens in a seeded-id-only mapping, never stored on the theme, never a filter,
custom themes unmapped. The same module now carries both disciplines on purpose.

**Why the divergence is honest.** An Aufgabenmuster is *dominant*, not constitutive: a
Forumsbeitrag's four [Inhaltspunkt](../../CONTEXT.md)e mix patterns (an opinion point beside an
experience point beside an alternative point), so the lens maps each seeded theme to its
*dominant* shape and filtering by it would imply a purity the data does not have. A Schreibanlass
is *constitutive*: the exam task **is** an apology or a request — the Inhaltspunkte flow from the
occasion, and a generator cannot write an Auftrag without first deciding it. What is a reading of
Teil 1's sheets is a property of Teil 2's.

**Lens-only symmetry was rejected** on three counts: the AI generator could not balance new
Aufträge across occasions it does not know it is writing; custom Aufträge would fall out of the
Musternachricht, Baukasten, and Move-aptness mechanisms that seeded ones enjoy; and the
[Move nudge](../../CONTEXT.md) could not be Anlass-apt, so it would coach apologies into
thank-you messages. **Textsorte grouping was also rejected**: Teil 2's Textsorte is constant
(always a halbformelle Nachricht in Sie-register), so it yields one group — the Aufgabenmuster
avoid-note that anticipated "email genres" as Teil 2's world was corrected in the same grill.

## Consequences

- **The five Anlass slugs are forever shared property.** `entschuldigung | bitte | beschwerde |
  vorschlag | dank` key the Musternachrichten, the Baukasten fallback banks, the Move aptness
  lists, and every persisted custom Auftrag. Renaming or splitting one is a data migration, not a
  label edit.
- **Still never a grading input.** Parity with the Aufgabenmuster holds where it matters: the
  grader judges the Auftrag's own Inhaltspunkte and text, never an Anlass-shaped expectation.
- **The generator contract widens.** A generated Auftrag with a missing or unknown `anlass` is
  rejected by the validator, and generation draws balanced across the five — obligations Teil 1's
  theme generator never had.
- **Do not "fix" the inconsistency in either direction.** Retrofitting a stored field onto Teil
  1's 24 themes would force false single labels onto mixed sheets; demoting Teil 2's field to a
  lens would strip custom Aufträge of their model text and apt nudges. The asymmetry is the
  decision.
- **Anlass-aware Move aptness exists only because the field is trustworthy.** The eight
  Nachrichtfunktionen declare which Anlässe they fit; that declaration is only usable because
  every Auftrag — seeded or custom — carries a validated Anlass.
