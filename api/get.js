// /api/get.js — safe handler with mock data so Summary works now
export default async function handler(req, res) {
  try {
    const { id } = req.query || {};
    if (!id) {
      return res.status(400).json({ error: 'Missing id parameter' });
    }

    // TODO: Replace this block with your real data fetch (DB/storage) later.
    // For now, we return a stable mock so the UI renders.
    const mock = {
      id,
      profile: 'Right-eye dominant, 7i baseline session',
      tempo: '3:1 (backswing:downswing)',
      totals: { fairways: 8, greens: 11, putts: 30, swingSpeedAvg: 101 },
      metrics: { P1: 1, P2: 2, P3: 3, P4: 4, P5: 5, P6: 6, P7: 7, P8: 8, P9: 9 }
    };

    // Example: if you want the mock only for certain IDs, you could gate it:
    // if (id !== 'test') return res.status(404).json({ error: 'Report not found' });

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(mock);
  } catch (e) {
    console.error('[get] fail', e?.message || e);
    return res.status(500).json({ error: 'Failed to load report' });
  }
}
