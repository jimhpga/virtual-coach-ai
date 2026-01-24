import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs"; // we need fs

export async function GET() {
  try {
    const pubReports = path.join(process.cwd(), "public", "reports");
    if (!fs.existsSync(pubReports)) {
      return NextResponse.redirect(new URL("/report-beta/full", "https://virtualcoachai.net"));
    }

    const files = fs
      .readdirSync(pubReports)
      .filter((f) => /^rep_.*\.json$/i.test(f))
      .map((f) => {
        const full = path.join(pubReports, f);
        return { f, t: fs.statSync(full).mtimeMs };
      })
      .sort((a, b) => b.t - a.t);

    const latest = files[0]?.f;
    if (!latest) {
      return NextResponse.redirect(new URL("/report-beta/full", "https://virtualcoachai.net"));
    }

    const base = "https://virtualcoachai.net";
    const repUrl = `${base}/reports/${latest}`;
    const fullUrl = `${base}/report-beta/full?src=${encodeURIComponent(repUrl)}`;

    return NextResponse.redirect(fullUrl, 302);
  } catch {
    return NextResponse.redirect(new URL("/report-beta/full", "https://virtualcoachai.net"));
  }
}
