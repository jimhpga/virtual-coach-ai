"use client";
import Link from "next/link";
import { Shell } from "../_components/Shell";
import { TinyCard } from "../_components/UI";

export default function SequencingTruth() {
  return (
    <Shell
      title="Sequencing Truth"
      subtitle="What feels right… is often wrong. Here’s why."
      right={<Link href="/upload" style={{ color: "#b9cff6", fontWeight: 900 }}>Start Upload</Link>}
    >
      <div style={{ display: "grid", gap: 14 }}>
        <TinyCard title="The problem">
          <div style={{ lineHeight: 1.65, opacity: 0.92 }}>
            Most golfers start the downswing with their arms. Great ball-strikers start by shifting pressure and moving the lead hip laterally first.
            The downswing is ~0.33s. The fix is often a tiny ~0.10s pause in the arms so the body can get a head start.
          </div>
        </TinyCard>

        <TinyCard title="Why your feel lies (short + brutal)">
          <div style={{ lineHeight: 1.65, opacity: 0.92 }}>
            Your brain protects the old motor pattern. So the new move will feel wrong—even when it’s correct.
            If it feels “normal,” it’s probably the same old mistake in a new outfit.
          </div>
        </TinyCard>

        <TinyCard title="The improvement process (the ‘gap’)">
          <div style={{ lineHeight: 1.65, opacity: 0.92 }}>
            When you change a motor pattern you enter a temporary dip: the old move stops working and the new one isn’t stable yet.
            That dip is not failure. It’s the price of rewiring.
          </div>
        </TinyCard>

        <TinyCard title="What the app does">
          <ol style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7, opacity: 0.92 }}>
            <li>Detect sequencing timing (example: hips late by ~0.08s).</li>
            <li>Prescribe ONE drill to fix the root cause.</li>
            <li>Track progress: dip → exit → climb so you don’t panic.</li>
          </ol>
        </TinyCard>
      </div>
    </Shell>
  );
}
