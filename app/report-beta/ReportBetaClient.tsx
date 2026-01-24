"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type Fault = {
  key: string;
  score?: number;
  label?: string;
  note?: string;
  meaning?: string;
  drills?: string[];
};

type Report = {
  headline?: string;
  summary?: string;
  swingScore?: number;
  topFaults?: Fault[];
  powerLeaks?: any[];
  topFixes?: any[];
  practicePlan?: any[];
  [k: string]: any;
};

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

function capList<T>(arr: any, n: number): T[] {
  return Array.isArray(arr) ? arr.slice(0, n) : [];
}

export default function ReportBetaClient() {
  const sp = useSearchParams();
  const [report, setReport] = useState<Report | null>(null);

  useEffect(() => {
    // 1) Try query param (?report=...) if you ever pass it (URL-encoded JSON)
    const qp = sp?.get("report");
    if (qp) {
      const decoded = (() => { try { return decodeURIComponent(qp); } catch { return qp; } })();
      const parsed = safeParse<Report>(decoded);
      if (parsed) { setReport(parsed); return; }
    }

    // 2) Try sessionStorage keys (we don't know which one you used, so try a few)
    const keys = ["vca_report","vca_analysis_report","analysis_report","report"];
    for (const k of keys) {
      const parsed = safeParse<Report>(sessionStorage.getItem(k));
      if (parsed) { setReport(parsed); return; }
    }
  }, [sp]);

  const topFaults = useMemo(() => capList<Fault>(report?.topFaults, 3), [report]);
  const powerLeaks = useMemo(() => capList<any>(report?.powerLeaks, 2), [report]);
  const topFixes = useMemo(() => capList<any>(report?.topFixes, 2), [report]);
  const practicePlan = useMemo(() => capList<any>(report?.practicePlan, 3), [report]);

  if (!report) {
    return (
      <div style={{ padding: 24, color: "#e6edf6", fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif" }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Report not found</h1>
        <p style={{ opacity: 0.85, marginTop: 10 }}>
          No report payload was found in sessionStorage or the URL. Run an analysis first, then open this page again.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, color: "#e6edf6", fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "baseline", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{report.headline ?? "Your Swing Report"}</div>
          {report.summary ? <div style={{ opacity: 0.85, marginTop: 6, maxWidth: 920 }}>{report.summary}</div> : null}
        </div>
        {typeof report.swingScore === "number" ? (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 700 }}>Swing Score</div>
            <div style={{ fontSize: 34, fontWeight: 900, lineHeight: 1 }}>{Math.round(report.swingScore)}</div>
          </div>
        ) : null}
      </div>

      {/* Top Faults */}
      <section style={{ marginTop: 18 }}>
        <div style={{ fontSize: 14, fontWeight: 900, letterSpacing: 0.2, opacity: 0.95, marginBottom: 10 }}>
          Top 3 Priorities
        </div>

        {topFaults.length ? (
          <div style={{ display: "grid", gap: 12, maxWidth: 980 }}>
            {topFaults.map((f, idx) => (
              <div key={(f.key ?? "") + idx} style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: 14, background: "rgba(0,0,0,0.22)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "baseline" }}>
                  <div style={{ fontSize: 15, fontWeight: 900 }}>
                    {idx + 1}. {f.label ?? f.key ?? "Priority"}
                  </div>
                  {typeof f.score === "number" ? (
                    <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 800 }}>Score: {Math.round(f.score)}</div>
                  ) : null}
                </div>

                {f.meaning ? <div style={{ marginTop: 8, opacity: 0.86 }}>{f.meaning}</div> : null}

                {Array.isArray(f.drills) && f.drills.length ? (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 800, marginBottom: 6 }}>Drills</div>
                    <ul style={{ margin: 0, paddingLeft: 18, opacity: 0.9 }}>
                      {f.drills.slice(0, 2).map((d, i) => <li key={i} style={{ marginBottom: 6 }}>{d}</li>)}
                    </ul>
                  </div>
                ) : null}

                {f.note ? <div style={{ marginTop: 8, fontSize: 12, opacity: 0.6 }}>{f.note}</div> : null}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ opacity: 0.75 }}>No top priorities found.</div>
        )}
      </section>

      {/* Optional sections */}
      {powerLeaks.length ? (
        <section style={{ marginTop: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 900, letterSpacing: 0.2, opacity: 0.95, marginBottom: 10 }}>
            Where you leak power
          </div>
          <pre style={{ whiteSpace: "pre-wrap", opacity: 0.9, background: "rgba(0,0,0,0.22)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: 14 }}>
{JSON.stringify(powerLeaks, null, 2)}
          </pre>
        </section>
      ) : null}

      {topFixes.length ? (
        <section style={{ marginTop: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 900, letterSpacing: 0.2, opacity: 0.95, marginBottom: 10 }}>
            Top fixes
          </div>
          <pre style={{ whiteSpace: "pre-wrap", opacity: 0.9, background: "rgba(0,0,0,0.22)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: 14 }}>
{JSON.stringify(topFixes, null, 2)}
          </pre>
        </section>
      ) : null}

      {practicePlan.length ? (
        <section style={{ marginTop: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 900, letterSpacing: 0.2, opacity: 0.95, marginBottom: 10 }}>
            Practice plan
          </div>
          <pre style={{ whiteSpace: "pre-wrap", opacity: 0.9, background: "rgba(0,0,0,0.22)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: 14 }}>
{JSON.stringify(practicePlan, null, 2)}
          </pre>
        </section>
      ) : null}

      {/* Debug (remove later) */}
      <section style={{ marginTop: 18 }}>
        <div style={{ fontSize: 12, opacity: 0.65, fontWeight: 800, marginBottom: 8 }}>Debug payload (for now)</div>
        <pre style={{ whiteSpace: "pre-wrap", opacity: 0.75, background: "rgba(0,0,0,0.16)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 14, padding: 14 }}>
{JSON.stringify({ topFaults, swingScore: report.swingScore }, null, 2)}
        </pre>
      </section>
    </div>
  );
}
