import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = (await req.json()) as HandleUploadBody;

  try {
    const json = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => {
        return {
          allowedContentTypes: [
            "video/mp4",
            "video/quicktime",
            "video/x-m4v",
                                  ],
          maximumSizeInBytes: 500 * 1024 * 1024, // 500MB
          addRandomSuffix: true, // ✅ unique filenames
        };
      },
      onUploadCompleted: async ({ blob }) => {
        console.log("Upload completed:", blob.url);
      },
    });

    return NextResponse.json(json);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Blob upload failed" },
      { status: 400 }
    );
  }
}





