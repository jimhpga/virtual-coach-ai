// app/contact/page.tsx
"use client";
import { useState } from "react";

export default function ContactPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [sent, setSent] = useState(false);

  async function submit() {
    // send to your email service or a future /api/contact
    setSent(true);
  }

  return (
    <section className="grid" style={{gap:12, maxWidth:600}}>
      <h1 className="h-lg">Contact</h1>
      <input placeholder="Your email" value={email} onChange={e=>setEmail(e.target.value)} />
      <textarea placeholder="How can we help?" value={msg} onChange={e=>setMsg(e.target.value)} rows={6} />
      <button className="btn" onClick={submit}>Send</button>
      {sent && <div className="k">Thanks — we’ll reply soon.</div>}
    </section>
  );
}
