// ─── Sentence module · Variant A — „Das Register" ───
// One editorial scroll: category ledger rows with segmented counts, a quiet sticky
// budget strip, inline-expanding filters, numbers-only manifest in the runner.

function snaEnPlain(card) { return card.en.map(t => typeof t === 'string' ? t : t.t).join(''); }

function SnaCount({ value, max, total, onChange }) {
  return (
    <div className="segmented sna-count-seg">
      {Array.from({ length: max + 1 }).map((_, o) => (
        <button key={o} className={value === o ? 'active' : ''}
          disabled={o > value && total - value + o > SN_BUDGET}
          onClick={() => onChange(o)}>{o}</button>
      ))}
    </div>
  );
}

function SnaMeter({ counts }) {
  const total = snItemTotal(counts);
  const cells = [];
  SN_CATS.forEach(c => { for (let i = 0; i < counts[c]; i++) cells.push(c); });
  const cls = total === 0 ? ' empty' : total >= SN_WARN_AT ? ' warn' : '';
  return (
    <div className={'sna-meter' + cls}>
      <div className="sna-cells">
        {Array.from({ length: SN_BUDGET }).map((_, i) => {
          const c = cells[i];
          return <span key={i} className={'sna-cell' + (c ? ' f' : '')}
            style={c ? { background: SN_CAT[c].color, borderColor: SN_CAT[c].color } : undefined}>
            {c ? SN_CAT[c].letter : ''}</span>;
        })}
      </div>
      <div className="sna-meter-t">
        {total === 0 ? 'Leer — wähle mindestens ein Item'
          : total >= SN_WARN_AT ? total + ' / 8 — Karten werden zu Kurztexten (3–4 Sätze) gedehnt'
          : total + ' / 8 Items pro Karte'}
      </div>
    </div>
  );
}

function SnaChips({ list, sel, onToggle, disabledIds }) {
  return (
    <div className="chip-row">
      {list.map(o => {
        const off = disabledIds && disabledIds.has(o.id);
        return <button key={o.id} className={'chip' + (sel.has(o.id) ? ' selected' : '')}
          disabled={off} style={off ? { opacity: .35, cursor: 'not-allowed' } : undefined}
          onClick={() => onToggle(o.id)}>
          {o.label}<span className="chip-count">{o.n}</span>
        </button>;
      })}
    </div>
  );
}

function SnaBlock({ cat, count, max, total, onCount, summary, open, onOpen, children, filterless }) {
  const m = SN_CAT[cat];
  return (
    <div className="sna-block">
      <div className="sna-block-h">
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: m.color, flex: 'none' }}></span>
        <span className="sna-name">{m.de}<span className="de">pro Karte</span></span>
        <span className="sna-count"><SnaCount value={count} max={max} total={total} onChange={onCount} /></span>
      </div>
      <div className="sna-sum">
        <span className="sna-sum-t">{summary}</span>
        {!filterless && <button className="sna-flt" onClick={onOpen}>{open ? 'Filter schließen' : 'Filter'}</button>}
      </div>
      {open && !filterless && <div className="sna-filters">{children}</div>}
    </div>
  );
}

function SnaSetup({ demo, onStart, initial }) {
  const [counts, setCounts] = React.useState(initial?.counts || { verb: 2, noun: 2, prep: 1, dac: 1, conn: 1 });
  const [vLevels, setVLevels] = React.useState(() => new Set(['A2', 'B1']));
  const [vTypes, setVTypes] = React.useState(() => new Set(SN_VERB_TYPES.map(t => t.id)));
  const [vRekt, setVRekt] = React.useState(() => new Set(SN_REKTION.map(r => r.id)));
  const [nGroups, setNGroups] = React.useState(() => new Set(SN_NOUN_GROUPS.filter(g => g.n).map(g => g.id)));
  const [pGroups, setPGroups] = React.useState(() => new Set(SN_PREP_GROUPS.map(g => g.id)));
  const [kFams, setKFams] = React.useState(() => new Set(['adversativ', 'kausal', 'konzessiv']));
  const [kDetail, setKDetail] = React.useState(false);
  const [kWords, setKWords] = React.useState(() => new Set());
  const [open, setOpen] = React.useState(null);
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

  const famWordKey = (f, w) => f + ':' + w;
  const wordOn = (f, w) => kDetail ? kWords.has(famWordKey(f, w)) : kFams.has(f);
  const toggleWord = (f, w) => { const s = new Set(kWords); const k = famWordKey(f, w); s.has(k) ? s.delete(k) : s.add(k); setKWords(s); };
  const enterDetail = () => {
    if (!kDetail) { const s = new Set(); SN_CONN_FAMILIES.forEach(f => { if (kFams.has(f.id)) f.words.forEach(w => s.add(famWordKey(f.id, w.w))); }); setKWords(s); }
    setKDetail(!kDetail);
  };

  const emptyPool = {
    verb: counts.verb > 0 && (vLevels.size === 0 || vTypes.size === 0 || vRekt.size === 0),
    noun: counts.noun > 0 && nGroups.size === 0,
    prep: counts.prep > 0 && pGroups.size === 0,
    dac: false,
    conn: counts.conn > 0 && (kDetail ? kWords.size === 0 : kFams.size === 0),
  };
  const anyEmpty = SN_CATS.some(c => emptyPool[c]);
  const canStart = total > 0 && !anyEmpty && !demo.aiMissing;

  const allNone = (list, setter) => (
    <span className="field-actions">
      <button className="btn btn-quiet" onClick={() => setter(new Set(list))}>All</button>
      <button className="btn btn-quiet" onClick={() => setter(new Set())}>None</button>
    </span>
  );

  return (
    <div className="sna-wrap" data-screen-label="A · Sentence Setup">
      <div className="section-header" style={{ marginBottom: 0 }}>
        <div>
          <div className="breadcrumb">Kapitel XII · Satz · Einrichtung</div>
          <h1 className="section-title">Setup<em>.</em></h1>
          <p className="section-subtitle">
            Eine Karte, alle Kategorien: die KI schreibt einen Satz, der jedes bestellte Item
            enthält — normalerweise 1–2 Sätze, bei voller Packung ein Kurztext. Jede Karte
            zieht frische Wörter.
          </p>
        </div>
      </div>

      <SnaMeter counts={counts} />

      {demo.aiMissing && (
        <div className="alert alert-danger" style={{ marginTop: 18 }}>
          <span className="alert-label">KI-Schlüssel fehlt</span>
          Ohne Schlüssel können keine Karten generiert werden. Hinterlege ihn in den Einstellungen.
        </div>
      )}

      <SnaBlock cat="verb" count={counts.verb} max={SN_MAX.verb} total={total} onCount={v => setC('verb', v)}
        open={open === 'verb'} onOpen={() => setOpen(open === 'verb' ? null : 'verb')}
        summary={[...vLevels].join(' ') + (vLevels.size ? '' : '— ') + ' · ' + vTypes.size + '/' + SN_VERB_TYPES.length + ' Typen · Rektion ' + vRekt.size + '/' + SN_REKTION.length}>
        <div className="field">
          <div className="field-row"><div className="field-label">Niveau</div>{allNone(SN_VERB_LEVELS, setVLevels)}</div>
          <SnaChips list={SN_VERB_LEVELS.map(l => ({ id: l, label: l, n: SN_VERB_LEVEL_N[l] }))} sel={vLevels} onToggle={tgl(vLevels, setVLevels)} />
        </div>
        <div className="field">
          <div className="field-row"><div className="field-label">Typ</div>{allNone(SN_VERB_TYPES.map(t => t.id), setVTypes)}</div>
          <SnaChips list={SN_VERB_TYPES} sel={vTypes} onToggle={tgl(vTypes, setVTypes)} />
        </div>
        <div className="field">
          <div className="field-row"><div className="field-label">Rektion · Objektkasus</div>{allNone(SN_REKTION.map(r => r.id), setVRekt)}</div>
          <SnaChips list={SN_REKTION} sel={vRekt} onToggle={tgl(vRekt, setVRekt)} />
          <p className="grading-hint">„Verb + Dativ" gezielt üben: nur Dativ anwählen.</p>
        </div>
      </SnaBlock>
      {emptyPool.verb && <div className="alert alert-warning"><span className="alert-label">Leerer Pool</span>Verben stehen auf {counts.verb}, aber kein Verb passt zu den Filtern.</div>}

      <SnaBlock cat="noun" count={counts.noun} max={SN_MAX.noun} total={total} onCount={v => setC('noun', v)}
        open={open === 'noun'} onOpen={() => setOpen(open === 'noun' ? null : 'noun')}
        summary={nGroups.size + '/' + SN_NOUN_GROUPS.filter(g => g.n).length + ' Themengruppen'}>
        <div className="field">
          <div className="field-row"><div className="field-label">Themen</div>{allNone(SN_NOUN_GROUPS.filter(g => g.n).map(g => g.id), setNGroups)}</div>
          <SnaChips list={SN_NOUN_GROUPS} sel={nGroups} onToggle={tgl(nGroups, setNGroups)}
            disabledIds={new Set(SN_NOUN_GROUPS.filter(g => !g.n).map(g => g.id))} />
        </div>
      </SnaBlock>
      {emptyPool.noun && <div className="alert alert-warning"><span className="alert-label">Leerer Pool</span>Nomen stehen auf {counts.noun}, aber keine Themengruppe ist gewählt.</div>}

      <SnaBlock cat="prep" count={counts.prep} max={SN_MAX.prep} total={total} onCount={v => setC('prep', v)}
        open={open === 'prep'} onOpen={() => setOpen(open === 'prep' ? null : 'prep')}
        summary={pGroups.size + '/' + SN_PREP_GROUPS.length + ' Kasusgruppen'}>
        <div className="field">
          <div className="field-row"><div className="field-label">Kasusgruppe</div>{allNone(SN_PREP_GROUPS.map(g => g.id), setPGroups)}</div>
          <SnaChips list={SN_PREP_GROUPS} sel={pGroups} onToggle={tgl(pGroups, setPGroups)} />
        </div>
      </SnaBlock>
      {emptyPool.prep && <div className="alert alert-warning"><span className="alert-label">Leerer Pool</span>Präpositionen stehen auf {counts.prep}, aber keine Kasusgruppe ist gewählt.</div>}

      <SnaBlock cat="dac" count={counts.dac} max={SN_MAX.dac} total={total} onCount={v => setC('dac', v)}
        filterless summary="feste Kollokationsliste — keine Filter in v1" />

      <SnaBlock cat="conn" count={counts.conn} max={SN_MAX.conn} total={total} onCount={v => setC('conn', v)}
        open={open === 'conn'} onOpen={() => setOpen(open === 'conn' ? null : 'conn')}
        summary={kDetail ? kWords.size + ' Wörter (detailliert)' : kFams.size + '/' + SN_CONN_FAMILIES.length + ' Familien'}>
        <div className="field">
          <div className="field-row">
            <div className="field-label">Bedeutungsfamilien</div>
            <span className="field-actions">
              <button className="btn btn-quiet" onClick={enterDetail}>{kDetail ? '← Familien' : 'Detailliert'}</button>
            </span>
          </div>
          {!kDetail && (
            <div className="chip-row">
              {SN_CONN_FAMILIES.map(f => (
                <button key={f.id} className={'chip' + (kFams.has(f.id) ? ' selected' : '')} onClick={() => tgl(kFams, setKFams)(f.id)}>
                  {f.label}<span className="chip-count">{f.words.length}</span>
                </button>
              ))}
            </div>
          )}
          {kDetail && (
            <div className="sna-fam-words">
              {SN_CONN_FAMILIES.filter(f => kFams.has(f.id)).map(f => (
                <div key={f.id}>
                  <div className="fam-l">{f.label} · {f.de}</div>
                  <div className="chip-row">
                    {f.words.map(w => (
                      <button key={w.w} className={'chip' + (wordOn(f.id, w.w) ? ' selected' : '')} onClick={() => toggleWord(f.id, w.w)}>{w.w}</button>
                    ))}
                  </div>
                </div>
              ))}
              {kFams.size === 0 && <p className="grading-hint">Erst Familien wählen — dann hier einzelne Wörter abwählen.</p>}
            </div>
          )}
          <p className="grading-hint">Familie gewählt = alle Wörter der Familie im Topf. Zweiteilige Paare (sowohl … als auch) zählen als ein Item.</p>
        </div>
      </SnaBlock>
      {emptyPool.conn && <div className="alert alert-warning"><span className="alert-label">Leerer Pool</span>Konnektoren stehen auf {counts.conn}, aber kein Wort ist gewählt.</div>}

      <div className="sna-opts">
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
        {dir === 'en-de' && (
          <div className="field">
            <div className="field-label">Modalität</div>
            <div className="segmented">
              <button className={modality === 'typed' ? 'active' : ''} onClick={() => setModality('typed')}>Getippt</button>
              <button className={modality === 'spoken' ? 'active' : ''} disabled={!micOk} onClick={() => micOk && setModality('spoken')}>Gesprochen</button>
            </div>
            {!micOk && <p className="grading-hint">Gesprochen erfordert Mikrofonzugriff — in diesem Browser nicht verfügbar.</p>}
          </div>
        )}
        {dir === 'en-de' && (
          <div className="field">
            <div className="field-label">Wort-Hinweise</div>
            <div className="segmented">
              <button className={hints ? 'active' : ''} onClick={() => setHints(true)}>An</button>
              <button className={!hints ? 'active' : ''} onClick={() => setHints(false)}>Aus</button>
            </div>
            <p className="grading-hint">Markiert die abgefragten Wörter im englischen Satz.</p>
          </div>
        )}
        <div className="field">
          <div className="field-label">Anzahl Karten</div>
          <div className="field-row count-row">
            <div className="segmented">
              {[3, 5, 8].map(p => <button key={p} className={preset === p ? 'active' : ''} onClick={() => setPreset(p)}>{p}</button>)}
              <button className={preset === 'custom' ? 'active' : ''} onClick={() => setPreset('custom')}>Custom</button>
            </div>
            {preset === 'custom' && <input className="input" type="number" min="1" max="12" value={custom}
              onChange={e => setCustom(parseInt(e.target.value, 10) || 1)} style={{ width: 70, fontSize: 17 }} />}
            <span className="micro-mark count-avail">1 Karte ≈ {Math.max(total, 1)} bewertete Items</span>
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
      {total === 0 && <p className="grading-hint" style={{ textAlign: 'right' }}>Wähle mindestens ein Item pro Karte.</p>}
    </div>
  );
}

/* ── Runner A ── */

function SnaReveal({ entry, dir, answer }) {
  const { card, res, offline } = entry;
  const okOf = k => res.items && res.items.find(r => r.k === k).ok;
  return (
    <div>
      <div className="sna-sticky">
        <div className="sna-rev-h compact">
          <span className={'sn-verdict v-' + res.verdict}>{SN_VERDICT[res.verdict]}{res.items ? ' · ' + res.okCount + ' / ' + res.items.length + ' Items' : ''}</span>
          {offline && <SnOffline />}
          {dir !== 'de-en' && <span style={{ marginLeft: 'auto' }}><SnTTS text={card.de} /></span>}
        </div>
        <div className="sna-st-r"><span className="sna-st-l">Quelle</span><span className="sna-st-t">{dir === 'de-en' ? card.de : snaEnPlain(card)}</span></div>
        <div className="sna-st-r"><span className="sna-st-l">Du</span><span className="sna-st-t you" style={{ color: res.verdict === 'ok' ? 'var(--success)' : res.verdict === 'part' ? 'var(--ochre)' : 'var(--danger)' }}>{answer}</span></div>
        <div className="sna-st-r"><span className="sna-st-l">Referenz</span><span className="sna-st-t ref">{dir === 'de-en' ? snaEnPlain(card) : card.de}</span></div>
      </div>
      {!offline && <p className="sna-tip" style={{ marginTop: 12 }}>{card.tip}</p>}
      {offline && <p className="sna-tip" style={{ marginTop: 12 }}>KI-Bewertung nicht erreichbar — lokale Prüfung per Wortabgleich, ohne Coaching-Tipp.</p>}
      {dir === 'de-en' && <p className="grading-hint">Nur Bedeutungs-Bewertung — keine Fehler-Tags in DE → EN.</p>}
      {res.items && (
        <div className="sna-list">
          {card.items.map(it => (
            <div className="sna-row compact" key={it.k}>
              <span className={'sn-check ' + (okOf(it.k) ? 'ok' : 'no')}>{okOf(it.k) ? '✓' : '✗'}</span>
              <span className="r-dot" style={{ background: SN_CAT[it.cat].color }}></span>
              <span className="r-en">{it.en}{it.pair ? ' (Paar)' : ''}</span>
              <span className="r-sol">{it.sol}</span>
              <span className="r-meta">
                {it.rekt && <SnRekt text={it.rekt} />}
                {!okOf(it.k) && <SnTagChips tags={it.tags} />}
              </span>
            </div>
          ))}
          <div style={{ height: 30 }}></div>
        </div>
      )}
    </div>
  );
}

function SnaRunner({ cfg, demo, deck, practice, onDone, onExit }) {
  const run = useSnRun({ deck, offline: demo.offline, practice });
  const [answer, setAnswer] = React.useState('');
  const [rec, setRec] = React.useState('idle');
  const taRef = React.useRef(null);
  const spoken = cfg.modality === 'spoken' && !demo.noMic;
  const micDenied = cfg.modality === 'spoken' && demo.noMic;
  const shortfall = deck.length < cfg.cards;

  React.useEffect(() => { if (run.phase === 'answer') { setAnswer(''); setRec('idle'); if (taRef.current) { taRef.current.style.height = 'auto'; taRef.current.focus(); } } }, [run.phase, run.idx]);
  React.useEffect(() => {
    if (!spoken) return;
    const h = (e) => {
      if (e.code === 'Space' && run.phase === 'answer' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        if (rec === 'idle') setRec('live');
        else if (rec === 'live') stopRec();
      }
    };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  });
  const stopRec = () => {
    setRec('done');
    const t = snTranscript(run.card);
    setAnswer(t);
    setTimeout(() => run.submit(t, cfg.dir), 600);
  };
  const doSubmit = () => { if (answer.trim()) run.submit(answer, cfg.dir); };
  const onKey = (e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); doSubmit(); } };
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

  const size = run.card && run.card.sents >= 3 ? 's4' : run.card.sents === 2 ? 's2' : 's1';
  return (
    <div className="sna-run" data-screen-label="A · Sentence Runner">
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
        <div>
          {run.phase !== 'graded' && cfg.dir === 'en-de' && (
            <div className="sna-manifest">
              <span className="m-l">Gesucht</span>
              {snManifestParts(run.card, false).map((p, i, a) => (
                <React.Fragment key={i}><span className="m-p">{p}</span>{i < a.length - 1 && <span className="m-s">·</span>}</React.Fragment>
              ))}
              {run.card.sents >= 3 && <span className="m-s" style={{ marginLeft: 'auto', fontStyle: 'italic' }}>Kurztext · {run.card.sents} Sätze</span>}
            </div>
          )}
          {cfg.dir === 'de-en' && run.phase !== 'graded' && <div style={{ height: 20 }}></div>}
          {run.phase !== 'graded' && <SnSource card={run.card} hints={cfg.hints} dir={cfg.dir} size={size} />}

          {run.phase === 'answer' && (
            <div className="sna-answer">
              {spoken ? (
                <div className="sn-rec">
                  <button className={'sn-rec-btn' + (rec === 'live' ? ' live' : '')}
                    onClick={() => rec === 'idle' ? setRec('live') : rec === 'live' ? stopRec() : null}>{rec === 'live' ? '■' : '●'}</button>
                  <div className="sn-rec-t">
                    {rec === 'idle' && <>Leertaste oder Knopf: Aufnahme starten. Sprich die ganze Übersetzung — auch mehrere Sätze.</>}
                    {rec === 'live' && <>Aufnahme läuft … Leertaste beendet und reicht automatisch ein.</>}
                    {rec === 'done' && <>Transkript: „{answer}"</>}
                  </div>
                </div>
              ) : (
                <div>
                  <textarea ref={taRef} className="sn-ta" rows={cfg.dir === 'de-en' || run.card.sents === 1 ? 2 : run.card.sents}
                    placeholder={cfg.dir === 'de-en' ? 'Deine englische Übersetzung …' : 'Deine deutsche Übersetzung — gern mehrere Sätze …'}
                    value={answer} onChange={grow} onKeyDown={onKey}></textarea>
                  <div className="sn-foot">
                    <span className="sn-kbd">Enter = neue Zeile · <span className="kbd">Strg</span>+<span className="kbd">Enter</span> reicht ein</span>
                    <button className="btn btn-accent" disabled={!answer.trim()} onClick={doSubmit}>Einreichen →</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {run.phase === 'grading' && (
            <div className="sna-answer">
              <div className="sn-ta" style={{ color: 'var(--mute)' }}>{answer}</div>
              <div className="sn-foot"><span className="sn-stream-t" style={{ fontStyle: 'normal' }}>KI bewertet</span></div>
            </div>
          )}

          {run.phase === 'graded' && run.last && (
            <div>
              <SnaReveal entry={run.last} dir={cfg.dir} answer={answer} />
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
      )}
    </div>
  );
}

/* ── Result A ── */

function SnaResult({ history, cfg, onRestart, onPractice }) {
  const [openIdx, setOpenIdx] = React.useState(null);
  const okCards = history.filter(h => h.res.verdict === 'ok').length;
  const agg = snAggregate(history);
  const itemsTotal = Object.values(agg.cat).reduce((s, c) => s + c.n, 0);
  const itemsOk = Object.values(agg.cat).reduce((s, c) => s + c.ok, 0);
  const wrongCards = history.filter(h => h.res.verdict !== 'ok');
  const tagList = Object.entries(agg.tags).sort((a, b) => b[1] - a[1]);
  return (
    <div className="sna-wrap" data-screen-label="A · Sentence Result">
      <div className="breadcrumb">Kapitel XII · Satz · Auswertung</div>
      <div className="sn-res-head">
        <div className="sn-res-score">{okCards}<span className="denom"> / {history.length}</span></div>
        <div className="sn-res-sub">{history.length === 1 ? 'Karte' : 'Karten'} ganz richtig{itemsTotal ? ' · ' + itemsOk + ' von ' + itemsTotal + ' Items getroffen' : ''}{cfg.dir === 'de-en' ? ' · DE → EN, nur Bedeutung bewertet' : ''}</div>
      </div>

      {itemsTotal > 0 && (
        <div className="sn-res-sec">
          <span className="micro-mark">Nach Kategorie</span>
          <div className="sna-res-bars">
            {SN_CATS.filter(c => agg.cat[c].n).map(c => (
              <div className="sna-bar" key={c}>
                <span className="sna-bar-l">{SN_CAT[c].de}</span>
                <span className="sna-bar-t"><span className="sna-bar-f" style={{ width: (agg.cat[c].ok / agg.cat[c].n * 100) + '%', background: SN_CAT[c].color }}></span></span>
                <span className="sna-bar-v">{agg.cat[c].ok} / {agg.cat[c].n}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tagList.length > 0 && (
        <div className="sn-res-sec">
          <span className="micro-mark">Fehlerbild</span>
          <div className="sna-tagdist">
            {tagList.map(([t, n]) => <span className="sna-tagd" key={t}><b>{n}×</b>{t}</span>)}
          </div>
        </div>
      )}
      {cfg.dir === 'de-en' && (
        <div className="sn-res-sec">
          <span className="micro-mark">Fehlerbild</span>
          <p className="grading-hint" style={{ marginTop: 10 }}>In DE → EN gibt es keine Fehler-Tags — bewertet wird nur die Bedeutung.</p>
        </div>
      )}

      <div className="sn-res-sec">
        <span className="micro-mark">Karten</span>
        <div>
          {history.map((h, i) => (
            <div className="sna-resrow" key={i}>
              <button className="sna-resrow-h" onClick={() => setOpenIdx(openIdx === i ? null : i)}>
                <span className={'sn-check ' + (h.res.verdict === 'ok' ? 'ok' : 'no')} style={h.res.verdict === 'part' ? { color: 'var(--ochre)' } : undefined}>
                  {h.res.verdict === 'ok' ? '✓' : h.res.verdict === 'part' ? '◐' : '✗'}</span>
                <span className="sna-resrow-src">{cfg.dir === 'de-en' ? h.card.de : snaEnPlain(h.card)}</span>
                <span className="micro-mark">{openIdx === i ? 'schließen' : 'öffnen'}</span>
              </button>
              {openIdx === i && (
                <div className="sna-resrow-b">
                  <div className="a-l">Deine Antwort</div>
                  <div className="a-t" style={{ fontStyle: 'italic' }}>{h.answer}</div>
                  <div className="a-l">Referenz</div>
                  <div className="a-t">{cfg.dir === 'de-en' ? snaEnPlain(h.card) : h.card.de}</div>
                  {h.res.items && (
                    <div style={{ marginTop: 10 }}>
                      {h.card.items.map(it => {
                        const ok = h.res.items.find(r => r.k === it.k).ok;
                        return (
                          <div className="sna-row" key={it.k} style={{ gridTemplateColumns: '18px minmax(120px,auto) 1fr auto' }}>
                            <span className={'sn-check ' + (ok ? 'ok' : 'no')}>{ok ? '✓' : '✗'}</span>
                            <span className="r-en">{it.en}</span>
                            <span className="r-sol">{it.sol}</span>
                            <span className="r-meta">{it.rekt && <SnRekt text={it.rekt} />}{!ok && <SnTagChips tags={it.tags} />}</span>
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

/* ── Flow shell A ── */

function SentenceA({ demo }) {
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
  if (stage === 'setup') return <SnaSetup demo={demo} onStart={start} />;
  if (stage === 'run') return <SnaRunner cfg={cfg} demo={demo} deck={deck} onDone={done} onExit={() => setStage('setup')} />;
  if (stage === 'practice') return <SnaRunner cfg={cfg} demo={demo} deck={practiceDeck} practice onDone={done} onExit={() => setStage('result')} />;
  return <SnaResult history={history} cfg={cfg} onRestart={() => setStage('setup')}
    onPractice={(cards) => { setPracticeDeck(cards); setStage('practice'); }} />;
}

Object.assign(window, { SentenceA });
