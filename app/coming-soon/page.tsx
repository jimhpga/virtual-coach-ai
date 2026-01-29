import Link from "next/link";

export default function ComingSoonPage() {
  const shell = {
    minHeight: "100vh",
    padding: "28px 20px 60px",
    color: "#e9eef6",
  } as const;

  const wrap = {
    maxWidth: 1100,
    margin: "0 auto",
  } as const;

  const topbar = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    padding: 16,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(0,0,0,0.30)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
  } as const;

  const brand = { display: "flex", alignItems: "center", gap: 12 } as const;
  const logo = { height: 34, width: "auto", borderRadius: 6 } as const;

  const nav = { display: "flex", gap: 10, flexWrap: "wrap" as const, justifyContent: "flex-end" } as const;
  const pill = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    height: 34,
    padding: "0 14px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.20)",
    color: "#e9eef6",
    fontSize: 13,
    fontWeight: 700,
    textDecoration: "none",
    whiteSpace: "nowrap" as const,
  } as const;

  const hero = {
    marginTop: 16,
    padding: 26,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(0,0,0,0.32)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
  } as const;

  const h1 = { fontSize: 42, lineHeight: 1.1, margin: 0, letterSpacing: "-0.02em" } as const;
  const sub = { marginTop: 10, maxWidth: 860, opacity: 0.9, fontSize: 15, lineHeight: 1.5 } as const;

  const ctas = { marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" as const } as const;

  const btnPrimary = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    height: 42,
    padding: "0 16px",
    borderRadius: 12,
    background: "#ffffff",
    color: "#0b0f14",
    border: "1px solid rgba(255,255,255,0.35)",
    fontWeight: 900,
    textDecoration: "none",
  } as const;

  const btnGhost = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    height: 42,
    padding: "0 16px",
    borderRadius: 12,
    background: "rgba(0,0,0,0.25)",
    color: "#e9eef6",
    border: "1px solid rgba(255,255,255,0.12)",
    fontWeight: 800,
    textDecoration: "none",
  } as const;

  const grid = {
    marginTop: 14,
    display: "grid",
    gridTemplateColumns: "repeat(12, 1fr)",
    gap: 12,
  } as const;

  const card = {
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(0,0,0,0.28)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    padding: 16,
  } as const;

  const cardTitle = { fontSize: 14, fontWeight: 900, margin: 0, opacity: 0.95 } as const;
  const small = { fontSize: 12.5, opacity: 0.88, lineHeight: 1.45, marginTop: 8 } as const;

  const badge = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    height: 26,
    padding: "0 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    fontSize: 12,
    fontWeight: 800,
    opacity: 0.95,
  } as const;

  const list = { margin: "10px 0 0", paddingLeft: 18, fontSize: 12.5, opacity: 0.9, lineHeight: 1.55 } as const;

  return (
    <div style={shell}>
      <div style={wrap}>
        <div style={topbar}>
          <div style={brand}>
            <img src="/brand/vca-logo.png" alt="Virtual Coach AI" style={logo} />
            <div>
              <div style={{ fontWeight: 900, fontSize: 16 }}>Virtual Coach AI</div>
              <div style={{ fontSize: 12, opacity: 0.82 }}>Roadmap • Multi-sport • Programs</div>
            </div>
          </div>
          <div style={nav}>
            <Link href="/" style={pill}>Home</Link>
            <Link href="/upload" style={pill}>Upload</Link>
            <Link href="/report-beta/full" style={pill}>Demo Report</Link>
          </div>
        </div>

        <div style={hero}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <span style={badge}>✅ UI locked</span>
            <span style={badge}>🧠 AI engine next</span>
            <span style={badge}>🏌️ Golf first</span>
            <span style={badge}>⚾ Baseball next</span>
          </div>

          <h1 style={h1}>Coming Soon: the full platform.</h1>
          <div style={sub}>
            The report UI is locked. Now we wire the real pipeline: upload → pose → faults → drills → plan → export.
            Below is the product roadmap (the “26 things”) in a clean, investor-friendly way.
          </div>

          <div style={ctas}>
            <Link href="/upload" style={btnPrimary}>Upload a Swing</Link>
            <Link href="/report-beta/full" style={btnGhost}>View Demo Report</Link>
          </div>
        </div>

        <div style={grid}>
          <div style={{ ...card, gridColumn: "span 7" }}>
            <h3 style={cardTitle}>What ships first (MVP, no chaos)</h3>
            <div style={small}>The goal: one upload, one clean report, one practice plan. Everything else is layered on — not bolted on.</div>
            <ul style={list}>
              <li>Frictionless upload (mobile-first file picker)</li>
              <li>Pose estimation + P1–P9 checkpoints (estimated)</li>
              <li>Top 2–3 prioritized faults + 1–2 efficient drills each</li>
              <li>Swing Score + Tour DNA Match (mechanics similarity explanation)</li>
              <li>Instant report view + download + email delivery</li>
            </ul>
          </div>

          <div style={{ ...card, gridColumn: "span 5" }}>
            <h3 style={cardTitle}>What makes it feel “real”</h3>
            <ul style={list}>
              <li>Pixel-identical report UI (locked)</li>
              <li>Same styling across Home / Upload / Coming Soon / Report</li>
              <li>No account required for MVP testers (name + email only)</li>
              <li>Clean voice: direct, friendly, coach-like</li>
              <li>Idiot-proof flow (it just works)</li>
            </ul>
          </div>

          <div style={{ ...card, gridColumn: "span 12" }}>
            <h3 style={cardTitle}>Programs</h3>
            <div style={small}>These are modules the system can deliver as structured experiences (not random tips).</div>
            <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 10 }}>
              <div style={{ ...card, gridColumn: "span 4", padding: 14, background: "rgba(0,0,0,0.22)" }}>
                <div style={{ fontWeight: 900 }}>Junior Mental Training Academy</div>
                <div style={small}>Levels, certificates, pressure simulations, emotional control, course management.</div>
                <ul style={list}>
                  <li>Mental Basics → Competition Ready → Elite Junior Mindset</li>
                  <li>Scenario-based testing + scoring</li>
                  <li>Progress tracking dashboard</li>
                </ul>
              </div>

              <div style={{ ...card, gridColumn: "span 4", padding: 14, background: "rgba(0,0,0,0.22)" }}>
                <div style={{ fontWeight: 900 }}>Beginner Mode</div>
                <div style={small}>Simple feedback only: grip, posture, setup, basic pivot, face control.</div>
                <ul style={list}>
                  <li>Hides advanced biomechanics</li>
                  <li>Clear “next step” ladder</li>
                  <li>Voice cues that don’t overwhelm</li>
                </ul>
              </div>

              <div style={{ ...card, gridColumn: "span 4", padding: 14, background: "rgba(0,0,0,0.22)" }}>
                <div style={{ fontWeight: 900 }}>MVP Practice Tracks</div>
                <div style={small}>Short plans that actually get done — built from your top faults.</div>
                <ul style={list}>
                  <li>14-day plan (default)</li>
                  <li>Random-practice + testing days</li>
                  <li>“One priority only” discipline</li>
                </ul>
              </div>
            </div>
          </div>

          <div style={{ ...card, gridColumn: "span 12" }}>
            <h3 style={cardTitle}>Multi-sport expansion (same DNA engine)</h3>
            <div style={small}>Golf first. Then baseball + basketball. Same concept: capture → compare → coach.</div>
            <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 10 }}>
              <div style={{ ...card, gridColumn: "span 4", padding: 14, background: "rgba(0,0,0,0.22)" }}>
                <div style={{ fontWeight: 900 }}>Baseball</div>
                <ul style={list}>
                  <li>Pitch mechanics overlays + deception index</li>
                  <li>Hitter swing models (classic vs modern)</li>
                  <li>Pitch-type recognition (estimated)</li>
                </ul>
              </div>
              <div style={{ ...card, gridColumn: "span 4", padding: 14, background: "rgba(0,0,0,0.22)" }}>
                <div style={{ fontWeight: 900 }}>Basketball</div>
                <ul style={list}>
                  <li>Shooting form checkpoints</li>
                  <li>Release consistency + rhythm</li>
                  <li>Drill prescriptions</li>
                </ul>
              </div>
              <div style={{ ...card, gridColumn: "span 4", padding: 14, background: "rgba(0,0,0,0.22)" }}>
                <div style={{ fontWeight: 900 }}>More sports</div>
                <ul style={list}>
                  <li>Same pipeline, new checkpoints</li>
                  <li>Pro comparison tutorials</li>
                  <li>Coach tools + dashboards</li>
                </ul>
              </div>
            </div>
          </div>

          <div style={{ ...card, gridColumn: "span 7" }}>
            <h3 style={cardTitle}>Advanced features (layered, not rushed)</h3>
            <ul style={list}>
              <li>Tempo Meter + Personal Tempo Number</li>
              <li>Pressure mapping + CoP trace + force vectors</li>
              <li>Torque View (ground-up camera)</li>
              <li>Club selector tied to Swing DNA baseline</li>
              <li>Voice AI Coach Mode + uncertainty protocol</li>
              <li>Swing Reliability Test (10 swings → consistency score)</li>
            </ul>
          </div>

          <div style={{ ...card, gridColumn: "span 5" }}>
            <h3 style={cardTitle}>Coach/Business (optional add-ons)</h3>
            <ul style={list}>
              <li>Coaches’ Corner: remote lessons + tools</li>
              <li>Instructor/student dashboard</li>
              <li>Leaderboards + CoachScore gamification</li>
              <li>QR tracking per range/event</li>
              <li>Access codes / premium unlocks</li>
            </ul>
          </div>
        </div>

        <div style={{ marginTop: 14, opacity: 0.72, fontSize: 12 }}>
          © Virtual Coach AI — internal demo build. UI locked; pipeline wiring in progress.
        </div>
      </div>
    </div>
  );
}

