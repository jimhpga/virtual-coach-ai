import { chromium } from "playwright";
import fs from "fs";

const url = process.argv[2];
const out = process.argv[3] || "report.pdf";

if (!url) {
  console.error("Usage: node scripts/vca-print-report.mjs <url> <out.pdf>");
  process.exit(2);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

await page.goto(url, { waitUntil: "networkidle", timeout: 120000 });
await page.waitForTimeout(1500);

const bodyLen = await page.evaluate(() => document.body?.innerText?.length || 0);
if (bodyLen < 50) {
  console.error("Page content looks empty. Aborting.");
  await browser.close();
  process.exit(3);
}

await page.pdf({
  path: out,
  format: "Letter",
  printBackground: true,
  margin: { top: "0.35in", right: "0.35in", bottom: "0.35in", left: "0.35in" }
});

await browser.close();

if (!fs.existsSync(out) || fs.statSync(out).size < 5000) {
  console.error("PDF not created or too small.");
  process.exit(4);
}

console.log("✅ PDF created:", out);
