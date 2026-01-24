import { redirect } from "next/navigation";

export default async function ReportBetaPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = new URLSearchParams();

  // Pass through any query params (golden, src, etc.)
  const spObj = searchParams ? await searchParams : undefined;
  if (spObj) {
    for (const [k, v] of Object.entries(spObj)) {
      if (Array.isArray(v)) v.forEach((x) => x != null && sp.append(k, String(x)));
      else if (v != null) sp.set(k, String(v));
    }
  }

  const qs = sp.toString();
  redirect(`/report-beta/full${qs ? `?${qs}` : ""}`);
}


