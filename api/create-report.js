// API: POST /api/create-report
// Body: { filename, videoUrl, videoPath }
// Creates a starter report JSON in Vercel Blob and returns a viewer URL.
// Returns: { reportUrl: "report.html?report=<encoded JSON URL>" }

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      res.status(500).json({ error: 'Missing BLOB_READ_WRITE_TOKEN' });
      return;
    }

    const { filename, videoUrl, videoPath } = req.body || {};
    const now = new Date().toISOString();
    const id = (Math.random().toString(36).slice(2) + Date.now().toString(36)).slice(0, 16);
    const report = {
      id,
      createdAt: now,
      sourceFile: filename || null,
      video: { url: videoUrl || null, path: videoPath || null },
      meta: {
        generator: 'VirtualCoachAI',
        version: '0.1',
        note: 'Starter report – replace with real analyzer output.',
      },
      summary: {
        title: 'Your Swing Report (Starter)',
        player: 'Player',
        notes: [
          'This is a starter report created after upload.',
          'Your analyzer can overwrite this JSON later.',
        ],
      },
      // minimal sections the viewer already understands
      fundamentals: [],
      power_fixes: [],
      quick_fixes: [],
      practice_plan_14d: [
        { day: 1, focus: 'Setup & Balance', reps: 30 },
        { day: 2, focus: 'Backswing Width', reps: 30 },
      ],
    };

    // 1) Get presigned upload URL for the JSON file
    const presign = await fetch('https://api.vercel.com/v2/blob/upload-url', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    if (!presign.ok) {
      const t = await presign.text();
      res.status(502).json({ error: 'upload-url failed', detail: t });
      return;
    }

    const { url: uploadUrl } = await presign.json();

    // 2) Upload the JSON to Blob
    const putRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(report),
    });

    if (!putRes.ok) {
      const t = await putRes.text();
      res.status(502).json({ error: 'blob put failed', detail: t });
      return;
    }

    const putJson = await putRes.json(); // { url, pathname, ... }
    const jsonUrl = putJson.url;

    // 3) Return the viewer URL that loads that JSON
    const reportUrl = `report.html?report=${encodeURIComponent(jsonUrl)}`;
    res.status(200).json({ reportUrl });
  } catch (err) {
    res.status(500).json({ error: String(err && err.message || err) });
  }
}
