// /api/self-test.js
export default async function handler(req, res) {
  try {
    const r = await fetch(`${req.headers["x-forwarded-proto"] || "https"}://${req.headers.host}/api/s3-presign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: "selftest.mov", contentType: "video/quicktime" })
    });

    const body = await r.json();
    if (!r.ok) {
      return res.status(200).json({ ok: false, step: "presign", error: body });
    }

    return res.status(200).json({
      ok: true,
      step: "presign",
      message: "Presign successful",
      sample: {
        url: body.url,
        fieldsKeys: Object.keys(body.fields || {}),
        key: body.key,
        publicUrl: body.publicUrl
      }
    });
  } catch (e) {
    return res.status(200).json({ ok: false, error: e.message || String(e) });
  }
}
