import { NextResponse } from "next/server";
export async function GET() {
  const txt = "VCA Demo Export\n\nIf this downloaded, downloads are working end-to-end.\n";
  return new NextResponse(txt, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": "attachment; filename=vca-demo-export.txt",
      "Cache-Control": "no-store",
    },
  });
}
