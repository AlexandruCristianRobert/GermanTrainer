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
A verb, adjective, or noun that governs a fixed preposition and a fixed case — *warten auf + Akkusativ*, *stolz auf + Akkusativ*, *Angst vor + Dativ*. The **Fixed prepositions** drill shows the word and its English meaning and asks the learner to supply the preposition and its case. Each meaning that takes a *different* preposition is a separate collocation (*sich freuen auf* "look forward to" vs *sich freuen über* "be glad about"). But a single meaning that more than one preposition satisfies **equally** (*das Interesse an* ≈ *für*, *die Frage an/nach*) is *one* collocation that accepts each: it carries a set of acceptable *(preposition, case)* answers — every one is graded correct, and a card is shown for it only once per drill. Distinct from meaning-splitting pairs and from opposites (*sich entscheiden für* vs *gegen*), which stay separate because the gloss is the answer.
_Avoid_: prepositional verb (excludes adjectives and nouns), fixed phrase, idiom

**Da-compound** (Pronominaladverb):
A pronoun-like adverb — da(r) + preposition (*dafür*, *daran*, *darüber*) — standing in for preposition + pronoun when the referent is a thing, an abstract, or a whole clause, never a person (persons keep preposition + personal pronoun: *an ihn*). `dar-` before a vowel-initial preposition, `da-` otherwise; some prepositions form no compound (*ohne*, *seit*, *außer*, *gegenüber*, the genitive prepositions).
_Avoid_: Pronominaladverb / Präpositionaladverb (German subtitle only), prepositional adverb, da-word

**Wo-compound**:
The interrogative counterpart of a [Da-compound] — wo(r) + preposition (*worauf*, *womit*) — asking after a thing; asking after a person takes preposition + *wen*/*wem* instead.
_Avoid_: w-compound, question adverb, wo-word

**Fixed-preposition core idea**:
The single dominant sense a preposition carries across its [Prepositional collocation]s — *über* marks the topic of talking/thinking, *nach* reaching-toward/seeking, *vor* fear/avoidance, *auf* anticipation. A memory hook, not a rule: which word governs which preposition is still memorized. The organizing spine of the **Fixed prepositions cheatsheet** (de *Spickzettel*), which groups collocations by preposition and states this hook instead of enumerating them — the mnemonic counterpart to the verb Cheatsheet's grammar rules.
_Avoid_: theme, meaning, category, rule.

**Core-idea hint**:
A one-line English cue shown on a Fixed prepositions drill card *before* the learner answers, worded to evoke the governed preposition's [Fixed-preposition core idea] as it applies to that one [Prepositional collocation] (*warten auf*: "your attention is oriented toward something still ahead") — *without* naming the preposition or the case. A scaffold for recall: it points toward the answer, it does not give it. For two-way prepositions the sense also carries the case (*denken an*: "the mind reaches out and fastens on a target" vs *teilnehmen an*: "you stand inside it, taking your part"). Distinct from the [Fixed-preposition core idea], which is the *preposition-level* mnemonic shared across a preposition's collocations; the core-idea hint specialises it down to a *single* collocation. Stored per collocation as `coreIdeaHint` (≤ 90 chars, ≤ 14 words, unique across the dataset). A setup toggle (default on) shows or hides it for the whole drill. Distinct from [Word hint], which reveals vocabulary in translation drills.
_Avoid_: scene hint, description, example retelling, tooltip

**Core-idea explanation**:
A short English explanation (one to two sentences) shown *after* a **wrong** answer in the Fixed prepositions drill — on the card's reveal, and beneath each missed word on the result screen. It *explains the mapping*: it unpacks **how** the collocation's [Core-idea hint] image enacts the governed preposition's [Fixed-preposition core idea] — the mechanism, not merely a restatement of both — then names the word, preposition, and case (*zweifeln an*: "A nagging doubt 'snags at one spot and refuses to hold' — it stays fastened to the one thing you can't be sure of and won't move past it. That stuck, won't-let-go grip is what *an* marks: fixation on a point. So *zweifeln* takes *an* (Dativ)."). Where the [Core-idea hint] *precedes* the answer and hides it, the core-idea explanation *follows* a miss and names it — the teaching payoff. A merged interchangeable [Prepositional collocation] explains each acceptable answer. Seeded per collocation as `coreIdeaExplanation`; shown only on a wrong answer, independent of the hint toggle.
_Avoid_: hint (that is the pre-answer cue), correction, feedback, AI explanation.

**Preposition color**:
A fixed hue permanently assigned to each of the fifteen governed prepositions (e.g. *gegen* = red), used in the **Fixed prepositions** drill as a memory anchor binding a [Prepositional collocation] to its preposition. By default it appears only once the learner has answered — at the card's reveal and in the drill summary — never while answering, because it would leak the answer; the [Color hint] toggle deliberately overrides this, showing it from the start. Correct/wrong verdicts keep their own green/red and always read on top of it. The cheatsheet does not use preposition colors.
_Avoid_: theme color, category color, highlight

**Color hint**:
The [Preposition color] shown on the drill card *before* the learner answers, as an opt-in cue. Unlike the [Core-idea hint], which evokes the preposition without naming it, the color hint gives the preposition away outright to a learner who knows the color scheme, leaving only the case to recall — its purpose is as much to drill the color↔preposition mapping itself as to scaffold the answer. Keyed to the preposition, not the case, so it never reveals the governed case. A setup toggle (default off) turns it on for the whole drill; when off, the [Preposition color] appears only on reveal. Distinct from [Word hint] (vocabulary in translation drills) and [Core-idea hint] (a worded cue).
_Avoid_: color coaching, color scheme trainer

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

**Verb level**:
A label naming one frequency-ordered batch of the verb pool (`A1`, `A2`, `B1`, `B2.1`, `B2.2`). Verbs are admitted by corpus frequency — each level is "the next most frequent verbs not yet in the pool", named for the CEFR stage it roughly serves, not an official CEFR classification; `B2.1` and `B2.2` are the first and second batches of the advanced pool.
_Avoid_: CEFR level (the learner-assessment scale is separate), difficulty, tier

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
A verb's citation set — infinitive, third-person-singular Präteritum, Partizip II, and the perfect-tense auxiliary (*haben*/*sein*) — learned and recalled as one unit. The **Principal parts** drill tests the whole set for a verb at once and counts a card correct only when every part is right. Distinct from the conjugation drill, which fills all six person-forms of a chosen tense.
_Avoid_: principal forms, base forms, stem forms; conjugation (the six-form drill)

**Verb case government** (Rektion):
The grammatical case a verb requires of its object — `accusative` (the default), `dative` (*helfen*, *danken*), `dative + accusative` (ditransitive, *geben*), `genitive` (rare, *gedenken*), a reflexive pronoun (*sich freuen*), or none (intransitive). The **Verb case government** drill shows a verb and the learner identifies which case it governs. Verbs whose governed case varies by meaning are excluded from the drill.
_Avoid_: valency, government, case selection

### Vocabulary forms

**Dictionary form**:
A word as it appears in a dictionary entry — for a noun, its article plus the nominative singular (`der Tisch`); for a preposition, the bare word (`auf`). What a word hint reveals.
_Avoid_: base form, lemma, citation form

**Inflected form**:
A word as it actually appears in a sentence after declension/conjugation (`den Tisch`). The learner must produce this themselves; hints never reveal it.
_Avoid_: surface form, conjugated form

### Direction words

**Perspective adverb**:
A hin/her word — bare *hin*/*her* or a preposition compound (*hinein/herein*, *hinauf/herauf*, *hinaus/heraus*, *hinunter/herunter*, *hinüber/herüber*, *herum*, *hervor*, *hindurch*) — encoding motion relative to the speaker's position: *hin* = away from the speaker, *her* = toward the speaker. The subject matter of the **Direction Words** module. Not to be confused with [Direction], which is the EN→DE/DE→EN axis of a translation drill.
_Avoid_: directional adverb, direction word (collides with [Direction]), hin/her word, movement adverb

**Adverb pair**:
The hin-/her- twins built on one preposition (*hinauf/herauf*), differing only in speaker perspective. The unit the Direction Words drills filter by and track [Weak point]s against — the module's analogue of a governed preposition.
_Avoid_: compound pair, twin forms

**R-form**:
The colloquial contraction of a [Perspective adverb] compound — *rein, raus, rauf, runter, rüber* — which collapses the hin/her distinction entirely. Spoken-register standard, written-register marked; never itself wrong, unlike misformed compounds (\**hinrein*).
_Avoid_: short form, slang form, contraction (too generic)

**Lexicalized prefix verb**:
A verb whose hin-/her- separable prefix no longer means direction — *herstellen* (produce), *hinweisen* (point out), *hinrichten* (execute), *herausfinden* (find out). Vocabulary, not perspective: the perspective rule does not apply and cannot be used to guess the meaning.
_Avoid_: idiom verb, faded-direction verb, prefix verb (unqualified)

**Direction error tag**:
A classification the grader assigns to a wrong Direction Words sentence answer. `direction` (any wrong [Perspective adverb]: wrong hin/her side, wrong compound, or a misformed one like \**hinrein*) joins the reused `conjugation`, `case`, `word-order`, `noun`, and `typo` tags. A single answer may carry several; `direction` errors feed [Weak point]s per [Adverb pair].
_Avoid_: perspective error, compound error (the da-compounds tag)

**Scene diagram**:
A schematic picture shown with a Direction Words drill card that fixes where the speaker stands and which way the motion goes — the information the perspective rule needs and the sentence alone may not give. Drawn from a small set of reusable scene archetypes (stairs, doorway, window, street, hill, room); its one-line text description doubles as the accessible fallback.
_Avoid_: illustration, image, picture hint

### Sprechen

**Discussion** (de Diskussion):
A Teil 2 speaking-practice conversation between the learner and the AI partner, arguing a [Topic] turn by turn. Its [Modality] decides whether the learner's turns are typed or spoken; everything else — the [Topic] pool, [Move]s, [Sprechen error tag]s, the rubric, the [Prädikat] — is the same either way. Resumable while in progress; once graded it is recorded as a [Run] and the conversation is discarded — what outlives it is the [Run]'s summary and, for each marked mistake, an [Archived correction] carrying the learner's own sentence. The partner's turns are kept nowhere.
_Avoid_: session, chat, dialogue, Diskussionsrunde

**Modality**:
Whether a [Discussion]'s learner turns are `typed` or `spoken`. A [Discussion] has exactly one Modality, chosen at setup and fixed once it starts. It changes only the input surface — a text field or a microphone — and what can be measured from it: a spoken [Discussion] yields real speaking tempo, reaction time and pause counts, so its rubric judges Flüssigkeit on evidence instead of adapting around its absence. Everything else is shared: the same [Topic] pool, the same preparation, the same [Move]s and hints, the same rubric, and the *same* kind of [Run] — so a typed and a spoken score are directly comparable, and "how much worse am I when I have to speak?" is an answerable question.
_Avoid_: mode (collides with [Grading mode]), input method, voice mode, separate test

**Topic** (de Thema):
A controversial statement or question a [Discussion] argues — drawn from the app's seeded pool or AI-generated into the learner's custom pool.
_Avoid_: theme (a noun vocabulary category), subject, statement

**Sprechen error tag**:
A classification the post-Discussion analysis assigns to each marked mistake in a learner's turns, naming *what* went wrong. One of: `grammar` (case, conjugation, endings, agreement), `word-order` (verb-second, verb-final, separable-prefix placement), `vocabulary` (wrong word, false friend, broken collocation), `spelling`, `register` (du/Sie slips, tone). Unlike [Error tag] and [Verb error tag], exactly one kind per marked mistake — each annotation is a single span with a single explanation. `spelling` is never assigned in a `spoken` [Modality]: the spelling there is the speech recognizer's, not the learner's.
_Avoid_: mistake type, error category

**Move**:
A named discussion tactic — agree, disagree, partially agree, ask back, give an example, summarize — under which the Sprechen cheatsheet and the in-Discussion hint panel group their stock phrases (Redemittel). A seventh, stating an opinion, appears in the cheatsheet only.
_Avoid_: hint category, strategy, tactic chip

**Redemittel yield** (de Redemittel-Ausbeute):
How many distinct Redemittel the learner's turns actually contained, grouped by [Move] — counted locally by text matching, never by AI, and never affecting the score. It measures *use*, not command: a phrase counts whether the learner recalled it, inserted it from the hint panel, or read it aloud from the panel mid-turn. The basis for suggesting a [Move] the learner has not reached for.
_Avoid_: Redemittel score, phrase coverage, mastery

**KI-Tipp**:
An on-demand AI-generated suggestion during the learner's turn in a [Discussion]: a strategic direction for what to argue next, never ready-made text. Uses are counted and shown with the result, but never affect the score.
_Avoid_: AI hint, tip (unqualified)

**Prädikat**:
The Goethe grade band a graded [Discussion]'s score maps to: *sehr gut* (90+), *gut* (80+), *befriedigend* (70+), *ausreichend* (60+), *nicht bestanden* (below 60).
_Avoid_: grade, mark, rating

**Archived correction** (de Korrektur):
One marked mistake from a graded [Discussion], kept after the conversation itself is discarded: the learner's wrong wording, the suggested fix, its [Sprechen error tag], and enough of the surrounding sentence to make the fix intelligible. The only part of a [Discussion] that outlives it. Corrections from a `spoken` [Modality] are archived on the same terms as typed ones and are not distinguished — a mistake the recognizer invented is archived as readily as one the learner made, which is a known and accepted cost.
_Avoid_: mistake (that is the in-Discussion marking), error record, flashcard

**Error archive** (de Fehlerarchiv):
The learner's whole standing collection of [Archived correction]s, grouped by [Sprechen error tag] so that repetition becomes visible. Cold storage: never read while a [Discussion] runs, only when the learner opens it or a [Correction drill].
_Avoid_: mistake history, error log, weak points (that term belongs to the drill modules)

**Correction drill** (de Korrekturdrill):
A practice run over the [Error archive] that replays the learner's own [Archived correction]s and asks them to rewrite just the marked wording. Unlike a [Remedial drill], its items are the learner's own recorded sentences rather than generated ones.
_Avoid_: remedial drill (that is the preposition/verb one), review, retry

### Identity & history

**User**:
A learner identified solely by a self-chosen display name — no password, no account, no verification. Anyone who types the same name shares and adds to that name's history; identity is honor-system. The name is asked for once and remembered on the device; if it is ever missing, the app asks again.
_Avoid_: account, profile, login, player

**Username key**:
The normalized form of a User's name — trimmed, lower-cased, inner whitespace collapsed — used to group all of that name's runs. Two names differing only in case or spacing are the same User.
_Avoid_: slug, id, handle

**Run**:
One completed quiz, recorded in history with its score, timing, settings, and (for some quiz types) per-item detail. The unit the History page lists and the stats aggregate over. Recorded only when online — a quiz finished offline is silently unrecorded practice. A retry round of only the wrong items is practice, not a Run, and is never recorded.
_Avoid_: session, attempt, entry
