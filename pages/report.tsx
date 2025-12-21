import { useRouter } from "next/router";
import { useEffect, useState } from "react";

// type ReportJson here should match what we returned from the API
type ReportJson = {
  ok: boolean;
  profile: {
    name: string;
    hand: string;
    eye: string;
    handicap: string;
    height: string;
  };
  report: {
    meta: { playerName: string; generatedAt: string; notes: string };
    summary: { headline: string; bullets: string[] };
    scores: {
      swing: { grade: string; label: string };
      power: { grade: string; label: string };
      reliability: { grade: string; label: string };
    };
  };
};

export default function ReportPage() {
  const router = useRouter();
  const { mode, report: reportParam } = router.query;

  const [data, setData] = useState<ReportJson | null>(null);
  const [error, setError] = useState<string | null>(null);

  // MVP: if upload page stored a local preview, show it here
  useEffect(() => {
    try {
      const url = window.sessionStorage.getItem("vca_video_preview_url");
      if (!url) return;

      const v = document.getElementById("vid") as HTMLVideoElement | null;
      if (!v) return;

      const fb = document.getElementById("vidFallback");
      if (fb) fb.style.display = "none";

      v.src = url;
      v.style.display = "block";
      v.load();
    } catch {
      // silent by design (preview is optional)
    }
  }, []);

  useEffect(() => {
    // Wait until router is ready so query params are stable
    if (!router.isReady) return;

    // Case 1: new AI report stored locally
    if (mode === "local") {
      try {
        const raw =
          typeof window !== "undefined"
            ? window.sessionStorage.getItem("vca-last-report")
            : null;

        if (!raw) {
          setError("No local report found. Please upload a swing first.");
          return;
        }

        const json = JSON.parse(raw) as ReportJson;
        setData(json);
      } catch (err) {
        console.error(err);
        setError("Could not load local report.");
      }
      return;
    }

    // Case 2: existing behavior — static JSON path, e.g. reports/demo/report.json
    if (typeof reportParam === "string" && reportParam.length) {
      fetch("/" + reportParam)
        .then((res) => res.json())
        .then((json) => setData(json as ReportJson))
        .catch((err) => {
          console.error(err);
          setError("Could not load report.");
        });
      return;
    }

    // If neither mode is used, just sit on loading state (or show a helpful message)
    // You can optionally set an error here if you want.
  }, [router.isReady, mode, reportParam]);

  if (error) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50 p-8">
        <p className="text-red-400 text-sm">{error}</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50 p-8">
        <p className="text-slate-300 text-sm">Loading report...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 p-8">
      {/* Swing video (MVP local preview) */}
      <div
        style={{
          margin: "16px 0",
          padding: 16,
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 12,
          background: "rgba(0,0,0,0.25)",
        }}
      >
        <h2 style={{ margin: "0 0 10px 0" }}>Swing video</h2>
        <video
          id="vid"
          controls
          playsInline
          preload="metadata"
          style={{
            width: "100%",
            borderRadius: 12,
            background: "#000",
            display: "none",
          }}
        />
        <div id="vidFallback" style={{ padding: 10, opacity: 0.75 }}>
          No video attached (yet). Upload a swing to preview it here.
        </div>
      </div>

      {/* ===== From here down: keep your existing beautiful report layout ===== */}
      {/* Example usage:
          data.report.summary.headline
          data.report.summary.bullets
          data.report.scores.swing.grade
      */}

      <section style={{ marginTop: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>
          {data.report.summary.headline}
        </h1>
        <ul style={{ marginTop: 10, paddingLeft: 18, opacity: 0.9 }}>
          {data.report.summary.bullets.map((b, i) => (
            <li key={i} style={{ marginBottom: 6 }}>
              {b}
            </li>
          ))}
        </ul>

        <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
          <div>
            <strong>Swing:</strong> {data.report.scores.swing.grade} —{" "}
            {data.report.scores.swing.label}
          </div>
          <div>
            <strong>Power:</strong> {data.report.scores.power.grade} —{" "}
            {data.report.scores.power.label}
          </div>
          <div>
            <strong>Reliability:</strong> {data.report.scores.reliability.grade} —{" "}
            {data.report.scores.reliability.label}
          </div>
        </div>
      </section>
    </main>
  );
}
