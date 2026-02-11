/**
 * P3↔P5 Delivery Mirror card
 * Drop this inside your report renderer (React/Next).
 */
export function P3P5MirrorCard({ report }: { report: any }) {
  const m = report?.p3p5Mirror;

  const confMin = typeof m?.confidenceMin === "number" ? m.confidenceMin : null;
  const confLabel =
    confMin == null ? "Unknown" :
    confMin >= 40 ? "High" :
    confMin >= 25 ? "Medium" : "Low";

  const status =
    m?.status ? m.status :
    confMin == null ? "missing" :
    confMin >= 25 ? "ok" : "low_confidence";

  const fmt = (n: any) => (typeof n === "number" ? n.toFixed(2) : "—");

  return (
    <div className="report-card">
      <div className="report-card-title">P3 ↔ P5 Delivery Mirror</div>

      {!m ? (
        <div className="report-muted">Not available for this swing.</div>
      ) : (
        <>
          <div className="report-row">
            <div className="report-label">Status</div>
            <div className="report-value">
              {status} • Confidence: {confLabel}{confMin != null ? ` (${confMin})` : ""}
            </div>
          </div>

          <div className="report-row">
            <div className="report-label">Hand Match (deg)</div>
            <div className="report-value">{fmt(m.symmetry?.handMatchDeg)}</div>
          </div>

          <div className="report-row">
            <div className="report-label">Shaft Match (deg)</div>
            <div className="report-value">{fmt(m.symmetry?.shaftMatchDeg)}</div>
          </div>

          <div className="report-row">
            <div className="report-label">Delta Match (deg)</div>
            <div className="report-value">{fmt(m.symmetry?.deltaMatchDeg)}</div>
          </div>

          {status === "low_confidence" && (
            <div className="report-note">
              Estimated (low confidence). This will tighten up as shaft-vision improves.
            </div>
          )}
        </>
      )}
    </div>
  );
}