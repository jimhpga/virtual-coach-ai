import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const q = (body?.question || "").toString().trim();
  const priority = (body?.priority || "foundation").toString();
  const faults = Array.isArray(body?.faults) ? body.faults : [];

  const answer =
    q
      ? `Quick take: Based on your report, stay focused on ${priority}. Ask yourself: “Did the start line improve?” Keep reps slow and clean. If contact is stable, then add speed.`
      : `Stay focused on ${priority}. Don't chase 3 fixes today. One priority, clean reps, then re-check impact/start line.`;

  return NextResponse.json({
    ok: true,
    answer,
    meta: { priority, faultsCount: faults.length },
  });
}
