// scripts/pack.js
const fs = require('fs');
const path = require('path');
const shx = require('shelljs');
const git = require('simple-git')();
const chalk = require('chalk');

(async () => {
  const pkg = JSON.parse(fs.readFileSync('package.json','utf8'));
  const version = pkg.version || '0.0.0';
  let sha = 'nogit';
  try { sha = (await git.revparse(['--short','HEAD'])).trim(); } catch {}
  const outDir = '.pack';
  shx.mkdir('-p', outDir);

  // Decide your build output directory
  const buildDir = fs.existsSync('dist') ? 'dist' :
                   fs.existsSync('.next') ? '.next' :
                   fs.existsSync('build') ? 'build' : null;
  if(!buildDir) {
    console.error(chalk.red('No build output found (dist/.next/build). Did your build step run?'));
    process.exit(1);
  }

  const stamp = `${pkg.name || 'app'}-${version}-${sha}`;
  const stage = path.join(outDir, stamp);
  shx.rm('-rf', stage); shx.mkdir('-p', stage);

  // include only what you need
  shx.cp('-r', buildDir, path.join(stage, buildDir));
  ['package.json','README.md','LICENSE'].forEach(f => fs.existsSync(f) && shx.cp(f, stage));

  // optional: include a minimal runner for static builds
  if (fs.existsSync('server.js')) shx.cp('server.js', stage);

  fs.writeFileSync(path.join(stage, 'REPRODUCIBLE.txt'),
`Built with:
- node ${process.version}
- npm ${require('child_process').execSync('npm -v').toString().trim()}
- commit ${sha}
- package-lock present: yes
- built at ${new Date().toISOString()}
`);
  console.log(chalk.green(`Staged ${stamp} → ${stage}`));
})();
