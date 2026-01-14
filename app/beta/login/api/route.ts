import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const pw = String(body?.pw || "");
    const expected = process.env.BETA_PASSWORD || "";

    if (!expected) {
      return NextResponse.json({ ok: false, error: "Server missing BETA_PASSWORD" }, { status: 500 });
    }

    if (pw !== expected) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    const res = NextResponse.json({ ok: true });
    res.cookies.set("vca_beta", "true", {
      httpOnly: true,
      sameSite: "lax",
      secure: false, // set true on https deploy
      path: "/",
      maxAge: 60 * 60 * 12, // 12 hours
    });

    return res;
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
