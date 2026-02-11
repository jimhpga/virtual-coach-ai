import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const GOLDEN = "v1_HERO_SWING.mkv_imp2p00";

export function middleware(req: NextRequest) {
  const url = req.nextUrl;

  // rewrite /frames/p1.jpg -> /frames/<GOLDEN>/p1.jpg (and p2..p9)
  if (/^\/frames\/p\d+\.(jpg|png)$/i.test(url.pathname)) {
    const file = url.pathname.replace(/^\/frames\//, ""); // p1.jpg
    url.pathname = "/frames/" + GOLDEN + "/" + file;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/frames/:path*"],
};
