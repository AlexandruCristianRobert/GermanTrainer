// ─── Verbs module: data + translation quiz setup + runner ───

const VERBS = [
  { german: 'sein',        english: 'to be',                       level: 'A1', type: 'irregular', case: 'none' },
  { german: 'haben',       english: 'to have',                     level: 'A1', type: 'irregular', case: 'accusative' },
  { german: 'werden',      english: 'to become',                   level: 'A1', type: 'irregular', case: 'none' },
  { german: 'gehen',       english: 'to go / to walk',             level: 'A1', type: 'irregular', case: 'none' },
  { german: 'kommen',      english: 'to come',                     level: 'A1', type: 'irregular', case: 'none' },
  { german: 'machen',      english: 'to make / to do',             level: 'A1', type: 'regular',   case: 'accusative' },
  { german: 'sagen',       english: 'to say / to tell',            level: 'A1', type: 'regular',   case: 'accusative' },
  { german: 'sehen',       english: 'to see',                      level: 'A1', type: 'irregular', case: 'accusative' },
  { german: 'wissen',      english: 'to know (a fact)',            level: 'A1', type: 'mixed',     case: 'accusative' },
  { german: 'kennen',      english: 'to know (a person/place)',    level: 'A1', type: 'mixed',     case: 'accusative' },
  { german: 'arbeiten',    english: 'to work',                     level: 'A1', type: 'regular',   case: 'none' },
  { german: 'wohnen',      english: 'to live / to reside',         level: 'A1', type: 'regular',   case: 'none' },
  { german: 'spielen',     english: 'to play',                     level: 'A1', type: 'regular',   case: 'accusative' },
  { german: 'lernen',      english: 'to learn / to study',         level: 'A1', type: 'regular',   case: 'accusative' },
  { german: 'kaufen',      english: 'to buy',                      level: 'A1', type: 'regular',   case: 'accusative' },
  { german: 'fahren',      english: 'to drive / to travel',        level: 'A1', type: 'irregular', case: 'none' },
  { german: 'sprechen',    english: 'to speak / to talk',          level: 'A1', type: 'irregular', case: 'none' },
  { german: 'helfen',      english: 'to help',                     level: 'A1', type: 'irregular', case: 'dative' },
  { german: 'geben',       english: 'to give',                     level: 'A1', type: 'irregular', case: 'dative+accusative' },
  { german: 'nehmen',      english: 'to take',                     level: 'A1', type: 'irregular', case: 'accusative' },
  { german: 'lesen',       english: 'to read',                     level: 'A1', type: 'irregular', case: 'accusative' },
  { german: 'essen',       english: 'to eat',                      level: 'A1', type: 'irregular', case: 'accusative' },
  { german: 'trinken',     english: 'to drink',                    level: 'A1', type: 'irregular', case: 'accusative' },
  { german: 'aufstehen',   english: 'to get up / to stand up',     level: 'A1', type: 'separable', case: 'none' },
  { german: 'anrufen',     english: 'to call (on phone)',          level: 'A1', type: 'separable', case: 'accusative' },
  { german: 'einkaufen',   english: 'to shop / to buy groceries',  level: 'A1', type: 'separable', case: 'accusative' },
  { german: 'mitkommen',   english: 'to come along',               level: 'A1', type: 'separable', case: 'none' },
  { german: 'können',      english: 'can / to be able to',         level: 'A1', type: 'modal',     case: 'varies' },
  { german: 'müssen',      english: 'must / to have to',           level: 'A1', type: 'modal',     case: 'varies' },
  { german: 'wollen',      english: 'to want',                     level: 'A1', type: 'modal',     case: 'varies' },
  { german: 'sollen',      english: 'should / supposed to',        level: 'A1', type: 'modal',     case: 'varies' },
  { german: 'dürfen',      english: 'may / to be allowed to',      level: 'A1', type: 'modal',     case: 'varies' },
  { german: 'mögen',       english: 'to like',                     level: 'A1', type: 'modal',     case: 'accusative' },
  { german: 'verstehen',   english: 'to understand',               level: 'A2', type: 'irregular', case: 'accusative' },
  { german: 'beginnen',    english: 'to begin / to start',         level: 'A2', type: 'irregular', case: 'accusative' },
  { german: 'denken',      english: 'to think',                    level: 'A2', type: 'mixed',     case: 'none' },
  { german: 'bringen',     english: 'to bring',                    level: 'A2', type: 'mixed',     case: 'dative+accusative' },
  { german: 'gefallen',    english: 'to please / to like',         level: 'A2', type: 'irregular', case: 'dative' },
  { german: 'gehören',     english: 'to belong to',                level: 'A2', type: 'regular',   case: 'dative' },
  { german: 'sich freuen', english: 'to be happy / to look forward', level: 'A2', type: 'regular', case: 'reflexive' },
  { german: 'empfehlen',   english: 'to recommend',                level: 'B1', type: 'irregular', case: 'dative+accusative' },
  { german: 'erinnern',    english: 'to remind / to remember',     level: 'B1', type: 'regular',   case: 'reflexive' },
  { german: 'gewinnen',    english: 'to win',                      level: 'B1', type: 'irregular', case: 'accusative' },
  { german: 'verbringen',  english: 'to spend (time)',             level: 'B1', type: 'mixed',     case: 'accusative' },
  { german: 'beweisen',    english: 'to prove',                    level: 'B2', type: 'irregular', case: 'accusative' },
  { german: 'gedenken',    english: 'to commemorate',              level: 'B2', type: 'mixed',     case: 'genitive' },
];

const LEVELS = ['A1', 'A2', 'B1', 'B2'];
const VERB_TYPES = ['regular', 'irregular', 'mixed', 'separable', 'modal'];
const VERB_CASES = ['none', 'accusative', 'dative', 'dative+accusative', 'genitive', 'reflexive', 'varies'];

// Marginalia for translation quiz — etymological / mnemonic vignettes
const TRANS_MARGINALIA = [
  {
    label: 'NOTIZ',
    quote: 'The infinitive carries no person.',
    body: 'German infinitives end in -en (sometimes -n). When you translate them, the English answer can be the bare verb or the "to-" form — both are accepted.'
  },
  {
    label: 'BEACHTE',
    quote: '"wissen" vs. "kennen" — two ways to know.',
    body: 'Use wissen for facts (Ich weiß die Antwort). Use kennen for people, places, or things you\'re familiar with (Ich kenne Berlin). English collapses them; German doesn\'t.'
  },
  {
    label: 'TIPP',
    quote: 'Separable verbs hide their main meaning in the prefix.',
    body: 'aufstehen = auf (up) + stehen (to stand). einkaufen = ein (in) + kaufen (to buy). Learn the prefixes and the rest unfolds.'
  },
  {
    label: 'GESCHICHTE',
    quote: 'Modal verbs come without "to".',
    body: 'können, müssen, dürfen, sollen, wollen, mögen — six modal verbs, each pairing with a bare infinitive: "Ich kann schwimmen", not "Ich kann zu schwimmen".'
  },
];

function caseTagClass(c) {
  if (c === 'dative' || c === 'dative+accusative') return 'tag-clay';
  if (c === 'accusative') return 'tag-cobalt';
  if (c === 'reflexive') return 'tag-accent';
  if (c === 'genitive') return 'tag-ochre';
  return '';
}

function typeTagClass(t) {
  if (t === 'irregular') return 'tag-clay';
  if (t === 'separable') return 'tag-cobalt';
  if (t === 'modal') return 'tag-ochre';
  if (t === 'mixed') return 'tag-accent';
  return '';
}

/* ────── Translation quiz setup ────── */

function VerbTranslationSetup({ navigate, startQuiz }) {
  const [levels, setLevels] = React.useState(() => new Set(LEVELS));
  const [types, setTypes] = React.useState(() => new Set(VERB_TYPES));
  const [cases, setCases] = React.useState(() => new Set(VERB_CASES));
  const [count, setCount] = React.useState(10);
  const [customCount, setCustomCount] = React.useState(15);

  const pool = VERBS.filter((v) =>
    levels.has(v.level) && types.has(v.type) && cases.has(v.case)
  );
  const totalAvailable = pool.length;
  const effectiveCount = count === 'custom' ? Math.min(customCount, totalAvailable)
    : count === 'all' ? totalAvailable
    : Math.min(count, totalAvailable);

  const toggleSet = (set, val, setter) => {
    const next = new Set(set);
    if (next.has(val)) next.delete(val); else next.add(val);
    setter(next);
  };

  const start = () => {
    startQuiz({ pool, count: effectiveCount });
    navigate('verbs/translation/run');
  };

  const FilterRow = ({ label, items, set, setter, fmt }) => (
    <div className="field">
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8}}>
        <div className="field-label">{label} · {set.size} of {items.length}</div>
        <div style={{display: 'flex', gap: 4}}>
          <button className="btn btn-quiet" onClick={() => setter(new Set(items))}>All</button>
          <button className="btn btn-quiet" onClick={() => setter(new Set())}>None</button>
        </div>
      </div>
      <div className="chip-row">
        {items.map((v) => (
          <button
            key={v}
            className={'chip' + (set.has(v) ? ' selected' : '')}
            onClick={() => toggleSet(set, v, setter)}
          >
            {fmt ? fmt(v) : v}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="page" style={{maxWidth: 720, margin: '0 auto'}}>
      <div className="section-header" data-screen-label="32 Verb translation setup">
        <div>
          <div className="breadcrumb">Kapitel III · Übersetzen · Einrichtung</div>
          <h1 className="section-title">Setup<em>.</em></h1>
          <p className="section-subtitle">
            Filter the verb pool by level, type, and case. Then pick how many to drill.
          </p>
        </div>
      </div>

      <FilterRow label="Level" items={LEVELS} set={levels} setter={setLevels} />
      <FilterRow label="Type" items={VERB_TYPES} set={types} setter={setTypes} />
      <FilterRow label="Object case" items={VERB_CASES} set={cases} setter={setCases} />

      <div className="field">
        <div className="field-label">Number of verbs</div>
        <div style={{display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap'}}>
          <div className="segmented">
            {[10, 15, 20, 'all', 'custom'].map((n) => (
              <button key={n} className={count === n ? 'active' : ''} onClick={() => setCount(n)}>
                {n === 'custom' ? 'Custom' : n === 'all' ? `All · ${totalAvailable}` : n}
              </button>
            ))}
          </div>
          {count === 'custom' && (
            <input
              className="input"
              type="number"
              min="1"
              max={totalAvailable || 1}
              value={customCount}
              onChange={(e) => setCustomCount(parseInt(e.target.value) || 1)}
              style={{width: 80, fontSize: 17, padding: '4px 0'}}
            />
          )}
          <span className="micro-mark" style={{marginLeft: 'auto'}}>{totalAvailable} verbs match</span>
        </div>
      </div>

      {totalAvailable === 0 && (
        <div className="alert alert-warning">
          <span className="alert-label">Warning</span>
          No verbs match the selected filters. Widen them to begin.
        </div>
      )}

      <div className="alert alert-info">
        <span className="alert-label">Acceptance</span>
        Answers ignore case &amp; whitespace. A leading "to" is optional. Slash-separated alternatives are all accepted — e.g. "to go / to walk" matches either.
      </div>

      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 40, gap: 16}}>
        <button className="btn btn-ghost" onClick={() => navigate('verbs')}>← Back</button>
        <button
          className="btn btn-accent"
          disabled={totalAvailable === 0}
          onClick={start}
        >
          Start quiz · {effectiveCount} verbs →
        </button>
      </div>
    </div>
  );
}

/* ────── Translation quiz runner ────── */

function normalizeAnswer(s) {
  return String(s || '').trim().toLowerCase().replace(/^to\s+/, '').replace(/\s+/g, ' ');
}

function checkTranslation(input, expectedEnglish) {
  const want = normalizeAnswer(input);
  if (!want) return false;
  // expectedEnglish may have multiple slash-separated alternatives, each may have "to "
  const alts = expectedEnglish.split('/').map((a) => normalizeAnswer(a));
  return alts.includes(want);
}

function buildVerbDeck(config) {
  const shuffled = [...config.pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(config.count, config.pool.length));
}

function VerbTranslationRunner({ navigate, config }) {
  const cfg = config || { pool: VERBS.filter(v => v.level === 'A1'), count: 10 };
  const [deck] = React.useState(() => buildVerbDeck(cfg));
  const [answers, setAnswers] = React.useState(() => deck.map(() => ''));
  const [startedAt] = React.useState(() => Date.now());
  const refs = React.useRef([]);

  const setAnswer = (i, v) => {
    const next = [...answers];
    next[i] = v;
    setAnswers(next);
  };

  const filled = answers.filter(a => a.trim()).length;
  const total = deck.length;

  const onSubmitAll = () => {
    const graded = deck.map((verb, i) => ({
      verb,
      input: answers[i],
      correct: checkTranslation(answers[i], verb.english),
    }));
    const finishedAt = Date.now();
    const correctCount = graded.filter(g => g.correct).length;
    // Save to history
    saveQuizRun({
      type: 'verb-translation',
      startedAt: new Date(startedAt).toISOString(),
      finishedAt: new Date(finishedAt).toISOString(),
      durationMs: finishedAt - startedAt,
      count: total,
      correct: correctCount,
      meta: {
        levels: Array.from(new Set(deck.map(d => d.level))).sort(),
        types: Array.from(new Set(deck.map(d => d.type))).sort(),
      },
    });
    // Pass graded history forward
    window.__lastVerbQuiz = { history: graded, total };
    navigate('verbs/translation/result');
  };

  // Auto-focus first input on mount
  React.useEffect(() => {
    if (refs.current[0]) refs.current[0].focus();
  }, []);

  // Enter in any input advances to next
  const onKeyDown = (e, i) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (i + 1 < total && refs.current[i + 1]) {
        refs.current[i + 1].focus();
      } else if (i + 1 === total) {
        // last input → focus submit
        document.getElementById('submit-all-btn')?.focus();
      }
    }
  };

  return (
    <div className="page" data-screen-label="33 Verb translation runner">
      <div className="test-sheet">
        <div className="section-header" style={{marginBottom: 0}}>
          <div>
            <div className="breadcrumb">Kapitel III · Übersetzen · {total} Verben</div>
            <h1 className="section-title">Übersetzung<em>.</em></h1>
            <p className="section-subtitle">
              Type the English meaning of each verb. "to" is optional. Press Enter to jump to the next line.
            </p>
          </div>
          <button className="btn btn-quiet" onClick={() => navigate('verbs/translation')}>End quiz</button>
        </div>

        <div className="test-sheet-header">
          <span className="filled-count">
            <strong>{filled}</strong> · von {total} ausgefüllt
          </span>
          <div className="quiz-progress-bar" style={{flex: 1, maxWidth: 280, marginBottom: 0, marginLeft: 24}}>
            {deck.map((_, i) => (
              <div key={i} className={'pip ' + (answers[i]?.trim() ? 'current' : '')}></div>
            ))}
          </div>
        </div>

        <div style={{marginTop: 16}}>
          {deck.map((verb, i) => {
            const filledHere = answers[i]?.trim().length > 0;
            return (
              <div key={i} className={'test-row' + (filledHere ? ' is-filled' : '')}>
                <div className="test-num">
                  <strong>{String(i + 1).padStart(2, '0')}.</strong>
                </div>
                <div className="test-content">
                  <div className="test-prompt-row">
                    <span className="test-verb">{verb.german}</span>
                    <span className="test-chips">
                      <span className="tag">{verb.level}</span>
                      <span className={'tag ' + typeTagClass(verb.type)}>{verb.type}</span>
                      <span className={'tag ' + caseTagClass(verb.case)}>{verb.case}</span>
                    </span>
                  </div>
                  <input
                    ref={(el) => { refs.current[i] = el; }}
                    className="test-input"
                    type="text"
                    placeholder="English (to is optional)…"
                    value={answers[i]}
                    onChange={(e) => setAnswer(i, e.target.value)}
                    onKeyDown={(e) => onKeyDown(e, i)}
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck="false"
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="test-sheet-footer">
          <span className="filled-count">
            <strong>{filled}</strong> filled · {total - filled} remaining
          </span>
          <button
            id="submit-all-btn"
            className="btn btn-accent"
            onClick={onSubmitAll}
            disabled={filled === 0}
          >
            Submit all · {total} verbs →
          </button>
        </div>
      </div>
    </div>
  );
}

/* ────── Result screen for verb translation ────── */

function VerbTranslationResult({ navigate }) {
  const stashed = window.__lastVerbQuiz;
  const history = stashed?.history || [];
  const total = stashed?.total || history.length;
  return <VerbResultScreen navigate={navigate} history={history} total={total} />;
}

/* ────── Result screen for verb translation ────── */

function VerbResultScreen({ navigate, history, total }) {
  const correct = history.filter(h => h.correct).length;
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;

  return (
    <div className="page" style={{maxWidth: 880, margin: '0 auto'}} data-screen-label="34 Verb result">
      <div className="section-header">
        <div>
          <div className="breadcrumb">Auswertung · Übersetzung</div>
          <div className="result-score">
            {correct}<span className="denom"> / {total}</span>
          </div>
          <p className="section-subtitle">
            {pct >= 80 && 'Stark. Most of these verbs are second nature now.'}
            {pct >= 50 && pct < 80 && 'Solid. A few translations to revisit.'}
            {pct < 50 && 'Worth another pass — translations live in the long-term memory pile.'}
          </p>
        </div>
        <div style={{textAlign: 'right'}}>
          <button className="btn btn-ghost" onClick={() => navigate('verbs')}>← Verben</button>{' '}
          <button className="btn btn-accent" onClick={() => navigate('verbs/translation')}>Start another quiz →</button>
        </div>
      </div>

      <div className="result-list">
        {history.map((h, i) => (
          <div key={i} className="result-row">
            <div className="german">
              {h.verb.german}
              <div style={{fontFamily: 'var(--font-body)', fontStyle: 'italic', fontSize: 13, color: 'var(--mute)', fontWeight: 400, marginTop: 2, display: 'flex', gap: 6}}>
                <span>{h.verb.level}</span>
                <span>·</span>
                <span>{h.verb.type}</span>
              </div>
            </div>
            <div className="answers">
              your answer: <strong style={{color: h.correct ? 'var(--success)' : 'var(--danger)'}}>{h.input || '—'}</strong>
              {!h.correct && <span> · expected: <strong>{h.verb.english}</strong></span>}
            </div>
            <div>
              {h.correct
                ? <span className="tag" style={{background: 'var(--success-tint)', color: 'var(--success)'}}>✓ Correct</span>
                : <span className="tag" style={{background: 'var(--danger-tint)', color: 'var(--danger)'}}>✗ Missed</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { VERBS, VerbTranslationSetup, VerbTranslationRunner, VerbTranslationResult, VerbResultScreen });
