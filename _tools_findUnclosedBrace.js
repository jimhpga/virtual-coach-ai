const fs = require("fs");
let ts;
try { ts = require("typescript"); }
catch (e) {
  console.error("❌ Cannot require('typescript'). Is it installed? Try: npm i -D typescript");
  process.exit(1);
}

const file = process.argv[2];
const text = fs.readFileSync(file, "utf8");

// TS scanner: TSX-aware so it handles JSX properly
const scanner = ts.createScanner(
  ts.ScriptTarget.Latest,
  /*skipTrivia*/ false,
  ts.LanguageVariant.JSX,
  text
);

const opens = [];
let token;
while ((token = scanner.scan()) !== ts.SyntaxKind.EndOfFileToken) {
  if (token === ts.SyntaxKind.OpenBraceToken) {
    opens.push(scanner.getTokenPos());
  } else if (token === ts.SyntaxKind.CloseBraceToken) {
    if (opens.length) opens.pop();
  }
}

// Report leftovers
const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

console.log("Unclosed '{' count =", opens.length);
if (!opens.length) process.exit(0);

console.log("\nMost recent unclosed '{' (last one is the likely culprit):\n");
const last = opens[opens.length - 1];
const lc = sf.getLineAndCharacterOfPosition(last);
const line = lc.line + 1;
const col  = lc.character + 1;

console.log({ pos: last, line, col });

// print context around that line
const lines = text.split(/\r?\n/);
const start = Math.max(1, line - 6);
const end   = Math.min(lines.length, line + 6);

for (let i = start; i <= end; i++) {
  const mark = (i === line) ? ">>" : "  ";
  console.log(`${mark} ${String(i).padStart(5)} │ ${lines[i-1]}`);
}
