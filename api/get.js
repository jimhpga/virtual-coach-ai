// /api/get.js — richer mock so Summary tiles populate now
export default async function handler(req, res) {
  try {
    const { id } = req.query || {};
    if (!id) return res.status(400).json({ error: 'Missing id parameter' });

    const mock = {
      id,
      profile: 'Right-eye dominant • Neutral grip • Mid stance width',
      tempo: '3:1 (backswing:downswing)',
      totals: { fairways: 8, greens: 11, putts: 30, swingSpeedAvg: 101, power: 83 },
      metrics: { P1: 1, P2: 2, P3: 3, P4: 4, P5: 5, P6: 6, P7: 7, P8: 8, P9: 9 },

      // NEW fields for tiles
      tips3: [
        'Steadier head through P3.',
        'Finish the backswing—don’t rush transition.',
        'Hold posture into impact (P7).'
      ],
      power: {
        score: 83,
        notes: [
          'Good ground use, room to extend through P8.',
          'Add 5° more hip-shoulder separation at P4.',
          'Earlier trail-foot pressure shift by P2.5.'
        ]
      },
      powerTips3: [
        'Add step-drill sets for dynamic pressure shift.',
        'Medicine-ball toss drills for extension.',
        'Overspeed set: 3x swings at 110% intent.'
      ],
      lessons14: [
        'Tempo metronome: 3:1 with 9-ball ladder.',
        'Mirror drill: P1–P3 checkpoint, 3 sets x 10.',
        'Alignment sticks: start line + hip clearance.',
        'Step drill: shift by P2.5, 3x8.',
        'Impact bag: P7 shaft lean, 3x12.',
        'Hold finish for 2s: balance check.',
        'Video check: down-the-line at waist height.',
        'Trail-arm throw: extend through P8.',
        'Gate putting: 15 min tempo control.',
        'Wedge ladder: 30/50/70y distance control.',
        'Bunker setup: square feet, open face reps.',
        'Fairway wood sweep: low point after ball.',
        'Driver tee height tuning, 10-ball set.',
        'On-course: 3-hole routine, process > score.'
      ]
    };

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(mock);
  } catch (e) {
    console.error('[get] fail', e?.message || e);
    return res.status(500).json({ error: 'Failed to load report' });
  }
}
