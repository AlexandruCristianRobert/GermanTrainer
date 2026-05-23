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
      </aside>
    </React.Fragment>
  );
}

Object.assign(window, { NavShell });
