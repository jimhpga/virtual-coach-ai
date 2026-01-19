import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Public/static paths (do NOT force auth)
  if (
    pathname.startsWith("/golden") ||
    pathname.startsWith("/frames") ||
    pathname.startsWith("/uploads") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // Default: allow everything else through.
  // (If you want auth gating, we'll add it back cleanly AFTER golden works.)
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api).*)"],
};
