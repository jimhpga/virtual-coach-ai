import "../styles/globals.css";
import "../styles/environment.css";
import TopNav from "./_components/TopNav";

export const metadata = {
  title: "Virtual Coach AI",
  description: "Virtual Coach AI",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
        <body>
    <div className="vcaEnv">
      <TopNav />
      <main className="vcaShell">
        <div className="vcaGlass">
          {children}
        </div>
      </main>
    </div>
  </body>
    </html>
  );
}


