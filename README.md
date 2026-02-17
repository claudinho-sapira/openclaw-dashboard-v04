# OpenClaw Dashboard

Web-based management dashboard for OpenClaw agents (Luna, Bolt, Iris).

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **UI:** ShadCN + Tailwind CSS
- **Auth:** NextAuth.js (Google OAuth)
- **Hosting:** Vercel
- **Gateway:** Cloudflare Tunnel

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

Required variables:
- `NEXTAUTH_SECRET` - Generate with: `openssl rand -base64 32`
- `NEXTAUTH_URL` - Your app URL (e.g., `http://localhost:3000`)
- `GOOGLE_CLIENT_ID` - From Google Cloud Console
- `GOOGLE_CLIENT_SECRET` - From Google Cloud Console
- `GATEWAY_URL` - Cloudflare Tunnel URL or `http://127.0.0.1:18789` for local
- `GATEWAY_TOKEN` - Gateway authentication token

### 3. Setup Cloudflare Tunnel

See [CLOUDFLARE_SETUP.md](./CLOUDFLARE_SETUP.md) for detailed instructions.

Quick start (temporary tunnel):

```bash
cloudflared tunnel --url http://127.0.0.1:18789
```

Use the output URL as `GATEWAY_URL` in `.env.local`.

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use existing)
3. Enable Google+ API
4. Go to Credentials → Create Credentials → OAuth 2.0 Client ID
5. Configure consent screen with:
   - App name: OpenClaw Dashboard
   - Authorized domain: Your domain
6. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://your-vercel-domain.vercel.app/api/auth/callback/google`
7. Copy Client ID and Client Secret to `.env.local`

## Architecture

```
Browser → Next.js (Vercel) → BFF API Routes → Cloudflare Tunnel → Gateway (127.0.0.1:18789)
```

### BFF Proxy Layer

All gateway communication goes through Next.js API routes at `/api/gateway/[...path]`:

- Handles authentication (NextAuth session check)
- Proxies requests to gateway via Cloudflare Tunnel
- Adds gateway Bearer token authentication
- Isolates gateway from direct browser access

## Project Structure

```
openclaw-dashboard/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/    # NextAuth handlers
│   │   ├── gateway/[...path]/     # BFF proxy to gateway
│   │   └── health/                # Health check endpoint
│   ├── auth/
│   │   ├── signin/                # Google OAuth sign-in page
│   │   └── error/                 # Auth error page
│   ├── globals.css                # Tailwind + ShadCN styles
│   ├── layout.tsx                 # Root layout
│   └── page.tsx                   # Dashboard home
├── components/                    # React components
├── lib/
│   ├── auth.ts                    # NextAuth config
│   ├── gateway.ts                 # Gateway client
│   └── utils.ts                   # Utility functions
├── .env.example                   # Environment variable template
├── CLOUDFLARE_SETUP.md            # Tunnel setup guide
└── PRD.md                         # Product requirements doc
```

## Deployment

### Vercel

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

Vercel will automatically:
- Deploy on every push to `main`
- Create preview deployments for PRs
- Set up custom domains

### Environment Variables (Vercel)

Add all variables from `.env.example` in Vercel dashboard:
- Settings → Environment Variables
- Add production values
- Redeploy after adding variables

## Security

- ✅ Google OAuth with domain restriction (@sapira.ai)
- ✅ Bearer token authentication to gateway
- ✅ BFF pattern (no direct gateway access from browser)
- ✅ Loopback-only gateway (127.0.0.1)
- ✅ Cloudflare Tunnel (encrypted, no port forwarding)

## Development

### Running Tests

```bash
npm test
```

### Linting

```bash
npm run lint
```

### Building

```bash
npm run build
npm start
```

## Tickets

See Linear for active tickets:
- SAP-4: Project scaffolding (✅ Current)
- SAP-5: Dashboard home
- SAP-6: Agent detail page
- SAP-7: Kanban board

## Team

- **PM:** Luna 🎯
- **Builder:** Bolt 🔨
- **QA:** Iris 🔍

## License

Proprietary - Sapira AI
