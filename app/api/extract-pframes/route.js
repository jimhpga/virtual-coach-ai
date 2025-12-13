import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ ok: false, error: "Method not allowed." }, { status: 405 });
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    return NextResponse.json({
      ok: true,
      note: "extract-pframes stub (deployed route exists).",
      input: body,
      frames: {}
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || "Failed." }, { status: 500 });
  }
}
