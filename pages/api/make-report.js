export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "POST only" });
  }

  try {
    const body = await readJson(req);
    const s3Key = body.s3_key || body.key || null;

    // TODO: kick off your real analysis here using s3Key.
    // For now, just point the user to a working viewer JSON so the flow completes.
    // You can swap this to /reports/latest.json once you write reports to S3.
    const viewerUrl = "/report?report=/docs/report.json";

    res.status(200).json({ ok: true, s3_key: s3Key, viewerUrl });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: e.message || "make-report failed" });
  }
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(e);
      }
    });
  });
}
