import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";

export default function SiteNav() {
  const router = useRouter();

  // If you want NO nav on the homepage, keep this.
  // If you want nav on homepage too, delete this block.
  if (router.pathname === "/") return null;

  const wrap: React.CSSProperties = {
    position: "sticky",
    top: 0,
    zIndex: 50,
    backdropFilter: "blur(10px)",
    background: "rgba(0,0,0,0.35)",
    borderBottom: "1px solid rgba(255,255,255,0.10)",
  };

  const inner: React.CSSProperties = {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "10px 18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  };

  const left: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10 };

  const logoBox: React.CSSProperties = {
    width: 34,
    height: 34,
    borderRadius: 10,
    background: "rgba(34,197,94,0.18)",
    border: "1px solid rgba(34,197,94,0.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 900,
    color: "#e6edf6",
  };

  const link: React.CSSProperties = {
    height: 34,
    padding: "0 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.22)",
    color: "#e6edf6",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    whiteSpace: "nowrap",
  };

  const linkActive: React.CSSProperties = {
    ...link,
    borderColor: "rgba(34,197,94,0.45)",
    background: "rgba(34,197,94,0.12)",
  };

  const is = (path: string) => router.pathname === path;

  return (
    <div style={wrap}>
      <div style={inner}>
        <div style={left}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <div style={logoBox}>VC</div>
          </Link>
          <div style={{ lineHeight: 1 }}>
            <div style={{ fontWeight: 900, color: "#e6edf6" }}>VIRTUAL COACH AI</div>
            <div style={{ fontSize: 12, opacity: 0.70, color: "#e6edf6" }}>Beta</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <Link href="/upload" style={is("/upload") ? linkActive : link}>Upload</Link>
          <Link href="/report" style={is("/report") ? linkActive : link}>Report</Link>
          <Link href="/reports" style={is("/reports") ? linkActive : link}>Samples</Link>
          <Link href="/p1p9" style={is("/p1p9") ? linkActive : link}>P1-P10</Link>
        </div>
      </div>
    </div>
  );
}
