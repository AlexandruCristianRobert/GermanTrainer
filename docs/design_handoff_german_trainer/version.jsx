// ─── Version page + changelog ───
// Version format: X.YY.ZZ
//   X  — major redesigns (rarely changes)
//   YY — a new module added
//   ZZ — regular improvements / fixes
//
// To add a new version, prepend an entry to CHANGELOG. Newest at top.

const APP_VERSION = '1.03.07';

const CHANGELOG = [
  {
    version: '1.03.07',
    date: '2026-05-24',
    kind: 'polish',
    title: 'Pagination across lists',
    notes: [
      'Reusable <code>&lt;Pagination&gt;</code> component with a user-selectable page size (10 / 25 / 50 / 100).',
      'Applied to: version page changelog, noun manage table, quiz history, noun result rows, verb result rows, adjective result rows.',
      'The verb translation worksheet keeps the all-in-one view — by design.',
      'Removed the X / YY / ZZ key from the version masthead — convention is implicit.',
    ],
  },
  {
    version: '1.03.06',
    date: '2026-05-24',
    kind: 'polish',
    title: 'Version page · changelog',
    notes: [
      'New "About · Version" page accessible from the nav and the drawer.',
      'Version badge in the header (desktop) and at the bottom of the drawer (mobile).',
      'Changelog seeded with the full design history.',
    ],
  },
  {
    version: '1.03.05',
    date: '2026-05-24',
    kind: 'polish',
    title: 'Settings · Daten tab',
    notes: [
      'New IV. Daten · Backup tab — storage stats, last-backup ago, per-collection counts.',
      'Three sub-sections: A. Bestand (counts), B. Sichern (export · import · clipboard), C. Zurücksetzen (per-collection resets and nuke-all).',
      'Warning alert about no-undo for destructive actions.',
    ],
  },
  {
    version: '1.03.04',
    date: '2026-05-24',
    kind: 'fix',
    title: 'Mobile pass · settings tab grid',
    notes: [
      'Settings tab rail no longer scrolls horizontally on mobile — it is now a 2×2 card grid.',
      'Page-level horizontal overflow eliminated across all routes.',
      'Module landing cards compacted (~40% shorter).',
      'Setup pages tightened so the Start CTA is reachable without scrolling far.',
      'Quiz runners fit der/die/das side-by-side; long words wrap rather than clip.',
    ],
  },
  {
    version: '1.03.03',
    date: '2026-05-24',
    kind: 'polish',
    title: 'Progress meter for long quizzes',
    notes: [
      'Quiz progress switches from individual pips to a continuous meter when total > 25 questions.',
      'Meter shows green correct + red wrong fills, a cursor at the current index, and a counts legend.',
    ],
  },
  {
    version: '1.03.02',
    date: '2026-05-24',
    kind: 'polish',
    title: 'Two-line CTA buttons',
    notes: [
      'Long action buttons (Start quiz · N questions, Submit all · N verbs, Generate &amp; start) now stack the primary action on top with a mono-caps subtitle below.',
      'Prevents awkward wrapping on mobile and keeps the visual rhythm consistent.',
    ],
  },
  {
    version: '1.03.01',
    date: '2026-05-24',
    kind: 'polish',
    title: 'Strong-stamp result rows',
    notes: [
      'Noun and verb result pages redesigned with green/red row washes.',
      'Wrong answers shown as a struck-through red stamp; the correct answer as a solid green stamp directly beneath.',
      'Top summary strip: Richtig / Falsch / Quote (%).',
      'Empty answers render as a muted "— no answer —" placeholder.',
    ],
  },
  {
    version: '1.03.00',
    date: '2026-05-24',
    kind: 'module',
    title: 'Adjectives module',
    notes: [
      'Third vocabulary module — AI-generated sentences with a fill-in-the-blank inflection quiz.',
      'Test sheet layout with progress meter and end-of-quiz review.',
      'Setup picks group filters, question count, and case focus.',
    ],
  },
  {
    version: '1.02.04',
    date: '2026-05-23',
    kind: 'polish',
    title: 'Verbs cheatsheet',
    notes: [
      'Standalone reference page — irregular verbs, separable prefixes, modal-verb patterns.',
      'Editorial chapter layout with vowel-shift highlights tinted by the accent token.',
    ],
  },
  {
    version: '1.02.03',
    date: '2026-05-23',
    kind: 'polish',
    title: 'Translation worksheet',
    notes: [
      'Verb translation quiz now uses a worksheet layout — all prompts visible at once with per-row inputs.',
      'Submit-all reveals per-row pass/fail in place.',
    ],
  },
  {
    version: '1.02.02',
    date: '2026-05-22',
    kind: 'polish',
    title: 'Palette overrides per theme',
    notes: [
      'Settings · Farben lets you override design tokens per light / dark theme independently.',
      'JSON import &amp; export for moving palettes between devices.',
    ],
  },
  {
    version: '1.02.01',
    date: '2026-05-22',
    kind: 'fix',
    title: 'Accessibility &amp; type pass',
    notes: [
      'Prompt size sliders for each quiz type with live preview.',
      'Sun / moon theme toggle moved into the header actions.',
      'Hairlines and rules audited for contrast on both themes.',
    ],
  },
  {
    version: '1.02.00',
    date: '2026-05-21',
    kind: 'module',
    title: 'Verbs module',
    notes: [
      'Second vocabulary module — irregular, separable, modal classifications.',
      'Translation quiz with case &amp; level filters.',
      'Verlauf records each run.',
    ],
  },
  {
    version: '1.01.01',
    date: '2026-05-19',
    kind: 'polish',
    title: 'Quiz history · Verlauf',
    notes: [
      'New History page lists every completed run with score and per-question breakdown.',
      'Re-runnable from the row.',
    ],
  },
  {
    version: '1.01.00',
    date: '2026-05-18',
    kind: 'module',
    title: 'Nouns module',
    notes: [
      'First vocabulary module — gender (der · die · das) and translation modes.',
      'Group-tagged seed deck with custom-entry support.',
      'Setup picks groups, count, and mode.',
    ],
  },
  {
    version: '1.00.00',
    date: '2026-05-17',
    kind: 'major',
    title: 'Grammatik-Atelier · initial release',
    notes: [
      'Editorial design system — Fraunces display, Source Serif 4 body, JetBrains Mono accents.',
      'Light &amp; dark themes, Settings shell with API · Display · Farben tabs.',
      'Cheatsheet long-form reference layout established.',
    ],
  },
];

function VersionBadge({ navigate, variant }) {
  // variant: 'header' (small inline) or 'drawer' (label below the drawer)
  if (variant === 'drawer') {
    return (
      <button
        className="version-badge version-badge-drawer"
        onClick={() => navigate('version')}
        aria-label={'Version ' + APP_VERSION + ' — view changelog'}
      >
        <span className="vb-prefix">v</span>
        <span className="vb-num">{APP_VERSION}</span>
        <span className="vb-arrow" aria-hidden="true">→</span>
      </button>
    );
  }
  return (
    <button
      className="version-badge"
      onClick={() => navigate('version')}
      aria-label={'Version ' + APP_VERSION + ' — view changelog'}
      title={'Version ' + APP_VERSION + ' — view changelog'}
    >
      <span className="vb-prefix">v</span>
      <span className="vb-num">{APP_VERSION}</span>
    </button>
  );
}

function VersionPage({ navigate }) {
  // Parse current version into parts
  const [major, minor, patch] = APP_VERSION.split('.').map(s => parseInt(s, 10));

  const pagination = window.usePagination(CHANGELOG, 10);

  return (
    <div className="page" style={{ maxWidth: 880, margin: '0 auto' }} data-screen-label="40 Version">
      <div className="section-header">
        <div>
          <div className="breadcrumb">Über · About</div>
          <h1 className="section-title">Versionen</h1>
          <p className="section-subtitle">
            A running ledger of changes — modules added, polish, the occasional course-correction.
          </p>
        </div>
        <div>
          <button className="btn btn-ghost" onClick={() => navigate('home')}>← Home</button>
        </div>
      </div>

      {/* Current-version masthead */}
      <article className="version-masthead">
        <div className="vm-label">Currently running</div>
        <div className="vm-num">
          <span className="vm-part vm-major">{major}</span>
          <span className="vm-dot">.</span>
          <span className="vm-part vm-minor">{String(minor).padStart(2, '0')}</span>
          <span className="vm-dot">.</span>
          <span className="vm-part vm-patch">{String(patch).padStart(2, '0')}</span>
        </div>
      </article>

      <window.Pagination pagination={pagination} label="releases" />

      <ol className="version-list">
        {pagination.slice.map((entry) => {
          const [vMaj, vMin, vPatch] = entry.version.split('.');
          const isCurrent = entry.version === APP_VERSION;
          return (
            <li
              key={entry.version}
              className={'version-entry kind-' + entry.kind + (isCurrent ? ' is-current' : '')}
            >
              <div className="ve-meta">
                <div className="ve-version">
                  <span className="ve-v">v</span>
                  <span className="ve-num">
                    <span className="ve-major">{vMaj}</span>
                    <span className="ve-dot">.</span>
                    <span className="ve-minor">{vMin}</span>
                    <span className="ve-dot">.</span>
                    <span className="ve-patch">{vPatch}</span>
                  </span>
                </div>
                <div className="ve-date">{entry.date}</div>
                <div className="ve-kind">{entry.kind}</div>
                {isCurrent ? <div className="ve-current-mark">● now</div> : null}
              </div>

              <div className="ve-body">
                <h3 className="ve-title">{entry.title}</h3>
                <ul className="ve-notes">
                  {entry.notes.map((n, j) => (
                    <li key={j} dangerouslySetInnerHTML={{ __html: n }}></li>
                  ))}
                </ul>
              </div>
            </li>
          );
        })}
      </ol>

      {pagination.totalPages > 1 && (
        <window.Pagination pagination={pagination} label="releases" />
      )}

      <div className="version-footer">
        <p>
          Want to suggest a change? File it through your usual channel — every accepted change becomes
          a new <code>ZZ</code> bump and lands on this page.
        </p>
      </div>
    </div>
  );
}

Object.assign(window, { VersionBadge, VersionPage, APP_VERSION, CHANGELOG });
