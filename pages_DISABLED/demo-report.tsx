// pages/demo-report.tsx
import { useEffect } from "react";
import BrandShell from "../components/BrandShell";
import { useRouter } from "next/router";

/**
 * Simple helper page:
 * /demo-report -> redirects to the main report viewer
 * using the demo JSON at /reports/demo/report.json
 */
export default function DemoReportRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/report?report=reports/demo/report.json");
  }, [router]);

  return null;
}
