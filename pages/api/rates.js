// pages/api/rates.js
// Cowork POSTs hotel rate data here.
// The dashboard GETs from here to display results.

// In-memory store (persists between requests in the same serverless instance).
// For production persistence, swap this with a Vercel KV or Supabase insert.
let ratesStore = [];

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  // POST — Cowork sends rate data here
  if (req.method === 'POST') {
    const { results, checkin, checkout, guests, notes } = req.body;

    if (!results || !Array.isArray(results)) {
      return res.status(400).json({ error: 'Missing or invalid results array' });
    }

    const entry = {
      id: Date.now(),
      fetchedAt: new Date().toISOString(),
      checkin: checkin || null,
      checkout: checkout || null,
      guests: guests || null,
      notes: notes || null,
      results, // array of { site, property, price, currency, available, url }
    };

    // Keep the 20 most recent fetches
    ratesStore = [entry, ...ratesStore].slice(0, 20);

    return res.status(200).json({ success: true, id: entry.id });
  }

  // GET — dashboard fetches latest rates
  if (req.method === 'GET') {
    return res.status(200).json({ entries: ratesStore });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
