/* VCA_ENSURE_DOTDATA: create .data in clean build env (Vercel/Linux) */
const fs = require("fs");
const path = require("path");
try{
  const dataDir = path.join(process.cwd(), ".data");
  if(!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
}catch(e){
  // Don't fail build for this; it's just a safety net.
}
const fs = require("fs");
const path = require("path");

function walk(dir, out=[]) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    let st;
    try { st = fs.lstatSync(p); } catch { continue; }
    if (st.isSymbolicLink()) out.push(p);
    if (st.isDirectory()) walk(p, out);
  }
  return out;
}

const pub = path.join(process.cwd(), "public");
if (!fs.existsSync(pub)) process.exit(0);

const links = walk(pub);
if (links.length) {
  console.error("❌ Build blocked: symlinks found under /public:");
  for (const p of links) console.error(" - " + p);
  process.exit(1);
} else {
  console.log("✅ Prebuild check: no symlinks under /public");
}

