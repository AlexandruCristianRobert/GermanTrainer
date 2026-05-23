// ─── Nouns module: landing, manage, quiz setup, quiz runner (gender), result ───

function NounsLanding({ navigate }) {
  const cards = [
  {
    numeral: 'A',
    title: 'Manage nouns',
    de: 'Verwalten',
    desc: 'Add, edit, or delete your noun deck. Reset to defaults restores the curated seed list.',
    cta: 'Open',
    route: 'nouns/manage'
  },
  {
    numeral: 'B',
    title: 'Quiz',
    de: 'Übung',
    desc: 'Pick gender (der/die/das) or English translation mode, choose your groups, and quiz yourself on N random nouns.',
    cta: 'Start',
    route: 'nouns/quiz'
  }];


  return (
    <div className="page">
      <div className="section-header" data-screen-label="10 Nouns landing">
        <div>
          <div className="breadcrumb">Kapitel I · Substantive</div>
          <h1 className="section-title">Nouns<em>.</em></h1>
          <p className="section-subtitle">
            German nouns have three genders — masculine, feminine, neuter — and the article
            has to be stored alongside the word. Quiz the gender or the translation.
          </p>
        </div>
      </div>

      <div className="module-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        {cards.map((c) =>
        <article
          key={c.route}
          className="card module-card interactive"
          onClick={() => navigate(c.route)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {if (e.key === 'Enter') navigate(c.route);}}>
          
            <div className="module-numeral">{c.numeral}</div>
            <h2>{c.title}</h2>
            <div className="module-de">{c.de}</div>
            <p className="module-desc">{c.desc}</p>
            <div className="module-cta">{c.cta} <span aria-hidden="true">→</span></div>
          </article>
        )}
      </div>
    </div>);

}

/* ────── Manage nouns ────── */

function ManageNouns({ navigate }) {
  const [search, setSearch] = React.useState('');
  const filtered = NOUNS.filter((n) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return n.german.toLowerCase().includes(q) ||
    n.english.toLowerCase().includes(q) ||
    n.group.toLowerCase().includes(q);
  });

  return (
    <div className="page">
      <div className="section-header" data-screen-label="11 Manage nouns">
        <div>
          <div className="breadcrumb">Kapitel I · Verwaltung</div>
          <h1 className="section-title">Manage<em>.</em></h1>
          <p className="section-subtitle">
            Add custom entries to your deck. Search across German, English, and group.
            Your changes live in your browser only.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button className="btn btn-ghost btn-danger">Reset to seed</button>
          <button className="btn btn-accent">＋ Add noun</button>
        </div>
      </div>

      <div className="toolbar">
        <input
          className="input search-input"
          placeholder="Search the deck…"
          value={search}
          onChange={(e) => setSearch(e.target.value)} />
        
        <span className="micro-mark">{filtered.length} of {NOUNS.length} entries</span>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th style={{ width: '36%' }}>German</th>
            <th style={{ width: '12%' }}>Gender</th>
            <th style={{ width: '30%' }}>English</th>
            <th style={{ width: '14%' }}>Group</th>
            <th style={{ width: '8%', textAlign: 'right' }}>·</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((n) => {
            const genderClass = n.gender === 'der' ? 'tag-cobalt' : n.gender === 'die' ? 'tag-clay' : 'tag-ochre';
            return (
              <tr key={n.german}>
                <td>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 19 }}>
                    <span style={{ color: 'var(--mute)', fontStyle: 'italic', fontWeight: 400 }}>{n.gender}</span>{' '}{n.german}
                  </span>
                </td>
                <td><span className={'tag ' + genderClass}>{n.gender}</span></td>
                <td style={{ color: 'var(--ink-soft)' }}>{n.english}</td>
                <td><span className="tag">{n.group}</span></td>
                <td style={{ textAlign: 'right' }}>
                  <button className="btn-quiet btn" style={{ fontSize: 13 }}>Edit</button>
                </td>
              </tr>);

          })}
          {filtered.length === 0 &&
          <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--mute)', fontStyle: 'italic' }}>No entries.</td></tr>
          }
        </tbody>
      </table>
    </div>);

}

/* ────── Noun quiz setup ────── */

function NounQuizSetup({ navigate, startQuiz }) {
  const [selected, setSelected] = React.useState(() => new Set(['Food', 'Family', 'Animals', 'Nature & Weather', 'Furniture', 'House']));
  const [mode, setMode] = React.useState('gender');
  const [count, setCount] = React.useState(10);
  const [customCount, setCustomCount] = React.useState(15);

  const totalAvailable = Array.from(selected).reduce((sum, g) => sum + (GROUP_COUNTS[g] || 0), 0);
  const effectiveCount = count === 'custom' ? Math.min(customCount, totalAvailable) : count === 'all' ? totalAvailable : Math.min(count, totalAvailable);

  const toggle = (g) => {
    const next = new Set(selected);
    if (next.has(g)) next.delete(g);else next.add(g);
    setSelected(next);
  };

  const start = () => {
    startQuiz({ groups: Array.from(selected), mode, count: effectiveCount });
    navigate('nouns/quiz/run');
  };

  return (
    <div className="page" style={{ maxWidth: 720, margin: '0 auto' }}>
      <div className="section-header" data-screen-label="12 Noun quiz setup">
        <div>
          <div className="breadcrumb">Kapitel I · Übung · Einrichtung</div>
          <h1 className="section-title">Setup<em>.</em></h1>
          <p className="section-subtitle">
            Pick the groups, the mode, and how many questions. Your choices are remembered.
          </p>
        </div>
      </div>

      <div className="field">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div className="field-label">Groups · {selected.size} of {NOUN_GROUPS.length}</div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="btn btn-quiet" onClick={() => setSelected(new Set(NOUN_GROUPS))}>All</button>
            <button className="btn btn-quiet" onClick={() => setSelected(new Set())}>None</button>
          </div>
        </div>
        <div className="chip-row">
          {NOUN_GROUPS.map((g) =>
          <button
            key={g}
            className={'chip' + (selected.has(g) ? ' selected' : '')}
            onClick={() => toggle(g)}>
            
              <span>{g}</span>
              <span className="chip-count">{GROUP_COUNTS[g] || 0}</span>
            </button>
          )}
        </div>
      </div>

      <div className="field">
        <div className="field-label">Mode</div>
        <div className="segmented">
          <button className={mode === 'gender' ? 'active' : ''} onClick={() => setMode('gender')}>Gender · der/die/das</button>
          <button className={mode === 'translation' ? 'active' : ''} onClick={() => setMode('translation')}>English translation</button>
        </div>
      </div>

      <div className="field">
        <div className="field-label">Number of questions</div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="segmented">
            {[10, 15, 20, 'all', 'custom'].map((n) =>
            <button key={n} className={count === n ? 'active' : ''} onClick={() => setCount(n)}>
                {n === 'custom' ? 'Custom' : n === 'all' ? `All · ${totalAvailable}` : n}
              </button>
            )}
          </div>
          {count === 'custom' &&
          <input
            className="input"
            type="number"
            min="1"
            max={totalAvailable}
            value={customCount}
            onChange={(e) => setCustomCount(parseInt(e.target.value) || 1)}
            style={{ width: 80, fontSize: 17, padding: '4px 0' }} />

          }
          <span className="micro-mark" style={{ marginLeft: 'auto' }}>{totalAvailable} available</span>
        </div>
      </div>

      {totalAvailable > 0 && count !== 'custom' && count > totalAvailable &&
      <div className="alert alert-info">
          <span className="alert-label">Info</span>
          Only {totalAvailable} nouns available in selected groups — quizzing all of them.
        </div>
      }
      {selected.size === 0 &&
      <div className="alert alert-warning">
          <span className="alert-label">Warning</span>
          Pick at least one group to begin.
        </div>
      }

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 40, gap: 16 }}>
        <button className="btn btn-ghost" onClick={() => navigate('nouns')}>← Back</button>
        <button
          className="btn btn-accent"
          disabled={selected.size === 0 || totalAvailable === 0}
          onClick={start}>
          
          Start quiz · {effectiveCount} questions →
        </button>
      </div>
    </div>);

}

/* ────── Noun gender quiz runner ────── */

function genderTagClass(g) {
  return g === 'der' ? 'tag-cobalt' : g === 'die' ? 'tag-clay' : 'tag-ochre';
}

function buildDeck(config) {
  // Filter by groups, pick N at random
  const pool = NOUNS.filter((n) => config.groups.includes(n.group));
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(config.count, pool.length));
}

function GenderQuizRunner({ navigate, config, onFinish }) {
  // If no config (deep-linked), build a default deck
  const cfg = config || { groups: ['Food', 'Family', 'Animals', 'Nature & Weather', 'Furniture', 'House'], mode: 'gender', count: 10 };
  const [deck] = React.useState(() => buildDeck(cfg));
  const [idx, setIdx] = React.useState(0);
  const [picked, setPicked] = React.useState(null);
  const [history, setHistory] = React.useState([]);
  const [margIdx, setMargIdx] = React.useState(() => Math.floor(Math.random() * GENDER_MARGINALIA.length));

  const total = deck.length;
  const noun = deck[idx];
  const nextBtnRef = React.useRef(null);

  React.useEffect(() => {
    if (picked && nextBtnRef.current) nextBtnRef.current.focus();
  }, [picked]);

  if (!noun) {
    return (
      <ResultScreen
        navigate={navigate}
        history={history}
        total={total} />);


  }

  const onPick = (g) => {
    if (picked) return;
    setPicked(g);
  };

  const onNext = () => {
    const correct = picked === noun.gender;
    setHistory([...history, { noun, picked, correct }]);
    setMargIdx((margIdx + 1) % GENDER_MARGINALIA.length);
    setPicked(null);
    setIdx(idx + 1);
  };

  const isCorrect = picked === noun.gender;
  const marg = GENDER_MARGINALIA[margIdx];

  // Progress pips
  const pips = [];
  for (let i = 0; i < total; i++) {
    let cls = '';
    if (i < history.length) cls = history[i].correct ? 'done' : 'wrong';else
    if (i === idx && picked) cls = isCorrect ? 'done' : 'wrong';else
    if (i === idx) cls = 'current';
    pips.push(cls);
  }

  return (
    <div className="page" data-screen-label="13 Noun quiz runner (gender)">

      <div className="quiz-stage">
        <div>
          <div className="quiz-meta">
            <span className="quiz-counter">Frage {idx + 1} · von {total}</span>
            <button className="btn btn-quiet" onClick={() => navigate('nouns/quiz')}>End quiz</button>
          </div>

          <div className="quiz-progress-bar">
            {pips.map((cls, i) => <div key={i} className={'pip ' + cls}></div>)}
          </div>

          <div className="prompt-card">
            <span className="tag" style={{ position: 'absolute', top: 16, left: 0, fontSize: 10 }}>{noun.group}</span>
            <div className="prompt-german">{noun.german}</div>
            <div className="prompt-english">{noun.english}</div>
          </div>

          <div className="gender-row">
            {['der', 'die', 'das'].map((g) => {
              let cls = '';
              let dim = false;
              if (picked) {
                if (g === noun.gender) cls = ' correct';else
                if (g === picked) cls = ' wrong';else
                dim = true;
              }
              const style = picked ?
              { pointerEvents: 'none', ...(dim ? { opacity: 0.35 } : {}) } :
              undefined;
              return (
                <button
                  key={g}
                  className={'gender-btn' + cls}
                  style={style}
                  onClick={() => onPick(g)}
                  aria-disabled={!!picked}>
                  
                  {g}
                  <span className="sub">{g === 'der' ? 'masculine' : g === 'die' ? 'feminine' : 'neuter'}</span>
                </button>);

            })}
          </div>

          <div className={'feedback-line' + (picked ? isCorrect ? ' correct' : ' wrong' : '')}>
            {!picked && <span style={{ color: 'var(--mute)', fontStyle: 'italic' }}>Pick an article.</span>}
            {picked && isCorrect && '✓ Richtig.'}
            {picked && !isCorrect && <>✗ Richtig wäre — <strong>{noun.gender}</strong> {noun.german}.</>}
          </div>

          <div className="quiz-actions">
            <span className="micro-mark">Press <span className="kbd">Enter</span> to advance</span>
            <button
              ref={nextBtnRef}
              className="btn btn-accent"
              disabled={!picked}
              onClick={onNext}>
              
              {idx + 1 === total ? 'Finish quiz' : 'Next'} →
            </button>
          </div>
        </div>

        <aside className="marginalia">
          <div className="marg-section">
            <div className="marg-label">{marg.label}</div>
            <p className="marg-quote">{marg.quote}</p>
            <p style={{ margin: 0 }}>{marg.body}</p>
          </div>

          <div className="marg-section">
            <div className="marg-label">Score so far</div>
            <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 500, letterSpacing: '-0.01em' }}>
              {history.filter((h) => h.correct).length}
              <span style={{ color: 'var(--mute)' }}> / {history.length || '0'}</span>
            </p>
            <p style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--mute)', margin: 0, marginTop: 4, letterSpacing: '0.06em' }}>
              answered · {total - idx - (picked ? 1 : 0)} remaining
            </p>
          </div>

          <div className="marg-section">
            <div className="marg-label">Legend</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
              <div><span className="tag tag-cobalt">der</span> <em>masculine</em></div>
              <div><span className="tag tag-clay">die</span> <em>feminine</em></div>
              <div><span className="tag tag-ochre">das</span> <em>neuter</em></div>
            </div>
          </div>
        </aside>
      </div>
    </div>);

}

/* ────── Result screen ────── */

function ResultScreen({ navigate, history, total }) {
  const correct = history.filter((h) => h.correct).length;
  const pct = Math.round(correct / total * 100);

  return (
    <div className="page" style={{ maxWidth: 880, margin: '0 auto' }} data-screen-label="14 Quiz result">
      <div className="section-header">
        <div>
          <div className="breadcrumb">Auswertung · Ergebnis</div>
          <div className="result-score">
            {correct}<span className="denom"> / {total}</span>
          </div>
          <p className="section-subtitle">
            {pct >= 80 && 'Stark. Most of these are in your bones now.'}
            {pct >= 50 && pct < 80 && 'Solid. A couple weak spots to revisit.'}
            {pct < 50 && 'Keep at it — the gendered articles are the slowest to internalise.'}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <button className="btn btn-ghost" onClick={() => navigate('nouns/quiz')}>Setup another</button>{' '}
          <button className="btn btn-accent" onClick={() => navigate('nouns/quiz')}>Start another quiz →</button>
        </div>
      </div>

      <div className="result-list">
        {history.map((h, i) =>
        <div key={i} className="result-row">
            <div className="german">
              <span style={{ color: 'var(--mute)', fontStyle: 'italic', fontWeight: 400 }}>{h.noun.gender}</span>{' '}
              {h.noun.german}
              <div style={{ fontFamily: 'var(--font-body)', fontStyle: 'italic', fontSize: 14, color: 'var(--ink-soft)', fontWeight: 400 }}>
                {h.noun.english}
              </div>
            </div>
            <div className="answers">
              your answer: <strong style={{ color: h.correct ? 'var(--success)' : 'var(--danger)' }}>{h.picked || '—'}</strong>
              {!h.correct && <span> · correct: <strong>{h.noun.gender}</strong></span>}
            </div>
            <div>
              {h.correct ?
            <span className="tag" style={{ background: 'var(--success-tint)', color: 'var(--success)' }}>✓ Correct</span> :
            <span className="tag" style={{ background: 'var(--danger-tint)', color: 'var(--danger)' }}>✗ Missed</span>}
            </div>
          </div>
        )}
      </div>
    </div>);

}

Object.assign(window, { NounsLanding, ManageNouns, NounQuizSetup, GenderQuizRunner, ResultScreen });