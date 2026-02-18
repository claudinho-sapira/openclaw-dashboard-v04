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

interface GatewayRPCRequest {
  jsonrpc: string;
  id: number;
  method: string;
  params?: Record<string, any>;
}

interface GatewayRPCResponse<T = any> {
  result?: T;
  error?: {
    code: number;
    message: string;
  };
}

/**
 * Call a gateway RPC method
 */
export async function gatewayCall<T = any>(
  method: string,
  params?: Record<string, any>
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

  const response = await fetch(`${GATEWAY_URL}/rpc`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method,
      params: params || {},
    } as GatewayRPCRequest),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(`Gateway RPC failed (${response.status}): ${errorText}`);
  }

  const data: GatewayRPCResponse<T> = await response.json();

  if (data.error) {
    throw new Error(`Gateway RPC error: ${data.error.message}`);
  }

  return data.result as T;
}

/**
 * Invoke a tool via /tools/invoke
 */
export async function gatewayInvokeTool(
  tool: string,
  parameters: Record<string, any> = {}
): Promise<any> {
  if (!GATEWAY_URL) {
    throw new Error("Gateway URL not configured. Set NEXT_PUBLIC_GATEWAY_URL environment variable.");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (GATEWAY_TOKEN) {
    headers["Authorization"] = `Bearer ${GATEWAY_TOKEN}`;
  }

  const response = await fetch(`${GATEWAY_URL}/tools/invoke`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      tool,
      parameters,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(`Gateway tool invoke failed (${response.status}): ${errorText}`);
  }

  return response.json();
}

/**
 * Health check
 */
export async function gatewayHealth() {
  return gatewayCall("health");
}
