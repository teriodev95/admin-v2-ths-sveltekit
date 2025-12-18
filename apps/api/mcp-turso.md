# MCP Turso Query Service

Servicio MCP desplegado en Cloudflare Workers para ejecutar queries en Turso DB.

## Endpoints

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/` | GET | Info del servicio |
| `/query` | POST | Ejecutar query SQL |
| `/tables` | GET | Listar tablas |
| `/schema/:table` | GET | Schema de tabla |

## Autenticación

Todos los endpoints (excepto `/`) requieren el header `X-API-Key`.

## Ejemplo

```bash
curl -X POST https://mcp-ths-turso.clvrt.workers.dev/query \
  -H "Content-Type: application/json" \
  -H "X-API-Key: 592a1ebcab6abb05c78efa5173f1696524177f3e2ef369fa5e41f6f7a398c5c0" \
  -d '{"query": "SELECT * FROM users LIMIT 10"}'
```

## Despliegue

```bash
# Configurar el token de Turso como secret
wrangler secret put TURSO_AUTH_TOKEN

# Desplegar
npm run deploy
```

## API Key

```
592a1ebcab6abb05c78efa5173f1696524177f3e2ef369fa5e41f6f7a398c5c0
```
url base
libsql://ths-db-clvrt.aws-us-west-2.turso.io

token
eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NjYwOTU2NjAsImlkIjoiNmMzZDY0ODMtZjQxYy00YWNhLTk3NTMtNzdmZTA2YTE3MTUwIiwicmlkIjoiNzBjNzBhNmQtYTgzMC00MTdkLWIwNzgtNGI2NmQwNTUwMDQ1In0.ACO5Tt1seAiVErxygIYn-gy5ajqhbPviHrZhPXnzEnXWbR2R1cFI_Jq80twz0gpEBpkGq7GpCyqPjmG-5BDiBQ