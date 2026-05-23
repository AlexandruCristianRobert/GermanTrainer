// ─── Adjectives module: setup + test-sheet runner + result ───
// In the real app, sentences are AI-generated via Gemini. For this prototype,
// we ship a pre-canned sample so the flow is fully demoable without an API key.

const ADJECTIVE_GROUPS = [
  'People & Character', 'Feelings & Emotions', 'Size & Quantity',
  'Quality & Condition', 'Time & Sequence', 'Position & Direction',
  'Health & Body', 'Food & Taste', 'Social & Abstract',
  'Actions & Verbs', 'Other',
];

const ADJECTIVE_GROUP_COUNTS = {
  'People & Character': 28, 'Feelings & Emotions': 24, 'Size & Quantity': 18,
  'Quality & Condition': 32, 'Time & Sequence': 14, 'Position & Direction': 16,
  'Health & Body': 19, 'Food & Taste': 21, 'Social & Abstract': 26,
  'Actions & Verbs': 22, 'Other': 30,
};

// Sample pre-generated sentences — one per adjective.
// In production these come from Gemini at runtime.
const ADJECTIVE_SENTENCES = [
  { base: 'schön', inflected: 'schönen', blanked: 'Ich sehe den ____ Park.', sentence: 'Ich sehe den schönen Park.', hint: 'the beautiful park (acc.)', group: 'Quality & Condition' },
  { base: 'gross', inflected: 'großes', blanked: 'Das ist ein ____ Haus.', sentence: 'Das ist ein großes Haus.', hint: 'a big house (neut. nom.)', group: 'Size & Quantity' },
  { base: 'klein', inflected: 'kleinen', blanked: 'Mit der ____ Schwester.', sentence: 'Mit der kleinen Schwester.', hint: 'with the little sister (dat.)', group: 'Size & Quantity' },
  { base: 'alt', inflected: 'alte', blanked: 'Die ____ Frau lächelt.', sentence: 'Die alte Frau lächelt.', hint: 'the old woman smiles', group: 'People & Character' },
  { base: 'jung', inflected: 'junger', blanked: 'Ein ____ Mann kam herein.', sentence: 'Ein junger Mann kam herein.', hint: 'a young man came in (nom.)', group: 'People & Character' },
  { base: 'glücklich', inflected: 'glückliche', blanked: 'Sie ist eine ____ Person.', sentence: 'Sie ist eine glückliche Person.', hint: 'a happy person (nom.)', group: 'Feelings & Emotions' },
  { base: 'müde', inflected: 'müden', blanked: 'Der ____ Hund schläft.', sentence: 'Der müde Hund schläft.', hint: 'the tired dog sleeps', group: 'Feelings & Emotions' },
  { base: 'kalt', inflected: 'kaltes', blanked: 'Ein ____ Bier, bitte.', sentence: 'Ein kaltes Bier, bitte.', hint: 'a cold beer, please (acc.)', group: 'Food & Taste' },
  { base: 'warm', inflected: 'warmen', blanked: 'In dem ____ Wasser.', sentence: 'In dem warmen Wasser.', hint: 'in the warm water (dat.)', group: 'Quality & Condition' },
  { base: 'lecker', inflected: 'leckeren', blanked: 'Ich esse einen ____ Apfel.', sentence: 'Ich esse einen leckeren Apfel.', hint: 'a tasty apple (acc.)', group: 'Food & Taste' },
  { base: 'schnell', inflected: 'schnelles', blanked: 'Das ist ein ____ Auto.', sentence: 'Das ist ein schnelles Auto.', hint: 'a fast car (nom.)', group: 'Quality & Condition' },
  { base: 'langsam', inflected: 'langsame', blanked: 'Die ____ Bahn kommt.', sentence: 'Die langsame Bahn kommt.', hint: 'the slow train arrives', group: 'Quality & Condition' },
  { base: 'rot', inflected: 'rotes', blanked: 'Ein ____ Auto fährt vorbei.', sentence: 'Ein rotes Auto fährt vorbei.', hint: 'a red car drives past', group: 'Quality & Condition' },
  { base: 'neu', inflected: 'neue', blanked: 'Mein ____ Buch ist gut.', sentence: 'Mein neues Buch ist gut.', hint: 'my new book (nom.)', group: 'Quality & Condition' },
  { base: 'interessant', inflected: 'interessanten', blanked: 'Ich lese einen ____ Artikel.', sentence: 'Ich lese einen interessanten Artikel.', hint: 'an interesting article (acc.)', group: 'Social & Abstract' },
];

function buildAdjectiveDeck(config) {
  const pool = ADJECTIVE_SENTENCES.filter(s => config.groups.includes(s.group));
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(config.count, pool.length));
}

function checkAdjective(input, expected) {
  return String(input || '').trim().toLowerCase() === String(expected || '').trim().toLowerCase();
}

/* ────── Setup ────── */

function AdjectiveQuizSetup({ navigate, startQuiz }) {
  const [selected, setSelected] = React.useState(() => new Set(['Quality & Condition', 'Size & Quantity', 'People & Character', 'Feelings & Emotions', 'Food & Taste']));
  const [count, setCount] = React.useState(10);
  const [customCount, setCustomCount] = React.useState(15);
  const [apiKey] = React.useState(() => 'placeholder-key'); // assume user has key set in real app

  const totalAvailable = Array.from(selected).reduce((s, g) => s + (ADJECTIVE_GROUP_COUNTS[g] || 0), 0);
  const effectiveCount = count === 'custom' ? Math.min(customCount, totalAvailable)
    : count === 'all' ? totalAvailable
    : Math.min(count, totalAvailable);

  const toggle = (g) => {
    const next = new Set(selected);
    if (next.has(g)) next.delete(g); else next.add(g);
    setSelected(next);
  };

  const start = () => {
    startQuiz({ groups: Array.from(selected), count: effectiveCount });
    navigate('adjectives/quiz/run');
  };

  return (
    <div className="page" style={{maxWidth: 720, margin: '0 auto'}} data-screen-label="22 Adjective quiz setup">
      <div className="section-header">
        <div>
          <div className="breadcrumb">Kapitel II · Lückentext · Einrichtung</div>
          <h1 className="section-title">Setup<em>.</em></h1>
          <p className="section-subtitle">
            Pick adjective groups and quiz length. Sentences will be generated for each.
          </p>
        </div>
      </div>

      {!apiKey && (
        <div className="alert alert-warning">
          <span className="alert-label">Required</span>
          Set your Gemini API key in <a href="#" onClick={(e) => { e.preventDefault(); navigate('settings'); }}>Settings</a> first.
        </div>
      )}

      <div className="alert alert-info">
        <span className="alert-label">Prototype note</span>
        Sentences in this prototype come from a small pre-canned set. In the production app, Gemini generates a fresh sentence for each adjective at quiz start.
      </div>

      <div className="field">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline'}}>
          <div className="field-label">Groups · {selected.size} of {ADJECTIVE_GROUPS.length}</div>
          <div style={{display: 'flex', gap: 4}}>
            <button className="btn btn-quiet" onClick={() => setSelected(new Set(ADJECTIVE_GROUPS))}>All</button>
            <button className="btn btn-quiet" onClick={() => setSelected(new Set())}>None</button>
          </div>
        </div>
        <div className="chip-row">
          {ADJECTIVE_GROUPS.map((g) => (
            <button
              key={g}
              className={'chip' + (selected.has(g) ? ' selected' : '')}
              onClick={() => toggle(g)}
            >
              <span>{g}</span>
              <span className="chip-count">{ADJECTIVE_GROUP_COUNTS[g] || 0}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <div className="field-label">Number of sentences</div>
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
        </div>
      </div>

      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 40, gap: 16}}>
        <button className="btn btn-ghost" onClick={() => navigate('adjectives')}>← Back</button>
        <button
          className="btn btn-accent"
          disabled={selected.size === 0 || totalAvailable === 0}
          onClick={start}
        >
          Generate sentences and start →
        </button>
      </div>
    </div>
  );
}

/* ────── Test-sheet runner ────── */

function AdjectiveQuizRunner({ navigate, config }) {
  const cfg = config || { groups: ADJECTIVE_GROUPS, count: 8 };
  const [deck] = React.useState(() => buildAdjectiveDeck(cfg));
  const [answers, setAnswers] = React.useState(() => deck.map(() => ''));
  const [startedAt] = React.useState(() => Date.now());
  const refs = React.useRef([]);

  const total = deck.length;
  const filled = answers.filter(a => a.trim()).length;

  const setAnswer = (i, v) => {
    const next = [...answers];
    next[i] = v;
    setAnswers(next);
  };

  const onSubmitAll = () => {
    const graded = deck.map((s, i) => ({
      sentence: s,
      input: answers[i],
      correct: checkAdjective(answers[i], s.inflected),
    }));
    const finishedAt = Date.now();
    const correctCount = graded.filter(g => g.correct).length;
    saveQuizRun({
      type: 'adjective',
      startedAt: new Date(startedAt).toISOString(),
      finishedAt: new Date(finishedAt).toISOString(),
      durationMs: finishedAt - startedAt,
      count: total,
      correct: correctCount,
      meta: { groups: cfg.groups || [] },
    });
    window.__lastAdjectiveQuiz = { history: graded, total };
    navigate('adjectives/quiz/result');
  };

  React.useEffect(() => {
    if (refs.current[0]) refs.current[0].focus();
  }, []);

  const onKeyDown = (e, i) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (i + 1 < total && refs.current[i + 1]) refs.current[i + 1].focus();
      else if (i + 1 === total) document.getElementById('submit-all-adj')?.focus();
    }
  };

  if (deck.length === 0) {
    return (
      <div className="page" style={{maxWidth: 720, margin: '0 auto'}}>
        <div className="section-header">
          <h1 className="section-title">No sentences<em>.</em></h1>
        </div>
        <div className="alert alert-warning">No sentences available for the selected groups in this prototype.</div>
        <button className="btn btn-ghost" onClick={() => navigate('adjectives/quiz')}>← Back to setup</button>
      </div>
    );
  }

  return (
    <div className="page" data-screen-label="23 Adjective quiz runner">
      <div className="test-sheet">
        <div className="section-header" style={{marginBottom: 0}}>
          <div>
            <div className="breadcrumb">Kapitel II · Lückentext · {total} Sätze</div>
            <h1 className="section-title">Adjektive<em>.</em></h1>
            <p className="section-subtitle">
              Fill in the missing adjective with the correct inflection. The dictionary form is shown in italic — type the inflected form that fits the sentence.
            </p>
          </div>
          <button className="btn btn-quiet" onClick={() => navigate('adjectives/quiz')}>End quiz</button>
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
          {deck.map((s, i) => (
            <div key={i} className={'test-row' + (answers[i]?.trim() ? ' is-filled' : '')}>
              <div className="test-num">
                <strong>{String(i + 1).padStart(2, '0')}.</strong>
              </div>
              <div className="test-content">
                <div className="test-prompt-row">
                  <span className="test-verb" style={{fontSize: 'calc(var(--test-verb-size, 26px) * 0.85)', lineHeight: 1.3}}>
                    {s.blanked}
                  </span>
                  <span className="test-chips">
                    <span style={{
                      fontFamily: 'var(--font-display)', fontStyle: 'italic',
                      color: 'var(--mute)', fontSize: 14, marginRight: 6
                    }}>
                      {s.base}
                    </span>
                    <span className="tag">{s.group}</span>
                  </span>
                </div>
                <p style={{margin: '4px 0 0 0', fontFamily: 'var(--font-body)', fontStyle: 'italic', color: 'var(--ink-soft)', fontSize: 13}}>
                  {s.hint}
                </p>
                <input
                  ref={(el) => { refs.current[i] = el; }}
                  className="test-input"
                  type="text"
                  placeholder="inflected form…"
                  value={answers[i]}
                  onChange={(e) => setAnswer(i, e.target.value)}
                  onKeyDown={(e) => onKeyDown(e, i)}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck="false"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="test-sheet-footer">
          <span className="filled-count">
            <strong>{filled}</strong> filled · {total - filled} remaining
          </span>
          <button
            id="submit-all-adj"
            className="btn btn-accent"
            onClick={onSubmitAll}
            disabled={filled === 0}
          >
            Submit all · {total} sentences →
          </button>
        </div>
      </div>
    </div>
  );
}

/* ────── Result ────── */

function AdjectiveQuizResult({ navigate }) {
  const stashed = window.__lastAdjectiveQuiz;
  const history = stashed?.history || [];
  const total = stashed?.total || history.length;
  const correct = history.filter(h => h.correct).length;
  const pct = total > 0 ? Math.round(100 * correct / total) : 0;

  return (
    <div className="page" style={{maxWidth: 880, margin: '0 auto'}} data-screen-label="24 Adjective result">
      <div className="section-header">
        <div>
          <div className="breadcrumb">Auswertung · Adjektive</div>
          <div className="result-score">
            {correct}<span className="denom"> / {total}</span>
          </div>
          <p className="section-subtitle">
            {pct >= 80 && 'Stark. The inflection endings are landing.'}
            {pct >= 50 && pct < 80 && 'Solid. Case and gender endings need a few more passes.'}
            {pct < 50 && 'Worth another pass — the case + gender endings are the slowest German rule to internalise.'}
          </p>
        </div>
        <div style={{textAlign: 'right'}}>
          <button className="btn btn-ghost" onClick={() => navigate('adjectives')}>← Adjektive</button>{' '}
          <button className="btn btn-accent" onClick={() => navigate('adjectives/quiz')}>Start another quiz →</button>
        </div>
      </div>

      <div className="result-list">
        {history.map((h, i) => (
          <div key={i} className="result-row" style={{gridTemplateColumns: '1fr auto'}}>
            <div>
              <div style={{fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 500, marginBottom: 4}}>
                {h.sentence.sentence.split(h.sentence.inflected).map((part, j, arr) => (
                  <React.Fragment key={j}>
                    {part}
                    {j < arr.length - 1 && (
                      <strong style={{color: h.correct ? 'var(--success)' : 'var(--danger)'}}>
                        {h.sentence.inflected}
                      </strong>
                    )}
                  </React.Fragment>
                ))}
              </div>
              <div className="answers" style={{display: 'flex', gap: 14, flexWrap: 'wrap'}}>
                <span>your answer: <strong style={{color: h.correct ? 'var(--success)' : 'var(--danger)'}}>{h.input || '—'}</strong></span>
                <span>· base: <em style={{color: 'var(--mute)'}}>{h.sentence.base}</em></span>
                {!h.correct && <span>· expected: <strong>{h.sentence.inflected}</strong></span>}
              </div>
            </div>
            <div>
              {h.correct
                ? <span className="tag" style={{background: 'var(--success-tint)', color: 'var(--success)'}}>✓</span>
                : <span className="tag" style={{background: 'var(--danger-tint)', color: 'var(--danger)'}}>✗</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, {
  ADJECTIVE_SENTENCES, ADJECTIVE_GROUPS,
  AdjectiveQuizSetup, AdjectiveQuizRunner, AdjectiveQuizResult,
});
