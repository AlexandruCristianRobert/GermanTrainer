// ─── Sentence module · Variant B — „Der Setzkasten" ───
// The card blueprint is the hero: a sticky slot meter, category cards with steppers,
// one filter tray at a time, tabbed connector picker with grammar-behavior marks,
// runner with a named hunt-list in the margin and tinted hint washes.

function snbEnPlain(card) { return card.en.map(t => typeof t === 'string' ? t : t.t).join(''); }

function SnbBlueprint({ counts, compact }) {
  const total = snItemTotal(counts);
  const cells = [];
  SN_CATS.forEach(c => { for (let i = 0; i < counts[c]; i++) cells.push(c); });
  return (
    <div className={'snb-bp' + (total >= SN_WARN_AT ? ' warn' : '')}>
      <div className="snb-bp-l">Eine Karte · Budget {SN_BUDGET} Items</div>
      <div className="snb-slots">
        {Array.from({ length: SN_BUDGET }).map((_, i) => {
          const c = cells[i];
          return <span key={i} className={'snb-slot' + (c ? ' f' : '')}
            style={c ? { background: SN_CAT[c].color, borderColor: SN_CAT[c].color } : undefined}>{c ? SN_CAT[c].letter : '·'}</span>;
        })}
      </div>
      <div className="snb-bp-n">
        <div className="snb-bp-num">{total}<span> / {SN_BUDGET}</span></div>
        <div className="snb-bp-sub">
          {total === 0 ? 'mind. 1 Item wählen' : total >= SN_WARN_AT ? 'Kurztext · 3–4 Sätze' : 'Items pro Karte'}
        </div>
      </div>
    </div>
  );
}

function SnbStepper({ value, max, total, onChange }) {
  return (
    <div className="snb-step">
      <button disabled={value === 0} onClick={() => onChange(value - 1)} aria-label="weniger">−</button>
      <span className={'n' + (value === 0 ? ' zero' : '')}>{value}</span>
      <button disabled={value >= max || total >= SN_BUDGET} onClick={() => onChange(value + 1)} aria-label="mehr">+</button>
    </div>
  );
}

function SnbSetup({ demo, onStart }) {
  const [counts, setCounts] = React.useState({ verb: 2, noun: 2, prep: 1, dac: 1, conn: 1 });
  const [vLevels, setVLevels] = React.useState(() => new Set(['A2', 'B1']));
  const [vTypes, setVTypes] = React.useState(() => new Set(SN_VERB_TYPES.map(t => t.id)));
  const [vRekt, setVRekt] = React.useState(() => new Set(SN_REKTION.map(r => r.id)));
  const [nGroups, setNGroups] = React.useState(() => new Set(SN_NOUN_GROUPS.filter(g => g.n).map(g => g.id)));
  const [pGroups, setPGroups] = React.useState(() => new Set(SN_PREP_GROUPS.map(g => g.id)));
  const [kFams, setKFams] = React.useState(() => new Set(['adversativ', 'kausal', 'konzessiv']));
  const [kTab, setKTab] = React.useState('fam');
  const [kWords, setKWords] = React.useState(() => new Set());
  const [tray, setTray] = React.useState(null);
  const [dir, setDir] = React.useState('en-de');
  const [modality, setModality] = React.useState('typed');
  const [hints, setHints] = React.useState(true);
  const [preset, setPreset] = React.useState(5);
  const [custom, setCustom] = React.useState(6);

  const total = snItemTotal(counts);
  const setC = (cat, v) => setCounts({ ...counts, [cat]: v });
  const tgl = (set, setter) => (id) => { const s = new Set(set); s.has(id) ? s.delete(id) : s.add(id); setter(s); };
  const micOk = !demo.noMic && typeof navigator !== 'undefined' && !!(navigator.mediaDevices);
  const cards = preset === 'custom' ? Math.max(1, Math.min(12, custom || 1)) : preset;

  const wKey = (f, w) => f + ':' + w;
  const openWords = () => {
    if (kTab === 'fam') { const s = new Set(); SN_CONN_FAMILIES.forEach(f => { if (kFams.has(f.id)) f.words.forEach(w => s.add(wKey(f.id, w.w))); }); setKWords(s); }
    setKTab('words');
  };

  const emptyPool = {
    verb: counts.verb > 0 && (vLevels.size === 0 || vTypes.size === 0 || vRekt.size === 0),
    noun: counts.noun > 0 && nGroups.size === 0,
    prep: counts.prep > 0 && pGroups.size === 0,
    dac: false,
    conn: counts.conn > 0 && (kTab === 'words' ? kWords.size === 0 : kFams.size === 0),
  };
  const anyEmpty = SN_CATS.some(c => emptyPool[c]);
  const canStart = total > 0 && !anyEmpty && !demo.aiMissing;

  const summary = {
    verb: vLevels.size ? [...vLevels].join(' ') + ' · Rektion ' + vRekt.size + '/' + SN_REKTION.length : 'keine Niveaus',
    noun: nGroups.size + '/' + SN_NOUN_GROUPS.filter(g => g.n).length + ' Themen',
    prep: pGroups.size + '/' + SN_PREP_GROUPS.length + ' Kasusgruppen',
    dac: 'feste Kollokationen',
    conn: kTab === 'words' ? kWords.size + ' Wörter' : kFams.size + '/' + SN_CONN_FAMILIES.length + ' Familien',
  };

  const allNone = (list, setter) => (
    <span className="field-actions">
      <button className="btn btn-quiet" onClick={() => setter(new Set(list))}>All</button>
      <button className="btn btn-quiet" onClick={() => setter(new Set())}>None</button>
    </span>
  );
  const chips = (list, sel, setter, disabledIds) => (
    <div className="chip-row">
      {list.map(o => {
        const off = disabledIds && disabledIds.has(o.id);
        return <button key={o.id} className={'chip' + (sel.has(o.id) ? ' selected' : '')} disabled={off}
          style={off ? { opacity: .35, cursor: 'not-allowed' } : undefined}
          onClick={() => tgl(sel, setter)(o.id)}>{o.label}<span className="chip-count">{o.n}</span></button>;
      })}
    </div>
  );

  const trays = {
    verb: (
      <div>
        <div className="field">
          <div className="field-row"><div className="field-label">Niveau</div>{allNone(SN_VERB_LEVELS, setVLevels)}</div>
          {chips(SN_VERB_LEVELS.map(l => ({ id: l, label: l, n: SN_VERB_LEVEL_N[l] })), vLevels, setVLevels)}
        </div>
        <div className="field">
          <div className="field-row"><div className="field-label">Typ</div>{allNone(SN_VERB_TYPES.map(t => t.id), setVTypes)}</div>
          {chips(SN_VERB_TYPES, vTypes, setVTypes)}
        </div>
        <div className="field">
          <div className="field-row"><div className="field-label">Rektion · Objektkasus</div>{allNone(SN_REKTION.map(r => r.id), setVRekt)}</div>
          {chips(SN_REKTION, vRekt, setVRekt)}
          <p className="grading-hint">„Verb + Dativ" gezielt üben: nur Dativ anwählen.</p>
        </div>
      </div>
    ),
    noun: (
      <div className="field">
        <div className="field-row"><div className="field-label">Themen</div>{allNone(SN_NOUN_GROUPS.filter(g => g.n).map(g => g.id), setNGroups)}</div>
        {chips(SN_NOUN_GROUPS, nGroups, setNGroups, new Set(SN_NOUN_GROUPS.filter(g => !g.n).map(g => g.id)))}
      </div>
    ),
    prep: (
      <div className="field">
        <div className="field-row"><div className="field-label">Kasusgruppe</div>{allNone(SN_PREP_GROUPS.map(g => g.id), setPGroups)}</div>
        {chips(SN_PREP_GROUPS, pGroups, setPGroups)}
      </div>
    ),
    conn: (
      <div>
        <div className="field-row" style={{ marginBottom: 14 }}>
          <div className="segmented">
            <button className={kTab === 'fam' ? 'active' : ''} onClick={() => setKTab('fam')}>Familien</button>
            <button className={kTab === 'words' ? 'active' : ''} onClick={openWords}>Einzelne Wörter</button>
          </div>
          <span className="micro-mark">○ bleibt · INV Inversion · END Verb ans Ende</span>
        </div>
        {kTab === 'fam' && (
          <div className="chip-row">
            {SN_CONN_FAMILIES.map(f => (
              <button key={f.id} className={'chip' + (kFams.has(f.id) ? ' selected' : '')} onClick={() => tgl(kFams, setKFams)(f.id)}>
                {f.label}<span className="chip-count">{f.words.length}</span>
              </button>
            ))}
          </div>
        )}
        {kTab === 'words' && SN_CONN_FAMILIES.filter(f => kFams.has(f.id)).map(f => (
          <div className="field" key={f.id} style={{ marginBottom: 14 }}>
            <div className="field-label" style={{ marginBottom: 8 }}>{f.label} · {f.de}</div>
            <div className="chip-row">
              {f.words.map(w => (
                <button key={w.w} className={'snb-w' + (kWords.has(wKey(f.id, w.w)) ? ' selected' : '')}
                  onClick={() => { const s = new Set(kWords); const k = wKey(f.id, w.w); s.has(k) ? s.delete(k) : s.add(k); setKWords(s); }}>
                  {w.w}<span className={'b' + (w.b === 'inv' ? ' inv' : w.b === 'end' ? ' end' : '')}>{w.b === '0' ? '○' : w.b === 'inv' ? 'INV' : 'END'}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
        {kTab === 'words' && kFams.size === 0 && <p className="grading-hint">Keine Familie gewählt — zurück zu „Familien".</p>}
        <p className="grading-hint">Zweiteilige Paare (sowohl … als auch) zählen als ein Item mit zwei Fundstellen.</p>
      </div>
    ),
  };

  return (
    <div className="snb-wrap" data-screen-label="B · Sentence Setup">
      <div className="section-header" style={{ marginBottom: 0 }}>
        <div>
          <div className="breadcrumb">Kapitel XII · Satz · Einrichtung</div>
          <h1 className="section-title">Setup<em>.</em></h1>
          <p className="section-subtitle">
            Bestücke die Karte wie einen Setzkasten: jede Kategorie legt 0–3 Lettern ins Budget.
            Die KI schreibt dann einen Satz, der alles enthält — bei voller Karte einen Kurztext.
          </p>
        </div>
      </div>

      <SnbBlueprint counts={counts} />

      {demo.aiMissing && (
        <div className="alert alert-danger" style={{ marginBottom: 16 }}>
          <span className="alert-label">KI-Schlüssel fehlt</span>
          Ohne Schlüssel können keine Karten generiert werden. Hinterlege ihn in den Einstellungen.
        </div>
      )}

      <div className="snb-grid">
        {SN_CATS.map(cat => (
          <div key={cat} className={'snb-cat' + (tray === cat ? ' open' : '')}>
            <div className="snb-cat-h">
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: SN_CAT[cat].color, flex: 'none', transform: 'translateY(-1px)' }}></span>
              <span className="snb-cat-n">{SN_CAT[cat].de}</span>
              <span className="snb-cat-de">0–{SN_MAX[cat]}</span>
            </div>
            <SnbStepper value={counts[cat]} max={SN_MAX[cat]} total={total} onChange={v => setC(cat, v)} />
            <div className="snb-cat-s">{summary[cat]}</div>
            {cat === 'dac'
              ? <span className="snb-cat-f none">keine Filter in v1</span>
              : <button className="snb-cat-f" onClick={() => setTray(tray === cat ? null : cat)}>{tray === cat ? 'Tray schließen' : 'Filter öffnen'}</button>}
          </div>
        ))}
      </div>

      {tray && tray !== 'dac' && (
        <div className="snb-tray">
          <div className="snb-tray-h">
            <span className="snb-tray-t">{SN_CAT[tray].de} — Pool eingrenzen</span>
            <button className="btn btn-quiet" onClick={() => setTray(null)}>Schließen ✕</button>
          </div>
          {trays[tray]}
        </div>
      )}

      {SN_CATS.filter(c => emptyPool[c]).map(c => (
        <div className="alert alert-warning" key={c} style={{ marginTop: 14 }}>
          <span className="alert-label">Leerer Pool</span>
          {SN_CAT[c].de} stehen auf {counts[c]}, aber kein Wort passt zu den Filtern.
        </div>
      ))}

      <div className="snb-opts">
        <div className="field">
          <div className="field-label">Richtung</div>
          <div className="segmented">
            <button className={dir === 'en-de' ? 'active' : ''} onClick={() => setDir('en-de')}>EN → DE</button>
            <button className={dir === 'de-en' ? 'active' : ''} onClick={() => setDir('de-en')}>DE → EN</button>
          </div>
          <p className="grading-hint">{dir === 'de-en'
            ? 'DE → EN: nur Bedeutungs-Bewertung — keine Fehler-Tags, keine Wort-Hinweise.'
            : 'EN → DE: volle Bewertung mit Fehler-Tags pro Item.'}</p>
        </div>
        {dir === 'en-de' ? (
          <div className="field">
            <div className="field-label">Modalität</div>
            <div className="segmented">
              <button className={modality === 'typed' ? 'active' : ''} onClick={() => setModality('typed')}>Getippt</button>
              <button className={modality === 'spoken' ? 'active' : ''} disabled={!micOk} onClick={() => micOk && setModality('spoken')}>Gesprochen</button>
            </div>
            {!micOk && <p className="grading-hint">Gesprochen erfordert Mikrofonzugriff — in diesem Browser nicht verfügbar.</p>}
          </div>
        ) : <div></div>}
        {dir === 'en-de' && (
          <div className="field">
            <div className="field-label">Wort-Hinweise</div>
            <div className="segmented">
              <button className={hints ? 'active' : ''} onClick={() => setHints(true)}>An</button>
              <button className={!hints ? 'active' : ''} onClick={() => setHints(false)}>Aus</button>
            </div>
          </div>
        )}
        <div className="field full">
          <div className="field-label">Anzahl Karten</div>
          <div className="field-row count-row">
            <div className="segmented">
              {[3, 5, 8].map(p => <button key={p} className={preset === p ? 'active' : ''} onClick={() => setPreset(p)}>{p}</button>)}
              <button className={preset === 'custom' ? 'active' : ''} onClick={() => setPreset('custom')}>Custom</button>
            </div>
            {preset === 'custom' && <input className="input" type="number" min="1" max="12" value={custom}
              onChange={e => setCustom(parseInt(e.target.value, 10) || 1)} style={{ width: 70, fontSize: 17 }} />}
            <span className="micro-mark count-avail">bewusst klein — 1 Karte ≈ {Math.max(total, 1)} Items</span>
          </div>
        </div>
      </div>

      <div className="setup-actions">
        <button className="btn btn-ghost">← Zurück</button>
        <button className="btn btn-accent" disabled={!canStart}
          onClick={() => onStart({ counts, dir, modality: dir === 'de-en' ? 'typed' : modality, hints: dir === 'en-de' && hints, cards })}>
          Start · {cards} {cards === 1 ? 'Karte' : 'Karten'} <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  );
}

/* ── Runner B ── */

function SnbHunt({ card, res, dir }) {
  if (dir === 'de-en') return (
    <aside className="snb-hunt">
      <div className="snb-hunt-l">Leichter Modus</div>
      <p className="snb-hunt-note" style={{ margin: 0 }}>
        DE → EN wird nur auf Bedeutung bewertet — keine Suchliste, keine Fehler-Tags, keine Wort-Hinweise.
      </p>
    </aside>
  );
  const okOf = k => res && res.items.find(r => r.k === k).ok;
  return (
    <aside className="snb-hunt">
      <div className="snb-hunt-l">Suchliste · {card.items.length} Items</div>
      {card.items.map(it => (
        <div className="snb-hunt-r" key={it.k}>
          <span className="h-dot" style={{ background: SN_CAT[it.cat].color }}></span>
          <span>{it.cat === 'conn' ? <b style={{ fontWeight: 500 }}>{it.sol.split(' — ')[0]}</b> : SN_CAT[it.cat].one}{it.pair ? ' · zweiteilig' : ''}</span>
          <span className={'h-chk ' + (res ? (okOf(it.k) ? 'sn-check ok' : 'sn-check no') : '')} style={{ width: 'auto' }}>
            {res ? (okOf(it.k) ? '✓' : '✗') : '·'}</span>
        </div>
      ))}
      <p className="snb-hunt-note">Der Konnektor ist beim Namen genannt — seine Grammatikfalle nicht.</p>
    </aside>
  );
}

function SnbRunner({ cfg, demo, deck, practice, onDone, onExit }) {
  const run = useSnRun({ deck, offline: demo.offline, practice });
  const [answer, setAnswer] = React.useState('');
  const [rec, setRec] = React.useState('idle');
  const taRef = React.useRef(null);
  const spoken = cfg.modality === 'spoken' && !demo.noMic;
  const micDenied = cfg.modality === 'spoken' && demo.noMic;
  const shortfall = deck.length < cfg.cards;

  React.useEffect(() => { if (run.phase === 'answer') { setAnswer(''); setRec('idle'); if (taRef.current) { taRef.current.style.height = 'auto'; taRef.current.focus(); } } }, [run.phase, run.idx]);
  const stopRec = () => { setRec('done'); const t = snTranscript(run.card); setAnswer(t); setTimeout(() => run.submit(t, cfg.dir), 600); };
  const doSubmit = () => { if (answer.trim()) run.submit(answer, cfg.dir); };
  const grow = (e) => { setAnswer(e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; };

  if (run.phase === 'done') {
    const wrong = run.history.filter(h => h.res.verdict !== 'ok');
    if (!practice && wrong.length > 0) {
      return <SnRetryModal wrong={wrong.length}
        onRetry={() => onDone(run.history, wrong.map(w => w.card))}
        onResult={() => onDone(run.history, null)} />;
    }
    onDone(run.history, null);
    return null;
  }

  const graded = run.phase === 'graded' && run.last;
  const size = run.card && run.card.sents >= 3 ? 's4' : run.card.sents === 2 ? 's2' : 's1';
  return (
    <div data-screen-label="B · Sentence Runner">
      <div className="quiz-meta">
        <span className="quiz-counter">Karte {run.idx + 1} · von {run.total}{practice ? ' — Übungsrunde, wird nicht gewertet' : ''}</span>
        <button className="btn btn-quiet" onClick={onExit}>Runde beenden</button>
      </div>
      <SnPips history={run.history} total={run.total} idx={run.idx} />
      {shortfall && !practice && (
        <div className="alert alert-warning"><span className="alert-label">Engpass</span>
          Nur {deck.length} von {cfg.cards} Karten konnten generiert werden — der Pool gab nicht mehr her.</div>
      )}
      {micDenied && (
        <div className="alert alert-warning"><span className="alert-label">Mikrofon</span>
          Zugriff verweigert — Modalität für diese Runde auf Getippt umgestellt.</div>
      )}

      {(run.phase === 'prep' || run.phase === 'stream') ? (
        <div className="sn-stream">
          <div className="sn-stream-t">{run.phase === 'prep' ? 'Karte wird geschrieben' : 'Nächste Karte wird geschrieben'}</div>
          <div className="sn-stream-b"><i></i><i></i><i></i></div>
        </div>
      ) : (
        <div className="snb-stage">
          <div>
            <div className={'snb-card' + (graded ? ' v-' + run.last.res.verdict : '')}>
              <div className="snb-card-l">
                <span>{cfg.dir === 'de-en' ? 'Deutsch → Englisch' : 'Englisch → Deutsch'} · {run.card.sents === 1 ? '1 Satz' : run.card.sents + ' Sätze'}{run.card.sents >= 3 ? ' — Kurztext' : ''}</span>
                {graded && <span className={'sn-verdict v-' + run.last.res.verdict} style={{ fontSize: 15 }}>{SN_VERDICT[run.last.res.verdict]}</span>}
              </div>
              <SnSource card={run.card} hints={cfg.hints} dir={cfg.dir} size={size} />

              {run.phase === 'answer' && (
                <div style={{ marginTop: 24 }}>
                  {spoken ? (
                    <div className="sn-rec">
                      <button className={'sn-rec-btn' + (rec === 'live' ? ' live' : '')}
                        onClick={() => rec === 'idle' ? setRec('live') : rec === 'live' ? stopRec() : null}>{rec === 'live' ? '■' : '●'}</button>
                      <div className="sn-rec-t">
                        {rec === 'idle' && <>Aufnahme starten — sprich die ganze Übersetzung, auch mehrere Sätze.</>}
                        {rec === 'live' && <>Aufnahme läuft … Stopp reicht automatisch ein.</>}
                        {rec === 'done' && <>Transkript: „{answer}"</>}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <textarea ref={taRef} className="sn-ta" rows={run.card.sents === 1 ? 2 : run.card.sents}
                        placeholder={cfg.dir === 'de-en' ? 'Deine englische Übersetzung …' : 'Deine deutsche Übersetzung …'}
                        value={answer} onChange={grow}
                        onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); doSubmit(); } }}></textarea>
                      <div className="sn-foot">
                        <span className="sn-kbd"><span className="kbd">Strg</span>+<span className="kbd">Enter</span> reicht ein</span>
                        <button className="btn btn-accent" disabled={!answer.trim()} onClick={doSubmit}>Prüfen →</button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {run.phase === 'grading' && (
                <div style={{ marginTop: 24 }}>
                  <div className="sn-ta" style={{ color: 'var(--mute)' }}>{answer}</div>
                  <div className="sn-foot"><span className="sn-stream-t" style={{ fontStyle: 'normal' }}>KI bewertet</span></div>
                </div>
              )}

              {graded && (
                <div style={{ marginTop: 24 }}>
                  <div className="sn-ta" style={{ borderLeftColor: run.last.res.verdict === 'ok' ? 'var(--success)' : run.last.res.verdict === 'part' ? 'var(--ochre)' : 'var(--danger)' }}>{answer}</div>
                  <div className="sna-ref" style={{ margin: '16px 0 0' }}>
                    <span className="micro-mark" style={{ letterSpacing: '.18em' }}>Referenz</span>
                    <span className="sna-ref-t">{cfg.dir === 'de-en' ? snbEnPlain(run.card) : run.card.de}</span>
                    {cfg.dir !== 'de-en' && <SnTTS text={run.card.de} />}
                    {run.last.offline && <SnOffline />}
                  </div>
                  {run.last.res.items && (
                    <div className="snb-tbl">
                      {run.card.items.map(it => {
                        const ok = run.last.res.items.find(r => r.k === it.k).ok;
                        return (
                          <div className="snb-tbl-r" key={it.k}>
                            <span className={'sn-check ' + (ok ? 'ok' : 'no')}>{ok ? '✓' : '✗'}</span>
                            <span className="t-dot" style={{ background: SN_CAT[it.cat].color }}></span>
                            <span className="t-en">{it.en}</span>
                            <span className="t-sol">{it.sol}</span>
                            <span className="t-meta">{it.rekt && <SnRekt text={it.rekt} />}{!ok && <SnTagChips tags={it.tags} />}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {graded && (
              <div>
                {!run.last.offline
                  ? <p className="sna-tip" style={{ marginTop: 14 }}>{run.card.tip}</p>
                  : <p className="sna-tip" style={{ marginTop: 14 }}>KI-Bewertung nicht erreichbar — lokale Prüfung per Wortabgleich, ohne Coaching-Tipp.</p>}
                <div className="quiz-actions">
                  <span className="micro-mark"><span className="kbd">Enter</span> — weiter</span>
                  <button className="btn btn-accent" autoFocus onClick={() => run.next()}
                    onKeyDown={e => { if (e.key === 'Enter') run.next(); }}>
                    {run.idx + 1 === run.total ? 'Runde abschließen' : 'Nächste Karte'} →
                  </button>
                </div>
              </div>
            )}
          </div>

          <SnbHunt card={run.card} res={graded && run.last.res.items ? run.last.res : null} dir={cfg.dir} />
        </div>
      )}
    </div>
  );
}

/* ── Result B ── */

function SnbResult({ history, cfg, onRestart, onPractice }) {
  const [openIdx, setOpenIdx] = React.useState(null);
  const okCards = history.filter(h => h.res.verdict === 'ok').length;
  const agg = snAggregate(history);
  const itemsTotal = Object.values(agg.cat).reduce((s, c) => s + c.n, 0);
  const wrongCards = history.filter(h => h.res.verdict !== 'ok');
  const tagList = Object.entries(agg.tags).sort((a, b) => b[1] - a[1]);
  const maxTag = tagList.length ? tagList[0][1] : 1;
  return (
    <div className="snb-wrap" data-screen-label="B · Sentence Result">
      <div className="breadcrumb">Kapitel XII · Satz · Auswertung</div>
      <div className="sn-res-head">
        <div className="sn-res-score">{okCards}<span className="denom"> / {history.length}</span></div>
        <div className="sn-res-sub">{history.length === 1 ? 'Karte' : 'Karten'} ganz richtig{cfg.dir === 'de-en' ? ' · DE → EN, nur Bedeutung bewertet' : ''}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: itemsTotal ? '1fr 1fr' : '1fr', gap: '0 44px' }} className="snb-res-cols">
        {itemsTotal > 0 && (
          <div className="sn-res-sec">
            <span className="micro-mark">Nach Kategorie</span>
            <div className="snb-acc">
              {SN_CATS.filter(c => agg.cat[c].n).map(c => (
                <div className="snb-acc-r" key={c}>
                  <span className="a-dot" style={{ background: SN_CAT[c].color }}></span>
                  <span style={{ fontSize: 14.5, color: 'var(--ink-soft)' }}>{SN_CAT[c].de}</span>
                  <span className="a-n">{agg.cat[c].ok}<span> / {agg.cat[c].n}</span></span>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="sn-res-sec">
          <span className="micro-mark">Fehlerbild</span>
          {tagList.length > 0 ? (
            <div className="snb-tagbars">
              {tagList.map(([t, n]) => (
                <div className="snb-tagbar" key={t}>
                  <span className="tb-l">{t}</span>
                  <span className="tb-t"><span className="tb-f" style={{ width: (n / maxTag * 100) + '%' }}></span></span>
                  <span className="tb-v">{n}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="grading-hint" style={{ marginTop: 10 }}>
              {cfg.dir === 'de-en' ? 'In DE → EN gibt es keine Fehler-Tags — bewertet wird nur die Bedeutung.' : 'Kein einziger Fehler — nichts zu zeigen.'}
            </p>
          )}
        </div>
      </div>

      <div className="sn-res-sec">
        <span className="micro-mark">Karten</span>
        <div>
          {history.map((h, i) => (
            <div className="sna-resrow" key={i}>
              <button className="sna-resrow-h" onClick={() => setOpenIdx(openIdx === i ? null : i)}>
                <span className={'sn-check ' + (h.res.verdict === 'ok' ? 'ok' : 'no')} style={h.res.verdict === 'part' ? { color: 'var(--ochre)' } : undefined}>
                  {h.res.verdict === 'ok' ? '✓' : h.res.verdict === 'part' ? '◐' : '✗'}</span>
                <span className="sna-resrow-src">{cfg.dir === 'de-en' ? h.card.de : snbEnPlain(h.card)}</span>
                <span className="micro-mark">{openIdx === i ? 'schließen' : 'öffnen'}</span>
              </button>
              {openIdx === i && (
                <div className="sna-resrow-b">
                  <div className="a-l">Deine Antwort</div>
                  <div className="a-t" style={{ fontStyle: 'italic' }}>{h.answer}</div>
                  <div className="a-l">Referenz</div>
                  <div className="a-t">{cfg.dir === 'de-en' ? snbEnPlain(h.card) : h.card.de}</div>
                  {h.res.items && (
                    <div className="snb-tbl" style={{ borderTop: 0, marginTop: 12 }}>
                      {h.card.items.map(it => {
                        const ok = h.res.items.find(r => r.k === it.k).ok;
                        return (
                          <div className="snb-tbl-r" key={it.k}>
                            <span className={'sn-check ' + (ok ? 'ok' : 'no')}>{ok ? '✓' : '✗'}</span>
                            <span className="t-dot" style={{ background: SN_CAT[it.cat].color }}></span>
                            <span className="t-en">{it.en}</span>
                            <span className="t-sol">{it.sol}</span>
                            <span className="t-meta">{it.rekt && <SnRekt text={it.rekt} />}{!ok && <SnTagChips tags={it.tags} />}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="setup-actions">
        <button className="btn btn-ghost" onClick={onRestart}>← Neue Runde</button>
        {wrongCards.length > 0 && cfg.dir === 'en-de' && (
          <button className="btn btn-accent" onClick={() => onPractice(wrongCards.map(w => w.card))}>
            Fehler üben · {wrongCards.length} {wrongCards.length === 1 ? 'Karte' : 'Karten'} →
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Flow shell B ── */

function SentenceB({ demo }) {
  const [stage, setStage] = React.useState('setup');
  const [cfg, setCfg] = React.useState(null);
  const [deck, setDeck] = React.useState([]);
  const [history, setHistory] = React.useState([]);
  const [practiceDeck, setPracticeDeck] = React.useState(null);

  const start = (c) => { setCfg(c); setDeck(snBuildDeck(c.counts, c.cards, demo)); setHistory([]); setStage('run'); };
  const done = (h, retryCards) => {
    if (stage === 'run') { setHistory(h); if (retryCards) { setPracticeDeck(retryCards); setStage('practice'); } else setStage('result'); }
    else setStage('result');
  };
  if (stage === 'setup') return <SnbSetup demo={demo} onStart={start} />;
  if (stage === 'run') return <SnbRunner cfg={cfg} demo={demo} deck={deck} onDone={done} onExit={() => setStage('setup')} />;
  if (stage === 'practice') return <SnbRunner cfg={cfg} demo={demo} deck={practiceDeck} practice onDone={done} onExit={() => setStage('result')} />;
  return <SnbResult history={history} cfg={cfg} onRestart={() => setStage('setup')}
    onPractice={(cards) => { setPracticeDeck(cards); setStage('practice'); }} />;
}

Object.assign(window, { SentenceB });
