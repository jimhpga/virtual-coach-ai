// app/layout.tsx
import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "Virtual Coach AI",
  description: "Upload one swing. Get a plan. Train smarter.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header style={{padding:"14px 18px", borderBottom:"1px solid #222"}}>
          <nav style={{display:"flex", gap:18, alignItems:"center"}}>
            <b>Virtual Coach AI</b>
            <Link href="/">Home</Link>
            <Link href="/upload">Upload</Link>
            <Link href="/report">Reports</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/faq">FAQ</Link>
            <Link href="/contact">Contact</Link>
          </nav>
        </header>
        <main style={{maxWidth:1200, margin:"32px auto", padding:"0 20px"}}>{children}</main>
      </body>
    </html>
  );
}
