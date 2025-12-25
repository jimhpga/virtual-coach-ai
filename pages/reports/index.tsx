import Link from "next/link";

export default function ReportsIndex() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 px-4 py-10">
      <section className="max-w-5xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-semibold mb-4">Reports</h1>
        <p className="text-sm md:text-base text-slate-300 mb-6 max-w-2xl">
          In this pilot phase, reports are generated in batches. You can explore
          the Virtual Coach AI report layout using the sample links below.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 space-y-2">
            <h2 className="text-sm font-semibold text-slate-50">
              Sample Swing Report (static)
            </h2>
            <p className="text-xs text-slate-300">
              A fixed demo player with P1Ã¢‚¬€œP9 checkpoints, scores, and notes.
            </p>
            <Link
              href="/reports/sample"
              className="inline-flex text-xs font-semibold text-emerald-300 hover:text-emerald-200"
            >
              View sample report Ã¢€ €™
            </Link>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 space-y-2">
            <h2 className="text-sm font-semibold text-slate-50">
              Live-style Demo (via analyzer flow)
            </h2>
            <p className="text-xs text-slate-300">
              This opens the report page that Upload uses, wired to the demo JSON.
            </p>
            <Link
              href="/report?report=reports/demo/report.json"
              className="inline-flex text-xs font-semibold text-emerald-300 hover:text-emerald-200"
            >
              Open demo analyzer report Ã¢€ €™
            </Link>
          </div>
        </div>

        <p className="text-[11px] text-slate-500 mt-6">
          When the full engine is live, this page will list each player&apos;s
          saved reports with dates, clubs, and swing scores.
        </p>
      </section>
    </main>
  );
}

