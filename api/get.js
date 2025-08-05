// /api/get.js — includes short/long descriptions for P1–P9
export default async function handler(req, res) {
  try {
    const { id } = req.query || {};
    if (!id) return res.status(400).json({ error: 'Missing id parameter' });

    // helper: condition | rating | status | short | long
    const p = (condition, rating, status, short, long) => ({
      condition, rating, status, short, long
    });

    const mock = {
      id,
      profile: 'Right-eye dominant • Neutral grip • Mid stance width',
      tempo: '3:1 (backswing:downswing)',
      totals: { fairways: 8, greens: 11, putts: 30, swingSpeedAvg: 101, power: 83 },

      // quick numbers if needed elsewhere
      metrics: { P1:1, P2:2, P3:3, P4:4, P5:5, P6:6, P7:7, P8:8, P9:9 },

      // stacked details with short + long
      pstack: {
        P1: p(
          'Setup & Grip', '8/10', 'good',
          'Neutral grip, balanced posture, good alignment.',
          'Grip pressure 4/10; lead-hand “V” to trail shoulder. Feet shoulder-width, slight flare. Ball position just inside lead heel with driver; one ball forward of center with irons. Check shoulder tilt (lead higher) and pelvis neutral.'
        ),
        P2: p(
          'Early Takeaway', '7/10', 'okay',
          'Clubhead a touch inside; widen triangle.',
          'Match hands/club traveling together first 12–18". Feel chest moving the club. Stick drill: keep the stick’s butt pointing at belt for first third of takeaway. Goal: club parallel to target line at P2 with face square (toe slightly up).'
        ),
        P3: p(
          'Lead Arm Parallel', '6/10', 'okay',
          'Trail wrist set is late; begin earlier.',
          'Load trail wrist/forearm by P2.5. “Set then turn” rehearsal: hinge first, then complete turn to P3. Keep lead arm across chest, not lifting. Camera check down-the-line: shaft through lead forearm window.'
        ),
        P4: p(
          'Top of Backswing', '5/10', 'need',
          'Complete the turn; stabilize trail knee.',
          'Add 10–15° more shoulder turn while maintaining trail-knee flex. Feel lead heel light but planted. Club points just left of target, not across the line. Pause drill: 1-count at P4 to feel full coil without sway.'
        ),
        P5: p(
          'Transition', '6/10', 'okay',
          'Soften transition; shift before drop.',
          'Bump pressure to lead side *before* arms move. Step drill: small lead step to start down. Keep trail elbow in front of seam; pelvis starts to open while chest stays closed. Tempo: 3 back / 1 down.'
        ),
        P6: p(
          'Delivery', '7/10', 'okay',
          'Shaft shallow enough; keep side bend.',
          'Maintain trail-side bend and wrist angles to deliver shaft from inside. Alignment stick gate just outside ball to avoid over-the-top. Feel lead hip cleared, chest still slightly closed at P6.'
        ),
        P7: p(
          'Impact', '5/10', 'need',
          'Add 4° shaft lean; more forward pressure.',
          'Hands ahead of ball at impact; handle forward. Pressure 80/20 lead/trail by P7. Forward shaft lean creates compressed strike. Impact bag reps: 3×12 focusing on hands forward and flat lead wrist.'
        ),
        P8: p(
          'Extension', '7/10', 'okay',
          'More chest to target; full trail-arm extend.',
          'Extend through the ball; chest rotates to target by P8. Both arms long, club exits low-left. Feel ground force driving up and around, not up-and-back. Hold finish with belt buckle facing target.'
        ),
        P9: p(
          'Finish', '8/10', 'good',
          'Balanced, stacked finish, hold 2 seconds.',
          'Spine tall, weight fully on lead side, trail toe down. Club behind head, elbows soft. Count “one-two” at finish to reinforce balance. If falling back, rehearse longer pivot and earlier lead-leg post.'
        )
      },

      tips3: [
        'Finish your backswing—full shoulder turn at P4.',
        'Shift pressure to lead side by P2.5 (step drill).',
        'Hold posture into impact; eyes level through P7.'
      ],
      power: {
        score: 83,
        notes: [
          'Good ground use; earlier lead-leg post adds speed.',
          'Add 5–8° hip-shoulder separation at P4.',
          'Stronger extension through P8 to sustain speed.'
        ]
      },
      powerTips3: [
        'Step-drill sets to time pressure shift.',
        'Med-ball rotational throws (3×8).',
        'Overspeed: 3 rounds × 3 swings at 110% intent.'
      ],
      lessons14: [
        'Tempo metronome 3:1, 9-ball ladder.',
        'Mirror drill P1–P3 triangle, 3×10.',
        'Alignment sticks: start line & hips.',
        'Step drill: shift by P2.5, 3×8.',
        'Impact bag: P7 shaft lean, 3×12.',
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
