# Cloudflare Tunnel Setup

This document explains how to expose the OpenClaw gateway (running on `127.0.0.1:18789`) to Vercel via Cloudflare Tunnel.

## Why Cloudflare Tunnel?

- The gateway runs on loopback (`127.0.0.1:18789`) for security
- Vercel needs remote access to the gateway
- Cloudflare Tunnel provides secure, zero-config tunneling without exposing ports

## Installation

### macOS (Homebrew)

```bash
brew install cloudflared
```

### Manual Download

Download from: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/

## Quick Start (Temporary Tunnel)

For development/testing, create a temporary tunnel:

```bash
cloudflared tunnel --url http://127.0.0.1:18789
```

This will output a URL like: `https://random-words-123.trycloudflare.com`

Use this URL as `GATEWAY_URL` in your `.env.local` file.

**Note:** Temporary tunnels expire after inactivity. For production, use a named tunnel.

## Production Setup (Named Tunnel)

### 1. Login to Cloudflare

```bash
cloudflared login
```

### 2. Create a Named Tunnel

```bash
cloudflared tunnel create openclaw-gateway
```

This creates a tunnel and saves credentials to `~/.cloudflared/`

### 3. Create Config File

Create `~/.cloudflared/config.yml`:

```yaml
tunnel: <TUNNEL_ID>
credentials-file: /Users/claudinho/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: openclaw-gateway.sapira.ai
    service: http://127.0.0.1:18789
  - service: http_status:404
```

### 4. Route Traffic

```bash
cloudflared tunnel route dns openclaw-gateway openclaw-gateway.sapira.ai
```

### 5. Run the Tunnel

```bash
cloudflared tunnel run openclaw-gateway
```

### 6. Run as a Service (macOS)

Install as a service:

```bash
sudo cloudflared service install
```

Start the service:

```bash
sudo launchctl start com.cloudflare.cloudflared
```

## Environment Variables

Update `.env.local` with your tunnel URL:

```bash
GATEWAY_URL=https://openclaw-gateway.sapira.ai
GATEWAY_TOKEN=your-gateway-token
```

## Testing

Test the tunnel:

```bash
curl https://openclaw-gateway.sapira.ai/health
```

## Troubleshooting

### Tunnel not connecting

Check if the gateway is running:

```bash
openclaw gateway status
```

Check tunnel logs:

```bash
cloudflared tunnel info openclaw-gateway
```

### 502 Bad Gateway

- Verify gateway is running on `127.0.0.1:18789`
- Check `config.yml` points to correct port
- Restart tunnel: `sudo launchctl restart com.cloudflare.cloudflared`

### Authentication errors

- Verify `GATEWAY_TOKEN` matches gateway config
- Check gateway logs: `openclaw gateway logs`

## Security Notes

- Always use Bearer token authentication (`GATEWAY_TOKEN`)
- Restrict gateway access via Cloudflare Access (optional)
- Never expose `127.0.0.1:18789` directly to the internet
- Rotate `GATEWAY_TOKEN` regularly

## References

- Cloudflare Tunnel Docs: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/
- OpenClaw Gateway: `/opt/homebrew/lib/node_modules/openclaw/docs/GATEWAY.md`
