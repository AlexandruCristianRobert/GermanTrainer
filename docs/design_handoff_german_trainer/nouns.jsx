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

/* ────── Noun quiz runner (test-sheet for both gender and translation modes) ────── */

function NounQuizRunner({ navigate, config }) {
  const cfg = config || { groups: ['Food', 'Family', 'Animals', 'Nature & Weather', 'Furniture', 'House'], mode: 'gender', count: 10 };
  const [deck] = React.useState(() => buildDeck(cfg));
  const [answers, setAnswers] = React.useState(() => deck.map(() => null));
  const [startedAt] = React.useState(() => Date.now());
  const refs = React.useRef([]);

  const total = deck.length;
  const mode = cfg.mode;
  const isGender = mode === 'gender';

  const setAnswer = (i, v) => {
    const next = [...answers];
    next[i] = v;
    setAnswers(next);
  };

  const isFilled = (a) => isGender ? !!a : (a && a.trim().length > 0);
  const filledCount = answers.filter(isFilled).length;

  const onSubmitAll = () => {
    const graded = deck.map((noun, i) => {
      const a = answers[i];
      const correct = isGender
        ? a === noun.gender
        : !!(a && checkNounTranslation(a, noun.english));
      return { noun, picked: isGender ? a : null, input: !isGender ? a : null, correct };
    });
    const finishedAt = Date.now();
    const correctCount = graded.filter(g => g.correct).length;
    saveQuizRun({
      type: isGender ? 'noun-gender' : 'noun-translation',
      startedAt: new Date(startedAt).toISOString(),
      finishedAt: new Date(finishedAt).toISOString(),
      durationMs: finishedAt - startedAt,
      count: total,
      correct: correctCount,
      meta: {
        mode,
        groups: cfg.groups || [],
      },
    });
    window.__lastNounQuiz = { history: graded, total, mode };
    navigate('nouns/quiz/result');
  };

  // Auto-focus first translation input on mount
  React.useEffect(() => {
    if (!isGender && refs.current[0]) refs.current[0].focus();
  }, [isGender]);

  const onKeyDown = (e, i) => {
    if (isGender) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      if (i + 1 < total && refs.current[i + 1]) refs.current[i + 1].focus();
      else if (i + 1 === total) document.getElementById('submit-all-noun')?.focus();
    }
  };

  const headerTitle = isGender ? 'Genus' : 'Übersetzung';
  const headerSub = isGender
    ? 'Pick the article for each noun. der · die · das.'
    : 'Type the English meaning of each noun. Multiple meanings can be separated by "/".';

  return (
    <div className="page" data-screen-label={isGender ? '13 Noun gender test-sheet' : '13b Noun translation test-sheet'}>
      <div className="test-sheet">
        <div className="section-header" style={{marginBottom: 0}}>
          <div>
            <div className="breadcrumb">Kapitel I · {isGender ? 'Genus' : 'Übersetzen'} · {total} Substantive</div>
            <h1 className="section-title">{headerTitle}<em>.</em></h1>
            <p className="section-subtitle">{headerSub}</p>
          </div>
          <button className="btn btn-quiet" onClick={() => navigate('nouns/quiz')}>End quiz</button>
        </div>

        <div className="test-sheet-header">
          <span className="filled-count">
            <strong>{filledCount}</strong> · von {total} ausgefüllt
          </span>
          <div className="quiz-progress-bar" style={{flex: 1, maxWidth: 280, marginBottom: 0, marginLeft: 24}}>
            {deck.map((_, i) => (
              <div key={i} className={'pip ' + (isFilled(answers[i]) ? 'current' : '')}></div>
            ))}
          </div>
        </div>

        <div style={{marginTop: 16}}>
          {deck.map((noun, i) => {
            return (
              <div key={i} className={'test-row' + (isFilled(answers[i]) ? ' is-filled' : '')}>
                <div className="test-num">
                  <strong>{String(i + 1).padStart(2, '0')}.</strong>
                </div>
                <div className="test-content">
                  <div className="test-prompt-row">
                    <span className="test-verb">{noun.german}</span>
                    <span className="test-chips">
                      <span className="tag">{noun.group}</span>
                      {!isGender && (
                        <span style={{
                          fontFamily: 'var(--font-display)', fontStyle: 'italic',
                          fontSize: 13, color: 'var(--mute)'
                        }}>
                          {noun.gender}
                        </span>
                      )}
                    </span>
                  </div>
                  {isGender ? (
                    <div className="inline-gender-row">
                      {['der', 'die', 'das'].map((g) => (
                        <button
                          key={g}
                          type="button"
                          className={'inline-gender-btn' + (answers[i] === g ? ' selected' : '')}
                          onClick={() => setAnswer(i, g)}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <input
                      ref={(el) => { refs.current[i] = el; }}
                      className="test-input"
                      type="text"
                      placeholder="English meaning…"
                      value={answers[i] || ''}
                      onChange={(e) => setAnswer(i, e.target.value)}
                      onKeyDown={(e) => onKeyDown(e, i)}
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck="false"
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="test-sheet-footer">
          <span className="filled-count">
            <strong>{filledCount}</strong> filled · {total - filledCount} remaining
          </span>
          <button
            id="submit-all-noun"
            className="btn btn-accent"
            onClick={onSubmitAll}
            disabled={filledCount === 0}
          >
            Submit all · {total} {isGender ? 'nouns' : 'translations'} →
          </button>
        </div>
      </div>
    </div>
  );
}

function checkNounTranslation(input, expectedEnglish) {
  const norm = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const want = norm(input);
  if (!want) return false;
  const alts = expectedEnglish.split('/').map(norm);
  return alts.includes(want);
}

function NounQuizResult({ navigate }) {
  const stashed = window.__lastNounQuiz;
  const history = stashed?.history || [];
  const total = stashed?.total || history.length;
  const mode = stashed?.mode || 'gender';
  return <ResultScreen navigate={navigate} history={history} total={total} mode={mode} />;
}

/* ────── Result screen ────── */

function ResultScreen({ navigate, history, total, mode }) {
  const correct = history.filter((h) => h.correct).length;
  const pct = total > 0 ? Math.round(correct / total * 100) : 0;
  const isGender = mode !== 'translation';

  return (
    <div className="page" style={{ maxWidth: 880, margin: '0 auto' }} data-screen-label="14 Quiz result">
      <div className="section-header">
        <div>
          <div className="breadcrumb">Auswertung · {isGender ? 'Genus' : 'Übersetzung'}</div>
          <div className="result-score">
            {correct}<span className="denom"> / {total}</span>
          </div>
          <p className="section-subtitle">
            {pct >= 80 && 'Stark. Most of these are in your bones now.'}
            {pct >= 50 && pct < 80 && 'Solid. A couple weak spots to revisit.'}
            {pct < 50 && (isGender ? 'Keep at it — the gendered articles are the slowest to internalise.' : 'Worth another pass. Translations stick with repetition.')}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <button className="btn btn-ghost" onClick={() => navigate('nouns/quiz')}>Setup another</button>{' '}
          <button className="btn btn-accent" onClick={() => navigate('nouns/quiz')}>Start another quiz →</button>
        </div>
      </div>

      <div className="result-list">
        {history.map((h, i) => {
          const yourAnswer = isGender ? h.picked : h.input;
          const expectedAnswer = isGender ? h.noun.gender : h.noun.english;
          return (
            <div key={i} className="result-row">
              <div className="german">
                <span style={{ color: 'var(--mute)', fontStyle: 'italic', fontWeight: 400 }}>{h.noun.gender}</span>{' '}
                {h.noun.german}
                <div style={{ fontFamily: 'var(--font-body)', fontStyle: 'italic', fontSize: 14, color: 'var(--ink-soft)', fontWeight: 400 }}>
                  {h.noun.english}
                </div>
              </div>
              <div className="answers">
                your answer: <strong style={{ color: h.correct ? 'var(--success)' : 'var(--danger)' }}>{yourAnswer || '—'}</strong>
                {!h.correct && <span> · {isGender ? 'correct' : 'expected'}: <strong>{expectedAnswer}</strong></span>}
              </div>
              <div>
                {h.correct ?
                <span className="tag" style={{ background: 'var(--success-tint)', color: 'var(--success)' }}>✓ Correct</span> :
                <span className="tag" style={{ background: 'var(--danger-tint)', color: 'var(--danger)' }}>✗ Missed</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>);

}

Object.assign(window, { NounsLanding, ManageNouns, NounQuizSetup, NounQuizRunner, NounQuizResult, ResultScreen });