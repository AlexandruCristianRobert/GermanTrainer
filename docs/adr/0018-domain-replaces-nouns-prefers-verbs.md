# A Domain replaces the Sentence quiz's noun pool but only prefers its verbs, and Niveau stops selecting verbs at all

A [Domain](../../CONTEXT.md) (de *Fachgebiet*) targets a [Sentence quiz](../../CONTEXT.md) run at a
subject-matter field — *.NET*, *SQL Server*, *Docker* — so the AI writes about the learner's actual
work instead of setting the scene at a train station. It steers three things: the framing, the
drilled nouns, and the drilled verbs. It steers each of them **differently**, and the asymmetry is
the decision.

**The framing is a definition, not a scene.** A targeted card does not narrate a day at that job —
it answers one *explanation* prompt from the Domain's own list (*the difference between a function
and a stored procedure*, *what an index costs*, *why the order of an image's layers matters*) in the
register a practitioner uses in a technical interview: present tense, generic subject or *man*, no
anecdote. The scene-setting slot is reused rather than emptied, so the mechanism is unchanged and only
the content of `Domain.scenes` differs; a fully targeted batch also swaps the structural angle pool
for `PACKED_DOMAIN_ANGLES`, which keeps the person/tense variety that survives a definition (*wir*,
question framing, Perfekt) and drops the two that do not (polite request, overheard remark).

**Nouns are replaced.** While any Domain is selected, its curated word list *is* the noun bag and the
Themengruppen chips go inert and greyed. Intersecting Domain ∩ chips was rejected: every Docker noun
lives in the `Programming` group, so ticking `Food` would produce an empty pool and block Start on a
combination that reads perfectly sensible. Union was rejected outright — a card drilling *der
Container* and *die Zwiebel* is the exact sentence a Domain exists to prevent.

**Verbs are only preferred, and the pool goes wide open.** A Domain names verbs that must already
exist in `verbs.ts`; the bag draws those first and falls back to the *entire* 607-verb pool, with
Niveau, Typ and Rektion applying no filter at all while a Domain is on. This looks backwards next to
the noun rule, and it is deliberate: almost every domain-plausible verb in the pool (*bereitstellen*,
*ausführen*, *speichern*, *erstellen*, *verwalten*, *testen*, *installieren*) sits at **B2.1/B2.2**,
while the drill's default is A2+B1. Restricting the pool to a Domain's ~25 verbs was rejected — an
8-card run at 2 verbs/card would redraw the same handful — and filtering by level would have made
ticking a Domain silently raise the difficulty of the whole passage.

**Niveau therefore changes job rather than going inert.** `levelLabel(vLevels)` also feeds the
generation prompt's *"Target CEFR level"*, so an unrestricted pool would have passed `A1–B2` and
removed the only lever on how hard the German reads. Under a Domain the chips stop selecting verbs
and set text difficulty alone — A2+B1 plus Docker means simple German about containers, not B2 German
about containers.

## Consequences

- **Two adjacent controls follow opposite rules.** Themen chips die under a Domain; Niveau chips stay
  live with a changed meaning. Both are correct. Anyone "harmonising" them will break one of the two
  reasons the feature works.
- **A saved setup means something different depending on the Domain field.** The persisted
  `sentenceSetup` still carries `nGroups` and `vLevels` while a Domain is active; they are dormant,
  not stale, and must survive round-tripping so clearing the Domain restores the learner's pools
  exactly.
- **Domain word lists are references, never definitions.** Nouns are bare German words resolved
  against the seeded store (so plural write-back, word hints and [Weak point](../../CONTEXT.md)s all
  keep working unchanged); verbs are infinitives resolved against `verbs.ts` (so level, Typ and
  Rektion are never invented per Domain). A test asserts every listed word resolves — a typo must
  fail CI, not silently shrink a Domain at runtime.
- **New Domain vocabulary needs a Dexie version bump.** Seed additions reach existing installs only
  through the `db/index.ts` "top up + re-categorize" migration, so shipping a Domain is a data change
  *and* a schema version, never a JSON edit alone.
- **Grading, tags and tracking are untouched.** A themed run records `packedDomains` in its meta and
  is labelled as such, but a missed *der Container* is a noun weak point exactly as a missed *der
  Tisch* is. A Domain changes what the AI writes about — never how the learner is judged.
- **The Domain data file is drill-agnostic on purpose.** Only the Sentence module reads it in v1; the
  four sibling sentence drills keep their own angle pools, and extending one of them later is
  additive rather than a refactor.
- **The fallback verb pool is unrestricted by level, deliberately.** A Domain's own verbs
  are B2.1+, which is why the pool opens; but slots the Domain cannot fill draw uniformly
  from all 607 verbs, so an A2 learner who ticks Docker can be asked for arbitrary B2.2
  vocabulary inside a passage the prompt still requests at A2–B1. The narrower alternative
  — preferred bag, then a Niveau-filtered bag, then the full pool — was available and not
  taken, because a Domain that quietly reintroduced level filtering would put back the
  rule this ADR exists to remove. Revisit this before adding a Domain aimed at beginners.
- **A new Domain's seed words can move a learner's own nouns.** `topUpNounsFromSeed`
  re-groups any existing row whose seed group changed, and several Domain words are
  ordinary German (*die Verbindung*, *die Eigenschaft*, *der Filter*, *der Dienst*,
  *die Wartung*, *die Sicht*, *die Migration*). A learner who had added one by hand under
  another Themengruppe will see it silently move to `Programming` and leave that group's
  chip. That is the documented behaviour of the shared migration, not a regression — but
  it is worth checking the word list against common vocabulary each time a Domain ships.
