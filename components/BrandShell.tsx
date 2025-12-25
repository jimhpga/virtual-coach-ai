import React from "react";
import Link from "next/link";

export default function BrandShell({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ minHeight: "100vh", padding: 24 }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <div style={{ fontWeight: 800 }}>Virtual Coach AI</div>
          </Link>
          {title ? <div style={{ opacity: 0.75 }}>— {title}</div> : null}
        </div>
        {children}
      </div>
    </div>
  );
}
