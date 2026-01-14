import { useEffect } from "react";

export default function DemoRedirect() {
  useEffect(() => {
    // One-link demo: goes straight into upload with demo mode on
    window.location.href = "/upload?demo=1";
  }, []);

  return null;
}
