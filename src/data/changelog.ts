// Version format: X.YY.ZZ
//   X  — major redesign (rarely changes)
//   YY — a new module added
//   ZZ — regular improvements / fixes
//
// Bump rule: prepend the new entry to CHANGELOG, set APP_VERSION to its version.

export const APP_VERSION = '1.11.09'

export type ChangelogKind = 'major' | 'module' | 'polish' | 'fix'

export interface ChangelogEntry {
  version: string
  date: string         // YYYY-MM-DD
  kind: ChangelogKind
  title: string
  notes: string[]      // supports inline HTML like <code> + <em>
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.11.09', date: '2026-06-02', kind: 'module',
    title: 'Local Claude AI provider (dev only)',
    notes: [
      '<strong>Run the AI features through your Claude Code login — no API key.</strong> Settings → API now has an <em>AI provider</em> choice: <em>Gemini (API key)</em> or <em>Local Claude (dev)</em>. Pick Local Claude and every AI feature (sentence quiz, adjective sentences, declension-AI, Konjunktiv, Passiv, writing grader, level assessment, simulator) routes through a small local endpoint that runs the <code>claude</code> CLI on your machine — no key pasted anywhere.',
      '<strong>Dev-only by nature.</strong> The local endpoint only exists while you run the app with <code>npm run dev</code> (it’s a Vite dev-server middleware). The deployed site is a static bundle with no server, so it stays on Gemini — there the Local Claude option simply shows as <em>not reachable</em>. Selection is manual; nothing auto-switches.',
      '<strong>Under the hood.</strong> The browser talks only to <code>localhost</code>; the dev middleware runs <code>claude -p --output-format json</code> with your existing subscription (the API key is stripped from its environment to force subscription auth), and the prompt is piped via stdin so nothing untrusted reaches the command line.'
    ]
  },
  {
    version: '1.11.08', date: '2026-06-01', kind: 'module',
    title: 'Prepositions: AI sentence-translation quiz',
    notes: [
      '<strong>New drill — Satzübersetzung (AI).</strong> A fifth preposition exercise: pick the case(s) to drill and a <em>noun theme</em> (the same groups the noun quizzes use), choose how many sentences (<strong>10 / 15 / 20 / 25 / custom</strong>) and whether each sentence is built from <strong>1, 2, or a mix</strong> of nouns. The app picks that many prepositions at random (the same shuffler as everywhere else, repeating when you ask for more than exist), hands each one or two nouns from your theme, and Gemini writes an English + German sentence pair for it.',
      '<strong>You translate, it checks instantly.</strong> You work through the sentences one at a time: read the English, type the German, submit. Your answer is checked on the spot against the German reference generated up front — an exact match that forgives capitalization, punctuation and extra spaces — with instant ✓/✗ and the reference shown before you advance. No second AI round-trip at grading time.',
      '<strong>Retry-wrong loop + history.</strong> Finishing with misses pops the same focused retry modal as the other quizzes (<em>Enter</em> re-runs just the wrong ones, <em>Esc</em> reviews); retry rounds are practice only and are not written to history. Completed runs are logged under <em>Präposition · Satz (KI)</em>. Requires a Gemini API key in Settings.'
    ]
  },
  {
    version: '1.11.07', date: '2026-06-01', kind: 'polish',
    title: 'Verb translation hints are now in English',
    notes: [
      '<strong>Double-click hints, now in English.</strong> In the verb <em>Übersetzung</em> test, double-clicking a verb still swaps it for a hint — but the hint now reads in English instead of German. Double-click again to flip back to the verb. All <strong>378</strong> verbs have one.',
      '<strong>A clue, not the answer.</strong> Each hint reads like a crossword clue: it evokes the meaning through synonyms and context but never contains the verb’s own English translation, so it nudges your memory without handing you the word.'
    ]
  },
  {
    version: '1.11.06', date: '2026-05-29', kind: 'polish',
    title: 'Prepositions: full standard set · 400 two-way drills · retry modal everywhere · one-per-view case quiz',
    notes: [
      '<strong>Complete preposition set.</strong> Grew the list from 37 to <strong>69</strong> — added the full standard German dative tail (<em>entgegen, gemäß, samt, nebst, zuwider</em>) and the long genitive tail (<em>oberhalb, unterhalb, diesseits, jenseits, anlässlich, anstelle, zugunsten, anhand, angesichts, bezüglich, hinsichtlich, infolge, mittels, kraft, zwecks, ungeachtet, abseits, längs, unweit, seitens, mangels, einschließlich, inmitten, zeit…</em>), each with example sentences. (The 9 two-way <em>Wechselpräpositionen</em> were already the complete set.)',
      '<strong>Two-way decision drill: 108 → 400 examples.</strong> One exercise for every Switzerland noun (Matterhorn, Fondue, Alphorn, the cantons…) plus a balanced spread of everyday motion-vs-location sentences across all nine two-way prepositions. Globally de-duplicated and gender-checked.',
      '<strong>Retry your wrong answers — now in prepositions too.</strong> Finishing any preposition quiz (case, article-fill, or two-way) with misses pops a focused modal: <em>Enter</em> re-runs a round of just the ones you got wrong, <em>Esc</em> dismisses to review — repeating until none are left. Retry rounds are practice only and are not written to history. Same modal as the noun quizzes (now shared).',
      '<strong>"Which case?" quiz is one preposition per view.</strong> Instead of a long sheet of every preposition at once, you now get one card at a time with <code>1</code>–<code>4</code> keys and instant ✓/✗ feedback — matching the noun-quiz rhythm.'
    ]
  },
  {
    version: '1.11.05', date: '2026-05-29', kind: 'polish',
    title: 'Noun result: instant, keyboard-driven retry modal',
    notes: [
      'When a noun quiz finishes <em>with</em> wrong answers, a focused modal now pops up the moment the result page loads. Press <strong>Enter</strong> to launch a fresh round on just the missed nouns, or <strong>Esc</strong> to dismiss it and review the full list. The modal grabs keyboard focus on open, so the whole retry loop is playable without touching the mouse.',
      'An all-correct round never triggers the modal (you still get the <em>Alles richtig! 🎉</em> banner), and the inline <em>Retry N wrong</em> button stays available after you dismiss it.'
    ]
  },
  {
    version: '1.11.04', date: '2026-05-29', kind: 'polish',
    title: 'Noun retry-wrong loop · Fantasy & Switzerland categories · bigger, cleaner seed',
    notes: [
      '<strong>Retry your wrong answers.</strong> After finishing a noun quiz (gender <em>or</em> translation), the result page now offers <em>Retry N wrong</em> — it re-runs only the nouns you missed, reshuffled, and keeps re-offering after each round until none are left, then shows <em>Alles richtig! 🎉</em>. Retry rounds are practice only and are <strong>not</strong> written to your history, so they never skew your stats.',
      '<strong>Two new categories.</strong> <em>Fantasy</em> (178 nouns — <em>der Drache, die Hexe, der Zauberer, das Schwert, der Ritter, die Burg, das Einhorn</em>…) and <em>Switzerland</em> (159 nouns — cantons, peaks &amp; lakes, <em>das Fondue, die Rösti, das Alphorn, der Nationalrat</em>…). Both appear in the noun-quiz setup automatically.',
      '<strong>Bigger, cleaner seed.</strong> Added ~18 new nouns to every existing category (≈360 total) so even the thinnest groups are well-stocked, and stripped <strong>263 duplicate</strong> entries that had crept into the seed. The noun set is now <strong>2,104</strong> unique words, each with a verified <code>der/die/das</code> gender.',
      '<strong>Under the hood.</strong> New nouns reach existing installs via a schema <code>version(7)</code> top-up migration (any nouns you added yourself are left untouched), guarded by a test that fails on any duplicate or mis-categorised entry.'
    ]
  },
  {
    version: '1.11.03', date: '2026-05-25', kind: 'polish',
    title: 'History overhaul · AI level assessment · per-module stats',
    notes: [
      '<strong>Layout.</strong> The <em>Fortschritt</em> score-over-time line was cramped in a 3-column row — it now gets its own full-width hero panel above the editorial chart grid. Same for the <em>Verteilung</em> by-quiz-type panel. The redundant <em>"Aktivität · Last 30 days"</em> heatmap was removed (the full <em>Aktivität</em> calendar below covers the same ground), and the <em>"Rhythmus"</em> day-of-week × hour heatmap was removed entirely.',
      '<strong>AI Level Assessment.</strong> New panel between the top charts and the editorial grid. Click <em>Assess my level</em> and Gemini reviews your full history — runs per type, accuracy per CEFR level, per-module performance — and returns a CEFR estimate (A1–C2) with confidence, a German one-line summary, 3–5 strengths, 3–5 weaknesses, 3–5 next steps, and a per-module score breakdown. Cached in <code>localStorage</code> with a history signature so re-opening the page doesn\'t re-spend the API call; <em>Refresh</em> button when the cache is stale. Requires ≥3 finished quizzes.',
      '<strong>Per-module stats.</strong> Four new panels below the editorial grid surface metrics that were hidden in raw <code>meta</code> fields: <em>Konjunktiv I</em> (accuracy by difficulty + per-topic bars), <em>Passiv</em> (per-transformation-type bars built from <code>passivPerTypeCorrect</code> — finally shows which of the six transformations is your weak spot), <em>Writing</em> (drafts graded, avg/best score, band distribution chips, per-task-type avg score, score-over-time when ≥2 graded drafts), <em>Simulator C1</em> (attempts, pass rate, avg combined, T1-vs-T2 comparison, last-5-attempts table).',
      '<strong>Score thresholds.</strong> Accuracy charts colour at sage ≥80% · ochre 50–79% · clay below. Writing / simulator score charts use the passing-mark thresholds instead: sage ≥60 · ochre 40–59 · clay below.'
    ]
  },
  {
    version: '1.11.02', date: '2026-05-25', kind: 'polish',
    title: 'AI randomizer extended to the last missed generator',
    notes: [
      'Audited every Gemini call in the codebase. Four sentence generators were already randomized in <code>1.11.01</code>; one was missed: the <em>"Upgrade paragraph"</em> action in the Writing editor / Simulator C1 review.',
      'That call now picks 3 random rhetorical strategies per click from a pool of twelve (Nominalisierung · Hypotaxe · Funktionsverbgefüge · Passiv · Partizipialphrasen · gehobene Synonyme · fachregisterspezifische Lexik · Genitivattribute · …) plus a unique variation seed, and runs at <code>temperature: 0.75</code> / <code>topP: 0.95</code> (was <code>0.2</code> / no seed).',
      'Effect: clicking <em>Upgrade</em> twice on the same paragraph now produces two genuinely different C1 rewrites instead of nearly identical ones — useful when the first variant feels stylistically off.'
    ]
  },
  {
    version: '1.11.01', date: '2026-05-25', kind: 'polish',
    title: 'AI randomizer · sticky header · smaller noun min · seed-data growth',
    notes: [
      'AI sentence generators (declension article-fill, Konjunktiv I, Passiv, adjective sentences) now seed every batch with a random scenario / subject / domain pool and a unique variation token. Temperature bumped to <code>0.85–0.9</code> with <code>topP=0.95</code>, so two consecutive runs at the same difficulty produce visibly different sentences instead of the same templated set.',
      'Sticky header now actually sticks on mobile: <code>html, body { overflow-x: hidden }</code> was creating a scroll containing block that trapped <code>position: sticky</code>. Switched to <code>overflow-x: clip</code>, which keeps overflowing children clipped without breaking the sticky nav.',
      'Noun runner minimum prompt size dropped from <code>48</code>px to <code>24</code>px (default also moved to 24, Compact preset retuned). Long compound nouns like <em>Sehenswürdigkeiten</em> now fit on a single line on a 360 px phone instead of breaking onto two.',
      'Seed-data expansion: prepositions <strong>96 → 400</strong> themed example sentences across office / sport / eating / dieting / vacations / work / corporate. Declension article-fill <strong>80 → 500</strong> across vacation / work / food / sport / eating / fantasy / office / climbing / Switzerland themes.'
    ]
  },
  {
    version: '1.11.00', date: '2026-05-25', kind: 'module',
    title: 'Simulator C1 · Goethe Schreiben mock exam',
    notes: [
      'Full 75-minute timed simulator wrapping two writing tasks (<em>Forumsbeitrag</em> + <em>formelle E-Mail</em>) under one countdown — the Goethe-Zertifikat C1 Schreiben module on paper.',
      'Run page: side-by-side tabs, per-task autosave, single Submit button that grades both drafts at once (or auto-submits the moment the timer expires).',
      'Result page: per-task score + band, combined score weighted <code>0.6 / 0.4</code>, pass mark <code>60 / 100</code>, durable history-saved flag so re-opening the result page doesn\'t double-log to history.',
      'Home tile shows in-progress / submitted / graded / abandoned sessions and lets you resume, abandon, or start a fresh exam.'
    ]
  },
  {
    version: '1.10.00', date: '2026-05-25', kind: 'module',
    title: 'Writing module · LLM-graded drafts',
    notes: [
      '<strong>Six task types</strong>: Forumsbeitrag (Goethe C1, ~230 W) · formelle E-Mail (Goethe C1, ~120 W) · argumentativer Aufsatz · Grafik-Beschreibung (telc C1) · Zusammenfassung · Stellungnahme.',
      '12 seeded prompts (2 per task type) with full task context, target word counts, and suggested minutes.',
      'Editor surface with draft autosave + grade trigger; review mode shows the rubric panel, inline criterion notes, and per-paragraph upgrade suggestions.',
      'Goethe C1 + telc C1 rubrics built in. Draft comparison page diffs two drafts side-by-side so you can see exactly what changed between revisions.'
    ]
  },
  {
    version: '1.09.00', date: '2026-05-25', kind: 'module',
    title: 'Passiv module · six transformation types',
    notes: [
      'Active → passive (and passive-alternative) drill. Six target types: <em>Vorgangspassiv</em> (werden + Part. II) · <em>Zustandspassiv</em> (sein + Part. II) · <em>sich-lassen</em> + Inf. · <em>sein + zu</em> + Inf. · <em>-bar/-lich</em> Adjektiv · <em>man-Konstruktion</em>.',
      'Difficulty: <em>Easy · B1</em> (simple transitive present) · <em>Medium · B2</em> (past tenses, dative, separables) · <em>Hard · C1</em> (subordinate clauses, modals, sich-lassen/man focus).',
      'Generator declares which transformations are <code>legalTypes</code> for each source verb; the target the learner must produce is chosen from that legal set. LLM judge identifies which type the learner actually produced and flags type mismatches as <em>partially correct</em>.',
      'Per-type breakdown on the result page so you can see where you confused Vorgangspassiv with Zustandspassiv.'
    ]
  },
  {
    version: '1.08.00', date: '2026-05-25', kind: 'module',
    title: 'Konjunktiv I module · Indirekte Rede',
    notes: [
      'Quote-rewrite drill: read a direct quotation (<code>Der Minister sagte: „…"</code>), produce the indirect-speech form with Konjunktiv I (or the Konjunktiv II fallback when K-I collides with the indicative — typical for plurals and 1st-person).',
      'Difficulty: <em>Easy · B1</em> (simple SVO, er/sie/es) · <em>Medium · B2</em> (mixed subjects forcing K-II fallback) · <em>Hard · C1</em> (news register, subordinate clauses, modals, time shifts).',
      'Topics: Politik · Wirtschaft · Wissenschaft · Sport · Kultur — pick a subset or take a mix.',
      'LLM judge reports the mood the learner actually used (<code>K1 / K2 / indicative / other</code>) plus whether that choice was appropriate, so wrong-mood answers get explained, not just marked wrong.'
    ]
  },
  {
    version: '1.07.03', date: '2026-05-24', kind: 'polish',
    title: 'Default prompt sizes lowered to the minimum',
    notes: [
      'Out-of-the-box prompt sizes now default to the lowest available value for each quiz, so more content fits on screen without scrolling.',
      'New defaults: verb worksheet <code>18</code>px (was 26) · noun runner <code>48</code>px (was 92) · adjective runner <code>22</code>px (was 36) · declension runner <code>32</code>px (was 56).',
      'Existing users keep their saved size — only first-time installs and explicit resets see the new defaults.',
      'Preset chips renamed: Compact / Medium / Large (the previous "Default" preset now sits in the middle as "Medium").'
    ]
  },
  {
    version: '1.07.02', date: '2026-05-24', kind: 'polish',
    title: 'Loading mask + toast notifications',
    notes: [
      'Global full-page loading mask with pulsing accent dots shown during slow operations (Gemini calls for both the declension AI mode and the adjective sentence quiz). Title + subtitle explain what is happening.',
      'Toast notification stack in the top-right (bottom on phones) for success/info/error messages. Errors get 6s dwell, others 4s; manual dismiss via × always available.',
      'AI generation errors now surface as toasts in addition to the inline danger alert, so they are visible even if you have scrolled down.',
      'New "Heads up" warning alert on the article-fill AI setup and the adjective setup: <strong>Gemini takes 1–3 minutes</strong> to return a batch — don\'t close the tab while the loader is up.'
    ]
  },
  {
    version: '1.07.01', date: '2026-05-24', kind: 'polish',
    title: 'Declension · article-fill AI mode',
    notes: [
      'New <strong>Source · AI · Live</strong> toggle on the article-fill setup page calls Gemini to generate fresh sentences.',
      'Difficulty levels: <em>Easy</em> (A1–A2, 1–2 blanks, def/indef only) · <em>Medium</em> (B1, 2–3 blanks, +possessive) · <em>Hard</em> (B2–C1, 3–4 blanks, +genitive constructions).',
      'Each sentence supports multiple blanks; the runner interleaves inputs at every <code>___</code> in the template and grades them all at once.',
      'Anti-fabrication: 5-stage validation per entry (structural sanity · blanks-count match · sentence reconstruction · enum validity · strict definite/indefinite article-form lookup). Failing entries are dropped and the model is asked again, up to 2 retries.',
      'Per-blank rationale shown after submit so the learner sees <em>why</em> each case applies.',
      'AI runs land in history as <code>decl-article-ai</code> with the difficulty and average blank-count recorded.'
    ]
  },
  {
    version: '1.07.00', date: '2026-05-24', kind: 'module',
    title: 'Declension v2 · Pronouns & Case recognition',
    notes: [
      'New pronoun-forms drill — produce all four case forms for personal, possessive, and reflexive pronouns (4-row table layout, parallel to the decline-the-phrase quiz).',
      'New case-recognition drill — read a sentence with a highlighted noun phrase, pick the case it is in (single-card multiple choice with <code>1</code>–<code>4</code> hotkeys).',
      'Declension landing grows from 4 cards to 6.'
    ]
  },
  {
    version: '1.06.04', date: '2026-05-24', kind: 'polish',
    title: 'Pagination across long lists',
    notes: [
      'Reusable <code>Pagination</code> component with page-size selector (10 / 25 / 50 / 100).',
      'Applied to: version changelog, Manage Nouns, History table, all result lists.',
      'The verb translation worksheet keeps the single-view layout — by design.'
    ]
  },
  {
    version: '1.06.03', date: '2026-05-24', kind: 'polish',
    title: 'Version page · changelog',
    notes: [
      'New About · Version page accessible from the nav header (badge) and the mobile drawer.',
      'Changelog seeded with the full design history.',
      'Each commit going forward bumps the patch (or higher) and lands here.'
    ]
  },
  {
    version: '1.06.02', date: '2026-05-24', kind: 'polish',
    title: 'Declension prompt-size slider',
    notes: [
      'Fourth slider in Settings · Display · Sizes for the declension drills.',
      'New <code>--decl-prompt-size</code> CSS variable wired into all three declension runners.'
    ]
  },
  {
    version: '1.06.01', date: '2026-05-24', kind: 'fix',
    title: 'Mobile UI overhaul',
    notes: [
      'No more horizontal scroll on any route — page max-width 100% with min-width: 0 cascade.',
      'Settings rail is a 2×2 card grid on mobile (was a horizontal-scrolling pill strip).',
      'Two-line CTA buttons on long action labels.',
      'Continuous quiz-meter for runs with more than 25 questions.',
      'Noun + verb result pages redesigned with red/green row stamps.'
    ]
  },
  {
    version: '1.06.00', date: '2026-05-24', kind: 'module',
    title: 'Declension module',
    notes: [
      'Three drills: decline-the-phrase (4-row case table), article-in-context, adjective endings.',
      '190 curated examples across A1–B2 (30 tables + 80 article-fill + 80 adjective endings).',
      'Tables-reference page with the six canonical declension tables.'
    ]
  },
  {
    version: '1.05.01', date: '2026-05-24', kind: 'polish',
    title: 'Keyboard shortcuts in Prepositions · which-case',
    notes: [
      'Press <code>1</code>–<code>4</code> to pick the case for the focused row.',
      'Tab / Shift-Tab navigate between rows; case buttons are no longer in the tab order.'
    ]
  },
  {
    version: '1.05.00', date: '2026-05-24', kind: 'module',
    title: 'Prepositions module',
    notes: [
      '37 curated prepositions across A1–B2 with ~90 example sentences.',
      'Three drills: which-case (test-sheet), article-fill, two-way decision (acc vs dat).',
      'Browse table with case-colored tags.'
    ]
  },
  {
    version: '1.04.03', date: '2026-05-23', kind: 'polish',
    title: 'Quiz history · stats dashboard',
    notes: [
      '14 charts powered by ECharts: activity calendar, accuracy trend, cumulative progress, type distribution radar, etc.',
      'Editorial 3-panel summary row at the top of <code>/history</code>.',
      'Secondary stat strip with streak, best run, days active, avg duration, most-practiced type.'
    ]
  },
  {
    version: '1.04.02', date: '2026-05-23', kind: 'polish',
    title: 'Settings · Daten tab + tabbed layout',
    notes: [
      'Settings becomes a four-tab layout — API · Display · Palette · Data.',
      'JSON export/import for every preference, palette, and the full quiz history.'
    ]
  },
  {
    version: '1.04.01', date: '2026-05-22', kind: 'polish',
    title: 'Palette overrides per theme',
    notes: [
      'Settings · Farben lets you override each of the 12 design tokens, per-theme.',
      'JSON import &amp; export.'
    ]
  },
  {
    version: '1.04.00', date: '2026-05-22', kind: 'module',
    title: 'History module',
    notes: [
      'Quiz history records every completed run with score, duration, and per-question breakdown.',
      'Per-quiz-type filter; live-saved to localStorage capped at 100 entries.'
    ]
  },
  {
    version: '1.03.01', date: '2026-05-22', kind: 'polish',
    title: 'Verb-tip double-click + parenthetical acceptance',
    notes: [
      'Double-click any verb in the translation worksheet to swap it with a German tip.',
      'Acceptance strips <code>(…)</code> parentheticals so typing one word matches multi-meaning verbs.'
    ]
  },
  {
    version: '1.03.00', date: '2026-05-22', kind: 'module',
    title: 'Adjectives module',
    notes: [
      'Third vocabulary module — Gemini-generated sentence fill with the inflected adjective blanked.',
      'Group filters + case-aware acceptance.'
    ]
  },
  {
    version: '1.02.01', date: '2026-05-21', kind: 'polish',
    title: 'Conjugation cheatsheet + verb runner test-sheet',
    notes: [
      'Long-form verb cheatsheet — twelve chapters of conjugation tables, drop-caps, exception callouts.',
      'Verb translation moved to a worksheet layout (all-at-once submit).'
    ]
  },
  {
    version: '1.02.00', date: '2026-05-21', kind: 'module',
    title: 'Verbs module',
    notes: [
      '378 verbs across A1–B2 with full conjugations in 15 tenses.',
      'Translation drill + conjugation drill + browse table + cheatsheet.'
    ]
  },
  {
    version: '1.01.00', date: '2026-05-18', kind: 'module',
    title: 'Nouns module',
    notes: [
      'First vocabulary module — der/die/das gender drill + English translation drill.',
      '1407 curated nouns across 20 groups.'
    ]
  },
  {
    version: '1.00.00', date: '2026-05-17', kind: 'major',
    title: 'Grammatik-Atelier · initial release',
    notes: [
      'Editorial design system — Fraunces display, Source Serif 4 body, JetBrains Mono accents.',
      'Light + dark themes; sage/clay/ochre/cobalt accent palette.',
      'Vue 3 + TS + Vite scaffolding with IndexedDB-backed nouns/adjectives.'
    ]
  }
]
