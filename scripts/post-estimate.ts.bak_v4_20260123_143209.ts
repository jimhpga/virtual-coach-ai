import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";


function stripFramesDeep(obj: any) {
  if (!obj || typeof obj !== "object") return obj;
  const out = Array.isArray(obj) ? [...obj] : { ...obj };
  // Common heavy payloads:
  if ("frames" in out) delete (out as any).frames;
  if ("pose" in out) delete (out as any).pose;
  if ("poseJson" in out) delete (out as any).poseJson;
  if (out.input && typeof out.input === "object") {
    const inp: any = { ...(out.input as any) };
    if ("frames" in inp) delete inp.frames;
    if ("pose" in inp) delete inp.pose;
    if ("poseJson" in inp) delete inp.poseJson;
    (out as any).input = inp;
  }
  return out;
}
// IMPORTANT: import by module path, NOT by absolute Windows path.
import { postAssess } from "../app/lib/postAssess";
process.on("beforeExit", () => {
  try {
    const reportsDir = path.join(process.cwd(), "public", "reports");
    const fullPath = path.join(reportsDir, "latest.full.json");
    if (!fs.existsSync(fullPath)) return;
    const cur = JSON.parse(fs.readFileSync(fullPath, "utf8"));
    const skinny = stripFramesDeep(cur);
    fs.writeFileSync(fullPath, JSON.stringify(skinny, null, 2), "utf8");
  } catch {}
});


