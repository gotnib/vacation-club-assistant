import { useState, useEffect } from 'react';
import Head from 'next/head';

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£' };

function fmtCash(price, currency = 'USD') {
  const sym = CURRENCY_SYMBOLS[currency] || currency + ' ';
  return `${sym}${Number(price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtPoints(pts) {
  return `${Number(pts).toLocaleString('en-US')} pts`;
}

function timeAgo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// Determine the "best" result by cash price (fallback: points)
function findBest(results) {
  const cashResults = results.filter(r => r.price != null && r.available !== false);
  if (cashResults.length) return cashResults.sort((a, b) => Number(a.price) - Number(b.price))[0];
  const pointsResults = results.filter(r => r.points_cost != null && r.available !== false);
  if (pointsResults.length) return pointsResults.sort((a, b) => Number(a.points_cost) - Number(b.points_cost))[0];
  return null;
}

function PriceDisplay({ result, isBest }) {
  const { payment_type, price, currency, points_cost } = result;
  const type = (payment_type || 'cash').toLowerCase();

  if (type === 'both') {
    return (
      <div className="price-both">
        {price != null && (
          <div className={`result-price${isBest ? ' best-price' : ''}`}>
            {fmtCash(price, currency)}
            <span className="price-type-tag cash-tag">Cash</span>
          </div>
        )}
        {points_cost != null && (
          <div className="result-price points-price">
            {fmtPoints(points_cost)}
            <span className="price-type-tag points-tag">Points</span>
          </div>
        )}
      </div>
    );
  }

  if (type === 'points') {
    return (
      <div className={`result-price points-price${isBest ? ' best-price' : ''}`}>
        {fmtPoints(points_cost)}
        <span className="price-type-tag points-tag">Points</span>
      </div>
    );
  }

  // Default: cash
  return (
    <div className={`result-price${isBest ? ' best-price' : ''}`}>
      {fmtCash(price, currency)}
      <span className="price-type-tag cash-tag">Cash</span>
    </div>
  );
}

function BestDealSummary({ result }) {
  if (!result) return null;
  const type = (result.payment_type || 'cash').toLowerCase();

  let priceDisplay;
  if (type === 'both') {
    priceDisplay = (
      <div className="best-deal-prices">
        {result.price != null && <span>{fmtCash(result.price, result.currency)} <small>cash</small></span>}
        {result.points_cost != null && <span>{fmtPoints(result.points_cost)} <small>pts</small></span>}
      </div>
    );
  } else if (type === 'points') {
    priceDisplay = <div className="best-deal-price">{fmtPoints(result.points_cost)}</div>;
  } else {
    priceDisplay = <div className="best-deal-price">{fmtCash(result.price, result.currency)}</div>;
  }

  return (
    <div className="best-deal">
      <div>
        <div className="best-deal-label">Best rate found</div>
        <div className="best-deal-site">{result.property}</div>
        <div style={{ fontSize: '0.82rem', opacity: 0.8, marginTop: 2 }}>{result.site}</div>
      </div>
      {priceDisplay}
    </div>
  );
}

export default function Dashboard() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [activeEntry, setActiveEntry] = useState(0);
  const [annualSpend, setAnnualSpend] = useState('');
  const [editingSpend, setEditingSpend] = useState(false);
  const [spendInput, setSpendInput] = useState('');

  async function fetchRates() {
    try {
      const res = await fetch('/api/rates');
      const data = await res.json();
      setEntries(data.entries || []);
      setLastRefresh(new Date());
    } catch (e) {
      console.error('Failed to fetch rates:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRates();
    const interval = setInterval(fetchRates, 60000);
    return () => clearInterval(interval);
  }, []);

  // Load saved annual spend from localStorage
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('vca_annual_spend') : null;
    if (saved) setAnnualSpend(saved);
  }, []);

  function saveSpend() {
    const val = spendInput.replace(/[^0-9.]/g, '');
    setAnnualSpend(val);
    if (typeof window !== 'undefined') localStorage.setItem('vca_annual_spend', val);
    setEditingSpend(false);
  }

  const entry = entries[activeEntry] || null;
  // Use entry-level spend if Cowork sent it, otherwise fall back to locally saved value
  const displaySpend = entry?.client_annual_spend || annualSpend || null;
  const best = entry ? findBest(entry.results) : null;

  return (
    <>
      <Head>
        <title>Vacation Club Rates</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="description" content="Live hotel rate comparison from Booking.com and RCI" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />
      </Head>

      <style jsx global>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --sand:    #f5f0e8;
          --warm:    #ede6d6;
          --stone:   #c8bfad;
          --bark:    #7a6a52;
          --ink:     #2c2416;
          --ocean:   #1a6b7c;
          --ocean2:  #0e4f5c;
          --foam:    #e0f0f4;
          --gold:    #c49a3c;
          --green:   #3a7d5a;
          --red:     #b84040;
          --points:  #5a3e8a;
        }

        html, body {
          background: var(--sand);
          color: var(--ink);
          font-family: 'DM Sans', sans-serif;
          font-size: 16px;
          min-height: 100vh;
          -webkit-font-smoothing: antialiased;
        }

        .app {
          max-width: 900px;
          margin: 0 auto;
          padding: 24px 20px 60px;
        }

        /* ── Header ── */
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 32px;
          padding-bottom: 20px;
          border-bottom: 1.5px solid var(--stone);
        }
        .header-left h1 {
          font-family: 'DM Serif Display', serif;
          font-size: clamp(1.6rem, 4vw, 2.2rem);
          color: var(--ocean2);
          line-height: 1.1;
        }
        .header-left p {
          font-size: 0.78rem;
          color: var(--bark);
          margin-top: 4px;
          font-weight: 300;
          letter-spacing: 0.03em;
        }
        .refresh-btn {
          background: var(--ocean);
          color: #fff;
          border: none;
          border-radius: 8px;
          padding: 10px 18px;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.82rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s;
          white-space: nowrap;
        }
        .refresh-btn:hover { background: var(--ocean2); }
        .refresh-btn:disabled { opacity: 0.5; cursor: default; }

        /* ── Empty state ── */
        .empty {
          text-align: center;
          padding: 80px 20px;
          color: var(--bark);
        }
        .empty .icon { font-size: 3rem; margin-bottom: 16px; }
        .empty h2 {
          font-family: 'DM Serif Display', serif;
          font-size: 1.4rem;
          color: var(--ocean2);
          margin-bottom: 8px;
        }
        .empty p { font-size: 0.9rem; line-height: 1.6; max-width: 420px; margin: 0 auto; }
        .empty code {
          display: block;
          background: var(--warm);
          border: 1px solid var(--stone);
          border-radius: 8px;
          padding: 12px 16px;
          font-size: 0.75rem;
          text-align: left;
          margin-top: 24px;
          line-height: 1.9;
          color: var(--ink);
          word-break: break-all;
        }

        /* ── Annual spend widget ── */
        .spend-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          background: var(--warm);
          border: 1px solid var(--stone);
          border-radius: 10px;
          padding: 12px 16px;
          margin-bottom: 16px;
          font-size: 0.82rem;
          flex-wrap: wrap;
        }
        .spend-label { color: var(--bark); font-weight: 300; white-space: nowrap; }
        .spend-value { font-weight: 600; color: var(--green); font-size: 1rem; }
        .spend-edit-btn {
          background: none;
          border: 1px solid var(--stone);
          border-radius: 6px;
          padding: 4px 10px;
          font-size: 0.75rem;
          color: var(--bark);
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          transition: all 0.15s;
        }
        .spend-edit-btn:hover { border-color: var(--ocean); color: var(--ocean); }
        .spend-input-row { display: flex; gap: 8px; align-items: center; width: 100%; }
        .spend-input {
          border: 1.5px solid var(--ocean);
          border-radius: 6px;
          padding: 6px 10px;
          font-size: 0.9rem;
          font-family: 'DM Sans', sans-serif;
          width: 160px;
          background: #fff;
          color: var(--ink);
          outline: none;
        }
        .spend-save-btn {
          background: var(--ocean);
          color: #fff;
          border: none;
          border-radius: 6px;
          padding: 6px 14px;
          font-size: 0.82rem;
          font-family: 'DM Sans', sans-serif;
          cursor: pointer;
          font-weight: 500;
        }
        .spend-hint {
          font-size: 0.72rem;
          color: var(--bark);
          margin-top: 2px;
          width: 100%;
        }

        /* ── Fetch history tabs ── */
        .fetch-tabs {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 4px;
          margin-bottom: 24px;
          scrollbar-width: none;
        }
        .fetch-tabs::-webkit-scrollbar { display: none; }
        .fetch-tab {
          flex-shrink: 0;
          background: var(--warm);
          border: 1.5px solid var(--stone);
          border-radius: 8px;
          padding: 8px 14px;
          font-size: 0.78rem;
          cursor: pointer;
          transition: all 0.15s;
          color: var(--bark);
          font-family: 'DM Sans', sans-serif;
        }
        .fetch-tab.active {
          background: var(--ocean);
          border-color: var(--ocean);
          color: #fff;
          font-weight: 500;
        }
        .fetch-tab:hover:not(.active) { border-color: var(--ocean); color: var(--ocean); }

        /* ── Meta bar ── */
        .meta-bar {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 24px;
          background: var(--warm);
          border: 1px solid var(--stone);
          border-radius: 10px;
          padding: 14px 16px;
          font-size: 0.82rem;
        }
        .meta-item { display: flex; gap: 6px; align-items: center; }
        .meta-label { color: var(--bark); font-weight: 300; }
        .meta-value { color: var(--ink); font-weight: 500; }
        .meta-value.spend { color: var(--green); font-weight: 600; }

        /* ── Best deal banner ── */
        .best-deal {
          background: linear-gradient(135deg, var(--ocean2) 0%, var(--ocean) 100%);
          color: #fff;
          border-radius: 12px;
          padding: 18px 20px;
          margin-bottom: 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
        }
        .best-deal-label {
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          opacity: 0.8;
          margin-bottom: 4px;
        }
        .best-deal-site { font-family: 'DM Serif Display', serif; font-size: 1.3rem; }
        .best-deal-price {
          font-family: 'DM Serif Display', serif;
          font-size: 2rem;
          white-space: nowrap;
          color: #ffd97d;
        }
        .best-deal-prices {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 4px;
        }
        .best-deal-prices span {
          font-family: 'DM Serif Display', serif;
          font-size: 1.4rem;
          color: #ffd97d;
        }
        .best-deal-prices small {
          font-family: 'DM Sans', sans-serif;
          font-size: 0.7rem;
          opacity: 0.75;
          font-weight: 300;
          margin-left: 4px;
        }

        /* ── Results grid ── */
        .results-grid {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .result-card {
          background: #fff;
          border: 1.5px solid var(--stone);
          border-radius: 12px;
          padding: 16px 18px;
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 8px 16px;
          transition: border-color 0.15s;
        }
        .result-card:hover { border-color: var(--ocean); }
        .result-card.best { border-color: var(--gold); background: #fffbf0; }
        .result-card.unavailable { opacity: 0.55; }

        .result-site {
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--bark);
          margin-bottom: 2px;
        }
        .result-property {
          font-family: 'DM Serif Display', serif;
          font-size: 1.05rem;
          color: var(--ink);
        }
        .result-availability {
          font-size: 0.75rem;
          margin-top: 4px;
          font-weight: 500;
        }
        .avail-yes { color: var(--green); }
        .avail-no  { color: var(--red); }

        /* ── Per-card notes ── */
        .card-notes {
          grid-column: 1 / -1;
          background: var(--foam);
          border: 1px solid #b0d8e0;
          border-radius: 8px;
          padding: 10px 13px;
          font-size: 0.8rem;
          color: var(--ocean2);
          line-height: 1.55;
          margin-top: 4px;
        }
        .card-notes-label {
          font-size: 0.68rem;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: var(--bark);
          font-weight: 500;
          margin-bottom: 4px;
        }

        /* ── Price display ── */
        .result-price-col { text-align: right; }
        .price-both { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
        .result-price {
          font-family: 'DM Serif Display', serif;
          font-size: 1.45rem;
          color: var(--ocean2);
          display: flex;
          align-items: center;
          gap: 6px;
          justify-content: flex-end;
        }
        .result-price.best-price { color: var(--gold); }
        .points-price { color: var(--points) !important; }
        .price-type-tag {
          font-family: 'DM Sans', sans-serif;
          font-size: 0.62rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          border-radius: 4px;
          padding: 2px 5px;
        }
        .cash-tag  { background: #e6f4ea; color: var(--green); }
        .points-tag { background: #ede8f5; color: var(--points); }

        .result-link {
          display: block;
          font-size: 0.72rem;
          color: var(--ocean);
          text-decoration: none;
          margin-top: 6px;
          text-align: right;
        }
        .result-link:hover { text-decoration: underline; }

        .badge-best {
          display: inline-block;
          background: var(--gold);
          color: #fff;
          font-size: 0.65rem;
          font-weight: 500;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          border-radius: 4px;
          padding: 2px 6px;
          margin-left: 8px;
          vertical-align: middle;
        }

        /* ── Footer ── */
        .footer {
          margin-top: 40px;
          text-align: center;
          font-size: 0.75rem;
          color: var(--stone);
        }

        @media (max-width: 540px) {
          .best-deal { flex-direction: column; align-items: flex-start; }
          .best-deal-prices { align-items: flex-start; }
          .result-card { grid-template-columns: 1fr; }
          .result-price-col { text-align: left; }
          .price-both { align-items: flex-start; }
          .result-price { justify-content: flex-start; }
          .result-link { text-align: left; }
        }
      `}</style>

      <div className="app">
        <header className="header">
          <div className="header-left">
            <h1>Vacation Club Rates</h1>
            <p>
              {lastRefresh
                ? `Last refreshed ${timeAgo(lastRefresh.toISOString())}`
                : 'Loading…'}
            </p>
          </div>
          <button
            className="refresh-btn"
            onClick={() => { setLoading(true); fetchRates(); }}
            disabled={loading}
          >
            {loading ? 'Refreshing…' : '↻ Refresh'}
          </button>
        </header>

        {/* Annual spend input */}
        <div className="spend-bar">
          <span className="spend-label">Client annual vacation spend:</span>
          {!editingSpend ? (
            <>
              <span className="spend-value">
                {displaySpend ? `$${Number(displaySpend).toLocaleString('en-US')} / yr` : '—'}
              </span>
              <button className="spend-edit-btn" onClick={() => { setSpendInput(displaySpend || ''); setEditingSpend(true); }}>
                {displaySpend ? 'Edit' : '+ Add'}
              </button>
              {!displaySpend && (
                <span className="spend-hint">Add this so Cowork can factor it into comparisons</span>
              )}
            </>
          ) : (
            <div className="spend-input-row">
              <span style={{ color: 'var(--bark)', fontSize: '0.9rem' }}>$</span>
              <input
                className="spend-input"
                type="text"
                inputMode="numeric"
                placeholder="e.g. 4500"
                value={spendInput}
                onChange={e => setSpendInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveSpend()}
                autoFocus
              />
              <button className="spend-save-btn" onClick={saveSpend}>Save</button>
              <button className="spend-edit-btn" onClick={() => setEditingSpend(false)}>Cancel</button>
            </div>
          )}
        </div>

        {loading && entries.length === 0 ? (
          <div className="empty">
            <div className="icon">🏖️</div>
            <h2>Waiting for rates…</h2>
            <p>No data yet. Run your Cowork task to pull rates from Booking.com and RCI.</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="empty">
            <div className="icon">🏖️</div>
            <h2>No rates found</h2>
            <p>Have Cowork POST rate data to your API endpoint. Example payload:</p>
            <code>{`POST /api/rates\n{\n  "checkin": "2025-08-01",\n  "checkout": "2025-08-07",\n  "guests": 2,\n  "client_annual_spend": 4500,\n  "results": [\n    {\n      "site": "RCI",\n      "property": "Ocean Palms Resort",\n      "payment_type": "both",\n      "points_cost": 12500,\n      "price": 154.00,\n      "currency": "USD",\n      "available": true,\n      "url": "https://rci.com/...",\n      "notes": "Studio unit, pool view, includes resort fee"\n    },\n    {\n      "site": "Booking.com",\n      "property": "Ocean Palms Resort",\n      "payment_type": "cash",\n      "price": 189.00,\n      "currency": "USD",\n      "available": true,\n      "url": "https://booking.com/...",\n      "notes": "Free cancellation until 48hrs prior"\n    }\n  ]\n}`}</code>
          </div>
        ) : (
          <>
            {entries.length > 1 && (
              <div className="fetch-tabs">
                {entries.map((e, i) => (
                  <button
                    key={e.id}
                    className={`fetch-tab${i === activeEntry ? ' active' : ''}`}
                    onClick={() => setActiveEntry(i)}
                  >
                    {i === 0 ? 'Latest' : timeAgo(e.fetchedAt)}
                  </button>
                ))}
              </div>
            )}

            {entry && (
              <>
                <div className="meta-bar">
                  {entry.checkin && (
                    <div className="meta-item">
                      <span className="meta-label">Check-in</span>
                      <span className="meta-value">{entry.checkin}</span>
                    </div>
                  )}
                  {entry.checkout && (
                    <div className="meta-item">
                      <span className="meta-label">Check-out</span>
                      <span className="meta-value">{entry.checkout}</span>
                    </div>
                  )}
                  {entry.guests && (
                    <div className="meta-item">
                      <span className="meta-label">Guests</span>
                      <span className="meta-value">{entry.guests}</span>
                    </div>
                  )}
                  {displaySpend && (
                    <div className="meta-item">
                      <span className="meta-label">Annual spend</span>
                      <span className="meta-value spend">${Number(displaySpend).toLocaleString('en-US')}/yr</span>
                    </div>
                  )}
                  <div className="meta-item">
                    <span className="meta-label">Fetched</span>
                    <span className="meta-value">{timeAgo(entry.fetchedAt)}</span>
                  </div>
                </div>

                <BestDealSummary result={best} />

                <div className="results-grid">
                  {entry.results.map((r, i) => {
                    const isBest = best && r.site === best.site && r.property === best.property;
                    const unavailable = r.available === false;
                    return (
                      <div key={i} className={`result-card${isBest ? ' best' : ''}${unavailable ? ' unavailable' : ''}`}>
                        {/* Left: property info */}
                        <div>
                          <div className="result-site">{r.site}</div>
                          <div className="result-property">
                            {r.property}
                            {isBest && <span className="badge-best">Best</span>}
                          </div>
                          <div className={`result-availability ${unavailable ? 'avail-no' : 'avail-yes'}`}>
                            {unavailable ? '✗ Unavailable' : '✓ Available'}
                          </div>
                        </div>

                        {/* Right: price */}
                        <div className="result-price-col">
                          <PriceDisplay result={r} isBest={isBest} />
                          {r.url && (
                            <a className="result-link" href={r.url} target="_blank" rel="noreferrer">
                              View →
                            </a>
                          )}
                        </div>

                        {/* Per-card notes — full width */}
                        {r.notes && (
                          <div className="card-notes">
                            <div className="card-notes-label">Notes</div>
                            {r.notes}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}

        <footer className="footer">Vacation Club Assistant · Powered by Claude Cowork</footer>
      </div>
    </>
  );
}
