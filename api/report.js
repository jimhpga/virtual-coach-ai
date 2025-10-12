// api/report.js
// Always return a usable report. If real analysis isn't available yet,
// fall back to a demo report so the UI never looks empty.

export default async function handler(req, res) {
  try {
    const {
      key = "",
      name = "",
      email = "",
      handicap = "",
      hand = "",
      eye = "",
      height = ""
    } = req.query || {};

    // If demo=1 was requested, force demo
    if (req.query.demo === "1") {
      return res.status(200).json({
        ok: true,
        source: "demo",
        report: demoReport({ key, name, email, handicap, hand, eye, height })
      });
    }

    // TODO: real analysis lookup goes here (DB/object store/etc.)
    // Example shape:
    // const real = await getAnalysisByKey(key)
    // if (real) return res.status(200).json({ ok: true, source: "real", report: real });

    // If we reach here, we don't have real analysis yet — fall back to demo
    return res.status(200).json({
      ok: true,
      source: "demo-fallback",
      report: demoReport({ key, name, email, handicap, hand, eye, height })
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

// --- Demo generator (kept small but complete) ---
function demoReport({ key, name, email, handicap, hand, eye, height }) {
  const inches = normalizeHeight(height); // number or null
  const golfer = {
    name: name || "Player",
    email,
    handicap: handicap || "",
    hand: hand || "right",
    eye: eye || "unknown",
    heightIn: inches || 70
  };

  // Simple, consistent sample content
  const today = new Date().toISOString().slice(0, 10);

  return {
    meta: {
      title: "Swing Report — P1–P9",
      date: today,
      mode: "Full Swing",
      key,
      golfer,
      swings: 8
    },
    checkpoints: [
      { label: "P6", note: "Shaft steep; handle high" },
      { label: "P7", note: "Face a bit open vs path" }
    ],
    sections: {
      positionConsistency: [
        "Setup aligned well; slight posture rise at P2.",
        "Trail hip early extension by ~3° vs baseline."
      ],
      swingConsistency: [
        "Tempo consistent at 3:1.",
        "Low-point scatter tightened vs last session."
      ],
      powerScoreSummary: [
        "Clubhead speed +1.8 mph vs baseline.",
        "Attack angle trend shallower by 0.6°."
      ],
      fundamentalsTop3: [
        "Neutral grip pressure through transition.",
        "Ball position one ball forward.",
        "Maintain spine tilt in downswing."
      ],
      powerErrorsTop3: [
        "Over-rotated forearms late (left start line).",
        "Early trail shoulder open (glancing contact).",
        "Excess handle height (thin/ground balls)."
      ],
      quickFixesTop3: [
        "Preset trail wrist extension at address.",
        "Half-swing drill: pause at P3, then rotate.",
        "Lead-hand only chips to feel loft."
      ],
      faults: [
        "Face-to-path mismatch at impact.",
        "Slight casting from P5→P6.",
        "Trail knee rushes ball-side."
      ],
      drills: [
        "Gate drill at 6–12 inches ahead of the ball.",
        "Step-through drill for rotation → shallowing.",
        "Alignment stick down trail side (no early extend)."
      ]
    },
    // Expectations after swing change (what the coach asked for)
    expectations: [
      "If you rotate forearms more: starts left are normal for a bit.",
      "If you rotate body faster: AoA shallows → expect some grounders.",
      "Small misses while it ‘beds in’ are expected. Give it ~2–3 sessions."
    ],
    // Teacher voice — UI can render this style string
    teacherVoice: {
      mode: "supportive", // "supportive" | "nice" | "grumpy"
      sample:
        "Good move. Small mess-ups mean it’s changing — stay patient; keep the drills tight."
    },
    // Baseline compare scaffold
    baseline: {
      canSet: true,
      notes: "Set this as your good swing and compare future swings any time."
    },
    // Gamification – simple badges
    badges: [
      { id: "tempo-tamer", title: "Tempo Tamer", earned: true },
      { id: "lowpoint-lock", title: "Low-Point Lock", earned: false },
      { id: "face-path-sync", title: "Face–Path Sync", earned: false }
    ]
  };
}

function normalizeHeight(h) {
  if (!h) return null;
  const s = String(h).trim();

  // plain inches
  if (/^\d{2,3}$/.test(s)) return clamp(+s, 48, 84);

  // feet'inches e.g. 5'10 or 5' 10"
  const feetIn = s.match(/^(\d)\s*'\s*(\d{1,2})/);
  if (feetIn) {
    const inches = (+feetIn[1]) * 12 + (+feetIn[2]);
    return clamp(inches, 48, 84);
  }

  // feet.inches e.g. 5.10 or 5.8 (assume .xx are inches)
  const feetDot = s.match(/^(\d)\.(\d{1,2})$/);
  if (feetDot) {
    const inches = (+feetDot[1]) * 12 + (+feetDot[2]);
    return clamp(inches, 48, 84);
  }

  // cm
  const cm = s.match(/^(\d{2,3})\s*cm$/i);
  if (cm) {
    const inches = Math.round((+cm[1]) / 2.54);
    return clamp(inches, 48, 84);
  }

  return null;
}

function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n));
}
