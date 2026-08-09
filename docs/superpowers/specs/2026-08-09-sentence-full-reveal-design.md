# Sentence module: full verb reveal, noun plurals, Enter to submit

Three changes to the Sentence module's packed-card runner (`src/modules/sentence/`),
all EN→DE only — DE→EN shows the plain German source with no spans at all.

## 1. Every verb gets a span

Today the packed card highlights every *drilled* item plus every AI-supplied
[Incidental noun]. Incidental **verbs** — the AI's own subjects' verbs,
auxiliaries, modals — are not highlighted, so a learner staring at "We had to
wait" gets *warten* revealed but not *müssen*.

The generation contract's `extraNouns` becomes one array carrying both kinds,
mirroring the Verb sentence quiz's proven `extraWords`:

```ts
export interface PackedExtraWord {
  en: string                  // exact English surface, a substring of card.english
  de: string                  // German dictionary form
  kind: 'verb' | 'noun'
  pl?: string                 // nouns only — bare nominative plural, '' = no plural
}
```

- `kind:'verb'` → `de` is the German **infinitive** (`müssen`, `regnen`, `sein`).
- `kind:'noun'` → `de` is article + nominative singular (`die Katze`), `pl` the
  bare plural (`Katzen`).

The system prompt's tail demands *every other noun **and finite verb*** in the
English translation — subjects, objects, auxiliaries, modals — the wording
`VERB_GEN_SYSTEM_TAIL` already uses successfully.

**Rendering.** `buildPackedSegments` emits verb extras with `cat:'verb'` and
`extra:true`. No CSS change: `.sn-i[data-cat="verb"]` supplies the sage
underline and `.sn-i.extra` thins it, so drilled verbs stay full-weight and
incidental verbs read as subtler — the treatment incidental nouns already get.
The existing `claim()` overlap rule stops an extra from stealing a drilled
span's range; a verb extra whose `de` equals a drilled verb's infinitive is
dropped, as noun extras already are.

Nothing persists a `GeneratedPackedCard` — the session stash holds *specs*
only — so reshaping it carries no back-compat burden.

## 2. Noun plurals

The hint for a noun becomes `der Tisch – die Tische (der Tische)`: nominative
singular, nominative plural, genitive plural. A noun with no plural (*die
Milch*) shows the singular alone.

Plurals are in neither the 2267-entry seed nor the `Noun` record, so the AI
supplies them and the store caches them.

**Contract.** `PackedSpan` gains an optional `pl` — no third array, spans are
already keyed per item:

```ts
export interface PackedSpan { key: string; en: string; pl?: string }
```

The AI returns the **bare** plural (`Tische`); we prefix the articles
ourselves, so the genitive plural is derived locally (`der` + plural, always)
and cannot be hallucinated. `pl:''` means the noun has no plural.

**Cache.** `Noun.plural?: string` and `NounRef.plural?: string`, passed through
`nounToRef`. **No Dexie version bump** — the field is unindexed, and Dexie
versions only indexes. After each generated card the runner writes back any
drilled noun plural the store lacks, keyed on the `&german` unique index,
fire-and-forget with errors swallowed: a failed cache write must never break a
card.

**Resolution order:** stored plural → this card's AI `pl` → none. Once a noun
has been seen it renders identically forever and the AI's answer for it is
ignored — the ADR-0003 rule (canonical German is ours, only what we don't hold
comes from the AI) applied to a field the store can grow into.

Incidental nouns carry `pl` on their extra entry and are never cached; they are
not in the store.

`packedHint(it, plural?)` stays pure — only the resolved string reaches it.

## 3. Enter submits

The composer is a textarea because a packed card can run 1–4 sentences, so
Enter has been a newline and `Ctrl+Enter` submitted. It flips to the chat
convention:

| key | effect |
|---|---|
| `Enter` | submit (and, on a graded card, advance) |
| `Shift+Enter` | new line |
| `Ctrl`/`Cmd`+`Enter` | submit — still works |

`isComposing` is guarded so an IME candidate-commit does not submit. The footer
hint becomes `Enter reicht ein · Umschalt+Enter = neue Zeile`. Graded-phase
Enter already advances via the window-level `onKey`; that is untouched.

## Errors and degradation

Every addition is best-effort, in the style ADR-0001/0003 established. An extra
that does not anchor in the English simply does not render; a missing `pl`
renders the noun alone; a failed cache write is silent. `validatePackedCard`
gains **no** new rejection reason — a card is never discarded over hint data.

## Tests

- `tests/composables/usePackedSentenceQuiz.test.ts` — the validator normalises
  `extras` of both kinds and `span.pl`, drops empty and drilled-duplicate
  entries; segments emit sage `extra` verb spans without stealing drilled
  ranges; hint formatting with and without a plural; stored-beats-AI precedence.
- `tests/modules/sentence/SentenceRunner.test.ts` — Enter submits, Shift+Enter
  does not, and the plural write-back fires once for an uncached noun.

## Out of scope

The [Verb sentence quiz] (already highlights every verb; its nouns do not gain
plurals) · the preposition, da-compound and Direction-Words sentence drills ·
DE→EN, which has no hints · the graded item list and the result screen, which
keep the compact `der Tisch`. CONTEXT.md's **Word hint** entry is updated: it
enumerates what the Sentence quiz reveals, and that enumeration changes.
