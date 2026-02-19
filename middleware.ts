// Middleware disabled for v0.3 design system phase
// Will re-enable when auth is needed

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [],
}
