import { useEffect } from "react";

export default function ReportPage() {
  // ---- TEMP SAFE DEMO PAYLOAD ----
  const payload: any = {
    swingScore: 72,
    priorities: [],
    drills: [{ name: "Step-Through Drill" }],
    checkpoints: [
      { id: "P1", title: "Setup", note: "Demo placeholder" },
      { id: "P2", title: "Shaft Parallel", note: "Demo placeholder" },
      { id: "P3", title: "Lead Arm Parallel", note: "Demo placeholder" }
    ]
  };

  useEffect(() => {
    console.log("REPORT PAYLOAD (debug):", payload);
    console.log("PRIORITIES (debug):", payload.priorities);
  }, []);

  const priorities = payload.priorities ?? [];
  const drills = payload.drills ?? [];
  const checkpoints = payload.checkpoints ?? [];

  return (
    <div style={{ padding: 24 }}>
      <h1>Swing Report</h1>
      <p><strong>Swing Score:</strong> {payload.swingScore}</p>

      <h2>Top Priorities</h2>
      {priorities.length === 0 ? <p>No priorities found (demo).</p> : null}

      <h2>Drills</h2>
      {drills.map((d: any, i: number) => (
        <div key={i}>{d.name}</div>
      ))}

      <h2>P1–P9 Checkpoints</h2>
      {checkpoints.map((c: any) => (
        <div key={c.id}>
          <strong>{c.id} — {c.title}</strong>
          <div>{c.note}</div>
        </div>
      ))}
    </div>
  );
}
