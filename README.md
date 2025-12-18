# THS Admin v2

Panel administrativo para gestión de productos, marcas y categorías.

## Stack

| App | Tecnología | Despliegue |
|-----|------------|------------|
| `apps/web` | SvelteKit 5 + Tailwind CSS v4 | Cloudflare Pages |
| `apps/api` | Hono + Drizzle ORM + Turso | Cloudflare Workers |

## Estructura

```
apps/
├── api/     # Backend REST API
└── web/     # Frontend panel admin
```

## Desarrollo

```bash
# Instalar dependencias
npm install

# Iniciar ambos (api + web)
npm run dev

# Solo frontend
npm run dev:web

# Solo backend
npm run dev:api
```

## Despliegue

### API (Cloudflare Workers)
```bash
cd apps/api
wrangler secret put TURSO_AUTH_TOKEN  # Solo primera vez
wrangler deploy
```

### Web (Cloudflare Pages)
```bash
cd apps/web
npm run build
# Desplegar via Cloudflare Dashboard o wrangler pages
```

## URLs Producción

- **API**: `https://ths-back-admin.clvrt.workers.dev`
- **Web**: Cloudflare Pages
