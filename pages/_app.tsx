import type { AppProps } from "next/app";

export default function App({ Component, pageProps }: AppProps) {
  const shell: React.CSSProperties = {
    minHeight: "100vh",
    // Global golf-course vibe (same family as report/upload)
    background:
      "radial-gradient(1100px 700px at 30% 10%, rgba(34,197,94,0.10), transparent 60%), radial-gradient(900px 600px at 90% 10%, rgba(59,130,246,0.10), transparent 55%), #050b16",
    color: "#e6edf6",
  };

  return (
    <div style={shell}>
      <Component {...pageProps} />
    </div>
  );
}
