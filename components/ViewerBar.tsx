import React from "react";

type Props = {
  videoRef: React.RefObject<HTMLVideoElement>;
};

export default function ViewerBar({ videoRef }: Props) {
  const safe = (fn: () => void) => { try { fn(); } catch {} };

  const jump = (t: number) => safe(() => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, t);
    v.play?.();
  });

  const nudge = (dt: number) => safe(() => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, (v.currentTime ?? 0) + dt);
  });

  return (
    <div style={{
      display: "flex",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 10,
      padding: "10px 10px",
      borderRadius: 12,
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.10)"
    }}>
      <button onClick={() => jump(0)} style={btn}>Setup</button>
      <button onClick={() => jump(1.2)} style={btn}>P2</button>
      <button onClick={() => jump(2.0)} style={btn}>P3</button>
      <button onClick={() => jump(2.8)} style={btn}>Top</button>
      <button onClick={() => jump(3.4)} style={btn}>Impact</button>
      <button onClick={() => jump(4.2)} style={btn}>Finish</button>

      <span style={{ opacity: 0.35, padding: "0 6px" }}>|</span>

      <button onClick={() => nudge(-0.10)} style={btn}>-0.1s</button>
      <button onClick={() => nudge(0.10)} style={btn}>+0.1s</button>
      <button onClick={() => safe(() => videoRef.current?.pause?.())} style={btn}>Pause</button>
      <button onClick={() => safe(() => videoRef.current?.play?.())} style={btn}>Play</button>
    </div>
  );
}

const btn: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(0,0,0,0.18)",
  color: "rgba(255,255,255,0.92)",
  cursor: "pointer",
  fontSize: 12,
};
