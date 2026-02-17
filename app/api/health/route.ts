import { NextResponse } from "next/server";
import { gatewayHealth } from "@/lib/gateway";

export async function GET() {
  try {
    const health = await gatewayHealth();
    return NextResponse.json({ status: "ok", gateway: health });
  } catch (error) {
    return NextResponse.json(
      { status: "error", message: "Gateway unavailable" },
      { status: 502 }
    );
  }
}
