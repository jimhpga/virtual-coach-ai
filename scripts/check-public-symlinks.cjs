/* VCA_SAFE_REQUIRES: collision-proof requires for this script */
const _fs = require("fs");
const _path = require("path");
function walk(dir, out=[]) {
  for (const name of _fs.readdirSync(dir)) {
    const p = _path.join(dir, name);
    let st;
    try { st = _fs.lstatSync(p); } catch { continue; }
    if (st.isSymbolicLink()) out.push(p);
    if (st.isDirectory()) walk(p, out);
  }
  return out;
}

const pub = _path.join(process.cwd(), "public");
if (!_fs.existsSync(pub)) process.exit(0);

const links = walk(pub);
if (links.length) {
  console.error("❌ Build blocked: symlinks found under /public:");
  for (const p of links) console.error(" - " + p);
  process.exit(1);
} else {
  console.log("✅ Prebuild check: no symlinks under /public");
}






