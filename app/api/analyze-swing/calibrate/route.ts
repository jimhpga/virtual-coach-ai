import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";

// NOTE: You MUST change this import to your real post-pose analyzer function.
// Search your repo for the function that takes pose landmarks/frames and produces scores/faults/narrative.
import { analyzeFromPoseJson } from "../lib/analyzeFromPoseJson";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const clip = (searchParams.get("clip") || "as_01").replace(/[^a-z0-9_]/gi, "");

    const file = path.join(
      process.cwd(),
      "app",
      "api",
      "analyze-swing",
      "calibration",
      `${clip}.json`
    );

    if (!fs.existsSync(file)) {
      return NextResponse.json({ ok: false, error: `Missing calibration file: ${clip}.json` }, { status: 404 });
    }

    const raw = fs.readFileSync(file, "utf8");
    const poseJson = JSON.parse(raw);

    const result = await analyzeFromPoseJson(poseJson);

    return NextResponse.json({ ok: true, clip, result });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
