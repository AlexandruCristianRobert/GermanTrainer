// ─── Nav shell — top header with logo, links, theme + tweaks toggles ───

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4"></circle>
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"></path>
    </svg>
  );
}
function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
    </svg>
  );
}
function BurgerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M3 6h18M3 12h18M3 18h18"></path>
    </svg>
  );
}

const NAV_ITEMS = [
  { route: 'home', label: 'Home' },
  { route: 'nouns', label: 'Nouns', de: 'Substantive' },
  { route: 'adjectives', label: 'Adjectives', de: 'Adjektive' },
  { route: 'verbs', label: 'Verbs', de: 'Verben' },
  { route: 'history', label: 'History', de: 'Verlauf' },
  { route: 'settings', label: 'Settings', de: 'Einstellungen' },
];

function NavLink({ item, active, onClick }) {
  return (
    <button
      className={'nav-link' + (active ? ' active' : '')}
      onClick={onClick}
    >
      {item.label}
    </button>
  );
}

function NavShell({ route, navigate, theme, toggleTheme }) {
  const [open, setOpen] = React.useState(false);

  // The active top-level route — strip subpath
  const top = route.split('/')[0];

  return (
    <React.Fragment>
      <header className="nav">
        <div className="nav-inner">
          <a
            className="nav-mark"
            href="#"
            onClick={(e) => { e.preventDefault(); navigate('home'); }}
            style={{borderBottom: 0, color: 'inherit', textDecoration: 'none'}}
          >
            <span className="mark-title">Grammatik</span>
            <span className="mark-sub">Atelier · German Trainer</span>
          </a>

          <nav className="nav-links">
            {NAV_ITEMS.map((it) => (
              <NavLink
                key={it.route}
                item={it}
                active={top === it.route}
                onClick={() => navigate(it.route)}
              />
            ))}
          </nav>

          <div className="nav-actions">
            <VersionBadge navigate={navigate} />
            <button
              className="icon-btn"
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Light' : 'Dark'}
            >
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>
            <button
              className="icon-btn nav-burger"
              aria-label="Open menu"
              onClick={() => setOpen(true)}
            >
              <BurgerIcon />
            </button>
          </div>
        </div>
      </header>

      <div
        className={'drawer-backdrop' + (open ? ' open' : '')}
        onClick={() => setOpen(false)}
      ></div>
      <aside className={'drawer' + (open ? ' open' : '')}>
        <div className="drawer-mark">
          <div className="mark-title" style={{fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 22, fontWeight: 600}}>Grammatik</div>
          <div className="mark-sub" style={{fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--mute)', marginTop: 3}}>Atelier · German Trainer</div>
        </div>
        {NAV_ITEMS.map((it) => (
          <button
            key={it.route}
            className={'nav-link' + (top === it.route ? ' active' : '')}
            onClick={() => { navigate(it.route); setOpen(false); }}
          >
            {it.label}
            {it.de ? <span style={{fontFamily: 'var(--font-display)', fontStyle: 'italic', color: 'var(--mute)', marginLeft: 8, fontSize: 14}}>{it.de}</span> : null}
          </button>
        ))}
        <VersionBadge navigate={(r) => { navigate(r); setOpen(false); }} variant="drawer" />
      </aside>
    </React.Fragment>
  );
}

Object.assign(window, { NavShell });

/* ─── Shared QuizProgress — pips below ~25, continuous meter above ─── */

function QuizProgress({ history, total, idx, advance, isCorrect }) {
  const correctSoFar = history.filter(h => h.correct).length + (advance && isCorrect ? 1 : 0);
  const wrongSoFar = history.filter(h => !h.correct).length + (advance && !isCorrect ? 1 : 0);
  const answered = correctSoFar + wrongSoFar;
  const remaining = Math.max(0, total - answered);

  // Use continuous meter once individual pips would become too small
  if (total > 25) {
    const correctPct = (correctSoFar / total) * 100;
    const wrongPct = (wrongSoFar / total) * 100;
    const cursorPct = Math.min(100, (answered / total) * 100);
    return (
      <div className="quiz-meter">
        <div className="quiz-meter-track">
          <div className="quiz-meter-fill quiz-meter-fill-done" style={{width: correctPct + '%'}}></div>
          <div className="quiz-meter-fill quiz-meter-fill-wrong" style={{width: wrongPct + '%'}}></div>
          {answered < total && (
            <div className="quiz-meter-cursor" style={{left: cursorPct + '%'}}></div>
          )}
        </div>
        <div className="quiz-meter-legend">
          <span>
            <strong style={{color: 'var(--ink)', fontFamily: 'var(--font-mono)', fontWeight: 500}}>{answered}</strong>
            <span style={{color: 'var(--mute)'}}> / {total}</span>
          </span>
          <span className="qml-counts">
            <span className="qml-correct">✓ {correctSoFar}</span>
            <span className="qml-wrong">✗ {wrongSoFar}</span>
            <span>· {remaining} remaining</span>
          </span>
        </div>
      </div>
    );
  }

  // Pips
  const pips = [];
  for (let i = 0; i < total; i++) {
    let cls = '';
    if (i < history.length) cls = history[i].correct ? 'done' : 'wrong';
    else if (i === idx && advance) cls = isCorrect ? 'done' : 'wrong';
    else if (i === idx) cls = 'current';
    pips.push(cls);
  }
  return (
    <div className="quiz-progress-bar">
      {pips.map((cls, i) => <div key={i} className={'pip ' + cls}></div>)}
    </div>
  );
}

Object.assign(window, { QuizProgress });

/* ─── Shared usePagination hook + Pagination component ───
   Reusable list pagination: page size selector + prev/next + page numbers.
   Used by: version changelog, noun manage list, history, result lists.
   NOT used by: verb translation worksheet (intentionally single view).
*/

function usePagination(items, defaultPageSize) {
  defaultPageSize = defaultPageSize || 10;
  const [pageSize, setPageSize] = React.useState(defaultPageSize);
  const [page, setPage] = React.useState(1);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const end = Math.min(start + pageSize, total);
  const slice = items.slice(start, end);

  // Reset page when items length shrinks
  React.useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [totalPages]);

  return {
    page: safePage,
    setPage,
    pageSize,
    setPageSize,
    total,
    totalPages,
    start,
    end,
    slice,
  };
}

function Pagination({ pagination, label, pageSizeOptions, hidePageSizeBelow }) {
  const { page, setPage, pageSize, setPageSize, total, totalPages, start, end } = pagination;
  pageSizeOptions = pageSizeOptions || [10, 25, 50, 100];
  hidePageSizeBelow = hidePageSizeBelow || 0;
  label = label || 'items';

  // If everything fits on one page AND total is below the smallest page-size threshold, hide the chrome entirely
  if (total === 0) return null;
  const showPageSize = total > hidePageSizeBelow;

  // Build page-number list — compact: first, last, current ±1, with ellipses
  const pages = [];
  const push = (p) => pages.push(p);
  const range = (from, to) => { for (let i = from; i <= to; i++) push(i); };
  if (totalPages <= 7) {
    range(1, totalPages);
  } else {
    push(1);
    if (page > 3) push('…');
    range(Math.max(2, page - 1), Math.min(totalPages - 1, page + 1));
    if (page < totalPages - 2) push('…');
    push(totalPages);
  }

  return (
    <nav className="pagination" aria-label={'Pagination · ' + label}>
      <div className="pg-meta">
        <span className="pg-range">
          <strong>{start + 1}</strong>
          <span className="pg-dash">–</span>
          <strong>{end}</strong>
          <span className="pg-of"> of </span>
          <strong>{total}</strong>
          <span className="pg-label"> {label}</span>
        </span>
      </div>

      <div className="pg-pages" role="group" aria-label="Page selector">
        <button
          className="pg-arrow"
          onClick={() => setPage(Math.max(1, page - 1))}
          disabled={page === 1}
          aria-label="Previous page"
        >‹ Prev</button>

        {pages.map((p, i) => (
          p === '…'
            ? <span key={'el' + i} className="pg-ellipsis" aria-hidden="true">…</span>
            : <button
                key={p}
                className={'pg-num' + (p === page ? ' active' : '')}
                onClick={() => setPage(p)}
                aria-current={p === page ? 'page' : undefined}
                aria-label={'Page ' + p}
              >{p}</button>
        ))}

        <button
          className="pg-arrow"
          onClick={() => setPage(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          aria-label="Next page"
        >Next ›</button>
      </div>

      {showPageSize ? (
        <div className="pg-size">
          <label className="pg-size-label" htmlFor="pgsize">Per page</label>
          <select
            id="pgsize"
            className="pg-size-select"
            value={pageSize}
            onChange={(e) => { setPageSize(parseInt(e.target.value, 10)); setPage(1); }}
          >
            {pageSizeOptions.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      ) : null}
    </nav>
  );
}

Object.assign(window, { usePagination, Pagination });
