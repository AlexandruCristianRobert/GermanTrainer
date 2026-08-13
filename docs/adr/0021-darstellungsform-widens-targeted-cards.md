# A Domain declares its Darstellungsform, widening targeted cards beyond definitions

ADR-0018 fixed the register of a targeted [Packed card](../../CONTEXT.md): *a definition, not a
scene* — present tense, generic subject or *man*, no anecdote. That rule fit the three founding
Domains because they were all technical. The Tier 1 Pharma [Katalog](../../CONTEXT.md) breaks the
assumption: an interview at its target companies is 50%+ behavioral, and the sentences worth
drilling for the HR round (*„Meine Gehaltsvorstellung liegt bei …"*, *„Meine Kündigungsfrist
beträgt drei Monate"*) or for a STAR story (*„Ich habe damals ein Altsystem ohne Dokumentation
übernommen …"*) are first-person, sometimes past-tense, sometimes anecdotal — each one a thing
ADR-0018 explicitly excludes.

**The decision: the register becomes a per-Domain declaration — the
[Darstellungsform](../../CONTEXT.md) — with three values.** `erklärend` is ADR-0018's register,
unchanged, and remains what the founding Domains declare. `erzählend` asks for a one-to-three-
sentence STAR-story fragment in the first person and a past tense. `persönlich` asks for a
first-person present-tense statement of the learner's own position or circumstances. The card
mechanism is untouched in all three: one EN+DE sentence pair, translated EN→DE (or DE→EN),
AI-graded with the same error tags, feeding the same [Weak point](../../CONTEXT.md)s. Only the
instruction the scene slot carries into the generation prompt changes.

**One Darstellungsform per Domain, never per card.** An interview uses each topic in exactly one
way — nobody is asked to *define* a notice period or *narrate* a stored procedure — so the
declaration sits where the topic sits. This also keeps a run predictable: selecting a Domain tells
the learner what kind of German they are about to produce.

**Rejected: sending the behavioral sections to Sprechen.** They would make fine
[Topic](../../CONTEXT.md)s or [Vortragsthema](../../CONTEXT.md)ta, but the request this feature
serves is sentence-level drilling of interview German — short, repeatable, graded per item —
which is precisely what a [Discussion](../../CONTEXT.md) does not give. Sprechen practice of the
same subjects remains open as a separate, additive feature.

**Rejected: the source document's "three registers per subject".** The topic map proposed
generating every leaf in Sie-form answer, du-form colleague explanation, and follow-up-email form.
That triples the card space for one payoff register — the interview answer. The du-form has no
interview moment at all, and the email register belongs to Schreiben if it is ever wanted.

## Consequences

- **ADR-0018's register rule is narrowed, not repealed.** Its "definition, not a scene" wording now
  describes the `erklärend` Darstellungsform only. Everything else in ADR-0018 — noun replacement,
  verb preference, Niveau's changed job — applies to every Darstellungsform unchanged.
- **An `erzählend` card's story is invented, and that is accepted.** The AI writes a generic
  plausible STAR fragment (an undocumented legacy system, a failed migration); the learner drills
  the grammar and vocabulary of telling such a story, not their own biography. Personalising the
  stories to the learner's real CV was considered out of scope, not wrong — it would need a place
  to keep biography, which no current concept offers.
- **`erzählend` buys past-tense practice for free.** Perfekt/Präteritum arrive naturally in every
  story card, where the erklärend register is structurally present-tense.
- **The generation prompt gains a register branch.** The angle pool that ADR-0018 swapped in for
  targeted batches (`PACKED_DOMAIN_ANGLES`) presumes a definition; `erzählend` and `persönlich`
  Domains need their own angle treatment, or the person/tense variety the angles exist to create
  collapses.
- **Grading must not punish the register.** A first-person Perfekt sentence is correct *because*
  its Domain is `erzählend`; the grader sees the same reference pair it always saw, so no grading
  change is expected — but any future rubric that assumes present tense or generic subject would
  break story cards.
