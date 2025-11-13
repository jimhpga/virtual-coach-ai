// app/faq/page.tsx
export default function FAQPage() {
  return (
    <section className="grid" style={{gap:12}}>
      <h1 className="h-lg">FAQ</h1>
      <div className="panel"><b>What video do I need?</b><div className="k">Down-the-line, 240–480p, single swing.</div></div>
      <div className="panel"><b>How long does it take?</b><div className="k">Usually under a minute to get your first draft.</div></div>
      <div className="panel"><b>What do I get?</b><div className="k">P1–P9 checkpoints, fault map, drills, and a 14-day plan.</div></div>
    </section>
  );
}
