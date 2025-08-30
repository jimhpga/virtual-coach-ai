// scripts/zip.js
const fs = require('fs');
const path = require('path');
const crossZip = require('cross-zip');
const chalk = require('chalk');

const pkg = JSON.parse(fs.readFileSync('package.json','utf8'));
const version = pkg.version || '0.0.0';
const packDir = '.pack';
const candidates = fs.readdirSync(packDir).filter(n => n.startsWith((pkg.name||'app')+'-'));
if (candidates.length === 0) { console.error('Nothing staged in .pack'); process.exit(1); }
const src = path.join(packDir, candidates[0]);
const out = path.join(packDir, `${candidates[0]}.zip`);

(async () => {
  // Normalize file times for reproducibility
  const walk = (p) => {
    const s = fs.statSync(p);
    const atime = new Date('2000-01-01T00:00:00Z');
    const mtime = new Date('2000-01-01T00:00:00Z');
    fs.utimesSync(p, atime, mtime);
    if (s.isDirectory()) fs.readdirSync(p).forEach(f => walk(path.join(p,f)));
  };
  walk(src);

  await crossZip.zip(src, out);
  console.log(chalk.green(`ZIP → ${out}`));
})();
