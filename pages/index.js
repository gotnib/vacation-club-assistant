import { useState, useEffect } from 'react';
import Head from 'next/head';

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£' };

function fmt(price, currency = 'USD') {
  const sym = CURRENCY_SYMBOLS[currency] || currency + ' ';
  return `${sym}${Number(price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function timeAgo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function Dashboard() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [activeEntry, setActiveEntry] = useState(0);

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
    const interval = setInterval(fetchRates, 60000); // auto-refresh every minute
    return () => clearInterval(interval);
  }, []);

  const entry = entries[activeEntry] || null;
  const cheapest = entry
    ? [...entry.results].sort((a, b) => Number(a.price) - Number(b.price))[0]
    : null;

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
        .empty p { font-size: 0.9rem; line-height: 1.6; max-width: 380px; margin: 0 auto; }
        .empty code {
          display: block;
          background: var(--warm);
          border: 1px solid var(--stone);
          border-radius: 8px;
          padding: 12px 16px;
          font-size: 0.78rem;
          text-align: left;
          margin-top: 24px;
          line-height: 1.8;
          color: var(--ink);
          word-break: break-all;
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

        /* ── Results table ── */
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
          gap: 8px;
          align-items: center;
          transition: border-color 0.15s;
        }
        .result-card:hover { border-color: var(--ocean); }
        .result-card.best { border-color: var(--gold); background: #fffbf0; }
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
        .result-price-col { text-align: right; }
        .result-price {
          font-family: 'DM Serif Display', serif;
          font-size: 1.5rem;
          color: var(--ocean2);
        }
        .result-price.best-price { color: var(--gold); }
        .result-link {
          display: block;
          font-size: 0.72rem;
          color: var(--ocean);
          text-decoration: none;
          margin-top: 4px;
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

        /* ── Notes ── */
        .notes-block {
          margin-top: 24px;
          background: var(--foam);
          border: 1px solid #b0d8e0;
          border-radius: 10px;
          padding: 14px 16px;
          font-size: 0.85rem;
          color: var(--ocean2);
          line-height: 1.6;
        }
        .notes-block strong { font-weight: 500; display: block; margin-bottom: 4px; }

        /* ── Footer ── */
        .footer {
          margin-top: 40px;
          text-align: center;
          font-size: 0.75rem;
          color: var(--stone);
        }

        @media (max-width: 540px) {
          .best-deal { flex-direction: column; align-items: flex-start; }
          .result-card { grid-template-columns: 1fr; }
          .result-price-col { text-align: left; }
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
            <code>
              {`POST /api/rates\n{\n  "checkin": "2025-08-01",\n  "checkout": "2025-08-07",\n  "guests": 2,\n  "notes": "Summer week search",\n  "results": [\n    {\n      "site": "Booking.com",\n      "property": "Ocean Palms Resort",\n      "price": 189.00,\n      "currency": "USD",\n      "available": true,\n      "url": "https://booking.com/..."\n    },\n    {\n      "site": "RCI",\n      "property": "Ocean Palms Resort",\n      "price": 154.00,\n      "currency": "USD",\n      "available": true,\n      "url": "https://rci.com/..."\n    }\n  ]\n}`}
            </code>
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
                  <div className="meta-item">
                    <span className="meta-label">Fetched</span>
                    <span className="meta-value">{timeAgo(entry.fetchedAt)}</span>
                  </div>
                </div>

                {cheapest && (
                  <div className="best-deal">
                    <div>
                      <div className="best-deal-label">Best rate found</div>
                      <div className="best-deal-site">{cheapest.property}</div>
                      <div style={{ fontSize: '0.82rem', opacity: 0.8, marginTop: 2 }}>{cheapest.site}</div>
                    </div>
                    <div className="best-deal-price">
                      {fmt(cheapest.price, cheapest.currency)}
                    </div>
                  </div>
                )}

                <div className="results-grid">
                  {entry.results.map((r, i) => {
                    const isBest = cheapest && r.site === cheapest.site && r.property === cheapest.property;
                    return (
                      <div key={i} className={`result-card${isBest ? ' best' : ''}`}>
                        <div>
                          <div className="result-site">{r.site}</div>
                          <div className="result-property">
                            {r.property}
                            {isBest && <span className="badge-best">Best</span>}
                          </div>
                          <div className={`result-availability ${r.available ? 'avail-yes' : 'avail-no'}`}>
                            {r.available ? '✓ Available' : '✗ Unavailable'}
                          </div>
                        </div>
                        <div className="result-price-col">
                          <div className={`result-price${isBest ? ' best-price' : ''}`}>
                            {fmt(r.price, r.currency)}
                          </div>
                          {r.url && (
                            <a className="result-link" href={r.url} target="_blank" rel="noreferrer">
                              View →
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {entry.notes && (
                  <div className="notes-block">
                    <strong>Notes from Cowork</strong>
                    {entry.notes}
                  </div>
                )}
              </>
            )}
          </>
        )}

        <footer className="footer">Vacation Club Assistant · Powered by Claude Cowork</footer>
      </div>
    </>
  );
}
