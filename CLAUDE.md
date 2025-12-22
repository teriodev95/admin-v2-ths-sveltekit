# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

THS Admin v2 is an admin panel for managing products, brands, and categories. It's a monorepo with two apps deployed on Cloudflare infrastructure.

## Commands

### Development
```bash
npm install          # Install all dependencies
npm run dev          # Start both API and web concurrently
npm run dev:web      # Start only web frontend (port 5173)
npm run dev:api      # Start only API (wrangler dev)
```

### Build & Lint
```bash
npm run build        # Build all workspaces
npm run build:web    # Build only web
npm run lint         # Lint all workspaces
```

### Type Checking (from apps/web/)
```bash
npm run check        # Run svelte-check with TypeScript
npm run check:watch  # Watch mode for development
```

### API Database (from apps/api/)
```bash
npm run db:generate  # Generate Drizzle migrations
npm run db:push      # Push schema to Turso
npm run db:studio    # Open Drizzle Studio
```

### Deployment
```bash
# API - from apps/api/
wrangler secret put TURSO_AUTH_TOKEN  # First time only
wrangler deploy

# Web - from apps/web/
npm run build
# Deploy via Cloudflare Pages
```

## Architecture

### Monorepo Structure
- **apps/api**: Hono REST API with Drizzle ORM, deployed to Cloudflare Workers
- **apps/web**: SvelteKit 5 admin panel with Tailwind CSS v4, deployed to Cloudflare Pages

### API (apps/api)
- **Framework**: Hono with TypeScript
- **Database**: Turso (libSQL) via Drizzle ORM
- **Auth**: JWT tokens (jose library), admin role required
- **Entry**: `src/index.ts` - single file containing all routes
- **Schema**: `src/db/schema.ts` - Drizzle table definitions (users, brands, categories, products, productCategories)

Key patterns:
- DB connection created per-request via middleware
- All responses follow `{ success: boolean, data?: T, error?: string }` format
- Protected routes use `authMiddleware`
- Categories support hierarchical tree structure with `parentId`
- Two API versions coexist: v1 routes (`/products`, `/productsTNT`) and v2 routes (`/v2/brands`, `/v2/categories`, `/v2/products`)

### Web (apps/web)
- **Framework**: SvelteKit 5 with Svelte 5 runes (`$state`, `$derived`, `$effect`)
- **Styling**: Tailwind CSS v4, iOS-inspired design system
- **Icons**: lucide-svelte

Key patterns:
- **Auth store**: `$lib/stores/auth.svelte.ts` - reactive auth state using Svelte 5 runes
- **API client**: `$lib/services/api.ts` - typed fetch wrapper with auto token injection
- **Types**: `$lib/types/index.ts` - shared TypeScript interfaces
- **UI components**: `$lib/components/ui/` - Button, Card, Input, Modal, Select, etc.
- **Layout**: Protected routes redirect to `/login` via `+layout.svelte` auth check

### Data Flow
1. Web makes authenticated requests to production API (`https://ths-back-admin.clvrt.workers.dev`)
2. API validates JWT, queries Turso database
3. Response flows back with typed data

### Database Schema
- **products**: Core entity with barcode, prices, stock, brandId reference
- **brands**: Name, slug, imageUrl (stored in R2), soft delete via `isActive`
- **categories**: Hierarchical with parentId, images stored as base64, soft delete via `isActive`
- **productCategories**: Many-to-many pivot table
- **users**: Auth with hashed passwords, role-based access

### Image Storage
- **Brand images**: Uploaded to Cloudflare R2 bucket (`ths-images`), URLs stored in DB
- **Category/Product images**: Stored as base64 data URIs directly in DB

## Environment

- API requires `TURSO_AUTH_TOKEN` as Cloudflare secret
- `TURSO_CONNECTION_URL` and `R2_PUBLIC_URL` configured in wrangler.toml
- R2 bucket `ths-images` bound as `IMAGES_BUCKET` for brand image storage
- Web has hardcoded production API URL in `api.ts`
