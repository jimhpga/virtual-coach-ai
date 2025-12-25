import React, { useEffect, useState } from "react";

type Props = {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  persistKey?: string;

  // NEW (optional): lets Report auto-scroll when the user opens it
  onToggle?: (open: boolean) => void;

  children: React.ReactNode;
};

export default function Disclosure({
  title,
  subtitle,
  defaultOpen = false,
  persistKey,
  onToggle,
  children,
}: Props) {
  const [open, setOpen] = useState<boolean>(defaultOpen);

  // Persist open/close across refresh
  useEffect(() => {
    if (!persistKey) return;
    try {
      const v = localStorage.getItem(persistKey);
      if (v === "open") setOpen(true);
      if (v === "closed") setOpen(false);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persistKey]);

  useEffect(() => {
    if (!persistKey) return;
    try { localStorage.setItem(persistKey, open ? "open" : "closed"); } catch {}
  }, [persistKey, open]);

  const toggle = () => {
    setOpen((prev) => {
      const next = !prev;
      try { onToggle?.(next); } catch {}
      return next;
    });
  };

  const shell: React.CSSProperties = {
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
    boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
    backdropFilter: "blur(10px)",
    overflow: "hidden",
  };

  const head: React.CSSProperties = {
    padding: "14px 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    cursor: "pointer",
    gap: 12,
  };

  const btn: React.CSSProperties = {
    width: 34, height: 34, borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.25)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontWeight: 900,
    opacity: 0.9,
    flexShrink: 0,
  };

  return (
    <div style={shell}>
      <div style={head} onClick={toggle}>
        <div>
          <div style={{ fontWeight: 900 }}>{title}</div>
          {subtitle ? <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>{subtitle}</div> : null}
        </div>
        <div style={btn}>{open ? "−" : "+"}</div>
      </div>

      {open ? (
        <div style={{ padding: "0 16px 16px" }}>
          {children}
        </div>
      ) : null}
    </div>
  );
}
