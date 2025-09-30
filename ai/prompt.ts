import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Reads the system prompt from disk (works locally and on Vercel). */
export function loadSystemPrompt() {
  const envPath = process.env.VCAI_SYSTEM_PROMPT_PATH; // optional override
  // default: prompt file shipped with the repo
  const defaultPath = path.resolve(__dirname, "system-prompt.txt");
  const p = envPath ? path.resolve(envPath) : defaultPath;
  return fs.readFileSync(p, "utf8");
}
