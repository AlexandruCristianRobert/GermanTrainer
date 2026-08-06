# Präzise senses are seeded meaning-level data, and true synonyms share one sense

The [Präzise](../../CONTEXT.md) variant of the Verb translation drill needs disambiguation
data that the verb table never had: for every English meaning that 2+ pool verbs carry
(~200 of them), *which situation selects which verb*. We decided a [Sense](../../CONTEXT.md)
is its own seeded dataset — keyed by the English meaning, not a field on the verb record —
where each sense is a short English situation cue plus the **set** of verbs that fit that
situation equally. The data is authored once (AI-assisted, human-reviewed) and committed,
per ADR-0007's offline-first rule for deterministic drills.

Rejected alternatives, in order of temptation:

- **Runtime AI cue generation** — contradicts ADR-0007: a word-level drill would need a key
  and network, and the "same" sense would be worded differently every run, so grading would
  rest on unstable prompts.
- **A cue field on each verb record** — *annehmen* is "accept / assume" and needs a
  different cue per English alternative, and an interchangeable pair (*anfangen/beginnen*)
  would have to duplicate one cue across two records and be re-joined by string equality at
  runtime. The meaning-level shape stores each of these facts once.
- **Forcing a cue for everything** — where no situation splits two verbs
  (*anfangen/beginnen* differ in register, not situation), inventing a cue like "(formal,
  written)" marks defensible answers wrong. Instead such verbs **share one sense** and every
  member is graded correct — the same rule the interchangeable
  [Prepositional collocation](../../CONTEXT.md) already established.

## Consequences

- **Merged senses are the decision, not a gap.** Anyone "completing" the data by splitting
  *anfangen/beginnen* with a register cue is undoing the trade-off, not finishing it.
- **Coverage is enforced by a guard test, not by convention.** Every English alternative
  shared by 2+ verbs must have senses whose verb sets cover every member; a verb added to
  `verbs.ts` that creates new ambiguity fails the build until its senses are authored.
- **Cues are English.** They narrow the English prompt; a German cue could leak the answer
  or its register.
- **Präzise adds no history type.** Runs record the existing `verb-translation` type with
  `meta.variant`, the same way `meta.verbDirection` already distinguishes Blatt from
  Bedeutungsfeld.
