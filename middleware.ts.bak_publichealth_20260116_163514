import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Public routes (no auth)
const PUBLIC_EXACT = new Set<string>([
  "/",              // landing
  "/upload",        // upload page
  
]);

const PUBLIC_PREFIXES: string[] = [
  "/_next/",
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",

  // public demo pages/assets
  "/pose-demo",
  "/report-beta",
  "/data/",
  "/frames/",
  "/impact/",
  "/uploads/",

  // common static images
  "/report-bg.png",
  "/golf-course-bg.jpg",
  "/golf_bg.jpg",
  "/homepage-background.png",
  "/virtualcoach-bg.png",
];

export function middleware(req: NextRequest) {
/* Always allow public/static assets */
  const p = req.nextUrl.pathname;

  // Public assets (served from /public)
  if (p.startsWith('/bg/')) return NextResponse.next();

  // Next internals + common public files
  if (
    p.startsWith('/_next/') ||
    p.startsWith('/favicon.ico') ||
    p.startsWith('/robots.txt') ||
    p.startsWith('/sitemap.xml') ||
    p.startsWith('/manifest.json') ||
    p.startsWith('/icons/') ||
    p.startsWith('/images/')
  ) {
    return NextResponse.next();
  }

  // If your upload uses an API route, don't block it
  if (p.startsWith('/api/')) return NextResponse.next();


  // === VCA_PUBLIC_BYPASS_BLOCK ===
  // Allow landing + upload + report without auth (dev/demo)
  const __p = req.nextUrl.pathname;
  if (
    __p === "/" ||
    __p === "/upload" || __p.startsWith("/upload/") ||
    __p === "/report" || __p.startsWith("/report/") ||
    __p === "/report-beta" || __p.startsWith("/report-beta/") ||
    __p === "/investor-demo" || __p.startsWith("/investor-demo/") ||
    __p === "/sequencing-truth" || __p.startsWith("/sequencing-truth/") ||
    __p === "/login" || __p.startsWith("/login/") ||
    __p.startsWith("/_next/") ||
    __p.startsWith("/frames/") ||
    __p.startsWith("/data/") ||
    __p.startsWith("/uploads/") ||
       __p === "/favicon.ico" ||    __p === "/robots.txt" ||    __p === "/sitemap.xml"
  ) {
    return NextResponse.next();
  }
  // === END VCA_PUBLIC_BYPASS_BLOCK ===

  const url = req.nextUrl;
  const path = url.pathname;

  // OK Never touch API routes (preserve Range/streaming headers)
  if (path.startsWith("/api/")) return NextResponse.next();

  // OK Allow public exact routes
  if (PUBLIC_EXACT.has(path)) return NextResponse.next();

  // OK Allow public prefixes
  if (PUBLIC_PREFIXES.some((p) => path.startsWith(p))) {
    // Keep golden demo special-case (still allowed anyway because /report-beta prefix is public)
    return NextResponse.next();
  }

  // OK Golden demo mode (extra-safe explicit allow)
  if (path === "/report-beta" && url.searchParams.get("golden") === "1") {
    return NextResponse.next();
  }

  // ---- AUTH GATE ----
  // Minimal default: require a cookie "vca_auth=1"
  const authed = req.cookies.get("vca_auth")?.value === "1";
  if (!authed) {
    const login = new URL("/login", req.url);
    login.searchParams.set("next", path + (url.search || ""));
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  // Only non-API routes (API is handled above too)
  matcher: ["/((?!api).*)"],
};







