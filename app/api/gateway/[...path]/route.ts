import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const GATEWAY_URL = process.env.GATEWAY_URL || "http://127.0.0.1:18789";
const GATEWAY_TOKEN = process.env.GATEWAY_TOKEN || "";

/**
 * BFF proxy to the OpenClaw gateway
 * All requests are authenticated via NextAuth
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleGatewayProxy(request, params.path);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleGatewayProxy(request, params.path);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleGatewayProxy(request, params.path);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleGatewayProxy(request, params.path);
}

async function handleGatewayProxy(
  request: NextRequest,
  pathSegments: string[]
) {
  // Check authentication
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Build gateway URL
  const path = pathSegments.join("/");
  const url = new URL(request.url);
  const gatewayUrl = `${GATEWAY_URL}/${path}${url.search}`;

  try {
    // Forward request to gateway
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (GATEWAY_TOKEN) {
      headers["Authorization"] = `Bearer ${GATEWAY_TOKEN}`;
    }

    const body = request.method !== "GET" ? await request.text() : undefined;

    const response = await fetch(gatewayUrl, {
      method: request.method,
      headers,
      body,
    });

    const data = await response.text();
    
    return new NextResponse(data, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "application/json",
      },
    });
  } catch (error) {
    console.error("Gateway proxy error:", error);
    return NextResponse.json(
      { error: "Gateway communication failed" },
      { status: 502 }
    );
  }
}
