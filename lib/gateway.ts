/**
 * Gateway client for communicating with the OpenClaw gateway
 */

const GATEWAY_URL = process.env.GATEWAY_URL || "http://127.0.0.1:18789";
const GATEWAY_TOKEN = process.env.GATEWAY_TOKEN || "";

interface GatewayRPCRequest {
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
  const response = await fetch(`${GATEWAY_URL}/rpc`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(GATEWAY_TOKEN && { Authorization: `Bearer ${GATEWAY_TOKEN}` }),
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method,
      params,
    } as GatewayRPCRequest & { jsonrpc: string; id: number }),
  });

  if (!response.ok) {
    throw new Error(`Gateway RPC failed: ${response.statusText}`);
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
  parameters: Record<string, any>
): Promise<any> {
  const response = await fetch(`${GATEWAY_URL}/tools/invoke`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(GATEWAY_TOKEN && { Authorization: `Bearer ${GATEWAY_TOKEN}` }),
    },
    body: JSON.stringify({
      tool,
      parameters,
    }),
  });

  if (!response.ok) {
    throw new Error(`Gateway tool invoke failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Health check
 */
export async function gatewayHealth() {
  return gatewayCall("health");
}
