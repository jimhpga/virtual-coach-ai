import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(_req: Request, ctx: { params: { id: string } }) {
  const id = ctx.params.id;
  const jobsDir = path.join(process.cwd(), ".vca", "jobs");
  const p = path.join(jobsDir, `${id}.json`);
  if (!fs.existsSync(p)) {
    return NextResponse.json({ ok: false, error: "Job not found" }, { status: 404 });
  }
  const raw = fs.readFileSync(p, "utf8");
  return new NextResponse(raw, {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}