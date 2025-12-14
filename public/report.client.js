"use strict";

// Tiny helper: pick one item from a list
function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// Tiny helper: pick N distinct items from a list
function takeRandom(list, count) {
  const copy = list.slice();
  const result = [];
  while (copy.length && result.length < count) {
    const idx = Math.floor(Math.random() * copy.length);
    result.push(copy.splice(idx, 1)[0]);
  }
  return result;
}

// ----- METRICS BARS (face control / swing plane) -----

function initMetricsBars() {
  const gradeToPct = {
    "A+": 96,
    "A": 92,
    "A-": 88,
    "B+": 84,
    "B": 80,
    "B-": 76,
    "C+": 72
  };

  const gradePool = ["A", "A-", "B+", "B", "B-", "C+"];

  const faceFill = document.querySelector(".metric-fill.metric-face");
  const planeFill = document.querySelector(".metric-fill.metric-plane");

  if (faceFill) {
    const grade = pickRandom(gradePool);
    const pct = gradeToPct[grade] || 80;
    faceFill.style.width = pct + "%";

    const scoreEl = faceFill.closest(".metric-card")?.querySelector(".metric-score");
    if (scoreEl) {
      scoreEl.textContent =
        "Today: " + grade + " · Start lines are mostly on target with a few misses when tempo drifts.";
    }
  }

  if (planeFill) {
    const grade = pickRandom(gradePool);
    const pct = gradeToPct[grade] || 78;
    planeFill.style.width = pct + "%";

    const scoreEl = planeFill.closest(".metric-card")?.querySelector(".metric-score");
    if (scoreEl) {
      scoreEl.textContent =
        "Today: " + grade + " · Swing plane is generally solid with the odd steep or shallow move under pressure.";
    }
  }
}

// ----- TODAY'S SNAPSHOT (3 / 3 / 3) -----

function initSnapshotBullets() {
  const list = document.querySelector(".metric-list");
  if (!list) return;

  const workingPool = [
    "solid contact on most swings",
    "steady tempo under pressure",
    "good posture and balance",
    "consistent start lines with short irons",
    "confident motion through impact",
    "calm pre-shot routine and commitment"
  ];

  const cleanupPool = [
    "setup alignment to the target",
    "top-of-swing shape and depth",
    "release timing through impact",
    "width control in the backswing",
    "trail-arm structure from P4 to P6",
    "face control when you add speed"
  ];

  const leakPool = [
    "late use of the ground for speed",
    "trail arm collapsing under load",
    "early stall of body rotation",
    "out-to-in path when you get tight",
    "early extension of the hips toward the ball",
    "over-tilting the shoulders instead of turning"
  ];

  const working = takeRandom(workingPool, 3);
  const cleanup = takeRandom(cleanupPool, 3);
  const leaks = takeRandom(leakPool, 3);

  function makeLine(label, items) {
    const li = document.createElement("li");
    li.innerHTML = "<strong>" + label + "</strong> " + items.join(", ") + ".";
    return li;
  }

  list.innerHTML = "";
  list.appendChild(makeLine("3 things working:", working));
  list.appendChild(makeLine("3 things to clean up:", cleanup));
  list.appendChild(makeLine("3 power leaks:", leaks));
}

// ----- ASK AI BUTTON -----

function initAskAiButton() {
  const btn = document.querySelector(".ask-section button");
  if (!btn) return;

  btn.addEventListener("click", function () {
    alert(
      "In the full version, this button will open Swing Coach AI so you can talk through this report in plain language."
    );
  });
}

// ----- BOOTSTRAP -----

document.addEventListener("DOMContentLoaded", function () {
  initMetricsBars();
  initSnapshotBullets();
  initAskAiButton();
});
