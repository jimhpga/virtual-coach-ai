// pages/index.tsx

import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      {/* HERO */}
      <section
        className="relative min-h-[80vh] flex items-center justify-center px-4 py-16"
        style={{
          backgroundImage: "url('/homepage-background.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-slate-950/70" />

        <div className="relative max-w-4xl text-center space-y-6">
          <p className="text-sm uppercase tracking-[0.35em] text-emerald-300/80">
            VIRTUAL COACH AI
          </p>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight">
            The fastest way to understand
            <span className="block text-emerald-300">
              what your golf swing is really doing.
            </span>
          </h1>
          <p className="text-slate-200 max-w-2xl mx-auto text-base md:text-lg">
            Upload one swing. Get a simple, brutal-honest breakdown of your motion,
            your biggest leaks, and a focused 14-day plan to fix it. No tech
            degree required.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link
              href="/upload"
              className="inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold bg-emerald-400 text-slate-950 hover:bg-emerald-300 transition"
            >
              Upload a Swing
            </Link>

            <Link
              href="/reports/sample"
              className="inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold border border-slate-400/60 text-slate-100 hover:bg-slate-800/80 transition"
            >
              View Sample Report
            </Link>
          </div>

          <p className="text-xs text-slate-400">
            No overthinking. One swing, clear feedback, real improvement.
          </p>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-slate-950 px-4 py-10 border-t border-slate-800">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl md:text-2xl font-semibold mb-4 text-slate-50">
            How Virtual Coach AI works
          </h2>
          <p className="text-slate-300 mb-6 text-sm md:text-base max-w-3xl">
            We don&apos;t drown you in numbers. We show you exactly where your
            motion breaks down, how it compares to elite patterns, and what to
            practice next.
          </p>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="text-xs font-semibold text-emerald-300 mb-1">
                STEP 1
              </div>
              <h3 className="text-sm font-semibold mb-2 text-slate-50">
                Record one swing
              </h3>
              <p className="text-xs text-slate-300">
                Down-the-line or face-on. Phone at waist height. Nothing fancy.
                Just your real swing.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="text-xs font-semibold text-emerald-300 mb-1">
                STEP 2
              </div>
              <h3 className="text-sm font-semibold mb-2 text-slate-50">
                AI reads your motion
              </h3>
              <p className="text-xs text-slate-300">
                We track key positions P1Ã¢â‚¬â€œP9, find your biggest leaks, and match
                your pattern against Tour DNA.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="text-xs font-semibold text-emerald-300 mb-1">
                STEP 3
              </div>
              <h3 className="text-sm font-semibold mb-2 text-slate-50">
                Get a 14-day plan
              </h3>
              <p className="text-xs text-slate-300">
                Simple drills, clear checkpoints, and one swing score to track
                your improvement over time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-800 bg-slate-950 px-4 py-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-3 text-xs text-slate-500">
          <span>Ã‚Â© {new Date().getFullYear()} Virtual Coach AI. All rights reserved.</span>
          <span className="text-slate-500">
            Built for golfers who are tired of guessing.
          </span>
        </div>
      </footer>
    </main>
  );
}
