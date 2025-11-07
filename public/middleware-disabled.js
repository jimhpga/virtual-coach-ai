// middleware.js
import { NextResponse } from 'next/server';

const PROTECT_PATHS = [
  '/report.html',
  '/summary.html',
  // add others if you like
];

// Donâ€™t block these (debug/health)
const OPEN_PATHS = ['https://api.virtualcoachai.net/api/health', 'https://api.virtualcoachai.net/api/env-check', 'https://api.virtualcoachai.net/api/frames', 'https://api.virtualcoachai.net/api/frames-zip', 'https://api.virtualcoachai.net/api/healthz'];

export function middleware(req) {
  const { pathname } = new URL(req.url);

  if (OPEN_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }
  if (!PROTECT_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const auth = req.headers.get('authorization') || '';
  const [scheme, b64] = auth.split(' ');
  const good = scheme === 'Basic' && b64;

  const user = process.env.BASIC_AUTH_USER || '';
  const pass = process.env.BASIC_AUTH_PASS || '';
  const expected = Buffer.from(`${user}:${pass}`).toString('base64');

  if (good && b64 === expected) return NextResponse.next();

  return new NextResponse('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="VirtualCoachAI"' }
  });
}

export const config = {
  matcher: [
    '/report.html',
    '/summary.html',
    // add more paths if needed, e.g. '/index.html'
  ]
};
