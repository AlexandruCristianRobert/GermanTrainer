# German Trainer

A browser app for drilling German grammar and vocabulary (nouns, adjectives, verbs, declension, prepositions) with AI-assisted exercises. This glossary pins the language used across the app so features stay consistent.

## Language

### Quiz framing

**Direction**:
Which way the learner translates in a translation drill: `EN→DE` (shown the English, types the German) or `DE→EN` (shown the German, types the English).
_Avoid_: mode, way, side

**Grading mode**:
How a typed answer is judged: `AI` (meaning-aware verdict plus a coaching tip) or `Exact` (local match against the reference, forgiving case/punctuation/whitespace).
_Avoid_: checking, scoring method

**Word hint**:
A highlighted word in the *source* sentence of a translation prompt that reveals its target-language vocabulary on demand (hover, tap, or keyboard focus). A scaffold, not the answer — it reveals the dictionary form, leaving any inflection to the learner. EN→DE only. Scope depends on the drill: the preposition sentence quiz hints the preposition and the assigned theme nouns only (German built from stored data); the [Verb sentence quiz] hints every drilled verb and *every* noun (assigned and incidental), and the German for incidental words is supplied by the AI, not stored data.
_Avoid_: tooltip, popover, reveal, clue

### Prepositions

**Two-way preposition** (Wechselpräposition):
A preposition that governs the accusative for motion/direction and the dative for location.
_Avoid_: dual preposition, mixed preposition

**Prepositional collocation** (feste Präposition):
A verb, adjective, or noun that governs a fixed preposition and a fixed case — *warten auf + Akkusativ*, *stolz auf + Akkusativ*, *Angst vor + Dativ*. The **Fixed prepositions** drill shows the word and its English meaning and asks the learner to supply the preposition and its case; practice-only, records no [Run]. Each meaning that takes a different preposition is a separate collocation (*sich freuen auf* "look forward to" vs *sich freuen über* "be glad about").
_Avoid_: prepositional verb (excludes adjectives and nouns), fixed phrase, idiom

**Fixed-preposition core idea**:
The single dominant sense a preposition carries across its [Prepositional collocation]s — *über* marks the topic of talking/thinking, *nach* reaching-toward/seeking, *vor* fear/avoidance, *auf* anticipation. A memory hook, not a rule: which word governs which preposition is still memorized. The organizing spine of the **Fixed prepositions cheatsheet** (de *Spickzettel*), which groups collocations by preposition and states this hook instead of enumerating them — the mnemonic counterpart to the verb Cheatsheet's grammar rules.
_Avoid_: theme, meaning, category, rule.

**Core-idea hint**:
A one-line English cue shown on a Fixed prepositions drill card *before* the learner answers, worded to evoke the governed preposition's [Fixed-preposition core idea] as it applies to that one [Prepositional collocation] (*warten auf*: "your attention is oriented toward something still ahead") — *without* naming the preposition or the case. A scaffold for recall: it points toward the answer, it does not give it. For two-way prepositions the sense also carries the case (*denken an*: "the mind reaches out and fastens on a target" vs *teilnehmen an*: "you stand inside it, taking your part"). Distinct from the [Fixed-preposition core idea], which is the *preposition-level* mnemonic shared across a preposition's collocations; the core-idea hint specialises it down to a *single* collocation. Stored per collocation as `coreIdeaHint` (≤ 90 chars, ≤ 14 words, unique across the dataset). A setup toggle (default on) shows or hides it for the whole drill. Distinct from [Word hint], which reveals vocabulary in translation drills.
_Avoid_: scene hint, description, example retelling, tooltip

**Core-idea explanation**:
A one-sentence English explanation shown *after* a **wrong** answer in the Fixed prepositions drill — on the card's reveal, and beneath each missed word on the result screen. It leads with the governed preposition's [Fixed-preposition core idea], recasts that collocation's [Core-idea hint] image as an instance of it, then names the word, preposition, and case (*glauben*: "*an* carries contact and mental fixation; 'reaches out and fastens' is that grip — so *glauben* takes *an* (Akkusativ)"). Where the [Core-idea hint] *precedes* the answer and hides it, the core-idea explanation *follows* a miss and names it — the teaching payoff. Seeded per collocation as `coreIdeaExplanation`; shown only on a wrong answer, independent of the hint toggle.
_Avoid_: hint (that is the pre-answer cue), correction, feedback, AI explanation.

**Preposition color**:
A fixed hue permanently assigned to each of the fifteen governed prepositions (e.g. *gegen* = red), used in the **Fixed prepositions** drill as a memory anchor binding a [Prepositional collocation] to its preposition. It appears only once the learner has answered — at the card's reveal and in the drill summary — never while answering (it would leak the answer). Correct/wrong verdicts keep their own green/red and always read on top of it. The cheatsheet does not use preposition colors.
_Avoid_: theme color, category color, highlight

**Assigned theme noun**:
A noun the drill deliberately selects from the learner's chosen noun theme and builds a sentence around. These are the vocabulary the drill tests, and the only nouns eligible for a word hint.
_Avoid_: target noun, chosen noun

**Incidental noun**:
A noun the AI introduces to make a generated sentence natural (e.g. the subject "the cat"). Not selected by the drill and not tested. Never hinted in the preposition quiz; hinted in the [Verb sentence quiz], where every noun is highlighted and its German is AI-supplied.
_Avoid_: extra noun, filler noun

**Error tag**:
A classification the grader assigns to a wrong sentence-translation answer, naming *what* went wrong. One of: `preposition` (wrong or missing preposition word), `case` (the right preposition but the wrong governed case — a mis-inflected article/ending), `noun` (a wrong assigned theme noun — wrong word, gender, or form), `typo` (a slip elsewhere in the sentence, not on the preposition, case, or assigned noun). A single answer may carry several. Assigned only for `EN→DE` sentence translation.
_Avoid_: error type, mistake category, error reason

**Weak point**:
A preposition, assigned theme noun, or [Drilled verb] the learner fails disproportionately often, surfaced from recorded sentence-translation attempts. The basis for suggesting targeted remedial practice.
_Avoid_: weakness, problem area, trouble word

**Remedial drill**:
A generated practice session aimed at the learner's weak points. Unlike the regular sentence-translation drill (random prepositions), it draws from the learner's weakest prepositions and nouns and blends several question formats — case fill-ins, noun cards, sentence translations — in proportion to the learner's recent error tags. Its own answers feed back into weak-point tracking.
_Avoid_: practice mode, review quiz, custom quiz

### Verbs

**Verb sentence quiz**:
An AI-generated EN→DE translation drill for verbs, the verb counterpart of the preposition sentence quiz. The learner picks a verb pool (level + type + governed case) and a noun theme; the app samples verbs, the AI writes an English+German sentence pair per item using 1–2 [Drilled verb]s and 1–2 [Assigned theme noun]s, the learner types the German, and the AI grades it. Distinct from the older word-level **Verb translation** (infinitive ↔ English) and **Verb conjugation** drills, which it does not replace.
_Avoid_: verb translation (means the word-level drill), sentence builder

**Drilled verb**:
A verb the verb sentence quiz deliberately samples from the chosen level/type/case pool and builds a sentence around — the verb analogue of an [Assigned theme noun]. The vocabulary the quiz tests; the basis (with theme nouns) for verb [Weak point]s. An [Incidental noun]'s verb counterpart (a verb the AI adds only for naturalness) is not separately named — every finite verb is highlighted, but only drilled verbs are tracked.
_Avoid_: target verb, chosen verb

**Verb error tag**:
A classification the grader assigns to a wrong verb-sentence answer, the verb counterpart of [Error tag]. One of: `conjugation` (the right verb but a wrong form — tense, person, auxiliary, or Partizip), `case` (the wrong case for an object the verb governs), `word-order` (verb-second, verb-final, or split separable-prefix placement gone wrong), `noun` (a wrong assigned theme noun — word, gender, or form), `typo` (a slip elsewhere). A single answer may carry several. EN→DE + AI grading only.
_Avoid_: verb mistake type, conjugation error

**Verb remedial drill**:
A [Verb sentence quiz] run whose verb and noun pools are drawn from the learner's [Weak point]s (weakest drilled verbs + theme nouns from recent history) instead of random sampling — the verb counterpart of the preposition [Remedial drill], but a *single* format (weak-weighted sentence translation) rather than a blend of formats.
_Avoid_: review mode, weak-verb quiz

**Principal parts** (Stammformen):
A verb's citation set — infinitive, third-person-singular Präteritum, Partizip II, and the perfect-tense auxiliary (*haben*/*sein*) — learned and recalled as one unit. The **Principal parts** drill tests the whole set for a verb at once and counts a card correct only when every part is right; it is practice-only and records no [Run]. Distinct from the conjugation drill, which fills all six person-forms of a chosen tense.
_Avoid_: principal forms, base forms, stem forms; conjugation (the six-form drill)

**Verb case government** (Rektion):
The grammatical case a verb requires of its object — `accusative` (the default), `dative` (*helfen*, *danken*), `dative + accusative` (ditransitive, *geben*), `genitive` (rare, *gedenken*), a reflexive pronoun (*sich freuen*), or none (intransitive). The **Verb case government** drill shows a verb and the learner identifies which case it governs; practice-only, records no [Run]. Verbs whose governed case varies by meaning are excluded from the drill.
_Avoid_: valency, government, case selection

### Vocabulary forms

**Dictionary form**:
A word as it appears in a dictionary entry — for a noun, its article plus the nominative singular (`der Tisch`); for a preposition, the bare word (`auf`). What a word hint reveals.
_Avoid_: base form, lemma, citation form

**Inflected form**:
A word as it actually appears in a sentence after declension/conjugation (`den Tisch`). The learner must produce this themselves; hints never reveal it.
_Avoid_: surface form, conjugated form

### Identity & history

**User**:
A learner identified solely by a self-chosen display name — no password, no account, no verification. Anyone who types the same name shares and adds to that name's history; identity is honor-system. The name is asked for once and remembered on the device; if it is ever missing, the app asks again.
_Avoid_: account, profile, login, player

**Username key**:
The normalized form of a User's name — trimmed, lower-cased, inner whitespace collapsed — used to group all of that name's runs. Two names differing only in case or spacing are the same User.
_Avoid_: slug, id, handle

**Run**:
One completed quiz, recorded in history with its score, timing, settings, and (for some quiz types) per-item detail. The unit the History page lists and the stats aggregate over. A retry round of only the wrong items is practice, not a Run, and is never recorded.
_Avoid_: session, attempt, entry
