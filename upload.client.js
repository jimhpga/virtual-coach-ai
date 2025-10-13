// ---- upload.client.js ----
// Call this after you've selected `file` from <input type="file">.

async function uploadToS3AndAnalyze(file) {
  if (!file) throw new Error("No file selected");

  // 1) Ask your API for a presigned PUT URL
  const presignRes = await fetch("/api/upload", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ filename: file.name })
  });
  if (!presignRes.ok) throw new Error(`Presign failed: ${presignRes.status}`);
  const presign = await presignRes.json();
  if (!presign?.url || !presign?.key) throw new Error("Bad presign payload");

  // 2) PUT the bytes to S3
  //    IMPORTANT:
  //    - Do NOT add Authorization or any x-amz-* headers.
  //    - Only include Content-Type if your presign included one.
  //      (If your server did NOT set ContentType in PutObjectCommand, you can omit it here too.)
  const putHeaders = {};
  // safe default — include ONLY if your server presigned with ContentType:
  // putHeaders["Content-Type"] = file.type || "application/octet-stream";

  const putRes = await fetch(presign.url, {
    method: "PUT",
    body: file,
    headers: putHeaders
  });
  if (!putRes.ok) {
    // Browsers sometimes surface S3 errors as generic "NetworkError".
    // This gives you a real status code to log.
    throw new Error(`S3 PUT failed: ${putRes.status} ${putRes.statusText}`);
  }

  // 3) Tell backend to analyze the uploaded object
  const reportKick = await fetch("/api/report", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ key: presign.key })
  }).then(r => r.json());

  if (!reportKick?.ok) {
    throw new Error(`Analyze failed: ${reportKick?.error || "unknown error"}`);
  }

  // 4) Go to the report page
  const url = new URL("/report.html", location.origin);
  url.searchParams.set("key", presign.key);
  location.href = url.toString();
}
