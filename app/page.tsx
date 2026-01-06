import Link from "next/link";

export default function HomePage() {
  return (
    <div style={{ width: "min(1120px, 100%)" }}>
      <section className="vcaHero">
        <div className="vcaKicker">VIRTUAL COACH AI</div>

        <h1 className="vcaH1">Welcome.</h1>

        <div className="vcaSub">
          Upload one swing. Get a clean, honest report with your top <b>2–3 priorities</b> — not a dump of random tips.
          <br />
          Built by coaches. Designed like a premium tool, not a noisy app.
        </div>

        <div className="vcaButtons">
          <Link className="vcaBtnPrimary" href="/upload">Upload your swing</Link>
          <Link className="vcaBtnSecondary" href="/reports">View sample report</Link>
          <Link className="vcaBtnSecondary" href="/whats-next">What’s next</Link>
        </div>

        <div className="vcaWhisper">
          Phase 0 — Beta. You’re seeing the foundation: consistent environment, report layout, and clean flows.
        </div>

        <div className="vcaDivider" />

        <div className="vcaGrid">
          <div className="vcaTile">
            <div className="vcaTileTitle">Clarity</div>
            <div className="vcaTileText">One swing → one score → 2–3 priorities that actually move the needle.</div>
          </div>
          <div className="vcaTile">
            <div className="vcaTileTitle">Consistency</div>
            <div className="vcaTileText">Same background, same nav, same glass — every page feels like the same product.</div>
          </div>
          <div className="vcaTile">
            <div className="vcaTileTitle">Trajectory</div>
            <div className="vcaTileText">Phases show investors exactly how this grows: Tour DNA Match, impact clip, PDF export.</div>
          </div>
        </div>
      </section>
    </div>
  );
}
