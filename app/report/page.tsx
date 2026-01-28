"use client";

import React, { useEffect, useMemo, useState } from "react";

type LastReport = {
  at?: string;
  jobId?: string;
  report?: any;
  scores?: any;
  debug?: any;
};

export default function ReportPage() {
  const [data, setData] = useState<LastReport | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("vca_last_report");
      if(raw) setData(JSON.parse(raw));
    } catch {
      setData(null);
    }
  }, []);

  const headline = data?.report?.headline || "Swing Report";
  const swingScore = data?.scores?.swing ?? data?.report?.swingScore ?? null;
  const tour = data?.report?.tourDna?.label ? `${data.report.tourDna.label} · ${data.report.tourDna.match ?? ""}` : null;

  const scoreRows = useMemo(() => {
    const s = data?.scores || data?.report?.scores || null;
    if(!s) return [];
    return Object.keys(s).map(k => ({ k, v: s[k] }));
  }, [data]);

  return (
    <div style={{ minHeight: "100vh", padding: 24, color: "#e8eef7" }}>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <div style={{ fontSize: 12, letterSpacing: 1.2, opacity: 0.75, marginBottom: 8 }}>VIRTUAL COACH AI</div>
        <div style={{ display: "flex", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
          <div style={{ fontSize: 30, fontWeight: 900 }}>{headline}</div>
          {swingScore !== null ? (
            <div style={{ fontSize: 14, opacity: 0.85 }}>Swing Score: <b>{swingScore}</b></div>
          ) : null}
        </div>

        {tour ? <div style={{ fontSize: 13, opacity: 0.8, marginTop: 6 }}>{tour}</div> : null}
        {data?.at ? <div style={{ fontSize: 12, opacity: 0.6, marginTop: 6 }}>Generated: {data.at}</div> : null}

        <div style={{ marginTop: 18, display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
          <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.28)", padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>Scores</div>
            {scoreRows.length ? (
              <div style={{ display: "grid", gap: 8 }}>
                {scoreRows.map(r => (
                  <div key={r.k} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 13, opacity: 0.9 }}>
                    <div style={{ textTransform: "capitalize" }}>{r.k}</div>
                    <div style={{ fontWeight: 800 }}>{String(r.v)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 12, opacity: 0.7 }}>No scores found yet.</div>
            )}
          </div>

          <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.28)", padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>Priority</div>
            <div style={{ fontSize: 13, opacity: 0.9, fontWeight: 800 }}>
              {data?.report?.priority?.title || "Next step"}
            </div>
            <div style={{ fontSize: 13, opacity: 0.85, marginTop: 6 }}>
              {data?.report?.priority?.text || "Run Golden Demo from /upload to generate a report."}
            </div>
          </div>

          <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.28)", padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>Top faults</div>
            {Array.isArray(data?.report?.topFaults) && data!.report.topFaults.length ? (
              <div style={{ display: "grid", gap: 8 }}>
                {data!.report.topFaults.slice(0,3).map((f:any, i:number) => (
                  <div key={i} style={{ fontSize: 13, opacity: 0.9 }}>
                    <b>{f?.title || `Fault ${i+1}`}</b>{f?.why ? ` — ${f.why}` : ""}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 12, opacity: 0.7 }}>No faults listed.</div>
            )}
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <button
            type="button"
            onClick={() => (location.href = "/upload")}
            style={{
              height: 42,
              padding: "0 16px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.06)",
              color: "#e8eef7",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            ← Back to Upload
          </button>
        </div>

        {process.env.NODE_ENV === "development" && (
          <div style={{ marginTop: 16, fontSize: 11, opacity: 0.5 }}>
            Dev: stored report key = vca_last_report
          </div>
        )}
      </div>
    </div>
  );
}

