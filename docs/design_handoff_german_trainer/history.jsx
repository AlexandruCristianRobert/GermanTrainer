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

/* ────── Charts ────── */

// SVG sparkline of scores over time (oldest → newest)
function ScoreTrendChart({ items }) {
  if (items.length < 2) {
    return (
      <div className="chart-empty">
        <p>Finish 2+ quizzes to see a trend.</p>
      </div>
    );
  }
  // items are newest-first, so reverse for oldest-first
  const sorted = [...items].reverse();
  const W = 560, H = 140, PAD_L = 32, PAD_R = 12, PAD_T = 12, PAD_B = 24;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;
  const n = sorted.length;
  const xs = sorted.map((_, i) => n === 1 ? PAD_L + innerW / 2 : PAD_L + (i / (n - 1)) * innerW);
  const scores = sorted.map(it => it.count > 0 ? 100 * it.correct / it.count : 0);
  const ys = scores.map(s => PAD_T + (1 - s / 100) * innerH);

  // Path
  const path = xs.map((x, i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(' ');
  // Area beneath path (closed to baseline)
  const areaPath = path + ` L ${xs[n - 1].toFixed(1)} ${PAD_T + innerH} L ${xs[0].toFixed(1)} ${PAD_T + innerH} Z`;

  // Y-axis ticks at 0, 50, 100
  const yTicks = [0, 50, 100];

  // Average line
  const avg = scores.reduce((a, b) => a + b, 0) / n;
  const avgY = PAD_T + (1 - avg / 100) * innerH;

  return (
    <svg className="chart-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      {/* y-axis grid lines */}
      {yTicks.map(t => {
        const y = PAD_T + (1 - t / 100) * innerH;
        return (
          <g key={t}>
            <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke="var(--hairline)" strokeDasharray={t === 50 ? '0' : '2 4'} />
            <text x={PAD_L - 6} y={y + 4} textAnchor="end" className="chart-axis-label">{t}%</text>
          </g>
        );
      })}

      {/* Average dashed line */}
      <line x1={PAD_L} y1={avgY} x2={W - PAD_R} y2={avgY} stroke="var(--accent)" strokeDasharray="4 4" opacity="0.5" />
      <text x={W - PAD_R - 4} y={avgY - 6} textAnchor="end" className="chart-callout">avg {avg.toFixed(0)}%</text>

      {/* Area fill */}
      <path d={areaPath} fill="var(--accent-tint)" />

      {/* Line */}
      <path d={path} fill="none" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />

      {/* Dots — highlight last 3 */}
      {xs.map((x, i) => {
        const isLast = i === n - 1;
        const isRecent = i >= n - 3;
        return (
          <circle
            key={i}
            cx={x} cy={ys[i]}
            r={isLast ? 4 : isRecent ? 2.5 : 1.6}
            fill={isLast ? 'var(--accent)' : 'var(--paper)'}
            stroke="var(--accent)"
            strokeWidth={isLast ? 0 : 1.4}
          />
        );
      })}

      {/* X-axis labels — first and last only */}
      <text x={xs[0]} y={H - 6} textAnchor="start" className="chart-axis-label">
        {fmtRelTime(sorted[0].startedAt)}
      </text>
      <text x={xs[n - 1]} y={H - 6} textAnchor="end" className="chart-axis-label">
        latest
      </text>
    </svg>
  );
}

// Calendar heatmap — last 30 days
function ActivityHeatmap({ items }) {
  // Build a map of YYYY-MM-DD → count
  const byDay = {};
  for (const it of items) {
    const d = new Date(it.startedAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    byDay[key] = (byDay[key] || 0) + 1;
  }
  // Generate last 30 days
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    days.push({ date: d, key, count: byDay[key] || 0 });
  }
  const maxCount = Math.max(1, ...days.map(d => d.count));

  return (
    <div className="heatmap">
      <div className="heatmap-grid">
        {days.map(d => {
          const intensity = d.count === 0 ? 0 : Math.max(0.18, d.count / maxCount);
          const label = `${d.date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} · ${d.count} quiz${d.count === 1 ? '' : 'zes'}`;
          return (
            <div
              key={d.key}
              className="heatmap-cell"
              title={label}
              style={{
                background: d.count === 0
                  ? 'var(--hairline)'
                  : `color-mix(in oklab, var(--accent) ${Math.round(intensity * 100)}%, transparent)`,
              }}
            />
          );
        })}
      </div>
      <div className="heatmap-scale">
        <span className="micro-mark">{days[0].date.toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</span>
        <div className="heatmap-legend">
          <span className="micro-mark">less</span>
          {[0, 0.25, 0.5, 0.75, 1].map(v => (
            <div key={v} className="heatmap-cell" style={{
              width: 11, height: 11,
              background: v === 0 ? 'var(--hairline)' : `color-mix(in oklab, var(--accent) ${v * 100}%, transparent)`,
            }} />
          ))}
          <span className="micro-mark">more</span>
        </div>
        <span className="micro-mark">today</span>
      </div>
    </div>
  );
}

// Horizontal bar by quiz type — runs per type
function TypeBreakdown({ items }) {
  const byType = {};
  for (const it of items) {
    byType[it.type] = (byType[it.type] || { runs: 0, correct: 0, total: 0 });
    byType[it.type].runs += 1;
    byType[it.type].correct += (it.correct || 0);
    byType[it.type].total += (it.count || 0);
  }
  const rows = Object.entries(byType)
    .map(([type, stats]) => ({
      type, stats,
      pct: stats.total > 0 ? Math.round(100 * stats.correct / stats.total) : 0,
    }))
    .sort((a, b) => b.stats.runs - a.stats.runs);

  if (rows.length === 0) {
    return (
      <div className="chart-empty"><p>No quizzes yet.</p></div>
    );
  }

  const maxRuns = Math.max(...rows.map(r => r.stats.runs));

  return (
    <div className="type-breakdown">
      {rows.map(r => {
        const meta = QUIZ_TYPES[r.type] || { label: r.type };
        const widthPct = (r.stats.runs / maxRuns) * 100;
        return (
          <div key={r.type} className="type-breakdown-row">
            <div className="type-breakdown-label">
              {meta.label}
              <div style={{fontStyle: 'italic', color: 'var(--mute)', fontSize: 12, fontFamily: 'var(--font-display)'}}>
                {meta.de}
              </div>
            </div>
            <div className="type-breakdown-bar-wrap">
              <div className="type-breakdown-bar" style={{width: `${widthPct}%`}} />
              <span className="type-breakdown-num">
                <strong>{r.stats.runs}</strong>
                <span style={{color: 'var(--mute)', fontFamily: 'var(--font-body)', fontStyle: 'italic', marginLeft: 6}}>
                  {r.stats.runs === 1 ? 'run' : 'runs'} · {r.pct}%
                </span>
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
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

  // Extra stats
  const scores = items.map(it => it.count > 0 ? Math.round(100 * it.correct / it.count) : 0);
  const bestPct = scores.length ? Math.max(...scores) : 0;
  const avgPct = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const totalDurMs = items.reduce((s, it) => s + (it.durationMs || 0), 0);
  const avgDurMs = items.length ? totalDurMs / items.length : 0;
  // Study days in last 30
  const now = new Date();
  const cutoff = new Date(now); cutoff.setDate(now.getDate() - 30);
  const recentDays = new Set();
  items.forEach(it => {
    const d = new Date(it.startedAt);
    if (d >= cutoff) {
      recentDays.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    }
  });
  // Most-frequent type
  const typeCounts = {};
  items.forEach(it => { typeCounts[it.type] = (typeCounts[it.type] || 0) + 1; });
  const topType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];
  const topTypeLabel = topType ? (QUIZ_TYPES[topType[0]]?.label || topType[0]) : '—';

  // Current streak (consecutive days ending today or yesterday)
  let streak = 0;
  if (items.length > 0) {
    const dayKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const dayKeys = new Set(items.map(it => dayKey(new Date(it.startedAt))));
    let cursor = new Date(now); cursor.setHours(0, 0, 0, 0);
    if (!dayKeys.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
    while (dayKeys.has(dayKey(cursor))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
  }

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

      {/* Aggregate strip — primary */}
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

      {/* Aggregate strip — secondary */}
      {items.length > 0 && (
        <div className="stat-strip stat-strip-secondary">
          <div className="stat">
            <div className="stat-num">{avgPct}<span className="stat-num-suffix">%</span></div>
            <div className="stat-label">avg score</div>
          </div>
          <div className="stat">
            <div className="stat-num">{bestPct}<span className="stat-num-suffix">%</span></div>
            <div className="stat-label">best run</div>
          </div>
          <div className="stat">
            <div className="stat-num">{streak}</div>
            <div className="stat-label">day streak</div>
          </div>
          <div className="stat">
            <div className="stat-num">{recentDays.size}<span className="stat-num-suffix">/30</span></div>
            <div className="stat-label">days active</div>
          </div>
          <div className="stat">
            <div className="stat-num">{fmtDuration(avgDurMs)}</div>
            <div className="stat-label">avg duration</div>
          </div>
          <div className="stat stat-wide">
            <div className="stat-num" style={{fontSize: 28, lineHeight: 1.1}}>{topTypeLabel}</div>
            <div className="stat-label">most practiced</div>
          </div>
        </div>
      )}

      {/* Charts row */}
      {items.length > 0 && (
        <div className="chart-row">
          <div className="chart-panel chart-panel-wide">
            <div className="chart-panel-title">
              <span className="chart-numeral">I</span>
              <div>
                <div className="chart-panel-de">Fortschritt</div>
                <div className="chart-panel-en">Score over time</div>
              </div>
            </div>
            <ScoreTrendChart items={items} />
          </div>

          <div className="chart-panel">
            <div className="chart-panel-title">
              <span className="chart-numeral">II</span>
              <div>
                <div className="chart-panel-de">Aktivität</div>
                <div className="chart-panel-en">Last 30 days</div>
              </div>
            </div>
            <ActivityHeatmap items={items} />
          </div>

          <div className="chart-panel chart-panel-wide">
            <div className="chart-panel-title">
              <span className="chart-numeral">III</span>
              <div>
                <div className="chart-panel-de">Verteilung</div>
                <div className="chart-panel-en">By quiz type</div>
              </div>
            </div>
            <TypeBreakdown items={items} />
          </div>
        </div>
      )}

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
