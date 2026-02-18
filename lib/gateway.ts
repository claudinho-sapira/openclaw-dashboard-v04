/**
 * Gateway client for communicating with the OpenClaw gateway
 */

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || process.env.GATEWAY_URL;
const GATEWAY_TOKEN = process.env.GATEWAY_TOKEN;

if (!GATEWAY_URL) {
  console.warn("⚠️ GATEWAY_URL not configured");
}

if (!GATEWAY_TOKEN) {
  console.warn("⚠️ GATEWAY_TOKEN not configured");
}

interface ToolInvokeRequest {
  tool: string;
  arguments?: Record<string, any>;
}

interface ToolInvokeResponse<T = any> {
  ok: boolean;
  result?: T;
  error?: string;
}

/**
 * Invoke a gateway tool via /tools/invoke
 */
export async function gatewayInvokeTool<T = any>(
  tool: string,
  args?: Record<string, any>
): Promise<T> {
  if (!GATEWAY_URL) {
    throw new Error("Gateway URL not configured. Set NEXT_PUBLIC_GATEWAY_URL environment variable.");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (GATEWAY_TOKEN) {
    headers["Authorization"] = `Bearer ${GATEWAY_TOKEN}`;
  }

  const body: ToolInvokeRequest = {
    tool,
    arguments: args,
  };

  const response = await fetch(`${GATEWAY_URL}/tools/invoke`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gateway tool invoke failed (${response.status}): ${text}`);
  }

  const data: ToolInvokeResponse<T> = await response.json();

  if (!data.ok) {
    throw new Error(data.error || "Tool invocation failed");
  }

  return data.result as T;
}

/**
 * Legacy RPC-style call (for backwards compatibility)
 * Translates to tool invocations
 */
export async function gatewayCall<T = any>(
  method: string,
  params?: Record<string, any>
): Promise<T> {
  // Map RPC-style methods to tool invocations
  const methodMap: Record<string, { tool: string; transform?: (p: any) => any }> = {
    "health": { tool: "session_status" },
    "agents.list": { tool: "sessions_list", transform: (p) => ({ limit: 100 }) },
    "logs.query": { tool: "sessions_list", transform: (p) => ({ limit: 50, messageLimit: 100 }) },
    "workspace.list": { tool: "sessions_list" },
    "workspace.read": { tool: "read", transform: (p) => ({ file_path: p.file }) },
    "workspace.write": { tool: "write", transform: (p) => ({ file_path: p.file, content: p.content }) },
    "config.get": { tool: "session_status" },
    "config.patch": { tool: "session_status" },
  };

  const mapping = methodMap[method];
  if (!mapping) {
    throw new Error(`Unknown RPC method: ${method}`);
  }

  const args = mapping.transform ? mapping.transform(params) : params;
  return gatewayInvokeTool<T>(mapping.tool, args);
}

/**
 * Health check
 */
export async function checkGatewayHealth(): Promise<{
  ok: boolean;
  version?: string;
  uptime?: number;
}> {
  try {
    const result = await gatewayInvokeTool<any>("session_status");
    return {
      ok: true,
      version: "2026.2.6", // Parse from result if available
      uptime: 0,
    };
  } catch (error) {
    return {
      ok: false,
    };
  }
}
