"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Home" },
  { href: "/upload", label: "Upload" },
  { href: "/reports", label: "Reports" },
  { href: "/whats-next", label: "What’s Next" },
];

export default function TopNav() {
  const path = usePathname();
  return (
    <div style={{
      position: "fixed",
      top: 0, left: 0, right: 0,
      height: 64,
      display: "flex",
      alignItems: "center",
      padding: "0 24px",
      background: "rgba(0,0,0,0.52)",
      backdropFilter: "blur(12px)",
      borderBottom: "1px solid rgba(255,255,255,0.12)",
      zIndex: 50
    }}>
      <Link href="/" style={{
        display: "flex",
        alignItems: "baseline",
        gap: 10,
        textDecoration: "none",
        color: "#e6edf6"
      }}>
        <span style={{
          width: 34, height: 34,
          borderRadius: 10,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(31,122,71,0.35)",
          border: "1px solid rgba(255,255,255,0.12)",
          fontWeight: 900
        }}>VC</span>
        <span style={{ fontWeight: 900, letterSpacing: 0.3 }}>VIRTUAL COACH AI</span>
        <span style={{ opacity: 0.6, fontSize: 12, fontWeight: 700 }}>Phase 0 — Beta</span>
      </Link>

      <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
        {items.map(it => {
          const active = path === it.href;
          return (
            <Link key={it.href} href={it.href} style={{
              height: 36,
              padding: "0 14px",
              borderRadius: 12,
              display: "inline-flex",
              alignItems: "center",
              textDecoration: "none",
              color: "#e6edf6",
              fontWeight: 800,
              fontSize: 13,
              border: "1px solid rgba(255,255,255,0.12)",
              background: active ? "rgba(31,122,71,0.35)" : "rgba(255,255,255,0.06)"
            }}>
              {it.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
