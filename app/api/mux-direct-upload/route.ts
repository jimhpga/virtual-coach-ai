import Mux from "@mux/mux-node";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const tokenId = process.env.MUX_TOKEN_ID;
    const tokenSecret = process.env.MUX_TOKEN_SECRET;

    if (!tokenId || !tokenSecret) {
      return Response.json(
        { ok: false, error: "Missing MUX_TOKEN_ID or MUX_TOKEN_SECRET on server" },
        { status: 500 }
      );
    }

    const mux = new Mux({ tokenId, tokenSecret });

    const upload = await mux.video.uploads.create({
      cors_origin: "https://virtualcoachai.net",
      new_asset_settings: {
        playback_policy: ["public"],
      },
    });

    return Response.json({ ok: true, uploadId: upload.id, uploadUrl: upload.url });
  } catch (e: any) {
    return Response.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}
