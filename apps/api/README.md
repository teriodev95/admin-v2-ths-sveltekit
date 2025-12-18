# THS Backend API

Backend para THS Admin usando Hono + Drizzle + Turso.

## Setup

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .dev.vars.example .dev.vars
# Editar .dev.vars con tu TURSO_AUTH_TOKEN

# Desarrollo local
npm run dev
```

## Deploy a Cloudflare Workers

```bash
# Configurar secret de Turso
wrangler secret put TURSO_AUTH_TOKEN

# Desplegar
npm run deploy
```

## Endpoints

### Autenticación
- `POST /login` - Login (email, password)

### Productos V1
- `GET /products` - Listar todos
- `GET /products/search?barcode=...` - Buscar por código
- `GET /products/search?name=...` - Buscar por nombre
- `GET /products/check-barcode/:barcode` - Validar código único
- `POST /products/search-advanced` - Búsqueda avanzada
- `POST /productsTNT` - Crear producto (auth)
- `PUT /editProductTNT/:id` - Editar producto (auth)
- `PUT /products/:id` - Actualizar enMercadolibre (auth)

### Marcas V2
- `GET /v2/brands` - Listar (con ?includeInactive=true)
- `GET /v2/brands/:id` - Obtener por ID
- `POST /v2/brands` - Crear (auth)
- `PUT /v2/brands/:id` - Actualizar (auth)
- `DELETE /v2/brands/:id` - Desactivar (auth)
- `POST /v2/brands/:id/image` - Subir imagen (auth)
- `DELETE /v2/brands/:id/image` - Eliminar imagen (auth)

### Categorías V2
- `GET /v2/categories` - Listar árbol (con ?flat=true, ?includeInactive=true)
- `GET /v2/categories/:id` - Obtener por ID
- `POST /v2/categories` - Crear (auth)
- `PUT /v2/categories/:id` - Actualizar (auth)
- `DELETE /v2/categories/:id` - Desactivar (auth)
- `POST /v2/categories/:id/image` - Subir imagen (auth)
- `DELETE /v2/categories/:id/image` - Eliminar imagen (auth)

### Productos V2
- `GET /v2/products/:id` - Obtener con marca y categorías
- `PUT /v2/products/:id` - Actualizar (auth)
- `GET /v2/products/by-category/:categoryId` - Por categoría
- `GET /v2/products/by-brand/:brandId` - Por marca
- `POST /v2/products/:id/categories` - Agregar categorías (auth)
- `DELETE /v2/products/:id/categories/:categoryId` - Quitar categoría (auth)

## Estructura

```
back-hono/
├── src/
│   ├── index.ts          # App principal
│   ├── db/
│   │   ├── index.ts      # Conexión Drizzle
│   │   └── schema.ts     # Schema de tablas
│   ├── middleware/
│   │   └── auth.ts       # JWT middleware
│   └── utils/
│       └── slug.ts       # Generador de slugs
├── package.json
├── wrangler.toml
├── tsconfig.json
└── drizzle.config.ts
```
