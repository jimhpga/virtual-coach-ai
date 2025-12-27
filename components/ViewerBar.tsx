import React from "react";

type Props = {
  videoRef: React.RefObject<HTMLVideoElement | null>;
};

export default function ViewerBar({ videoRef }: Props) {
  const btn: React.CSSProperties = {
    height: 34,
    padding: "0 10px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.06)",
    color: "#e6edf6",
    cursor: "pointer",
    fontWeight: 800,
  };

  const wrap: React.CSSProperties = {
    display: "flex",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: 10,
  };

  const step = (delta: number) => {
    const v = videoRef.current;
    if(!v) return;
    try {
      v.currentTime = Math.max(0, (v.currentTime || 0) + delta);
      v.pause();
    } catch {}
  };

  const playPause = () => {
    const v = videoRef.current;
    if(!v) return;
    try {
      if(v.paused) v.play();
      else v.pause();
    } catch {}
  };

  return (
    <div style={wrap}>
      <button style={btn} onClick={() => step(-0.04)}>◀ frame</button>
      <button style={btn} onClick={() => step( 0.04)}>frame ▶</button>
      <button style={btn} onClick={playPause}>Play / Pause</button>
    </div>
  );
}