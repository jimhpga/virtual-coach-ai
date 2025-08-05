// /api/get.js — returns full summary incl. P1–P9 stacked details
export default async function handler(req, res) {
  try {
    const { id } = req.query || {};
    if (!id) return res.status(400).json({ error: 'Missing id parameter' });

    // Mock data shaped for the stacked layout
    const p = (condition, rating, status, description) => ({ condition, rating, status, description });

    const mock = {
      id,
      profile: 'Right-eye dominant • Neutral grip • Mid stance width',
      tempo: '3:1 (backswing:downswing)',
      totals: { fairways: 8, greens: 11, putts: 30, swingSpeedAvg: 101, power: 83 },

      // For quick chips elsewhere if needed
      metrics: { P1: 1, P2: 2, P3: 3, P4: 4, P5: 5, P6: 6, P7: 7, P8: 8, P9: 9 },

      // NEW: Detailed P1–P9 stack (condition | rating | status | description)
      // status ∈ { 'good', 'okay', 'need' }
      pstack: {
        P1: p('Setup & Grip',        '8/10', 'good', 'Neutral grip, balanced posture, alignment within 1°.'),
        P2: p('Early Takeaway',      '7/10', 'okay', 'Clubhead slightly inside; keep the triangle a touch wider.'),
        P3: p('Lead Arm Parallel',   '6/10', 'okay', 'Trail wrist set is late; begin set earlier to avoid lift.'),
        P4: p('Top of Backswing',    '5/10', 'need', 'Complete turn—add 10° shoulder turn; trail knee stable.'),
        P5: p('Transition',          '6/10', 'okay', 'Soften transition; pressure shift should precede arm drop.'),
        P6: p('Delivery',            '7/10', 'okay', 'Shaft shallow enough; maintain side-bend into impact.'),
        P7: p('Impact',              '5/10', 'need', 'Hands a touch behind; add 4° shaft lean and forward pressure.'),
        P8: p('Extension',           '7/10', 'okay', 'More chest-to-target through P8; extend trail arm fully.'),
        P9: p('Finish',              '8/10', 'good', 'Balanced, stacked finish. Hold 2 seconds for consistency.')
      },

      // Coaching tiles
      tips3: [
        'Finish your backswing—feel full shoulder turn at P4.',
        'Shift pressure to lead side by P2.5 (step drill).',
        'Hold posture into impact; eyes stay level through P7.'
      ],
      power: {
        score: 83,
        notes: [
          'Good ground use; increase lead-leg post earlier.',
          'Add hip-shoulder separation at P4 by ~5–8°.',
          'Stronger extension through P8 for speed retention.'
        ]
      },
      powerTips3: [
        'Step-drill sets to time pressure shift.',
        'Med-ball rotational throws (3x8).',
        'Overspeed session: 3 rounds of 3 swings at 110% intent.'
      ],
      lessons14: [
        'Tempo metronome 3:1, 9-ball ladder.',
        'Mirror drill P1–P3 triangle, 3x10.',
        'Alignment sticks: start line & hips.',
        'Step drill: shift by P2.5, 3x8.',
        'Impact bag: P7 shaft lean, 3x12.',
        'Hold finish for 2s; balance check.',
        'DL video at waist height; checkpoint.',
        'Trail-arm throw: extend to P8.',
        'Gate putting: 15 min tempo control.',
        'Wedge ladder 30/50/70y.',
        'Bunker setup reps.',
        'FW sweep: low point after ball.',
        'Driver tee height tuning.',
        'On-course 3-hole routine.'
      ]
    };

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(mock);
  } catch (e) {
    console.error('[get] fail', e?.message || e);
    return res.status(500).json({ error: 'Failed to load report' });
  }
}

