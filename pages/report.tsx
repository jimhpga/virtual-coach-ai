"use client";

import React, { useEffect, useMemo, useState } from "react";

type DemoReport = {
  title?: string;
  createdAt?: string;
  swingScore?: number;
  priorities?: string[];
  drills?: { title: string; steps: string[] }[];
  checkpoints?: { key: string; label: string; note?: string }[];
};

export default function ReportPage() {
  const [data, setData] = useState<DemoReport | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const reportUrl = useMemo(() => "/reports/demo/report.json", []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(reportUrl, { cache: "no-store" as any });
        if (!res.ok) throw new Error(`Failed to load report (${res.status})`);
        const json = (await res.json()) as DemoReport;
        if (alive) setData(json);
      } catch (e: any) {
        if (alive) setErr(e?.message || "Failed to load report.");
      }
    })();
    return () => {
      alive = false;
    };
  }, [reportUrl]);

  const shell: React.CSSProperties = {
    minHeight: "100vh",
    background: "#0b1220",
    color: "#e6edf6",
    padding: 18,
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
  };

  const card: React.CSSProperties = {
    maxWidth: 980,
    margin: "0 auto",
    padding: 18,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.25)",
    boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
  };

  const h1: React.CSSProperties = { margin: 0, fontSize: 26, fontWeight: 900 };
  const sub: React.CSSProperties = { marginTop: 6, opacity: 0.8, fontSize: 13 };

  const section: React.CSSProperties = {
    marginTop: 14,
    padding: 14,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
  };

  const pill: React.CSSProperties = {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.20)",
    fontSize: 12,
    fontWeight: 800,
  };

  const listItem: React.CSSProperties = {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(0,0,0,0.18)",
    marginTop: 8,
  };

  return (
    <div style={shell}>
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1 style={h1}>{data?.title || "Swing Report"}</h1>
            <div style={sub}>
              {data?.createdAt ? `Created: ${data.createdAt}` : "Demo report view"}
              {" · "}
              <a href={reportUrl} style={{ color: "#9bdcff" }}>
                View JSON
              </a>
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ ...pill, fontSize: 13 }}>
              Swing Score: {typeof data?.swingScore === "number" ? data.swingScore : "—"}
            </div>
          </div>
        </div>

        {err ? (
          <div style={{ ...section, borderColor: "rgba(255,0,0,0.25)" }}>
            <div style={{ fontWeight: 900 }}>Couldn’t load report</div>
            <div style={{ opacity: 0.85, marginTop: 6 }}>{err}</div>
            <div style={{ opacity: 0.75, marginTop: 10 }}>
              Fix by placing a real JSON file at: <code>{reportUrl}</code>
            </div>
          </div>
        ) : null}

        <div style={section}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Top Priorities</div>
          {(data?.priorities?.length ? data.priorities : ["No priorities found (demo)."])
            .slice(0, 3)
            .map((p, i) => (
              <div key={i} style={listItem}>
                <div style={{ fontWeight: 900 }}>#{i + 1}</div>
                <div style={{ opacity: 0.9, marginTop: 4 }}>{p}</div>
              </div>
            ))}
        </div>

        <div style={section}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Drills</div>
          {(data?.drills?.length ? data.drills : [{ title: "Demo Drill", steps: ["Add real drills in report.json"] }])
            .slice(0, 2)
            .map((d, i) => (
              <div key={i} style={listItem}>
                <div style={{ fontWeight: 900 }}>{d.title}</div>
                <ol style={{ margin: "8px 0 0 18px", opacity: 0.9 }}>
                  {d.steps?.map((s, idx) => (
                    <li key={idx} style={{ marginTop: 4 }}>
                      {s}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
        </div>

        <div style={section}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>P1–P9 Checkpoints (Demo)</div>
          {(data?.checkpoints?.length
            ? data.checkpoints
            : [
                { key: "P1", label: "Setup", note: "Demo placeholder" },
                { key: "P2", label: "Shaft Parallel", note: "Demo placeholder" },
                { key: "P3", label: "Lead Arm Parallel", note: "Demo placeholder" },
              ]
          ).map((c) => (
            <div key={c.key} style={listItem}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div style={{ fontWeight: 900 }}>
                  {c.key} — {c.label}
                </div>
                <div style={{ ...pill, fontWeight: 900 }}>{c.key}</div>
              </div>
              {c.note ? <div style={{ opacity: 0.88, marginTop: 6 }}>{c.note}</div> : null}
            </div>
          ))}
        </div>

        <div style={{ marginTop: 14, opacity: 0.75, fontSize: 12 }}>
          This is a minimal, build-safe report page. Replace the JSON at <code>{reportUrl}</code> with your real report payload when ready.
        </div>
      </div>
    </div>
  );
}
