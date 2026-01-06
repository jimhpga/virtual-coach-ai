import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Level = "beginner" | "intermediate" | "advanced";

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function makeExplain(level: Level) {
  const short = (s: string, i: string, a: string) =>
    level === "beginner" ? s : level === "intermediate" ? i : a;

  return {
    swingCorridor: short(
      "A safe hallway the club stays inside going back and coming down.",
      "A consistent path zone that keeps the club from getting too inside or too outside early.",
      "A stable hand/shaft delivery corridor that reduces late compensations."
    ),
    fineViewer: short(
      "A slow, frame-by-frame look at key moments around impact.",
      "A slow viewer to compare checkpoints before/after impact.",
      "Frame-by-frame inspection to verify checkpoint consistency."
    )
  };
}

function behindSwing(level: Level) {
  if (level === "beginner") return { enabled: false, cards: [] as any[] };

  return {
    enabled: true,
    cards: [
      {
        key: "corridor",
        title: "Swing Corridor",
        human: "Keeping the club inside a consistent corridor makes contact easier to repeat.",
        technical:
          "Keeping the hands/shaft/club moving with the body’s rotation reduces late adjustments and lowers timing dependency near impact.",
        exit: "You don’t need to think about this during your swing."
      }
    ]
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const videoUrl = String(body?.videoUrl || "");
    const impactFrame = Number(body?.impactFrame ?? 62);
    const level = (String(body?.level || "beginner").toLowerCase() as Level) || "beginner";

    if (!videoUrl.startsWith("/uploads/")) {
      return NextResponse.json({ ok: false, error: "videoUrl must start with /uploads/..." }, { status: 400 });
    }

    // Call your existing extract-pframes route locally
    const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const r = await fetch(`${base}/api/extract-pframes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoUrl, impactFrame })
    });

    if (!r.ok) {
      const t = await r.text().catch(() => "");
      return NextResponse.json({ ok: false, error: "extract-pframes failed", detail: t.slice(0, 500) }, { status: 500 });
    }

    const frames = await r.json();

    // TEMP scoring (replace with real model later)
    const power = clamp(70 + Math.floor(Math.random() * 16), 55, 92);
    const reliability = clamp(72 + Math.floor(Math.random() * 16), 55, 95);
    const swing = clamp(Math.round((power + reliability) / 2), 55, 95);

    // Copy: 3 good, 3 improve, 3 power leaks (level-aware)
    const good = [
      "Balanced finish — your swing stays organized through impact.",
      "Solid checkpoint spacing — the motion looks repeatable.",
      "Impact zone looks stable — fewer last-second saves."
    ];

    const improve = [
      "Keep the takeaway centered early — don’t let it drift inside or outside.",
      "Match the hand path going back and coming down — keep it in the same ‘hallway.’",
      "Hold lead-arm structure a touch longer through P3–P6."
    ];

    const leaks = [
      "Early takeaway drift can force a late face/shaft adjustment.",
      "Lead-arm collapse can reduce swing radius and speed transfer.",
      "Inconsistent hand path can cost both strike and distance."
    ];

    const chart = {
      power,
      reliability,
      swing,
      note:
        level === "beginner"
          ? "Power is how much speed you can create. Reliability is how well it holds up swing to swing."
          : "Power reflects speed potential; reliability reflects how stable your pattern remains under speed and pressure."
    };

    return NextResponse.json({
      ok: true,
      level,
      media: {
        framesDir: frames.framesDir,
        frames: frames.frames,
        // If/when you generate an impact clip, put it here:
        impactClipUrl: ""
      },
      scores: chart,
      insights: {
        doingWell: good,
        needsWork: improve,
        powerLeaks: leaks
      },
      explain: makeExplain(level),
      behindSwing: behindSwing(level)
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}
