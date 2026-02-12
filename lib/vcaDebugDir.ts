import path from "path";

export function vcaDebugBaseDir(): string | null {
  // Never use .data in production deployments.
  if (process.env.NODE_ENV === "production") return null;

  // Hard gate: you must explicitly opt-in
  // Local dev: set VCA_DEBUG_LOCAL=1
  if (process.env.VCA_DEBUG_LOCAL !== "1") return null;

  return path.join(process.cwd(), ".data");
}
