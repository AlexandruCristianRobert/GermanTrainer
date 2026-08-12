# Schreiben corrections join the Sprechen error archive

The Schreiben module's marked mistakes become [Archived correction](../../CONTEXT.md)s in
the **same** append-only Dexie tables the Sprechen archive uses
([ADR-0012](0012-error-archive-append-only-dexie.md)), not in a parallel Schreiben
archive. New rows carry a module discriminator (absent on old rows, defaulted to
`sprechen` on read in the repository — the exact pattern the optional `part` field
already established), and the tag set is shared unchanged: the glossary term is renamed
from *Sprechen error tag* to [Correction tag](../../CONTEXT.md), because `grammar`,
`word-order`, `vocabulary`, `spelling` and `register` classify written German at least
as well as spoken.

The learner's recurring mistakes are one collection regardless of which exam skill
produced them — "my word-order problem" does not split into a speaking half and a
writing half. Sharing the tables gives one archive UI (filterable by module and part)
and makes the existing [Correction drill](../../CONTEXT.md) replay writing mistakes with
zero new infrastructure.

## Considered options

- **Shared tables + discriminator on new rows** (chosen) — no migration (ADR-0012
  forbids mutating existing rows anyway), one repository module, one drill.
- **Separate Schreiben tables** — rejected: duplicates the repository, the archive page,
  and the drill; splits one concept into two piles; and the sets would have to stay
  structurally identical anyway for the UI to make sense.
- **Renaming the tables to something module-neutral** — rejected: a Dexie table rename is
  a schema version bump and data copy purely for aesthetics; the repository module is the
  only place allowed to touch the tables, so the misnomer is contained to one file.

## Consequences

- `db.sprechenCorrections` / `db.sprechenCorrectionEvents` become historical misnomers
  holding Schreiben rows too. All reads and writes stay confined to
  `useSprechenArchive.ts`, which owns the read-side defaulting (`module ?? 'sprechen'`,
  `part ?? 2`).
- The `SprechenErrorTag` type name in code may be renamed to match the new glossary term
  opportunistically; the glossary does not force code churn.
- Rows from a Forumsbeitrag record `modality: 'typed'` — `spelling` is therefore always
  assignable for Schreiben corrections, unlike spoken Sprechen rows.
