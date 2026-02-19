import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { gatewayInvokeTool } from "@/lib/gateway";

// GET - Read openclaw.json config via gateway read tool
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await gatewayInvokeTool("read", {
      file_path: "~/.openclaw/openclaw.json",
    });

    // result.content[0].text has the file content
    const rawText = result?.content?.[0]?.text || "";
    let config;
    try {
      config = JSON.parse(rawText);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse config JSON", raw: rawText },
        { status: 500 }
      );
    }

    return NextResponse.json({ config, raw: rawText });
  } catch (error) {
    console.error("Failed to read config:", error);
    return NextResponse.json(
      {
        error: "Failed to read config from gateway",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 502 }
    );
  }
}

// POST - Write config back via gateway write tool
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { config } = body;

    if (!config) {
      return NextResponse.json({ error: "config is required" }, { status: 400 });
    }

    // Validate it's valid JSON
    const configStr = JSON.stringify(config, null, 2);

    const result = await gatewayInvokeTool("write", {
      file_path: "~/.openclaw/openclaw.json",
      content: configStr,
    });

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("Failed to write config:", error);
    return NextResponse.json(
      {
        error: "Failed to write config to gateway",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 502 }
    );
  }
}
