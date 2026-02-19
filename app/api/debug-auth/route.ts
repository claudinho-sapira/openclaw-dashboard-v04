import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    AUTH_USERNAME: process.env.AUTH_USERNAME || "(not set)",
    AUTH_PASSWORD_LENGTH: (process.env.AUTH_PASSWORD || "").length,
    AUTH_PASSWORD_FIRST3: (process.env.AUTH_PASSWORD || "").slice(0, 3),
    AUTH_SECRET_SET: !!process.env.AUTH_SECRET,
    NEXTAUTH_SECRET_SET: !!process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || "(not set)",
    GATEWAY_URL: process.env.GATEWAY_URL ? "SET" : "(not set)",
    NEXT_PUBLIC_GATEWAY_URL: process.env.NEXT_PUBLIC_GATEWAY_URL ? "SET" : "(not set)",
  })
}
