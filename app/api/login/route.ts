import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const next = url.searchParams.get("next") || "/upload";

  const res = NextResponse.redirect(new URL(next, url.origin));
  // 30 days for dev/demo; adjust later
  res.cookies.set("vca_auth", "1", {
    httpOnly: false,
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
  return res;
}
