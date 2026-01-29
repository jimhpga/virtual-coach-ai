"use client";

import Link from "next/link";
import Image from "next/image";

type Props = {
  active?: "home" | "upload" | "report" | "coming";
  logoSrc?: string; // e.g. "/vca-logo.png"
  brandText?: string;
};

export default function TopNav({ active = "home", logoSrc = "/vca-logo.png", brandText = "Virtual Coach AI" }: Props) {
  const pill = (href: string, label: string, key: Props["active"]) => {
    const on = active === key;
    return (
      <Link
        href={href}
        style={{
          height: 34,
          padding: "0 14px",
          borderRadius: 999,
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          border: on ? "1px solid rgba(255,255,255,0.22)" : "1px solid rgba(255,255,255,0.12)",
          background: on ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.18)",
          color: "#ffffff",
          fontWeight: 900,
          fontSize: 13,
          textDecoration: "none",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </Link>
    );
  };

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        background: "rgba(6,10,18,0.65)",
        borderBottom: "1px solid rgba(255,255,255,0.10)",
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "12px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
              display: "grid",
              placeItems: "center",
              overflow: "hidden",
            }}
            title="Virtual Coach AI"
          >
            {/* If the logo file doesn't exist yet, you'll still get a clean box */}
            <Image src={logoSrc} alt="VCA logo" width={88} height={88} style={{ objectFit: "contain" }} />
          </div>

          <div style={{ display: "grid", lineHeight: 1.05 }}>
            <div style={{ color: "#fff", fontWeight: 1000, letterSpacing: 0.2, fontSize: 16 }}>{brandText}</div>
            <div style={{ color: "rgba(255,255,255,0.75)", fontWeight: 800, fontSize: 12 }}>
              Swing analysis • P1–P9 • Tour DNA Match
            </div>
          </div>
        </Link>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {pill("/", "Home", "home")}
          {pill("/upload", "Upload", "upload")}
          {pill("/coming-soon", "Coming soon", "coming")}
          {pill("/report-beta/full", "Report demo", "report")}
        </div>
      </div>
    </div>
  );
}
