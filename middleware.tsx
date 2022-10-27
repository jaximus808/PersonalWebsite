// middleware.ts with Next.js
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default function middleware(request: NextRequest) {
  return NextResponse.redirect(new URL('/about-2', request.url));
}
// config with custom matcher
export const config = {
  matcher: '/about/:path*',
};
