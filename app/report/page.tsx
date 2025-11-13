// app/report/page.tsx
import { Suspense } from "react";

function Inner() {
  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const id = params.get("id");
  const provider = params.get("provider") || "mux";

  return (
    <section>
      <h1 className="h-lg">Your Swing Report</h1>
      {!id ? (
        <p className="k">Missing report id. Try uploading again.</p>
      ) : (
        <>
          <p className="k">Upload ID: <b>{id}</b> ({provider})</p>
          <div className="panel" style={{marginTop:12}}>
            <div className="h">Processing</div>
            <div className="k">
              We’ll fetch the asset once it’s ready, auto-segment P1–P9, detect faults, and render your plan.
            </div>
          </div>
        </>
      )}
    </section>
  );
}

export default function ReportPage() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}
