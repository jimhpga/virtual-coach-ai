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

  useEffect(() => {
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
      } catch (err: any) {
        console.error(err);
        setError("Could not load local report.");
      }
      return;
    }

    // Case 2: existing behaviour Ã¢â‚¬â€œ static JSON path, e.g. reports/demo/report.json
    if (typeof reportParam === "string") {
      fetch("/" + reportParam)
        .then((res) => res.json())
        .then((json) => setData(json as ReportJson))
        .catch((err) => {
          console.error(err);
          setError("Could not load report.");
        });
    }
  }, [mode, reportParam]);

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
        <p className="text-slate-300 text-sm">Loading reportÃ¢â‚¬Â¦</p>
      </main>
    );
  }

  // from here down, keep your existing beautiful report layout,
  // just swap references to whatever you were using to now use `data`

  // Example:
  // data.report.summary.headline
  // data.report.summary.bullets
  // data.scores.swing.grade, etc.
}
