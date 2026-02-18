# Deploy Simplificado a Vercel

## ✨ MODO DEMO - Sin configuración externa

Esta versión usa **auth simplificada** y **datos mock** para que funcione sin configurar Google OAuth ni Gateway.

## 🚀 Deploy en 3 pasos

### 1. Import en Vercel

Ve a https://vercel.com/new e importa:
```
https://github.com/claudinho-sapira/openclaw-dashboard
```

### 2. Configura SOLO estas env vars:

```bash
# Auth (obligatorio)
NEXTAUTH_SECRET=9Qfck+Ri+B3KDg3iVhPj7SzaRv7jvPCR1UyH/i0a6m8=
NEXTAUTH_URL=https://tu-proyecto.vercel.app

# Credentials de login (obligatorio)
AUTH_USERNAME=admin
AUTH_PASSWORD=demo123

# Modo demo (obligatorio)
DEMO_MODE=true

# Database (obligatorio)
DATABASE_URL=file:./prisma/dev.db
```

### 3. Deploy

Click "Deploy" y espera ~2-3 minutos.

## 🎯 Acceder

1. Ve a `https://tu-proyecto.vercel.app`
2. Login con:
   - **Username:** admin (o el que pusiste en `AUTH_USERNAME`)
   - **Password:** demo123 (o el que pusiste en `AUTH_PASSWORD`)
3. Listo! Dashboard funciona con datos de demo

## 📊 Qué funciona en modo demo

✅ Login con username/password  
✅ Dashboard con agent cards (Luna, Bolt, Iris)  
✅ Token usage con mock data  
✅ System health card  
✅ Navegación entre páginas  
✅ Kanban board (funcional con SQLite)  
✅ UI completa visible  

⚠️ **NO funciona en modo demo:**
- Conexión real al gateway
- Agent controls (start/stop)
- Config editor (save no persiste en gateway real)
- Workspace files (solo mock content)
- Logs reales del gateway
- Sessions reales

## 🔧 Para salir del modo demo (producción real)

Añade estas env vars adicionales en Vercel:

```bash
# Desactivar demo mode
DEMO_MODE=false

# Gateway real
GATEWAY_URL=https://tu-cloudflare-tunnel.com
GATEWAY_TOKEN=tu-token-real

# (Opcional) Cambiar a Google OAuth
# GOOGLE_CLIENT_ID=...
# GOOGLE_CLIENT_SECRET=...
```

Y actualiza `lib/auth.ts` para usar Google provider en lugar de Credentials.

## ⚡ Deploy desde CLI (alternativa)

Si tienes Vercel CLI configurado:

```bash
cd openclaw-dashboard
npx vercel --prod
```

Vercel te pedirá las env vars o puedes configurarlas después en el dashboard.

## 🎨 URLs de ejemplo

- Dashboard: `/dashboard`
- Agent Detail: `/agents/builder`
- Kanban: `/kanban`
- Login: `/auth/signin`

## 📝 Notas

- **NEXTAUTH_SECRET:** Ya generado arriba, úsalo tal cual
- **NEXTAUTH_URL:** Cámbialo después del primer deploy a tu URL real
- **AUTH_PASSWORD:** Cámbialo a algo más seguro para producción
- **DEMO_MODE=true:** Hace que funcione TODO sin gateway externo

## 🆘 Troubleshooting

### Build falla
- Revisa build logs en Vercel dashboard
- Verifica que todas las env vars están configuradas

### No puedo hacer login
- Verifica que `AUTH_USERNAME` y `AUTH_PASSWORD` están en Vercel env vars
- Verifica que `NEXTAUTH_SECRET` está configurado
- Verifica que `NEXTAUTH_URL` coincide con tu dominio de Vercel

### Dashboard vacío
- Verifica que `DEMO_MODE=true` está en las env vars
- Check browser console para errores

### Quiero usar gateway real
- Set `DEMO_MODE=false`
- Configura `GATEWAY_URL` y `GATEWAY_TOKEN`
- Asegúrate que el gateway es accesible desde Vercel (usa Cloudflare Tunnel)
