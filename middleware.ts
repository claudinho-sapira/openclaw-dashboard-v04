import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isLoggedIn = !!req.auth

  // Public paths that don't require auth
  const publicPaths = [
    "/",
  ]

  // Check if path is API or auth route (always allow)
  const isApiRoute = pathname.startsWith("/api")
  const isAuthRoute = pathname.startsWith("/auth")
  
  // Check if current path is public
  const isPublicPath = publicPaths.includes(pathname)

  // Allow API and auth routes
  if (isApiRoute || isAuthRoute) {
    return NextResponse.next()
  }

  // Redirect to login if not authenticated and trying to access protected route
  if (!isLoggedIn && !isPublicPath) {
    const signInUrl = new URL("/auth/signin", req.url)
    signInUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(signInUrl)
  }

  // Allow the request to continue
  return NextResponse.next()
})

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - /_next/* (Next.js internals)
     * - /favicon.ico, /sitemap.xml, /robots.txt (static files)
     * - Static assets (images, fonts, etc.)
     */
    "/((?!_next|_static|_vercel|favicon.ico|sitemap.xml|robots.txt|.*\\..*).*)",
  ],
}
