"use client";
import React from "react";

type Report = {
  meta:{jobId:string, sourceKey:string, fps:number, club:string};
  checkpoints: Array<{p:number,label?:string}>;
  faults: Array<{code:string,severity:string,note:string}>;
  drills: Array<{for:string,title:string,how:string}>;
};

async function pollReport(statusKey:string, tries=90, delay=5000):Promise<Report> {
  for (let i=0; i<tries; i++) {
    const res = await fetch("/api/report", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ key: statusKey })
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "report failed");
    if (data.status?.status === "ready") return data.report as Report;
    await new Promise(r => setTimeout(r, delay));
  }
  throw new Error("Timed out waiting for report");
}

export default function ReportPoller({ statusKey }: { statusKey: string }) {
  const [state, setState] = React.useState<"idle"|"pending"|"ready"|"error">("idle");
  const [error, setError] = React.useState<string|undefined>();
  const [report, setReport] = React.useState<Report|undefined>();

  React.useEffect(() => {
    let cancelled = false;
    setState("pending");
    pollReport(statusKey).then(r => {
      if (!cancelled) { setReport(r); setState("ready"); }
    }).catch(e => {
      if (!cancelled) { setError(String(e?.message || e)); setState("error"); }
    });
    return () => { cancelled = true; };
  }, [statusKey]);

  if (state === "pending") return <p>analyzing...</p>;
  if (state === "error")   return <p>�f¯�,¿�,½f�f¯�,¿�,½�f¯�,¿�,½,�f¯�,¿�,½�f¯�,¿�,½...?T {error}</p>;
  if (!report)             return null;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Report for {report.meta.jobId}</h2>
      <div>
        <h3 className="font-medium">Checkpoints</h3>
        <ul className="list-disc pl-6">
          {report.checkpoints.map(c => (
            <li key={c.p}>P{c.p}{c.label ? ` - ${c.label}` : ""}</li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="font-medium">Faults</h3>
        <ul className="list-disc pl-6">
          {report.faults.map(f => (
            <li key={f.code}><strong>{f.code}</strong> ({f.severity}) - {f.note}</li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="font-medium">Drills</h3>
        <ul className="list-disc pl-6">
          {report.drills.map(d => (
            <li key={d.title}><strong>{d.title}</strong>: {d.how}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

