// scripts/preflight.js
const { execSync } = require('child_process');
const chalk = require('chalk');

function run(cmd) { return execSync(cmd, { stdio: 'pipe' }).toString().trim(); }
function ok(msg){ console.log(chalk.green('✔ ') + msg); }
function die(msg){ console.error(chalk.red('✖ ')+msg); process.exit(1); }

try {
  const node = process.version; ok(`Node ${node}`);
  const npmV = run('npm -v'); ok(`npm ${npmV}`);

  // lockfile present & use npm ci for reproducibility
  try { run('shx test -f package-lock.json'); ok('Found package-lock.json'); }
  catch { die('Missing package-lock.json — run `npm install` once to create it.'); }

  // repo cleanliness
  try {
    const dirty = run('git status --porcelain');
    if (dirty) die('Working tree not clean. Commit or stash changes first.');
    ok('Git working tree is clean');
  } catch {
    ok('Git not available — skipping clean check');
  }

  // install to a known state
  run('npm ci'); ok('Dependencies installed via npm ci');
  ok('Preflight complete');
} catch (e) {
  die(`Preflight failed: ${e.message}`);
}
