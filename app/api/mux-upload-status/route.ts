import Mux from "@mux/mux-node";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

export async function POST(req: Request) {
  const { uploadId } = await req.json();
  const upload = await mux.video.uploads.retrieve(uploadId);

  return Response.json({
    ok: true,
    status: upload.status,
    assetId: upload.asset_id ?? null,
  });
}
