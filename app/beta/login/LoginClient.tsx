"use client";

import { useSearchParams, useRouter } from "next/navigation";

export default function LoginClient() {
  const sp = useSearchParams();
  const router = useRouter();

  const raw = sp.get("next") || "/report-beta?ok=1";
  let next = raw;

  try {
    next = decodeURIComponent(raw);
  } catch {
    // ignore
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>Login</h1>
      <p>After login, go to: <code>{next}</code></p>

      <button
        onClick={() => router.push(next)}
        style={{ marginTop: 16, padding: "8px 16px" }}
      >
        Fake Login (Continue)
      </button>
    </div>
  );
}
