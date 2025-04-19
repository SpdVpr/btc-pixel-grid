import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Pokračování s normálním zpracováním požadavku
  return NextResponse.next();
}

// Konfigurace middleware - spustí se pouze pro API požadavky
export const config = {
  matcher: '/api/:path*',
};