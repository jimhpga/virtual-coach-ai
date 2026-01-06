import { NextResponse } from "next/server";
import { makeSimplePdf } from "../../../src/export/simplePdf";

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Use POST to generate the demo PDF.",
    example: { method: "POST", body: { phase: "P7", confidence: 0.92 } }
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const phase = body?.phase ?? "P7";
    const conf = typeof body?.confidence === "number" ? body.confidence : 0;

    const pdf = makeSimplePdf("Virtual Coach AI — Swing Snapshot Report", [
  `Generated: ${new Date().toLocaleString()}`,
  "",
  `Phase (selected): ${phase}`,
  `Detection confidence: ${Math.round(conf * 100)}%`,
  "",
  "Quick Summary:",
  "- SwingScore (demo): 82",
  "- Top priority focus: Impact delivery (P7)",
  "- Next best checkpoint: Top of swing (P4)",
  "",
  "Suggested Next Steps:",
  "1) Verify camera angle (face-on or down-the-line).",
  "2) Upload a second swing for consistency check.",
  "3) Use 1 drill only until P7 stabilizes.",
  "",
  "Virtual Coach AI • Investor/Test Demo"
]);

    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=VCA_Demo_Report.pdf",
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "demo-report failed" }, { status: 500 });
  }
}


