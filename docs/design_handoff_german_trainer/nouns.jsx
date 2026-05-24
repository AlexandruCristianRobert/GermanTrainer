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

  const pagination = usePagination(filtered, 25);

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
          {pagination.slice.map((n) => {
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

      <Pagination pagination={pagination} label="nouns" pageSizeOptions={[10, 25, 50, 100]} />
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
          className="btn btn-accent btn-meta"
          disabled={selected.size === 0 || totalAvailable === 0}
          onClick={start}>
          <span className="bm-main">Start quiz <span aria-hidden="true">→</span></span>
          <span className="bm-sub">{effectiveCount} questions</span>
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

/* ────── Noun quiz runner (one-at-a-time, both gender and translation modes) ────── */

function NounQuizRunner({ navigate, config }) {
  const cfg = config || { groups: ['Food', 'Family', 'Animals', 'Nature & Weather', 'Furniture', 'House'], mode: 'gender', count: 10 };
  const [deck] = React.useState(() => buildDeck(cfg));
  const [idx, setIdx] = React.useState(0);
  const [picked, setPicked] = React.useState(null);
  const [input, setInput] = React.useState('');
  const [submitted, setSubmitted] = React.useState(false);
  const [history, setHistory] = React.useState([]);
  const [margIdx, setMargIdx] = React.useState(() => Math.floor(Math.random() * GENDER_MARGINALIA.length));
  const [startedAt] = React.useState(() => Date.now());
  const savedRef = React.useRef(false);

  const total = deck.length;
  const mode = cfg.mode;
  const isGender = mode === 'gender';
  const noun = deck[idx];
  const inputRef = React.useRef(null);
  const nextBtnRef = React.useRef(null);

  React.useEffect(() => {
    if (!isGender && !submitted && inputRef.current) inputRef.current.focus();
  }, [idx, submitted, isGender]);

  React.useEffect(() => {
    if ((isGender ? picked : submitted) && nextBtnRef.current) nextBtnRef.current.focus();
  }, [picked, submitted, isGender]);

  if (!noun) {
    if (!savedRef.current && history.length > 0) {
      savedRef.current = true;
      const correctCount = history.filter(h => h.correct).length;
      const finishedAt = Date.now();
      saveQuizRun({
        type: isGender ? 'noun-gender' : 'noun-translation',
        startedAt: new Date(startedAt).toISOString(),
        finishedAt: new Date(finishedAt).toISOString(),
        durationMs: finishedAt - startedAt,
        count: total,
        correct: correctCount,
        meta: { mode, groups: cfg.groups || [] },
      });
    }
    return <ResultScreen navigate={navigate} history={history} total={total} mode={mode} />;
  }

  const isCorrect = isGender
    ? picked === noun.gender
    : submitted && checkNounTranslation(input, noun.english);

  const onPick = (g) => {
    if (picked) return;
    setPicked(g);
  };

  const onSubmit = (e) => {
    e?.preventDefault?.();
    if (submitted || !input.trim()) return;
    setSubmitted(true);
  };

  const onNext = () => {
    const entry = isGender
      ? { noun, picked, correct: picked === noun.gender }
      : { noun, input, correct: checkNounTranslation(input, noun.english) };
    setHistory([...history, entry]);
    setMargIdx((margIdx + 1) % GENDER_MARGINALIA.length);
    setPicked(null);
    setInput('');
    setSubmitted(false);
    setIdx(idx + 1);
  };

  const advance = isGender ? !!picked : submitted;

  const marg = GENDER_MARGINALIA[margIdx];

  return (
    <div className="page" data-screen-label={isGender ? '13 Noun gender runner' : '13b Noun translation runner'}>
      <div className="quiz-stage">
        <div>
          <div className="quiz-meta">
            <span className="quiz-counter">Frage {idx + 1} · von {total}</span>
            <button className="btn btn-quiet" onClick={() => navigate('nouns/quiz')}>End quiz</button>
          </div>

          <QuizProgress history={history} total={total} idx={idx} advance={advance} isCorrect={isCorrect} />

          <div className="prompt-card">
            <span className="tag" style={{ position: 'absolute', top: 16, left: 0, fontSize: 10 }}>{noun.group}</span>
            <div className="prompt-german" style={{fontSize: 'var(--noun-prompt-size, 92px)'}}>
              {isGender ? noun.german : <><span style={{color: 'var(--mute)', fontStyle: 'italic', fontWeight: 400}}>{noun.gender}</span> {noun.german}</>}
            </div>
            {isGender && <div className="prompt-english">{noun.english}</div>}
          </div>

          {isGender ? (
            <>
              <div className="gender-row">
                {['der', 'die', 'das'].map((g) => {
                  let cls = '';
                  let dim = false;
                  if (picked) {
                    if (g === noun.gender) cls = ' correct';
                    else if (g === picked) cls = ' wrong';
                    else dim = true;
                  }
                  const style = picked
                    ? { pointerEvents: 'none', ...(dim ? { opacity: 0.35 } : {}) }
                    : undefined;
                  return (
                    <button
                      key={g}
                      className={'gender-btn' + cls}
                      style={style}
                      onClick={() => onPick(g)}
                      aria-disabled={!!picked}
                    >
                      {g}
                      <span className="sub">{g === 'der' ? 'masculine' : g === 'die' ? 'feminine' : 'neuter'}</span>
                    </button>
                  );
                })}
              </div>

              <div className={'feedback-line' + (picked ? (isCorrect ? ' correct' : ' wrong') : '')}>
                {!picked && <span style={{ color: 'var(--mute)', fontStyle: 'italic' }}>Pick an article.</span>}
                {picked && isCorrect && '✓ Richtig.'}
                {picked && !isCorrect && <>✗ Richtig wäre — <strong>{noun.gender}</strong> {noun.german}.</>}
              </div>
            </>
          ) : (
            <>
              <form onSubmit={onSubmit} className="translation-input-wrap">
                <input
                  ref={inputRef}
                  className="input"
                  type="text"
                  placeholder="English meaning"
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
                  <button className="btn btn-accent" type="submit" disabled={!input.trim()}>Submit →</button>
                )}
              </form>

              <div className={'feedback-line' + (submitted ? (isCorrect ? ' correct' : ' wrong') : '')}>
                {!submitted && <span style={{color: 'var(--mute)', fontStyle: 'italic'}}>Type the English meaning. Press Enter to submit.</span>}
                {submitted && isCorrect && '✓ Richtig.'}
                {submitted && !isCorrect && <>✗ Korrekt — <strong>{noun.english}</strong></>}
              </div>
            </>
          )}

          <div className="quiz-actions">
            <span className="micro-mark">Press <span className="kbd">Enter</span> to {advance ? 'advance' : (isGender ? 'pick first' : 'submit')}</span>
            <button
              ref={nextBtnRef}
              className="btn btn-accent"
              disabled={!advance}
              onClick={onNext}
            >
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
              answered · {total - idx - (advance ? 1 : 0)} remaining
            </p>
          </div>

          {isGender && (
            <div className="marg-section">
              <div className="marg-label">Legend</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
                <div><span className="tag tag-cobalt">der</span> <em>masculine</em></div>
                <div><span className="tag tag-clay">die</span> <em>feminine</em></div>
                <div><span className="tag tag-ochre">das</span> <em>neuter</em></div>
              </div>
            </div>
          )}
        </aside>
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
  const wrong = total - correct;
  const pct = total > 0 ? Math.round(correct / total * 100) : 0;
  const isGender = mode !== 'translation';

  const pagination = usePagination(history, 10);

  return (
    <div className="page" style={{ maxWidth: 920, margin: '0 auto' }} data-screen-label="14 Quiz result">
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

      <div className="verb-result-summary">
        <div className="vrs-cell is-correct">
          <div className="vrs-num">{correct}</div>
          <div className="vrs-label">Richtig · correct</div>
        </div>
        <div className="vrs-cell is-wrong">
          <div className="vrs-num">{wrong}</div>
          <div className="vrs-label">Falsch · missed</div>
        </div>
        <div className="vrs-cell">
          <div className="vrs-num">{pct}<span style={{fontSize: 20, color: 'var(--mute)'}}>%</span></div>
          <div className="vrs-label">Quote · score</div>
        </div>
      </div>

      <div className="verb-result-list">
        {pagination.slice.map((h, i) => {
          const idx = pagination.start + i;
          const yourAnswer = isGender ? h.picked : (h.input || '').trim();
          const expectedAnswer = isGender ? h.noun.gender : h.noun.english;
          return (
            <article key={idx} className={'verb-result-card ' + (h.correct ? 'is-correct' : 'is-wrong')}>
              <span className="verb-result-num">№ {String(idx + 1).padStart(2, '0')}</span>

              <div className="verb-result-prompt">
                <div className="vrp-german">
                  <span style={{color: 'var(--mute)', fontStyle: 'italic', fontWeight: 400}}>{h.noun.gender}</span>{' '}
                  {h.noun.german}
                </div>
                <div className="vrp-meta">
                  <span>{h.noun.english}</span>
                  {h.noun.group && (
                    <>
                      <span className="vrp-dot">·</span>
                      <span>{h.noun.group}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="verb-result-answers">
                {h.correct ? (
                  <div className="verb-result-line">
                    <span className="vrl-label">Antwort</span>
                    <span className="vr-stamp vr-stamp-right">{yourAnswer || expectedAnswer}</span>
                  </div>
                ) : (
                  <>
                    <div className="verb-result-line">
                      <span className="vrl-label">Du · you</span>
                      {yourAnswer
                        ? <span className="vr-stamp vr-stamp-wrong">{yourAnswer}</span>
                        : <span className="vr-stamp vr-stamp-empty">— no answer —</span>}
                    </div>
                    <div className="verb-result-line">
                      <span className="vrl-label">Richtig</span>
                      <span className="vr-stamp vr-stamp-right">{expectedAnswer}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="verb-result-mark" aria-hidden="true">
                {h.correct ? '✓' : '✗'}
              </div>
            </article>
          );
        })}
      </div>

      <Pagination pagination={pagination} label="questions" pageSizeOptions={[10, 25, 50]} />
    </div>);

}

Object.assign(window, { NounsLanding, ManageNouns, NounQuizSetup, NounQuizRunner, NounQuizResult, ResultScreen });