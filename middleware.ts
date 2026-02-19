import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isLoggedIn = !!req.auth

  // Always allow API, auth, and showcase routes
  if (pathname.startsWith("/api") || pathname.startsWith("/auth") || pathname.startsWith("/showcase")) {
    return NextResponse.next()
  }

  // Redirect to login if not authenticated
  if (!isLoggedIn) {
    const signInUrl = new URL("/auth/signin", req.url)
    signInUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(signInUrl)
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    "/((?!_next|_static|_vercel|favicon.ico|sitemap.xml|robots.txt|.*\\..*).*)",
  ],
}
