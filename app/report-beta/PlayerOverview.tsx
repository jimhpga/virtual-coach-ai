"use client";

type Props = {
  summary: string;
  meta: string;
  body: string;
  highlights: string[];
  footer: string;
};

export default function PlayerOverview({
  summary,
  meta,
  body,
  highlights,
  footer
}: Props) {
  return (
    <section className="rounded-xl border border-white/10 bg-black/30 p-5 space-y-3">
      <h2 className="text-lg font-semibold">Player Overview</h2>

      <p className="text-sm text-white/80">{summary}</p>

      <div className="text-xs text-white/50">{meta}</div>

      <p className="text-sm leading-relaxed text-white/80">{body}</p>

      <ul className="list-disc list-inside text-sm text-white/80 space-y-1">
        {highlights.map((h, i) => (
          <li key={i}>{h}</li>
        ))}
      </ul>

      <div className="text-xs text-emerald-400">{footer}</div>
    </section>
  );
}
