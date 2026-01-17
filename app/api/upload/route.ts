import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "Missing file field 'file'." }, { status: 400 });
    }

    // Basic guardrails (local demo)
    const maxBytes = 75 * 1024 * 1024; // 75MB
    if (file.size > maxBytes) {
      return NextResponse.json({ ok: false, error: "File too large for demo (max 75MB)." }, { status: 413 });
    }

    const extGuess =
      file.type?.includes("mp4") ? ".mp4" :
      file.type?.includes("quicktime") ? ".mov" :
      file.name?.includes(".") ? "." + file.name.split(".").pop() :
      "";

    const id = crypto.randomBytes(8).toString("hex");
    const safeName = `swing_${id}${extGuess}`;
    const outDir = path.join(process.cwd(), "public", "uploads");
    const outPath = path.join(outDir, safeName);

    await fs.mkdir(outDir, { recursive: true });

    const buf = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(outPath, buf);

    // Public URL (Next serves /public at /)
    const url = `/uploads/${safeName}`;

    return NextResponse.json({ ok: true, id, filename: safeName, url }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Upload failed." }, { status: 500 });
  }
}
