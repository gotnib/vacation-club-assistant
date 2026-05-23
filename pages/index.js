import { useState, useEffect } from 'react';
import Head from 'next/head';

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£' };

function fmtCash(price, currency = 'USD') {
  const sym = CURRENCY_SYMBOLS[currency] || (currency + ' ');
  return `${sym}${Number(price).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
function fmtCashFull(price, currency = 'USD') {
  const sym = CURRENCY_SYMBOLS[currency] || (currency + ' ');
  return `${sym}${Number(price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtPoints(pts) {
  return `${Number(pts).toLocaleString('en-US')}`;
}
function timeAgo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
// RCI exchange fee applied to every RCI booking
const RCI_EXCHANGE_FEE = 179;

function rciTotal(price) {
  return Number(price) + RCI_EXCHANGE_FEE;
}

function findBestCash(results) {
  // Sort RCI results by total cost (price + exchange fee)
  const avail = results.filter(r => r.price != null && r.available !== false);
  if (!avail.length) return null;
  return avail.sort((a, b) => {
    const aTotal = a.site === 'RCI' ? rciTotal(a.price) : Number(a.price);
    const bTotal = b.site === 'RCI' ? rciTotal(b.price) : Number(b.price);
    return aTotal - bTotal;
  })[0];
}

// ── Savings calculator ────────────────────────────────────────────────────────
function calcSavings(annualSpend, tripsPerYear, bestResult) {
  if (!annualSpend || !tripsPerYear || !bestResult?.price) return null;
  const spend          = Number(annualSpend);
  const trips          = Number(tripsPerYear);
  const rciBase        = Number(bestResult.price);
  const rciPer         = bestResult.site === 'RCI' ? rciTotal(rciBase) : rciBase;
  const currentPerTrip = spend / trips;
  const savingsPerTrip = currentPerTrip - rciPer;
  const annualSavings  = savingsPerTrip * trips;
  return { currentPerTrip, savingsPerTrip, annualSavings, rciPer, rciBase, includesFee: bestResult.site === 'RCI' };
}

export default function Dashboard() {
  const [entries, setEntries]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [activeEntry, setActiveEntry] = useState(0);

  // Client profile state
  const [annualSpend,   setAnnualSpend]   = useState('');
  const [tripsPerYear,  setTripsPerYear]  = useState('');
  const [editProfile,   setEditProfile]   = useState(false);
  const [spendInput,    setSpendInput]    = useState('');
  const [tripsInput,    setTripsInput]    = useState('');

  async function fetchRates() {
    try {
      const res  = await fetch('/api/rates');
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
    const iv = setInterval(fetchRates, 60000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const s = localStorage.getItem('vca_annual_spend');
    const t = localStorage.getItem('vca_trips_per_year');
    if (s) setAnnualSpend(s);
    if (t) setTripsPerYear(t);
  }, []);

  function saveProfile() {
    const s = spendInput.replace(/[^0-9.]/g, '');
    const t = tripsInput.replace(/[^0-9]/g, '');
    setAnnualSpend(s);
    setTripsPerYear(t);
    if (typeof window !== 'undefined') {
      localStorage.setItem('vca_annual_spend',   s);
      localStorage.setItem('vca_trips_per_year', t);
    }
    setEditProfile(false);
  }

  const entry        = entries[activeEntry] || null;
  const displaySpend = entry?.client_annual_spend || annualSpend || null;
  const bestCash     = entry ? findBestCash(entry.results) : null;
  const savings      = calcSavings(displaySpend, tripsPerYear, bestCash);

  return (
    <>
      <Head>
        <title>Vacation Club Value Tool</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="description" content="RCI vacation value comparison tool" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </Head>

      <style jsx global>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg:       #0a1628;
          --surface:  #112240;
          --surface2: #1a3a5c;
          --border:   #1e4976;
          --text:     #e8f4f8;
          --muted:    #7a9bb5;
          --accent:   #00c9a7;
          --accent2:  #0096ff;
          --gold:     #f5c842;
          --red:      #ff6b6b;
          --points:   #c084fc;
          --green:    #00c9a7;
        }
        html, body {
          background: var(--bg);
          color: var(--text);
          font-family: 'Inter', sans-serif;
          font-size: 16px;
          min-height: 100vh;
          -webkit-font-smoothing: antialiased;
        }
        .app {
          max-width: 1000px;
          margin: 0 auto;
          padding: 32px 24px 80px;
        }

        /* ── Header ── */
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 36px;
          padding-bottom: 24px;
          border-bottom: 1px solid var(--border);
        }
        .header-brand {
          font-family: 'Playfair Display', serif;
          font-size: clamp(1.4rem, 3vw, 1.9rem);
          font-weight: 700;
          color: var(--text);
          letter-spacing: -0.01em;
        }
        .header-brand span { color: var(--accent); }
        .header-right { display: flex; gap: 10px; align-items: center; }
        .refresh-btn {
          background: var(--surface2);
          color: var(--text);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 9px 16px;
          font-family: 'Inter', sans-serif;
          font-size: 0.82rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
        }
        .refresh-btn:hover { border-color: var(--accent); color: var(--accent); }
        .refresh-btn:disabled { opacity: 0.4; cursor: default; }
        .last-refresh { font-size: 0.72rem; color: var(--muted); }

        /* ── Client Profile ── */
        .profile-bar {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 20px 24px;
          margin-bottom: 28px;
          display: flex;
          align-items: center;
          gap: 20px;
          flex-wrap: wrap;
        }
        .profile-label {
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--muted);
          font-weight: 600;
          white-space: nowrap;
        }
        .profile-fields { display: flex; gap: 24px; flex-wrap: wrap; align-items: center; flex: 1; }
        .profile-field { display: flex; flex-direction: column; gap: 2px; }
        .profile-field-label { font-size: 0.68rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; }
        .profile-field-value { font-size: 1.25rem; font-weight: 600; color: var(--text); }
        .profile-field-value.highlight { color: var(--gold); }
        .profile-edit-btn {
          margin-left: auto;
          background: none;
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 8px 16px;
          font-size: 0.78rem;
          color: var(--muted);
          cursor: pointer;
          font-family: 'Inter', sans-serif;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .profile-edit-btn:hover { border-color: var(--accent); color: var(--accent); }
        .profile-form { display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap; width: 100%; }
        .profile-input-group { display: flex; flex-direction: column; gap: 5px; }
        .profile-input-group label { font-size: 0.72rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.07em; }
        .profile-input {
          background: var(--surface2);
          border: 1.5px solid var(--border);
          border-radius: 8px;
          padding: 10px 14px;
          font-size: 1rem;
          font-family: 'Inter', sans-serif;
          color: var(--text);
          width: 160px;
          outline: none;
          transition: border-color 0.15s;
        }
        .profile-input:focus { border-color: var(--accent); }
        .profile-save-btn {
          background: var(--accent);
          color: #0a1628;
          border: none;
          border-radius: 8px;
          padding: 10px 20px;
          font-size: 0.85rem;
          font-family: 'Inter', sans-serif;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.15s;
        }
        .profile-save-btn:hover { opacity: 0.88; }
        .profile-cancel-btn {
          background: none;
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 10px 16px;
          font-size: 0.82rem;
          color: var(--muted);
          cursor: pointer;
          font-family: 'Inter', sans-serif;
        }

        /* ── Value Hero ── */
        .value-hero {
          background: linear-gradient(135deg, #0d3060 0%, #0a4a3a 100%);
          border: 1px solid var(--accent);
          border-radius: 18px;
          padding: 36px 40px;
          margin-bottom: 28px;
          position: relative;
          overflow: hidden;
        }
        .value-hero::before {
          content: '';
          position: absolute;
          top: -60px; right: -60px;
          width: 220px; height: 220px;
          background: radial-gradient(circle, rgba(0,201,167,0.12) 0%, transparent 70%);
          pointer-events: none;
        }
        .value-hero-label {
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: var(--accent);
          font-weight: 600;
          margin-bottom: 10px;
        }
        .value-hero-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(2rem, 5vw, 3.2rem);
          font-weight: 900;
          color: #fff;
          line-height: 1.05;
          margin-bottom: 6px;
        }
        .value-hero-title span { color: var(--accent); }
        .value-hero-sub {
          font-size: 1rem;
          color: rgba(255,255,255,0.6);
          margin-bottom: 28px;
          font-weight: 300;
        }
        .value-hero-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        .value-stat {
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          padding: 18px 20px;
        }
        .value-stat-label {
          font-size: 0.68rem;
          text-transform: uppercase;
          letter-spacing: 0.09em;
          color: rgba(255,255,255,0.5);
          margin-bottom: 6px;
        }
        .value-stat-value {
          font-family: 'Playfair Display', serif;
          font-size: clamp(1.5rem, 3vw, 2.2rem);
          font-weight: 700;
          color: #fff;
          line-height: 1;
        }
        .value-stat-value.positive { color: var(--accent); }
        .value-stat-value.negative { color: var(--red); }
        .value-stat-note {
          font-size: 0.72rem;
          color: rgba(255,255,255,0.4);
          margin-top: 4px;
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
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 8px 16px;
          font-size: 0.78rem;
          cursor: pointer;
          color: var(--muted);
          font-family: 'Inter', sans-serif;
          transition: all 0.15s;
        }
        .fetch-tab.active { background: var(--accent2); border-color: var(--accent2); color: #fff; font-weight: 600; }
        .fetch-tab:hover:not(.active) { border-color: var(--accent2); color: var(--accent2); }

        /* ── Search meta ── */
        .search-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 24px;
        }
        .meta-pill {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 6px 14px;
          font-size: 0.78rem;
          display: flex;
          gap: 6px;
        }
        .meta-pill-label { color: var(--muted); }
        .meta-pill-value { color: var(--text); font-weight: 500; }

        /* ── Section heading ── */
        .section-heading {
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: var(--muted);
          font-weight: 600;
          margin-bottom: 14px;
          padding-left: 4px;
        }

        /* ── Result cards ── */
        .results-grid { display: flex; flex-direction: column; gap: 12px; }
        .result-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 22px 24px;
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 12px 24px;
          transition: border-color 0.15s, transform 0.15s;
          cursor: default;
        }
        .result-card:hover { border-color: var(--accent2); transform: translateY(-1px); }
        .result-card.best { border-color: var(--accent); border-width: 1.5px; background: #0d2e24; }
        .result-card.unavailable { opacity: 0.4; }

        .result-site {
          font-size: 0.68rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--muted);
          font-weight: 600;
          margin-bottom: 5px;
        }
        .result-property {
          font-family: 'Playfair Display', serif;
          font-size: clamp(1.1rem, 2.5vw, 1.4rem);
          font-weight: 700;
          color: var(--text);
          line-height: 1.2;
          margin-bottom: 6px;
        }
        .result-avail {
          font-size: 0.78rem;
          font-weight: 500;
        }
        .avail-yes { color: var(--accent); }
        .avail-no  { color: var(--red); }

        /* Savings badge on card */
        .card-savings-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: rgba(0,201,167,0.12);
          border: 1px solid rgba(0,201,167,0.3);
          border-radius: 6px;
          padding: 4px 10px;
          font-size: 0.75rem;
          color: var(--accent);
          font-weight: 600;
          margin-top: 8px;
        }
        .card-savings-badge.loss {
          background: rgba(255,107,107,0.1);
          border-color: rgba(255,107,107,0.3);
          color: var(--red);
        }

        /* Price column */
        .result-price-col { text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
        .price-block { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
        .price-row {
          display: flex;
          align-items: center;
          gap: 8px;
          justify-content: flex-end;
        }
        .price-amount {
          font-family: 'Playfair Display', serif;
          font-size: clamp(1.6rem, 3.5vw, 2.2rem);
          font-weight: 700;
          color: var(--text);
          line-height: 1;
        }
        .price-amount.best-price { color: var(--accent); }
        .price-amount.points-amount { color: var(--points); font-size: clamp(1.3rem, 2.8vw, 1.8rem); }
        .price-unit { font-size: 0.7rem; color: var(--muted); }
        .price-type-tag {
          font-size: 0.62rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          border-radius: 4px;
          padding: 3px 7px;
        }
        .cash-tag   { background: rgba(0,150,255,0.15); color: var(--accent2); }
        .points-tag { background: rgba(192,132,252,0.15); color: var(--points); }

        .result-link {
          font-size: 0.72rem;
          color: var(--muted);
          text-decoration: none;
          transition: color 0.15s;
          margin-top: 2px;
        }
        .result-link:hover { color: var(--accent2); }

        .badge-best {
          display: inline-block;
          background: var(--accent);
          color: #0a1628;
          font-size: 0.6rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          border-radius: 4px;
          padding: 3px 7px;
          margin-left: 8px;
          vertical-align: middle;
        }

        /* Per-card notes */
        .card-notes {
          grid-column: 1 / -1;
          background: rgba(255,255,255,0.03);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 12px 16px;
          font-size: 0.82rem;
          color: var(--muted);
          line-height: 1.6;
        }
        .card-notes-label {
          font-size: 0.65rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--accent2);
          font-weight: 600;
          margin-bottom: 5px;
        }

        /* ── Empty state ── */
        .empty {
          text-align: center;
          padding: 80px 20px;
          color: var(--muted);
        }
        .empty .icon { font-size: 3.5rem; margin-bottom: 20px; }
        .empty h2 {
          font-family: 'Playfair Display', serif;
          font-size: 1.6rem;
          color: var(--text);
          margin-bottom: 10px;
        }
        .empty p { font-size: 0.9rem; line-height: 1.7; max-width: 420px; margin: 0 auto; }
        .empty code {
          display: block;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 16px 20px;
          font-size: 0.74rem;
          text-align: left;
          margin-top: 28px;
          line-height: 2;
          color: var(--muted);
          word-break: break-all;
          max-width: 520px;
          margin-left: auto;
          margin-right: auto;
        }

        /* ── Footer ── */
        .footer {
          margin-top: 60px;
          text-align: center;
          font-size: 0.72rem;
          color: var(--border);
        }

        @media (max-width: 600px) {
          .value-hero-stats { grid-template-columns: 1fr; }
          .result-card { grid-template-columns: 1fr; }
          .result-price-col { text-align: left; align-items: flex-start; }
          .price-row { justify-content: flex-start; }
          .value-hero { padding: 24px 20px; }
          .profile-bar { flex-direction: column; align-items: flex-start; }
        }
      `}</style>

      <div className="app">

        {/* ── Header ── */}
        <header className="header">
          <div className="header-brand">
            Vacation Club <span>Value Tool</span>
          </div>
          <div className="header-right">
            {lastRefresh && <span className="last-refresh">Updated {timeAgo(lastRefresh.toISOString())}</span>}
            <button className="refresh-btn" onClick={() => { setLoading(true); fetchRates(); }} disabled={loading}>
              {loading ? 'Loading…' : '↻ Refresh'}
            </button>
          </div>
        </header>

        {/* ── Client Profile ── */}
        <div className="profile-bar">
          <span className="profile-label">Client Profile</span>
          {!editProfile ? (
            <>
              <div className="profile-fields">
                <div className="profile-field">
                  <span className="profile-field-label">Current annual spend</span>
                  <span className={`profile-field-value${displaySpend ? ' highlight' : ''}`}>
                    {displaySpend ? `$${Number(displaySpend).toLocaleString('en-US')} / yr` : '—'}
                  </span>
                </div>
                <div className="profile-field">
                  <span className="profile-field-label">Trips per year</span>
                  <span className="profile-field-value">
                    {tripsPerYear ? `${tripsPerYear} trip${tripsPerYear === '1' ? '' : 's'}` : '—'}
                  </span>
                </div>
                {displaySpend && tripsPerYear && (
                  <div className="profile-field">
                    <span className="profile-field-label">Avg spend per trip</span>
                    <span className="profile-field-value">
                      ${Math.round(Number(displaySpend) / Number(tripsPerYear)).toLocaleString('en-US')}
                    </span>
                  </div>
                )}
              </div>
              <button className="profile-edit-btn" onClick={() => { setSpendInput(displaySpend || ''); setTripsInput(tripsPerYear || ''); setEditProfile(true); }}>
                {displaySpend ? '✎ Edit Client' : '+ Add Client Info'}
              </button>
            </>
          ) : (
            <div className="profile-form">
              <div className="profile-input-group">
                <label>Annual vacation spend ($)</label>
                <input className="profile-input" type="text" inputMode="numeric" placeholder="e.g. 3000"
                  value={spendInput} onChange={e => setSpendInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveProfile()} autoFocus />
              </div>
              <div className="profile-input-group">
                <label>Trips per year</label>
                <input className="profile-input" type="text" inputMode="numeric" placeholder="e.g. 2"
                  value={tripsInput} onChange={e => setTripsInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveProfile()} />
              </div>
              <button className="profile-save-btn" onClick={saveProfile}>Save</button>
              <button className="profile-cancel-btn" onClick={() => setEditProfile(false)}>Cancel</button>
            </div>
          )}
        </div>

        {/* ── Value Hero (only when we have savings data) ── */}
        {savings && entry && (
          <div className="value-hero">
            <div className="value-hero-label">RCI Membership Value Analysis</div>
            <div className="value-hero-title">
              {savings.savingsPerTrip > 0
                ? <>Save <span>{fmtCash(savings.savingsPerTrip)}</span> per trip</>
                : <>RCI costs <span style={{color:'var(--red)'}}>{fmtCash(Math.abs(savings.savingsPerTrip))}</span> more per trip</>
              }
            </div>
            <div className="value-hero-sub">
              Based on {bestCash?.property} vs. current spending of ${Math.round(savings.currentPerTrip).toLocaleString()} per trip
              {savings.includesFee && <span style={{opacity:0.6, fontSize:'0.85rem'}}> &nbsp;· RCI rate includes ${RCI_EXCHANGE_FEE} exchange fee</span>}
            </div>
            <div className="value-hero-stats">
              <div className="value-stat">
                <div className="value-stat-label">Currently paying / trip</div>
                <div className="value-stat-value">{fmtCash(savings.currentPerTrip)}</div>
                <div className="value-stat-note">based on ${Number(displaySpend).toLocaleString()} ÷ {tripsPerYear} trips</div>
              </div>
              <div className="value-stat">
                <div className="value-stat-label">Best RCI rate</div>
                <div className={`value-stat-value${savings.savingsPerTrip > 0 ? ' positive' : ''}`}>{fmtCash(savings.rciPer)}</div>
                <div className="value-stat-note">
                  via {bestCash?.site}
                  {savings.includesFee && <> &nbsp;({fmtCash(savings.rciBase)} + ${RCI_EXCHANGE_FEE} fee)</>}
                </div>
              </div>
              <div className="value-stat">
                <div className="value-stat-label">Annual savings potential</div>
                <div className={`value-stat-value${savings.annualSavings > 0 ? ' positive' : ' negative'}`}>
                  {savings.annualSavings > 0 ? '+' : ''}{fmtCash(savings.annualSavings)}
                </div>
                <div className="value-stat-note">across {tripsPerYear} trip{tripsPerYear === '1' ? '' : 's'} per year</div>
              </div>
            </div>
          </div>
        )}

        {/* ── Empty states ── */}
        {loading && entries.length === 0 ? (
          <div className="empty">
            <div className="icon">🏝️</div>
            <h2>Waiting for rates…</h2>
            <p>No data yet. Run your Cowork task to pull rates from RCI and Booking.com.</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="empty">
            <div className="icon">🏝️</div>
            <h2>No rates loaded</h2>
            <p>Have Cowork POST rate data to your API. Example payload:</p>
            <code>{`POST /api/rates\n{\n  "checkin": "2025-11-01",\n  "checkout": "2025-11-07",\n  "guests": 2,\n  "client_annual_spend": 3000,\n  "results": [\n    {\n      "site": "RCI",\n      "property": "Marriott's Grande Vista",\n      "payment_type": "both",\n      "points_cost": 14500,\n      "price": 420.00,\n      "currency": "USD",\n      "available": true,\n      "url": "https://rci.com/...",\n      "notes": "2BR villa, full kitchen, sleeps 6"\n    }\n  ]\n}`}</code>
          </div>
        ) : (
          <>
            {/* Fetch history tabs */}
            {entries.length > 1 && (
              <div className="fetch-tabs">
                {entries.map((e, i) => (
                  <button key={e.id} className={`fetch-tab${i === activeEntry ? ' active' : ''}`}
                    onClick={() => setActiveEntry(i)}>
                    {i === 0 ? 'Latest' : timeAgo(e.fetchedAt)}
                  </button>
                ))}
              </div>
            )}

            {entry && (
              <>
                {/* Search meta pills */}
                <div className="search-meta">
                  {entry.checkin  && <div className="meta-pill"><span className="meta-pill-label">Check-in</span><span className="meta-pill-value">{entry.checkin}</span></div>}
                  {entry.checkout && <div className="meta-pill"><span className="meta-pill-label">Check-out</span><span className="meta-pill-value">{entry.checkout}</span></div>}
                  {entry.guests   && <div className="meta-pill"><span className="meta-pill-label">Guests</span><span className="meta-pill-value">{entry.guests}</span></div>}
                  <div className="meta-pill"><span className="meta-pill-label">Fetched</span><span className="meta-pill-value">{timeAgo(entry.fetchedAt)}</span></div>
                </div>

                {/* Results */}
                <div className="section-heading">Available Properties</div>
                <div className="results-grid">
                  {entry.results.map((r, i) => {
                    const isBest     = bestCash && r.site === bestCash.site && r.property === bestCash.property;
                    const unavailable = r.available === false;
                    const type        = (r.payment_type || 'cash').toLowerCase();

                    // Per-card savings vs client's current per-trip spend
                    let cardSavings = null;
                    if (displaySpend && tripsPerYear && r.price != null && !unavailable) {
                      const currentPerTrip  = Number(displaySpend) / Number(tripsPerYear);
                      const effectivePrice  = r.site === 'RCI' ? rciTotal(r.price) : Number(r.price);
                      cardSavings = currentPerTrip - effectivePrice;
                    }

                    return (
                      <div key={i} className={`result-card${isBest ? ' best' : ''}${unavailable ? ' unavailable' : ''}`}>
                        {/* Left */}
                        <div>
                          <div className="result-site">{r.site}</div>
                          <div className="result-property">
                            {r.property}
                            {isBest && <span className="badge-best">Best Rate</span>}
                          </div>
                          <div className={`result-avail ${unavailable ? 'avail-no' : 'avail-yes'}`}>
                            {unavailable ? '✗ Unavailable' : '✓ Available'}
                          </div>
                          {cardSavings !== null && !unavailable && (
                            <div className={`card-savings-badge${cardSavings < 0 ? ' loss' : ''}`}>
                              {cardSavings >= 0
                                ? `↓ Save ${fmtCash(cardSavings)} vs current spending`
                                : `↑ ${fmtCash(Math.abs(cardSavings))} more than current spending`
                              }
                            </div>
                          )}
                        </div>

                        {/* Right: price */}
                        <div className="result-price-col">
                          <div className="price-block">
                            {(type === 'cash' || type === 'both') && r.price != null && (
                              <div className="price-row">
                                <span className="price-type-tag cash-tag">Cash</span>
                                <span className={`price-amount${isBest ? ' best-price' : ''}`}>
                                  {fmtCashFull(r.price, r.currency)}
                                </span>
                              </div>
                            )}
                            {(type === 'points' || type === 'both') && r.points_cost != null && (
                              <div className="price-row">
                                <span className="price-type-tag points-tag">Points</span>
                                <span className="price-amount points-amount">
                                  {fmtPoints(r.points_cost)} <span className="price-unit">pts</span>
                                </span>
                              </div>
                            )}
                          </div>
                          {r.site === 'RCI' && r.price != null && (
                            <div style={{fontSize:'0.72rem', color:'var(--muted)', marginTop:'4px', textAlign:'right'}}>
                              {fmtCashFull(r.price)} + ${RCI_EXCHANGE_FEE} fee
                              <span style={{marginLeft:'6px', color:'var(--text)', fontWeight:600}}>
                                = {fmtCashFull(rciTotal(r.price))} total
                              </span>
                            </div>
                          )}
                          {r.url && (
                            <a className="result-link" href={r.url} target="_blank" rel="noreferrer">
                              View listing →
                            </a>
                          )}
                        </div>

                        {/* Per-card notes */}
                        {r.notes && (
                          <div className="card-notes">
                            <div className="card-notes-label">Details</div>
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

        <footer className="footer">Vacation Club Value Tool · Powered by Claude Cowork</footer>
      </div>
    </>
  );
}
