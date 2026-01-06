function escapePdfText(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

// Minimal, valid PDF generator (single page, Helvetica text).
export function makeSimplePdf(title: string, lines: string[]) {
  const body = [
    "BT",
    "/F1 18 Tf",
    "72 740 Td",
    `(${escapePdfText(title)}) Tj`,
    "/F1 12 Tf",
    "0 -28 Td",
    ...lines.map((ln) => `(${escapePdfText(ln)}) Tj\n0 -16 Td`).join("").split("\n"),
    "ET",
  ].join("\n");

  const objs: string[] = [];
  objs.push("1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj");
  objs.push("2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj");
  objs.push("3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources<< /Font<< /F1 4 0 R >> >> /Contents 5 0 R >>endobj");
  objs.push("4 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj");
  objs.push(`5 0 obj<< /Length ${Buffer.byteLength(body, "utf8")} >>stream\n${body}\nendstream\nendobj`);

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (const o of objs) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += o + "\n";
  }
  const xrefStart = Buffer.byteLength(pdf, "utf8");
  pdf += "xref\n0 6\n";
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i <= 5; i++) {
    const off = offsets[i].toString().padStart(10, "0");
    pdf += `${off} 00000 n \n`;
  }
  pdf += "trailer<< /Size 6 /Root 1 0 R >>\n";
  pdf += `startxref\n${xrefStart}\n%%EOF\n`;

  return Buffer.from(pdf, "utf8");
}
