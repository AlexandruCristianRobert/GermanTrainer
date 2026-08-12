# Forumsbeitrag essays are discarded after grading

The Schreiben module (Goethe B2 Schreiben Teil 1) is a writing trainer whose central
artifact — the learner's essay — is deliberately **not kept**. Once a
[Forumsbeitrag](../../CONTEXT.md) is graded, the text is discarded; what survives is the
[Run](../../CONTEXT.md)'s summary (score, Prädikat, per-criterion results), one
[Archived correction](../../CONTEXT.md) per marked mistake, and its
[Aufwertung](../../CONTEXT.md)s. This is the retention model
[Discussion](../../CONTEXT.md)s and [Vortrag](../../CONTEXT.md)e already use, adopted
unchanged — surprising here only because the module next door (the C1 writing tutor)
keeps every draft forever.

The reason is role separation, not storage thrift: the exam trainers treat the learner's
production as *evidence to be distilled* — corrections you can re-drill, upgrades you can
read, a score you can compare — while the C1 tutor is the keep-every-draft workbench for
learners who want to reread and compare whole texts. One module per philosophy; a learner
who wants both uses both.

## Considered options

- **Discard, keep the distillate** (chosen) — full consistency with Sprechen: same Run
  shape, same archive flow, same "the text it was counted from is discarded immediately
  afterwards" rule that already forces [Redemittel yield](../../CONTEXT.md) to be banked
  at grading time.
- **Keep the essay on the Run** — rejected: forks the exam-trainer retention model,
  grows history rows unboundedly (an essay is ~10× a Sprechen correction), and
  duplicates the C1 tutor's reason to exist.
- **Keep the last N essays** — rejected: "why did my old essay disappear" is a confusing
  contract, and nothing else in the app expires user-visible content by count.

## Consequences

- Rereading an old Forumsbeitrag is deliberately impossible. This is a feature boundary,
  not an oversight — do not "fix" it by persisting the editor text.
- An Archived correction must carry enough surrounding sentence to stay intelligible on
  its own; the grader schema has to be written with that in mind.
- Schreibmittel yield, Hilfe-Protokoll counts, and anything else derived from the essay
  must be computed and banked at grading time — there is no re-count later.
