import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  // 1) Newer dump layout: .data/jobs/<id>/response.json
  const p1 = path.join(process.cwd(), ".data", "jobs", String(id), "response.json");

  // 2) Older / alternate layout: .vca/jobs/<id>.json
  const p2 = path.join(process.cwd(), ".vca", "jobs", `${id}.json`);

  const pick = fs.existsSync(p1) ? p1 : (fs.existsSync(p2) ? p2 : null);

  if (!pick) {
    return NextResponse.json({ ok: false, jobId: id, error: "Job not found." }, { status: 404 });
  }

  try {
    const raw = fs.readFileSync(pick, "utf8");
    const json = JSON.parse(raw);
    // If the stored file is your dump wrapper, return the payload for convenience
    const payload = (json && json.payload) ? json.payload : json;
    return NextResponse.json(payload, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, jobId: id, error: e?.message || "Failed to read job." },
      { status: 500 }
    );
  }
}