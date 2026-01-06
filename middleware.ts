import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow the login page + its API (otherwise infinite redirect loop)
  if (pathname === "/beta/login" || pathname.startsWith("/beta/login/")) {
    return NextResponse.next();
  }

  // Gate only these routes
  const needsGate =
    pathname === "/beta" ||
    pathname.startsWith("/beta/") ||
    pathname === "/report-beta" ||
    pathname.startsWith("/report-beta/");

  if (!needsGate) return NextResponse.next();

  // already authed?
  const authed = req.cookies.get("vca_beta")?.value === "true";
  if (authed) return NextResponse.next();

  // send to login
  const url = req.nextUrl.clone();
  url.pathname = "/beta/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/beta/:path*", "/report-beta/:path*"],
};
