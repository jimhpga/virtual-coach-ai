"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shell } from "../_components/Shell";

export default function Upload() {
  const [file, setFile] = useState<any>(null);
  const [audience, setAudience] = useState<"adult"|"junior">("adult");
  const [focus, setFocus] = useState("General checkup (full swing)");
  const router = useRouter();

  function go() {
    const payload = {
      fileName: file?.name || null,
      audience,
      focus,
      createdAt: new Date().toISOString()
    };
    sessionStorage.setItem("vca_intake", JSON.stringify(payload));
    router.push("/report");
  }

  return (
    <Shell
      title="Upload"
      subtitle="One clip. One report. One drill."
      right={<Link href="/sequencing-truth" style={{ color: "#b9cff6", fontWeight: 900 }}>Sequencing Truth</Link>}
    >
      <div style={{ display: "grid", gap: 12 }}>
        <div>
          <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 900, marginBottom: 6 }}>Audience</div>
          <select value={audience} onChange={e => setAudience(e.target.value as any)}>
            <option value="adult">Adult</option>
            <option value="junior">Junior</option>
          </select>
        </div>

        <div>
          <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 900, marginBottom: 6 }}>Focus</div>
          <input value={focus} onChange={e => setFocus(e.target.value)} />
        </div>

        <div>
          <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 900, marginBottom: 6 }}>Video</div>
          <input type="file" accept="video/*" onChange={e => setFile(e.target.files?.[0])} />
        </div>

        <button onClick={go} disabled={!file} style={{ fontWeight: 900 }}>Continue → Report</button>

        <div style={{ fontSize: 12, opacity: 0.7 }}>
          Investor shortcut: <a href="/investor-demo" style={{ color: "#b9cff6" }}>Investor Demo</a>
        </div>
      </div>
    </Shell>
  );
}
