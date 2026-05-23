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
    const { results, checkin, checkout, guests, client_annual_spend, notes } = req.body;

    if (!results || !Array.isArray(results)) {
      return res.status(400).json({ error: 'Missing or invalid results array' });
    }

    const entry = {
      id: Date.now(),
      fetchedAt: new Date().toISOString(),
      checkin: checkin || null,
      checkout: checkout || null,
      guests: guests || null,
      client_annual_spend: client_annual_spend || null, // optional: passed from Cowork task
      notes: notes || null, // top-level summary note (optional)
      results,
      // Each result object supports:
      // {
      //   site: string,           e.g. "RCI" or "Booking.com"
      //   property: string,
      //   payment_type: string,   "points" | "cash" | "both"
      //   points_cost: number,    RCI points required (if payment_type is "points" or "both")
      //   price: number,          cash cost (if payment_type is "cash" or "both")
      //   currency: string,       e.g. "USD"
      //   available: boolean,
      //   url: string,
      //   notes: string,          per-card notes shown inline on the card
      // }
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
