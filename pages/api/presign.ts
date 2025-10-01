import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  // req.body has { s3_key, name, type, size } – keep if you want to log
  return res.status(200).json({
    ok: true,
    viewerUrl: "/report?report=/docs/reports/sample.viewer.json"
  });
}
