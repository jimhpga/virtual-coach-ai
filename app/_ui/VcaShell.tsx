import Link from "next/link";
import React from "react";

type Props = {
  title?: string;
  subtitle?: string;
  rightNav?: React.ReactNode;
  children: React.ReactNode;
};

export default function VcaShell({ title, subtitle, rightNav, children }: Props) {
  return (
    <div className="vca-bg">
      <div className="vca-wrap">
        <header className="vca-topbar">
          <Link href="/" className="vca-brand" aria-label="Virtual Coach AI home">
            <img
              src="/brand/vca-logo.png"
              alt="Virtual Coach AI"
              className="vca-logo"
            />
            <div className="vca-brandText">
              <div className="vca-brandTitle">Virtual Coach AI</div>
              <div className="vca-brandSub">Upload • Analyze • Improve</div>
            </div>
          </Link>

          <nav className="vca-nav">
            {rightNav ?? (
              <>
                <Link className="vca-pill" href="/upload">Upload Swing</Link>
                <Link className="vca-pill" href="/coming-soon">Coming Soon</Link>
                <Link className="vca-pill" href="/report-beta/full">View Demo Report</Link>
              </>
            )}
          </nav>
        </header>

        <main className="vca-main">
          {(title || subtitle) && (
            <div className="vca-heroCard">
              {title && <h1 className="vca-h1">{title}</h1>}
              {subtitle && <p className="vca-sub">{subtitle}</p>}
            </div>
          )}

          {children}
        </main>

        <footer className="vca-foot">
          © Virtual Coach AI — internal demo build
        </footer>
      </div>
    </div>
  );
}
