"use strict";

// Base for your API lite deployment
const VCAI_API_BASE = "https://vcai-api-lite.vercel.app";

// --- helpers -------------------------------------------------------------

async function vcaiFetchReportJson() {
  const params = new URLSearchParams(window.location.search);

  // Support both ?report= and ?url= for backwards compatibility
  const src =
    params.get("report") ||
    params.get("url") ||
    "reports/demo/report.json";

  const res = await fetch(src, { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Failed to load report JSON: " + res.status);
  }
  return await res.json();
}

async function vcaiCallAISummary(report) {
  const res = await fetch(`${VCAI_API_BASE}/api/ai-summary`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ report }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data.ok || !data.summary) {
    throw new Error(data.error || "AI summary request failed");
  }
  return data.summary;
}

async function vcaiCallAINotes(report, checkpointId) {
  const meta = (report && report.meta) || {};
  const payload = {
    checkpoint: checkpointId,
    report,
    meta: {
      skillLevel: meta.skillLevel || "intermediate",
      playerName: meta.playerName || meta.name || "Player",
    },
  };

  const res = await fetch(`${VCAI_API_BASE}/api/ai-notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data.ok || !data.notes) {
    throw new Error(data.error || "AI notes request failed");
  }
  return data.notes;
}

// --- AI summary wiring ---------------------------------------------------

function vcaiFindSummaryElements() {
  const allButtons = Array.from(
    document.querySelectorAll("button, a")
  );

  const summaryButton = allButtons.find((el) =>
    /play summary/i.test(el.textContent || "")
  );

  if (!summaryButton) {
    return { button: null, para: null };
  }

  const card =
    summaryButton.closest("section, article, div") || document.body;

  // Choose the first decent paragraph inside that card
  const paras = Array.from(card.querySelectorAll("p"));
  const para =
    paras.find((p) => (p.textContent || "").trim().length > 60) ||
    paras[0] ||
    null;

  return { button: summaryButton, para };
}

function vcaiWireSummarySpeech(button, getText) {
  if (!button) return;
  if (button.dataset.vcaiSpeechHooked === "1") return;

  button.dataset.vcaiSpeechHooked = "1";

  button.addEventListener("click", (ev) => {
    ev.preventDefault();

    const text = getText();
    if (!text) return;

    try {
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 1.0;
      utter.pitch = 1.0;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
    } catch (err) {
      console.error("Speech synthesis failed:", err);
    }
  });
}

async function vcaiInitAISummary(report) {
  const { button, para } = vcaiFindSummaryElements();
  if (!button && !para) {
    console.warn("[VCAI] Could not find summary area to enhance.");
    return;
  }

  let currentText =
    (para && (para.textContent || "").trim()) || "";

  // Wire speech immediately (will speak either static or AI text)
  vcaiWireSummarySpeech(button, () => currentText);

  try {
    const aiSummary = await vcaiCallAISummary(report);

    // Update on-screen text if we found a paragraph
    if (para) {
      para.textContent = aiSummary;
      // Optional: small AI badge
      if (!para.dataset.vcaiAiBadge) {
        const badge = document.createElement("span");
        badge.textContent = " AI summary";
        badge.style.fontSize = "0.75rem";
        badge.style.opacity = "0.7";
        badge.style.marginLeft = "6px";
        para.appendChild(badge);
        para.dataset.vcaiAiBadge = "1";
      }
    }

    currentText = aiSummary;
    console.log("[VCAI] AI summary loaded.");
  } catch (err) {
    console.error("[VCAI] AI summary error:", err);
  }
}

// --- AI notes wiring (per checkpoint) -----------------------------------

function vcaiFindCheckpointIdForButton(btn) {
  const container =
    btn.closest("[data-checkpoint]") ||
    btn.closest("section, article, div");

  if (!container) return null;

  // Try headings first
  const heading =
    container.querySelector("h2, h3, h4, .checkpoint-title, .p-label") ||
    container;

  const text = (heading.textContent || "").trim();
  const match = /P\s*([1-9])/i.exec(text);
  if (match) return "P" + match[1];

  return null;
}

function vcaiFindAINotesContainer(btn) {
  const container =
    btn.closest("[data-checkpoint]") ||
    btn.closest("section, article, div") ||
    btn.parentElement;

  if (!container) return null;

  // Look for an existing AI notes area
  const labelCandidate = Array.from(
    container.querySelectorAll("div, p, span, h5, strong")
  ).find((el) =>
    /ai notes/i.test(el.textContent || "")
  );

  if (labelCandidate && labelCandidate.nextElementSibling) {
    return labelCandidate.nextElementSibling;
  }

  // Fallback: create an inline area under the button
  const wrapper = document.createElement("div");
  wrapper.className = "vcai-ai-notes";
  wrapper.style.marginTop = "6px";
  wrapper.style.fontSize = "0.85rem";
  wrapper.style.lineHeight = "1.4";
  wrapper.style.color = "var(--muted, #cbd5f5)";
  btn.insertAdjacentElement("afterend", wrapper);
  return wrapper;
}

function vcaiWireAINotesButtons(report) {
  const buttons = Array.from(
    document.querySelectorAll("button, a")
  ).filter((el) =>
    /(ai notes|need more info)/i.test(el.textContent || "")
  );

  if (!buttons.length) {
    console.warn("[VCAI] No AI Notes buttons found to wire.");
    return;
  }

  buttons.forEach((btn) => {
    if (btn.dataset.vcaiNotesHooked === "1") return;
    btn.dataset.vcaiNotesHooked = "1";

    btn.addEventListener("click", async (ev) => {
      ev.preventDefault();

      const checkpointId = vcaiFindCheckpointIdForButton(btn);
      if (!checkpointId) {
        console.warn(
          "[VCAI] Could not infer checkpoint id for AI notes button."
        );
        alert(
          "Sorry, we couldn't figure out which checkpoint this belongs to."
        );
        return;
      }

      const target = vcaiFindAINotesContainer(btn);
      if (!target) {
        alert("Couldn't find a place to show AI notes.");
        return;
      }

      if (target.dataset.vcaiLoaded === "1") {
        // Already loaded once; just toggle visibility
        if (target.style.display === "none") {
          target.style.display = "";
        } else {
          target.style.display = "none";
        }
        return;
      }

      target.textContent = "Loading AI notes for " + checkpointId + "…";

      try {
        const notes = await vcaiCallAINotes(report, checkpointId);
        target.textContent = notes;
        target.dataset.vcaiLoaded = "1";
        btn.textContent = "AI notes ✓";
      } catch (err) {
        console.error("[VCAI] AI notes error:", err);
        target.textContent =
          "We couldn't load AI notes for this checkpoint.";
      }
    });
  });
}

// --- bootstrap ----------------------------------------------------------

document.addEventListener("DOMContentLoaded", async () => {
  if (!/report\.html$/i.test(window.location.pathname)) {
    return; // only run on the report page
  }

  try {
    const report = await vcaiFetchReportJson();
    window.vcaiCurrentReport = report; // handy for debugging

    vcaiInitAISummary(report);
    vcaiWireAINotesButtons(report);
  } catch (err) {
    console.error("[VCAI] Failed to initialize AI hooks:", err);
  }
});
