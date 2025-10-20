// at top
import { getSimilarPros } from "@/lib/pro-library"; // adjust path for your setup

// inside handler, after `const baseline = seededBaseline(meta, filename);`
const proRefs = getSimilarPros({ meta, filename, baseline, k: 4 });

// then, in callLLM() where we build the `user` content, add a block:
const user = {
  role: "user",
  content: [
    {
      type: "text",
      text:
`Student meta: ${JSON.stringify(meta, null, 2)}
Filename clues: ${JSON.stringify(baseline.parsed, null, 2)}

Baseline hints:
${JSON.stringify({
  archetype: baseline.arche,
  swingScore: baseline.swingScore,
  tempo: baseline.tempo,
  release_timing: baseline.release_timing
}, null, 2)}

Pro exemplars (anonymized, use for patterns not imitation):
${JSON.stringify(proRefs, null, 2)}

Optional observations:
${JSON.stringify(observations || {}, null, 2)}

OUTPUT SCHEMA:
... (the rest unchanged) ...`
    }
  ]
};
