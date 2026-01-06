import Mux from "@mux/mux-node";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

export async function POST(req: Request) {
  try {
    const { uploadId } = await req.json();
    if (!uploadId) {
      return Response.json({ ok: false, error: "Missing uploadId" }, { status: 400 });
    }

    const upload = await mux.video.uploads.retrieve(uploadId);

    const assetId = upload.asset_id ?? null;
    let playbackId: string | null = null;

    if (assetId) {
      const asset = await mux.video.assets.retrieve(assetId);
      playbackId = asset.playback_ids?.[0]?.id ?? null;
    }

    return Response.json({
      ok: true,
      status: upload.status,
      assetId,
      playbackId,
    });
  } catch (e: any) {
    return Response.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
