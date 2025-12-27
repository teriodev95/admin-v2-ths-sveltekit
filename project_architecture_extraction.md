# Extracción de Arquitectura del Proyecto

Este documento detalla la estructura y tecnologías utilizadas en el proyecto actual para ser replicadas en el nuevo desarrollo de ecommerce.

> [!IMPORTANT] > **Nota sobre el Backend**: Aunque este proyecto (`admin-v2-ths-sveltekit`) ya cuenta con un backend funcional, el objetivo para el proyecto de **Ecommerce** es construir una **instancia totalmente nueva** del backend. La información aquí contenida sirve como guía de arquitectura y referencia para esa nueva implementación, no para reutilizar la instancia existente.

## 1. Estructura del Monorepo

El proyecto utiliza **NPM Workspaces** para la gestión de múltiples paquetes en un solo repositorio.

- **Root**: El archivo `package.json` en la raíz define los espacios de trabajo:
  ```json
  "workspaces": [
      "apps/*"
  ]
  ```
- **Apps**:
  - `apps/web`: Frontend construido con **SvelteKit**.
  - `apps/api`: Backend implementado como un servicio serverless en **Cloudflare Workers** usando **Hono**.

## 2. Backend Worker (apps/api)

El backend es una API ligera y rápida desplegada en el borde (Edge).

### Stack Tecnológico

- **Framework**: [Hono](https://hono.dev/) - Elegido por ser ligero y optimizado para entornos Edge como Cloudflare Workers.
- **Runtime**: Cloudflare Workers (gestionado vía `wrangler`).
- **Base de Datos**: [Turso](https://turso.tech/) (LibSQL) - Base de datos SQL distribuida, conectada vía HTTP/WebSocket.
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/) - Para interactuar con la base de datos de manera tipada y segura.
- **Storage**: Cloudflare R2 - Utilizado para el almacenamiento de imágenes.

### Configuración Clave (`wrangler.toml`)

Este archivo configura el entorno del worker, variables y buckets.

```toml
name = "ths-back-admin"
main = "src/index.ts"
compatibility_date = "2024-12-18"

[vars]
TURSO_CONNECTION_URL = "libsql://tu-base-de-datos.turso.io"
R2_PUBLIC_URL = "https://tu-bucket-publico.r2.dev"

# El token de autenticación se gestiona como secreto:
# wrangler secret put TURSO_AUTH_TOKEN

[[r2_buckets]]
binding = "IMAGES_BUCKET"
bucket_name = "ths-images"
```

### Conexión a Base de Datos (`src/db/index.ts`)

Configuración de Drizzle con el cliente de LibSQL.

```typescript
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

export function createDb(url: string, authToken: string) {
  const client = createClient({
    url,
    authToken,
  });

  return drizzle(client, { schema });
}

export * from "./schema";
```

## 3. MCP para Endpoints (Model Context Protocol)

Para permitir que herramientas externas (como IAs) interactúen con la base de datos, se implementa un servicio MCP. A continuación, la implementación sugerida basada en la documentación del proyecto.

### Implementación (`src/routes/mcp.ts`)

Este módulo expone endpoints para listar tablas, ver esquemas y ejecutar consultas SQL con[text](project_architecture_extraction.md)troladas.

```typescript
import { Hono } from "hono";
import { sql } from "drizzle-orm";
import { createDb } from "../db";

const app = new Hono<{ Bindings: any }>();

// Middleware de seguridad (API Key)
app.use("*", async (c, next) => {
  // Permitir endpoint de info sin auth
  if (c.req.path === "/" && c.req.method === "GET") return next();

  const apiKey = c.req.header("X-API-Key");
  // Validar apiKey contra variable de entorno
  if (!apiKey || apiKey !== c.env.MCP_API_KEY) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  await next();
});

// Info del servicio
app.get("/", (c) =>
  c.json({
    status: "ok",
    service: "MCP Turso Query Service",
    version: "1.0.0",
  })
);

// Listar tablas disponibles
app.get("/tables", async (c) => {
  const db = createDb(c.env.TURSO_CONNECTION_URL, c.env.TURSO_AUTH_TOKEN);

  // Consulta a sqlite_master para obtener tablas de usuario
  const result = await db.run(sql`
    SELECT name FROM sqlite_master 
    WHERE type='table' 
    AND name NOT LIKE 'sqlite_%' 
    AND name NOT LIKE 'drizzle_%'
    AND name NOT LIKE '_cf_%'
  `);

  return c.json({ tables: result.rows.map((r) => r.name) });
});

// Obtener Schema de una tabla específica
app.get("/schema/:table", async (c) => {
  const db = createDb(c.env.TURSO_CONNECTION_URL, c.env.TURSO_AUTH_TOKEN);
  const table = c.req.param("table");

  // PRAGMA table_info devuelve metadatos de las columnas
  try {
    const result = await db.run(sql.raw(`PRAGMA table_info("${table}")`));
    return c.json({ schema: result.rows });
  } catch (e) {
    return c.json({ error: "Error fetching schema", details: e }, 400);
  }
});

// Ejecutar Query SQL Arbitrario
// ADVERTENCIA: Usar con extrema precaución y solo en entornos controlados
app.post("/query", async (c) => {
  const db = createDb(c.env.TURSO_CONNECTION_URL, c.env.TURSO_AUTH_TOKEN);
  const body = await c.req.json<{ query: string }>();

  if (!body.query) {
    return c.json({ error: "Query is required" }, 400);
  }

  try {
    const result = await db.run(sql.raw(body.query));
    return c.json({
      data: result.rows,
      rowsAffected: result.rowsAffected,
    });
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

export default app;
```

### Integración en `src/index.ts`

```typescript
import mcp from "./routes/mcp";

// ... configuración de app ...

// Montar las rutas MCP bajo /mcp
app.route("/mcp", mcp);

// ... resto de la aplicación ...
```

## Resumen de Pasos para el Nuevo Proyecto

1.  **Inicialización**: Crear estructura de monorepo (`npm init -w`).
2.  **Backend**: Crear paquete `apps/api` con `npm create hono@latest` (template Cloudflare Workers).
3.  **Dependencias**: Instalar `drizzle-orm`, `drizzle-kit`, `@libsql/client`.
4.  **Configuración**: Configurar `wrangler.toml` con credenciales de Turso y R2.
5.  **Base de Datos**: Definir esquemas en `db/schema.ts` y configurar cliente en `db/index.ts`.
6.  **MCP**: Implementar las rutas de MCP para exposición de datos a herramientas de IA.
