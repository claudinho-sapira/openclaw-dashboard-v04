# Vercel Deploy Instructions

## Prerequisites

1. Vercel account (claudinho-sapira or Sapira team account)
2. Cloudflare Tunnel running on Mac mini (for GATEWAY_URL)
3. Google OAuth credentials (for auth)

## Step 1: Login to Vercel

```bash
cd /Users/claudinho/.openclaw/workspace-builder/openclaw-dashboard
npx vercel login
```

Follow the OAuth flow in your browser.

## Step 2: Link Project (First Deploy)

```bash
npx vercel link
```

Select:
- Scope: Your team/account
- Link to existing project? **No** (create new)
- Project name: `openclaw-dashboard`
- Directory: `.` (current)

## Step 3: Set Environment Variables

Run these commands to set production environment variables:

```bash
# Generate NEXTAUTH_SECRET
npx vercel env add NEXTAUTH_SECRET production
# Paste the generated secret (see below)

# Set NEXTAUTH_URL
npx vercel env add NEXTAUTH_URL production
# Paste: https://openclaw-dashboard.vercel.app (or your custom domain)

# Set GATEWAY_URL (Cloudflare Tunnel)
npx vercel env add GATEWAY_URL production
# Paste: https://your-tunnel-url.trycloudflare.com (or custom domain)

# Set GATEWAY_TOKEN
npx vercel env add GATEWAY_TOKEN production
# Paste: Your gateway authentication token

# Set Google OAuth credentials
npx vercel env add GOOGLE_CLIENT_ID production
# Paste: Your Google Client ID

npx vercel env add GOOGLE_CLIENT_SECRET production
# Paste: Your Google Client Secret

# Set DATABASE_URL
npx vercel env add DATABASE_URL production
# Paste: file:./prisma/dev.db
```

## Step 4: Deploy to Production

```bash
npx vercel --prod
```

Wait for build to complete (~2-3 minutes).

## Step 5: Get Production URL

After deploy completes, Vercel will output:

```
✅  Production: https://openclaw-dashboard-xxxx.vercel.app [copied to clipboard]
```

## Generated Secrets

### NEXTAUTH_SECRET (Generate new one)
```bash
openssl rand -base64 32
```

Example output: `ABCxyz123...` (use this value)

## Google OAuth Setup

If you haven't set up Google OAuth yet:

1. Go to https://console.cloud.google.com/
2. Create OAuth 2.0 credentials
3. Add authorized redirect URIs:
   - `https://openclaw-dashboard.vercel.app/api/auth/callback/google`
   - `https://your-custom-domain.com/api/auth/callback/google`
4. Copy Client ID and Secret

## Cloudflare Tunnel

Make sure Cloudflare Tunnel is running on Mac mini:

```bash
# On Mac mini
cloudflared tunnel --url http://127.0.0.1:18789
```

Or for named tunnel:
```bash
cloudflared tunnel run openclaw-gateway
```

Use the tunnel URL as GATEWAY_URL.

## Verify Deploy

1. Visit the production URL
2. Test Google OAuth login
3. Check that dashboard loads
4. Verify gateway connection (system health card)

## Troubleshooting

### Build fails
- Check build logs in Vercel dashboard
- Verify all dependencies are in package.json
- Check for TypeScript errors

### Auth not working
- Verify NEXTAUTH_URL matches deployed URL
- Check Google OAuth redirect URIs
- Verify NEXTAUTH_SECRET is set

### Gateway not connecting
- Check GATEWAY_URL is accessible from Vercel
- Verify GATEWAY_TOKEN is correct
- Check Cloudflare Tunnel is running

### Database issues
- Prisma migrations need to run on Vercel
- Consider using Vercel Postgres or external DB for production
- Current setup uses SQLite (file-based) - may need migration

## Custom Domain (Optional)

1. Go to Vercel dashboard → Project → Settings → Domains
2. Add custom domain (e.g., `openclaw.sapira.ai`)
3. Update DNS records as instructed
4. Update NEXTAUTH_URL environment variable
5. Update Google OAuth redirect URIs

## Post-Deploy Checklist

- [ ] Production URL is accessible
- [ ] Google OAuth login works
- [ ] Dashboard displays agent cards
- [ ] Gateway health check passes
- [ ] All tabs load (Config, Files, Logs, Kanban)
- [ ] Drag & drop works on Kanban
- [ ] Files can be saved
- [ ] No console errors

## Continuous Deployment

Once linked, every push to `main` branch will trigger automatic deployment:

```bash
git push origin main
# → Vercel automatically deploys
```

## Environment Variables Reference

| Variable | Example | Purpose |
|----------|---------|---------|
| NEXTAUTH_SECRET | `random-32-char-string` | Session encryption |
| NEXTAUTH_URL | `https://openclaw-dashboard.vercel.app` | Auth callback base URL |
| GATEWAY_URL | `https://tunnel.sapira.ai` | Gateway API endpoint |
| GATEWAY_TOKEN | `bearer-token-xyz` | Gateway authentication |
| GOOGLE_CLIENT_ID | `123456.apps.googleusercontent.com` | OAuth client ID |
| GOOGLE_CLIENT_SECRET | `GOCSPX-xyz` | OAuth client secret |
| DATABASE_URL | `file:./prisma/dev.db` | Database connection |

## Notes

- First deploy takes ~3-5 minutes (includes dependencies install + build)
- Subsequent deploys are faster (~1-2 minutes)
- Preview deploys happen automatically on PR branches
- Production deploys only on `main` branch pushes
