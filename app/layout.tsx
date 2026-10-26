import "../styles/globals.css";
import "./vca-shell.css";
export const metadata = {
  title: "Virtual Coach AI | Golf Swing Analysis",
  description: "Upload one golf swing and get P1-P10 motion analysis, priority fixes, power opportunities, and a clear practice plan.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning={true} className="vca-bg">{children}</body>
    </html>
  )
}




