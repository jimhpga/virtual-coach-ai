export default function SampleReportPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 px-4 py-10 flex justify-center">
      <article className="w-full max-w-4xl space-y-8">
        <header className="border-b border-slate-800 pb-4">
          <h1 className="text-3xl font-bold">Virtual Coach AI â€“ Sample Swing Report</h1>
          <p className="text-slate-300 mt-2">
            Player: mid-handicap slicer Â· Club: driver Â· View: down-the-line.
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Summary</h2>
          <p className="text-slate-200">
            This sample report shows the type of feedback Virtual Coach AI delivers: clear faults,
            simple priorities, and a focused practice plan instead of generic tips.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Top 3 Priorities</h2>
          <ol className="list-decimal list-inside space-y-2 text-slate-200">
            <li>Over-the-top downswing causing left path and slice.</li>
            <li>Trail elbow stuck behind body at the top of the swing.</li>
            <li>Weight staying too much on the trail side at impact.</li>
          </ol>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">P1â€“P9 Snapshot</h2>
          <ul className="space-y-1 text-slate-200 text-sm">
            <li><strong>P1 â€“ Setup:</strong> Good posture, stance slightly wide.</li>
            <li><strong>P2 â€“ Shaft parallel backswing:</strong> Clubhead outside hands, face a bit open.</li>
            <li><strong>P3 â€“ Lead arm parallel:</strong> Arms long relative to turn.</li>
            <li><strong>P4 â€“ Top:</strong> Trail elbow deep behind body, shoulders over-turned.</li>
            <li><strong>P5â€“P6:</strong> Hands move out, club above plane (classic over-the-top).</li>
            <li><strong>P7 â€“ Impact:</strong> Weight not fully left, face open to path.</li>
            <li><strong>P8â€“P9:</strong> Finish balanced but with some lean back.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">14-Day Practice Plan (Outline)</h2>
          <ol className="list-decimal list-inside space-y-2 text-slate-200 text-sm">
            <li>Days 1â€“4: slow-motion pump-and-shallow drills, no ball, then half swings.</li>
            <li>Days 5â€“8: step-through swings to train pressure shift into the lead side.</li>
            <li>Days 9â€“14: mix full swings with a start-line challenge to control curve.</li>
          </ol>
        </section>

        <footer className="border-t border-slate-800 pt-4 text-sm text-slate-400">
          This is a demo only. Real reports are built from your swing video and your player profile.
        </footer>
      </article>
    </main>
  );
}
