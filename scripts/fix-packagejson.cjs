const fs = require("fs");

const p = "package.json";
let buf = fs.readFileSync(p);

// Strip UTF-8 BOM EF BB BF
if (buf.length >= 3 && buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) {
  buf = buf.slice(3);
}

// Decode as UTF-8 text
let txt = buf.toString("utf8");

// Strip anything before first "{"
const i = txt.indexOf("{");
if (i === -1) throw new Error("No '{' found in package.json");
txt = txt.slice(i);

// Parse to ensure valid JSON
const obj = JSON.parse(txt);

// Rewrite pretty JSON with UTF-8 NO BOM
const out = JSON.stringify(obj, null, 2) + "\n";
fs.writeFileSync(p, out, { encoding: "utf8" });

// Verify first bytes
const head = fs.readFileSync(p).slice(0, 8);
console.log("package.json first bytes:", [...head].map(b => b.toString(16).padStart(2,"0")).join(" "));
console.log("package.json first char:", out[0]);
