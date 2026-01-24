import { PDescriptionsCollapsed } from "../../components/PDescriptionsCollapsed";
import fs from "fs";
import path from "path";
import ReportBetaClient from "./ReportBetaClient";

type SP = {
  ok?: string;
  videoUrl?: string;
  pathname?: string;
  localPath?: string;
  golden?: string;
};

export default async function ReportBetaPage(props: any) {
  const sp = (await (props.searchParams as any)) as SP;

  const golden = sp?.golden === "1";
  const ok = sp?.ok === "1" || golden;

  // Default inputs
  let videoUrl = typeof sp?.videoUrl === "string" ? sp.videoUrl : "";
  let pathname = typeof sp?.pathname === "string" ? sp.pathname : "";
  let localPath = typeof sp?.localPath === "string" ? sp.localPath : "";

  // Golden-mode: pull the latest pinned report from /golden and use its localPath
  let initialReport: any = null;

  if (golden) {
    try {
      const root = process.cwd();
      const rptFile = fs.readFileSync(path.join(root, "golden", "GOLDEN_REPORT_FILE.txt"), "utf8").trim();
      const rptPath = path.join(root, "golden", "reports", rptFile);
      const raw = fs.readFileSync(rptPath, "utf8");
      initialReport = JSON.parse(raw);

      // Prefer report.meta.source.localPath (your JSON has it)
      localPath =
        (initialReport?.meta?.source?.localPath as string) ||
        (initialReport?.report?.meta?.source?.localPath as string) ||
        localPath;

      // If your JSON is wrapped { ok, report: {...} }, unwrap it
      if (initialReport?.report) initialReport = initialReport.report;
    } catch (e) {
      // fall through; client will show the missing-source error
      console.error("Golden load failed:", e);
    }
  }

  if (!ok) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Report Beta</h1>
        <p>Missing ok flag. Append <code>?ok=1</code> to the URL.</p>
      </main>
    );
  }

  return (
    <ReportBetaClient
      ok={ok}
      videoUrl={videoUrl}
      pathname={pathname}
      localPath={localPath}
      initialReport={initialReport}
      golden={golden}
    />
  );
}







