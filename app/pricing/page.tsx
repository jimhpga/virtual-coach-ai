// app/pricing/page.tsx
export default function PricingPage() {
  return (
    <section className="grid" style={{gap:18}}>
      <h1 className="h-lg">Pricing</h1>
      <div className="panel">
        <div className="h">Single Upload Pass</div>
        <div className="k">One report, downloadable PDF, drill plan.</div>
        <div className="big">$10</div>
      </div>
      <div className="panel">
        <div className="h">Monthly</div>
        <div className="k">Unlimited uploads, saved history, pro comparisons.</div>
        <div className="big">$7.99</div>
      </div>
      <div className="panel">
        <div className="h">Pro</div>
        <div className="k">Coach tools, student dashboards, voice feedback.</div>
        <div className="big">$17.95</div>
      </div>
    </section>
  );
}
