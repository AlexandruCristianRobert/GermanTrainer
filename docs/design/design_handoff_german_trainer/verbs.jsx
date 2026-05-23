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
  const [idx, setIdx] = React.useState(0);
  const [input, setInput] = React.useState('');
  const [submitted, setSubmitted] = React.useState(false);
  const [history, setHistory] = React.useState([]);
  const [margIdx, setMargIdx] = React.useState(() => Math.floor(Math.random() * TRANS_MARGINALIA.length));
  const inputRef = React.useRef(null);
  const nextBtnRef = React.useRef(null);

  const total = deck.length;
  const verb = deck[idx];

  React.useEffect(() => {
    if (!submitted && inputRef.current) inputRef.current.focus();
  }, [idx, submitted]);

  React.useEffect(() => {
    if (submitted && nextBtnRef.current) nextBtnRef.current.focus();
  }, [submitted]);

  if (!verb) {
    return <VerbResultScreen navigate={navigate} history={history} total={total} />;
  }

  const isCorrect = submitted && checkTranslation(input, verb.english);

  const onSubmit = (e) => {
    e?.preventDefault?.();
    if (submitted || !input.trim()) return;
    setSubmitted(true);
  };

  const onNext = () => {
    setHistory([...history, { verb, input, correct: isCorrect }]);
    setMargIdx((margIdx + 1) % TRANS_MARGINALIA.length);
    setInput('');
    setSubmitted(false);
    setIdx(idx + 1);
  };

  // Progress pips
  const pips = [];
  for (let i = 0; i < total; i++) {
    let cls = '';
    if (i < history.length) cls = history[i].correct ? 'done' : 'wrong';
    else if (i === idx && submitted) cls = isCorrect ? 'done' : 'wrong';
    else if (i === idx) cls = 'current';
    pips.push(cls);
  }

  const marg = TRANS_MARGINALIA[margIdx];

  return (
    <div className="page" data-screen-label="33 Verb translation runner">
      <div className="quiz-stage">
        <div>
          <div className="quiz-meta">
            <span className="quiz-counter">Frage {idx + 1} · von {total}</span>
            <button className="btn btn-quiet" onClick={() => navigate('verbs/translation')}>End quiz</button>
          </div>

          <div className="quiz-progress-bar">
            {pips.map((cls, i) => <div key={i} className={'pip ' + cls}></div>)}
          </div>

          <div className="prompt-card">
            <div style={{position: 'absolute', top: 16, left: 0, display: 'flex', gap: 6}}>
              <span className="tag">{verb.level}</span>
              <span className={'tag ' + typeTagClass(verb.type)}>{verb.type}</span>
              <span className={'tag ' + caseTagClass(verb.case)}>{verb.case}</span>
            </div>
            <div className="prompt-german">{verb.german}</div>
            <div className="prompt-english" style={{opacity: submitted ? 1 : 0, transition: 'opacity .3s'}}>
              {submitted ? verb.english : '\u00A0'}
            </div>
          </div>

          <form onSubmit={onSubmit} className="translation-input-wrap">
            <input
              ref={inputRef}
              className="input"
              type="text"
              placeholder="English (to is optional)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
              readOnly={submitted}
              style={submitted ? {
                color: isCorrect ? 'var(--success)' : 'var(--danger)',
                borderBottomColor: isCorrect ? 'var(--success)' : 'var(--danger)',
              } : undefined}
            />
            {!submitted && (
              <button className="btn btn-accent" type="submit" disabled={!input.trim()}>
                Submit →
              </button>
            )}
          </form>

          <div className={'feedback-line' + (submitted ? (isCorrect ? ' correct' : ' wrong') : '')}>
            {!submitted && <span style={{color: 'var(--mute)', fontStyle: 'italic'}}>Type the English meaning. Press Enter to submit.</span>}
            {submitted && isCorrect && <>✓ Richtig.</>}
            {submitted && !isCorrect && <>✗ Korrekt — <strong>{verb.english}</strong></>}
          </div>

          <div className="quiz-actions">
            <span className="micro-mark">Press <span className="kbd">Enter</span> to {submitted ? 'advance' : 'submit'}</span>
            {submitted && (
              <button
                ref={nextBtnRef}
                className="btn btn-accent"
                onClick={onNext}
                onKeyDown={(e) => { if (e.key === 'Enter') onNext(); }}
              >
                {idx + 1 === total ? 'Finish quiz' : 'Next'} →
              </button>
            )}
          </div>
        </div>

        <aside className="marginalia">
          <div className="marg-section">
            <div className="marg-label">{marg.label}</div>
            <p className="marg-quote">{marg.quote}</p>
            <p style={{margin: 0}}>{marg.body}</p>
          </div>

          <div className="marg-section">
            <div className="marg-label">Score so far</div>
            <p style={{margin: 0, fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 500, letterSpacing: '-0.01em'}}>
              {history.filter(h => h.correct).length}
              <span style={{color: 'var(--mute)'}}> / {history.length || '0'}</span>
            </p>
            <p style={{fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--mute)', margin: 0, marginTop: 4, letterSpacing: '0.06em'}}>
              answered · {total - idx - (submitted ? 1 : 0)} remaining
            </p>
          </div>

          <div className="marg-section">
            <div className="marg-label">Legend</div>
            <div style={{display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13}}>
              <div><span className="tag tag-cobalt">accusative</span> <em>direct object</em></div>
              <div><span className="tag tag-clay">dative</span> <em>indirect object</em></div>
              <div><span className="tag tag-ochre">genitive</span> <em>possessive</em></div>
              <div><span className="tag tag-accent">reflexive</span> <em>sich-</em></div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
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

Object.assign(window, { VERBS, VerbTranslationSetup, VerbTranslationRunner, VerbResultScreen });
