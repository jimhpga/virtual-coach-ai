import { NextResponse } from "next/server";

export async function GET() {
  const base = "https://virtualcoachai.net";
  const repUrl = `${base}/reports/latest.json`;
  const fullUrl = `${base}/report-beta/full?src=${encodeURIComponent(repUrl)}`;
  return NextResponse.redirect(fullUrl, 302);
}
