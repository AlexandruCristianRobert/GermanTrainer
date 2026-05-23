// ─── Quiz history — save + load + display ───

const HISTORY_KEY = 'gt:quizHistory';
const HISTORY_LIMIT = 100; // keep last 100 quiz runs

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

function saveQuizRun(entry) {
  const all = loadHistory();
  // entry: { type, startedAt, finishedAt, count, correct, durationMs, meta }
  all.unshift({
    id: entry.startedAt || Date.now(),
    ...entry,
  });
  // Trim to limit
  const trimmed = all.slice(0, HISTORY_LIMIT);
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed)); } catch (e) {}
}

function clearHistory() {
  try { localStorage.removeItem(HISTORY_KEY); } catch (e) {}
}

const QUIZ_TYPES = {
  'noun-gender':       { label: 'Noun gender',        de: 'Substantiv · der/die/das',  module: 'Nouns' },
  'noun-translation':  { label: 'Noun translation',   de: 'Substantiv · Übersetzung',  module: 'Nouns' },
  'adjective':         { label: 'Adjective sentence', de: 'Adjektiv · Lückentext',      module: 'Adjectives' },
  'verb-translation':  { label: 'Verb translation',   de: 'Verb · Übersetzung',         module: 'Verbs' },
  'verb-conjugation':  { label: 'Verb conjugation',   de: 'Verb · Konjugation',         module: 'Verbs' },
};

function fmtRelTime(ts) {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now - d;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function fmtDuration(ms) {
  if (!ms || ms < 0) return '—';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const ss = s % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${ss}s`;
}

function fmtTimeOfDay(ts) {
  const d = new Date(ts);
  return d.toLocaleString(undefined, {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function pctClass(pct) {
  if (pct >= 80) return 'success';
  if (pct >= 50) return 'ochre';
  return 'danger';
}

/* ────── History page ────── */

function HistoryPage({ navigate }) {
  const [items, setItems] = React.useState(() => loadHistory());
  const [filter, setFilter] = React.useState('all');

  const filtered = filter === 'all' ? items : items.filter(it => it.type === filter);

  // Aggregate stats
  const totalRuns = items.length;
  const totalQuestions = items.reduce((s, it) => s + (it.count || 0), 0);
  const totalCorrect = items.reduce((s, it) => s + (it.correct || 0), 0);
  const overallPct = totalQuestions > 0 ? Math.round(100 * totalCorrect / totalQuestions) : 0;

  const onClear = () => {
    if (confirm('Delete all quiz history? This cannot be undone.')) {
      clearHistory();
      setItems([]);
    }
  };

  return (
    <div className="page" data-screen-label="60 History">
      <div className="section-header">
        <div>
          <div className="breadcrumb">Verlauf · Quiz history</div>
          <h1 className="section-title">History<em>.</em></h1>
          <p className="section-subtitle">
            Every quiz you've finished, with its score, length, and time.
            Stored locally — only on this device.
          </p>
        </div>
        {items.length > 0 && (
          <div style={{textAlign: 'right'}}>
            <button className="btn btn-ghost btn-danger" onClick={onClear}>Clear history</button>
          </div>
        )}
      </div>

      {/* Aggregate strip */}
      <div className="stat-strip">
        <div className="stat">
          <div className="stat-num">{totalRuns}</div>
          <div className="stat-label">total runs</div>
        </div>
        <div className="stat">
          <div className="stat-num">{totalQuestions}</div>
          <div className="stat-label">questions answered</div>
        </div>
        <div className="stat">
          <div className="stat-num">{totalCorrect}</div>
          <div className="stat-label">correct</div>
        </div>
        <div className="stat">
          <div className="stat-num">{overallPct}<span className="stat-num-suffix">%</span></div>
          <div className="stat-label">overall</div>
        </div>
      </div>

      {/* Filter */}
      {items.length > 0 && (
        <div className="toolbar" style={{marginTop: 32}}>
          <div className="segmented">
            <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All · {items.length}</button>
            {Object.keys(QUIZ_TYPES).map(t => {
              const count = items.filter(it => it.type === t).length;
              if (count === 0) return null;
              return (
                <button key={t} className={filter === t ? 'active' : ''} onClick={() => setFilter(t)}>
                  {QUIZ_TYPES[t].label} · {count}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* List */}
      {items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-mark">∅</div>
          <h3>No quizzes yet.</h3>
          <p>Finish a quiz and it'll show up here.</p>
          <button className="btn btn-accent" onClick={() => navigate('home')}>Back to home →</button>
        </div>
      ) : (
        <table className="data-table history-table">
          <thead>
            <tr>
              <th style={{width: '24%'}}>Quiz</th>
              <th style={{width: '20%'}}>Started</th>
              <th style={{width: '12%'}}>Duration</th>
              <th style={{width: '12%'}}>Questions</th>
              <th style={{width: '18%'}}>Score</th>
              <th style={{width: '14%'}}>Filters</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((it) => {
              const meta = QUIZ_TYPES[it.type] || { label: it.type, de: '', module: '' };
              const pct = it.count > 0 ? Math.round(100 * it.correct / it.count) : 0;
              return (
                <tr key={it.id}>
                  <td>
                    <span style={{fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 18}}>
                      {meta.label}
                    </span>
                    <div style={{fontFamily: 'var(--font-display)', fontStyle: 'italic', color: 'var(--mute)', fontSize: 13, marginTop: 2}}>
                      {meta.de}
                    </div>
                  </td>
                  <td>
                    <div style={{fontFamily: 'var(--font-body)'}}>{fmtRelTime(it.startedAt)}</div>
                    <div style={{fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--mute)', marginTop: 2}}>
                      {fmtTimeOfDay(it.startedAt)}
                    </div>
                  </td>
                  <td>
                    <span className="mono" style={{color: 'var(--ink-soft)'}}>{fmtDuration(it.durationMs)}</span>
                  </td>
                  <td>
                    <span className="mono">{it.count}</span>
                    <span style={{fontFamily: 'var(--font-body)', fontStyle: 'italic', color: 'var(--mute)', marginLeft: 4, fontSize: 13}}>asked</span>
                  </td>
                  <td>
                    <div style={{display: 'flex', alignItems: 'baseline', gap: 8}}>
                      <span style={{fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 500}}>
                        {it.correct}<span style={{color: 'var(--mute)'}}>/{it.count}</span>
                      </span>
                      <span className={'tag history-pct history-pct-' + pctClass(pct)}>{pct}%</span>
                    </div>
                  </td>
                  <td>
                    <div style={{fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-soft)', lineHeight: 1.5}}>
                      {summariseMeta(it)}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

function summariseMeta(it) {
  const m = it.meta || {};
  const parts = [];
  if (m.mode) parts.push(m.mode);
  if (m.groups && m.groups.length) {
    parts.push(`${m.groups.length} group${m.groups.length === 1 ? '' : 's'}`);
  }
  if (m.levels && m.levels.length) {
    parts.push(m.levels.join('/'));
  }
  if (m.types && m.types.length && m.types.length < 5) {
    parts.push(m.types.join(', '));
  }
  return parts.length ? parts.join(' · ') : '—';
}

Object.assign(window, { saveQuizRun, loadHistory, clearHistory, HistoryPage, QUIZ_TYPES });
