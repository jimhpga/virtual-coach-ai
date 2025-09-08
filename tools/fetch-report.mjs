/**
 * Usage: node tools/fetch-report.mjs "<ApiBase>" "<statusKey>"
 * Example:
 *   node tools/fetch-report.mjs "https://virtual-coach-xxxx.vercel.app" "status/123.json"
 */
const ApiBase = process.argv[2];
const StatusKey = process.argv[3];

if (!ApiBase || !StatusKey) {
  console.error("Usage: node tools/fetch-report.mjs <ApiBase> <statusKey>");
  process.exit(1);
}

(async () => {
  try {
    const res = await fetch(`${ApiBase}/api/report`, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ key: StatusKey })
    });
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
    if (!data.ok) process.exit(2);
  } catch (e) {
    console.error(e?.message || String(e));
    process.exit(3);
  }
})();
