// /api/upload.js  (Edge runtime)
export const runtime = 'edge';

import { put } from '@vercel/blob';

// simple id
const id = () => crypto.randomUUID().replace(/-/g, '').slice(0, 16);

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'POST only' }), { status: 405 });
  }

  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!file || typeof file === 'string') {
      return new Response(JSON.stringify({ ok: false, error: 'file missing' }), { status: 400 });
    }

    // 1) store video
    const jobId = id();
    const ext = (file.name || 'swing.mp4').split('.').pop().toLowerCase();
    const videoKey = `uploads/${jobId}.${ext || 'mp4'}`;

    const videoPut = await put(videoKey, file, {
      access: 'private',
      token: process.env.BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: false
    });

    // 2) create a starter report JSON (you can later generate this server-side)
    const now = new Date().toISOString();
    const report = {
      meta: {
        version: 1,
        createdAt: now,
        jobId,
        sourceVideo: videoPut.url
      },
      player: { name: "Player", notes: "Starter auto-generated report" },
      scores: {
        fundamentals: 68, power: 61, consistency: 64
      },
      checkpoints: [
        { id: "P1", label: "Address", status: "OK", note: "Solid posture; watch grip pressure." },
        { id: "P2", label: "Takeaway", status: "NEEDS HELP", note: "Club outside hands; smoother start." },
        { id: "P3", label: "Lead arm parallel", status: "GOOD", note: "Clubface square, width good." },
        { id: "P4", label: "Top", status: "OK", note: "Slight across-the-line; soften trail arm." },
        { id: "P5", label: "Early down", status: "NEEDS HELP", note: "Sequencing late; shallow sooner." },
        { id: "P6", label: "Delivery", status: "OK", note: "Handle high; aim for more shaft lean." },
        { id: "P7", label: "Impact", status: "OK", note: "Low point a hair back; press into lead side." },
        { id: "P8", label: "Post-impact", status: "GOOD", note: "Extension looks athletic." },
        { id: "P9", label: "Finish", status: "GOOD", note: "Balanced, hold the pose." }
      ],
      swing_metrics: [
        { label: "Tempo (b:t)", value: 3.1, tour: 3.0, unit: "×" },
        { label: "Face Angle Consistency", value: 72, tour: 80, unit: "%" },
        { label: "Path Consistency", value: 66, tour: 78, unit: "%" }
      ],
      top_fixes: [
        "Start clubhead inside hands by P2 (alignment stick drill).",
        "Earlier weight shift to lead side by P6.",
        "Soft trail-arm at the top to reduce across-the-line."
      ],
      practice_plan_14d: [
        { day: 1,  focus: "P2 takeaway", reps: 40, drill: "Alignment stick, slow reps." },
        { day: 2,  focus: "Lead-side press @ impact", reps: 30, drill: "Impact bag / towel." },
        { day: 3,  focus: "Shallow earlier (P5)", reps: 35, drill: "Pump drill, 3 stops." },
        { day: 4,  focus: "Combine #1+#2", reps: 40, drill: "Block → random." },
        { day: 5,  focus: "Tempo 3:1", reps: 30, drill: "Metronome / count." },
        { day: 6,  focus: "Transfer", reps: 25, drill: "9-shot windows." },
        { day: 7,  focus: "Play / rest", reps: 0,  drill: "On-course awareness." },
        { day: 8,  focus: "Re-test P2", reps: 35, drill: "Video check." },
        { day: 9,  focus: "Re-test P5", reps: 30, drill: "Shallow cues." },
        { day:10,  focus: "Impact press", reps: 35, drill: "Bag/towel." },
        { day:11,  focus: "Tempo blend", reps: 30, drill: "Count 1–2–3." },
        { day:12,  focus: "Randomize", reps: 40, drill: "Different clubs/targets." },
        { day:13,  focus: "Course choices", reps: 0,  drill: "Targets fit dispersion." },
        { day:14,  focus: "Checkpoint", reps: 0,  drill: "Record new swing." }
      ]
    };

    const reportKey = `reports/${jobId}.json`;
    const reportPut = await put(reportKey, JSON.stringify(report), {
      access: 'public',
      contentType: 'application/json',
      token: process.env.BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: false
    });

    return new Response(
      JSON.stringify({
        ok: true,
        jobId,
        videoUrl: videoPut.url,
        reportUrl: reportPut.url
      }),
      { status: 200, headers: { 'content-type': 'application/json' } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 500 });
  }
}
