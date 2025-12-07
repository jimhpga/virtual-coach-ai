// pages/upload.tsx
import { useState, ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/router";

export default function UploadPage() {
  const router = useRouter();
  const [fileName, setFileName] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState("");
  const [email, setEmail] = useState("");
  const [club, setClub] = useState("");
  const [handedness, setHandedness] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setFileName(file ? file.name : null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      // Build payload for the AI API.
      const payload = {
        name: playerName || "Player",
        email: email || "",
        club: club || "",
        hand: (handedness as "right" | "left") || "right",
        eye: "unknown" as const, // we can add a real field later
        handicap: "1",
        height: `6'0"`,
        notes: notes || "",
        fileName: fileName || "",
      };

      const res = await fetch("/api/ai-generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to generate report.");
      }

      const reportJson = await res.json();

      // Store report so /report can read it
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(
          "vca-last-report",
          JSON.stringify(reportJson)
        );
      }

      // Go to live report view
      await router.push("/report?mode=local");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong while building your report.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 px-4 py-10">
      <section className="max-w-6xl mx-auto">
        {/* TOP HEADER */}
        <header className="mb-8">
          <p className="text-xs uppercase tracking-[0.35em] text-emerald-300/80 mb-2">
            VIRTUAL COACH AI
          </p>
          <h1 className="text-3xl md:text-4xl font-semibold mb-2">
            Upload Your Swing
          </h1>
          <p className="text-sm md:text-base text-slate-300 max-w-2xl">
            Drag in a face-on or down-the-line clip. We&apos;ll extract your P1â€“P9
            checkpoints, find your top 2â€“3 faults, and build a simple practice plan.
          </p>

          {/* BADGES */}
          <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
            <div className="inline-flex items-center rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-2" />
              P1â€“P9 checkpoints
            </div>
            <div className="inline-flex items-center rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-2" />
              Power &amp; efficiency score
            </div>
            <div className="inline-flex items-center rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-2" />
              Drill prescriptions
            </div>
            <div className="inline-flex items-center rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-2" />
              PDF report + email
            </div>
          </div>
        </header>

        {/* MAIN GRID */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)]">
          {/* LEFT: FORM */}
          <form
            onSubmit={handleSubmit}
            className="rounded-3xl border border-slate-800 bg-slate-900/70 shadow-[0_40px_120px_rgba(0,0,0,0.7)] p-6 md:p-8 space-y-5"
          >
            {/* File box */}
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-300 mb-3">
                1. Choose your swing video
              </h2>
              <label className="block rounded-2xl border border-dashed border-slate-600 bg-slate-900/80 px-4 py-6 cursor-pointer hover:border-emerald-400/70 hover:bg-slate-900 transition">
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/15 border border-emerald-400/50 flex items-center justify-center text-emerald-300 text-xl">
                    â†‘
                  </div>
                  <div className="text-xs text-slate-200">
                    <span className="font-semibold">
                      Click to browse or drag &amp; drop a video file
                    </span>
                    <span className="block text-[11px] text-slate-400 mt-1">
                      MP4 / MOV recommended â€¢ Ideally 1â€“3 seconds from setup to finish
                    </span>
                  </div>
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  {fileName && (
                    <div className="mt-1 text-[11px] text-emerald-300">
                      Selected: {fileName}
                    </div>
                  )}
                </div>
              </label>
            </div>

            {/* Player info */}
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1 text-xs">
                <label className="text-slate-300">Your name (optional)</label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="e.g. Jim H."
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                />
              </div>
              <div className="space-y-1 text-xs">
                <label className="text-slate-300">Email for report</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1 text-xs">
                <label className="text-slate-300">Club used (optional)</label>
                <input
                  type="text"
                  value={club}
                  onChange={(e) => setClub(e.target.value)}
                  placeholder="Driver, 7 iron, etc."
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                />
              </div>
              <div className="space-y-1 text-xs">
                <label className="text-slate-300">Handedness</label>
                <select
                  value={handedness}
                  onChange={(e) => setHandedness(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                >
                  <option value="">Right or left-handed?</option>
                  <option value="right">Right-handed</option>
                  <option value="left">Left-handed</option>
                </select>
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <label className="text-slate-300">
                Anything specific you want us to look at?
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="e.g. Driver consistency, early extension, face control, etc."
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-400 resize-none"
              />
            </div>

            {/* Submit */}
            <div className="pt-1 space-y-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full md:w-auto inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold bg-emerald-400 text-slate-950 hover:bg-emerald-300 disabled:opacity-60 disabled:cursor-not-allowed transition"
              >
                {submitting ? "Building your report..." : "Upload & analyze swing"}
              </button>
              <p className="text-[11px] text-slate-500 max-w-md">
                Pilot phase: we&apos;ll process your swing, build your report, and
                email you a link. No spam, no sharing.
              </p>

              {error && (
                <p className="text-[11px] text-red-400 max-w-md">
                  {error}
                </p>
              )}
            </div>
          </form>

          {/* RIGHT: LIVE PREVIEW / INFO */}
          <aside className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 md:p-7 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold tracking-wide text-slate-300">
                  LIVE PREVIEW
                </p>
                <p className="text-[11px] text-slate-500">
                  You&apos;ll see your swing here once uploads are live.
                </p>
              </div>
              <div className="px-3 py-1 rounded-full bg-slate-800 text-[11px] text-slate-300">
                {fileName ? "File ready" : "Waiting for fileâ€¦"}
              </div>
            </div>

            <div className="flex-1 rounded-2xl border border-slate-700 bg-slate-950/70 flex items-center justify-center px-4 py-6 text-center">
              {!fileName ? (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-200">
                    No file selected yet
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                    Drop a swing video on the left and you&apos;ll see it here
                    before we upload it.
                  </p>
                  <p className="text-[11px] text-slate-500 mt-2 max-w-xs mx-auto">
                    Tip: a clean single-swing clip (setup â†’ finish) makes analysis
                    easier.
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-200">
                    Preview placeholder
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                    In the full version, this panel will show a frame from your
                    uploaded swing and basic tracking info.
                  </p>
                </div>
              )}
            </div>

            <div className="border-t border-slate-800 pt-3 mt-2">
              <h3 className="text-xs font-semibold text-slate-300 mb-1">
                What happens next?
              </h3>
              <ol className="space-y-1 text-[11px] text-slate-400">
                <li>1. We upload and store your swing securely.</li>
                <li>2. AI extracts your P1â€“P9 positions and core metrics.</li>
                <li>3. We score your swing and flag the top 2â€“3 faults.</li>
                <li>4. You get a drill-based plan to fix them.</li>
              </ol>
              <p className="text-[11px] text-slate-500 mt-3">
                In this demo, the flow jumps straight to a live AI report. When the
                full engine is wired to video, this same page will power full analyses.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
