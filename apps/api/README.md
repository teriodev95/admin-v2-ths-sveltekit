# THS Backend API

API REST con Hono + Drizzle ORM + Turso, desplegada en Cloudflare Workers.

## Desarrollo

```bash
npm install
npm run dev
```

## Despliegue

```bash
# 1. Primero subir cambios al repositorio
git add . && git commit -m "feat: descripción" && git push

# 2. Configurar secret de Turso (solo primera vez)
wrangler secret put TURSO_AUTH_TOKEN

# 3. Desplegar a Cloudflare Workers
wrangler deploy
```

## Endpoints principales

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/login` | Autenticación |
| POST | `/products/search-advanced` | Buscar productos (query, name, barcode) |
| GET | `/v2/brands` | Listar marcas |
| GET | `/v2/categories` | Listar categorías (árbol o flat) |
| GET | `/v2/products/:id` | Producto con marca y categorías |
| PUT | `/v2/products/:id` | Actualizar producto |

> Los endpoints con (auth) requieren token JWT en header `Authorization: Bearer <token>`
