import { createHash, timingSafeEqual } from "crypto";

const BUILTIN_WORKER_KEY_SHA256 =
  "5cb77f61f6e652da915ea8684cbb45d62c2d364721e129bdedd24308237f621a";

function suppliedWorkerKey(req: Request) {
  const bearer = req.headers.get("authorization") || "";
  const fromBearer = bearer.toLowerCase().startsWith("bearer ")
    ? bearer.slice(7).trim()
    : "";
  return (req.headers.get("x-vca-worker-key") || fromBearer).trim();
}

function sha256Hex(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function constantTimeHexEqual(a: string, b: string) {
  try {
    const aa = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    return aa.length === bb.length && timingSafeEqual(aa, bb);
  } catch {
    return false;
  }
}

export function workerAuthorized(req: Request) {
  const supplied = suppliedWorkerKey(req);
  if (!supplied) {
    return { ok: false, status: 401, error: "Unauthorized worker" };
  }

  const expectedRaw = String(process.env.VCA_WORKER_KEY || "").trim();
  if (expectedRaw) {
    const ok = constantTimeHexEqual(
      sha256Hex(supplied),
      sha256Hex(expectedRaw)
    );
    return ok
      ? { ok: true, status: 200, error: "" }
      : { ok: false, status: 401, error: "Unauthorized worker" };
  }

  const expectedHash = String(
    process.env.VCA_WORKER_KEY_SHA256 || BUILTIN_WORKER_KEY_SHA256
  ).trim().toLowerCase();

  const ok = constantTimeHexEqual(sha256Hex(supplied), expectedHash);
  return ok
    ? { ok: true, status: 200, error: "" }
    : { ok: false, status: 401, error: "Unauthorized worker" };
}
