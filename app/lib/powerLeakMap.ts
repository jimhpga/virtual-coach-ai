export function getTopPowerLeaks(report: any) {
  const leaks: Array<{ key: string; title: string; fix: string }> = [];
  const m = report?.metrics ?? {};

  // 1) Pressure / sequence
  if (m.pressureShift === "late" || (typeof m.pressureForward === "number" && m.pressureForward < 60)) {
    leaks.push({
      key: "pressure_stall",
      title: "Pressure stalls before P6",
      fix: "Step-through pressure shift"
    });
  }

  // 2) Handle speed
  if ((typeof m.handleSpeedDrop === "number" && m.handleSpeedDrop > 12) || m.flipRisk === true) {
    leaks.push({
      key: "handle_slow",
      title: "Handle slows at impact",
      fix: "P6 check + turn-through"
    });
  }

  // 3) Arm structure
  if (m.trailArmCollapse === true) {
    leaks.push({
      key: "trail_arm",
      title: "Trail arm spills early",
      fix: "Trail-arm wall drill"
    });
  }

  if (!leaks.length) {
    return [
      { key: "sequence", title: "Sequence stalls (pressure then turn)", fix: "Step-through pressure shift" },
      { key: "handle", title: "Handle slows through impact", fix: "P6 check + turn-through" },
      { key: "trail_arm", title: "Trail arm spills early", fix: "Trail-arm wall drill" }
    ];
  }
  if (!leaks.length) {
    return [
      { key: "sequence", title: "Sequence stalls (pressure then turn)", fix: "Step-through pressure shift" },
      { key: "handle", title: "Handle slows through impact", fix: "P6 check + turn-through" },
      { key: "trail_arm", title: "Trail arm spills early", fix: "Trail-arm wall drill" }
    ];
  }
  return leaks.slice(0, 3);
}


