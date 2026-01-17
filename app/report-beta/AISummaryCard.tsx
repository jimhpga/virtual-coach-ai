"use client";
import * as React from "react";

export default function AISummaryCard({ post }: { post: any }) {
  if (!post) return null;

  const pri = post.priorityLabel || "Priority";
  const why = post.whyNow || "";
  const avoid = post.avoidList || "";
  const conf = post.confidenceCue || "";

  return (
    <div style={{ marginTop: 14, borderRadius: 16, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.22)", padding: 14 }}>
      <div style={{ fontSize: 12, letterSpacing: 0.6, opacity: 0.8, fontWeight: 800 }}>AI SUMMARY</div>
      <div style={{ marginTop: 8, fontSize: 18, fontWeight: 900 }}>{pri}</div>
      {why ? <div style={{ marginTop: 8, lineHeight: 1.35, opacity: 0.92 }}>{why}</div> : null}
      {avoid ? <div style={{ marginTop: 10, opacity: 0.9 }}><b>Avoid:</b> {avoid}</div> : null}
      {conf ? <div style={{ marginTop: 10, opacity: 0.9 }}><b>Confidence:</b> {conf}</div> : null}
    </div>
  );
}
