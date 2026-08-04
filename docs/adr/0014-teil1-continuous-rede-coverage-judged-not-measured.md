# Sprechen Teil 1 is one continuous Rede, and per-point coverage is judged, not measured

The design prototype composes the [Vortrag](../../CONTEXT.md) section by section — five
composers, each with its own word target and its own clock. We rejected that shape: the exam
gives four unbroken minutes, and rehearsing five short bursts rehearses the wrong thing. The
five [Gliederungspunkt](../../CONTEXT.md)s became a live checklist *beside* one composer
instead of a wizard *around* it, and the [Rede](../../CONTEXT.md) is written or spoken in a
single take.

That decision forecloses per-point measurement, which is the part worth writing down. An
earlier draft lit a second dot per point when a Vortragsmittel from that point's
`PUNKT_MOVES` groups appeared, and split the Rede into per-point spans at those matches.
The mapping cannot support it: `situation` and `erfahrung` are mapped to the *identical* pair
`{aspekt, beispiel}`, `aspekt` serves three points and `kontrast` two, so only points 1 and 5
are identifiable by phrase group at all. Sequential attribution — assume the learner proceeds
in order, advance a pointer on each new group match — would have restored the numbers by
inventing precision we do not have, and would be confidently wrong for any learner who
circles back or opens with a contrast.

So the rail shows **one dot per point**, lit by the learner's own
[Vortragsplan](../../CONTEXT.md) keyword, which is unambiguous by construction because the
learner assigned each keyword to exactly one point — plus a single total word count. Real
coverage is the grader's judgement, delivered on the result page beside the rail's live dots
so the difference between *saying a keyword* and *covering a point* stays visible. The rail's
rows say `gesagt`, never `abgedeckt`.

## Consequences

- **`PUNKT_MOVES` stays in the data** and must not be wired back into coverage. Its only job
  is deciding which drawer groups are outlined, keyed off the furthest point whose keyword has
  been said. Anyone who finds it and concludes the checklist is unfinished should read this
  file first.
- The `helpLog` cannot attribute a help to a Gliederungspunkt, so the **Hilfe-Protokoll reports
  counts against a minute timeline** rather than per-point tallies.
- `sectionsCovered` in a [Run](../../CONTEXT.md)'s meta is always the **grader's** figure. The
  rail's dot count is live UI state and is never recorded.
- A learner who leaves Vortragsplan keywords empty gets a checklist of dashes. That is correct:
  the app has nothing personal to watch for, and inventing a fallback signal would reintroduce
  exactly the false precision this decision rejects.
