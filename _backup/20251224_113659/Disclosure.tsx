import React, { useEffect, useState } from "react";

type Props = {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  persistKey?: string;
  children: React.ReactNode;
};

export default function Disclosure({
  title,
  subtitle,
  defaultOpen = false,
  persistKey,
  children,
}: Props) {
  const storageKey = persistKey ? `vca_disclosure_${persistKey}` : null;

  // SSR-safe: start with defaultOpen, then hydrate from sessionStorage in useEffect.
  const [open, setOpen] = useState<boolean>(defaultOpen);

  // Hydrate once on mount
  useEffect(() => {
    if (!storageKey) return;
    try {
      const v = sessionStorage.getItem(storageKey);
      if (v === "1") setOpen(true);
      if (v === "0") setOpen(false);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // Persist on change
  useEffect(() => {
    if (!storageKey) return;
    try {
      sessionStorage.setItem(storageKey, open ? "1" : "0");
    } catch {}
  }, [open, storageKey]);

  return (
    <section
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 18,
        padding: 14,
        boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
        backdropFilter: "blur(10px)",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          background: "transparent",
          border: "none",
          padding: 0,
          color: "inherit",
          cursor: "pointer",
          textAlign: "left",
        }}
        aria-expanded={open}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 900, letterSpacing: 0.2 }}>{title}</div>
          {subtitle ? (
            <div style={{ fontSize: 12, opacity: 0.75, marginTop: 3 }}>
              {subtitle}
            </div>
          ) : null}
        </div>

        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(0,0,0,0.20)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 900,
            flex: "0 0 auto",
          }}
          title={open ? "Collapse" : "Expand"}
        >
          {open ? "–" : "+"}
        </div>
      </button>

      {open ? <div style={{ marginTop: 12 }}>{children}</div> : null}
    </section>
  );
}
