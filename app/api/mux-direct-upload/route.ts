import Mux from "@mux/mux-node";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

export async function POST() {
  const upload = await mux.video.uploads.create({
    cors_origin: "https://virtualcoachai.net",
    new_asset_settings: {
      playback_policy: ["public"],
      mp4_support: "standard",
    },
  });

  return Response.json({
    ok: true,
    uploadId: upload.id,
    uploadUrl: upload.url,
  });
}
