import { NextResponse } from "next/server";
import { VCA_3D_RELEASE } from "../../../lib/vca3d/release";

export const dynamic = "force-static";

export async function GET() {
  return NextResponse.json(VCA_3D_RELEASE);
}
