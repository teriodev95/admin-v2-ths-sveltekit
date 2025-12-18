import { Hono } from 'hono'
import { eq, sql } from 'drizzle-orm'
import { brands } from '../db/schema'
import { authMiddleware } from '../middleware/auth'
import { generateSlug } from '../utils/slug'
import type { Database } from '../db'

type Env = {
  Variables: {
    db: Database
    user: { id: number; email: string; role: string }
  }
}

const brandsRouter = new Hono<Env>()

// GET /v2/brands - Listar marcas
brandsRouter.get('/', async (c) => {
  const db = c.get('db')
  const includeInactive = c.req.query('includeInactive') === 'true'

  let query = db.select().from(brands)

  if (!includeInactive) {
    query = query.where(eq(brands.isActive, 1)) as typeof query
  }

  const result = await query.orderBy(brands.name)

  return c.json({
    success: true,
    data: result.map(b => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      imageUrl: b.imageUrl,
      isActive: b.isActive,
    })),
  })
})

// GET /v2/brands/:id - Obtener marca por ID
brandsRouter.get('/:id', async (c) => {
  const db = c.get('db')
  const id = parseInt(c.req.param('id'))

  const [brand] = await db.select().from(brands).where(eq(brands.id, id)).limit(1)

  if (!brand) {
    return c.json({ success: false, error: 'Marca no encontrada' }, 404)
  }

  return c.json({
    success: true,
    data: {
      id: brand.id,
      name: brand.name,
      slug: brand.slug,
      imageUrl: brand.imageUrl,
      isActive: brand.isActive,
    },
  })
})

// POST /v2/brands - Crear marca (requiere auth)
brandsRouter.post('/', authMiddleware, async (c) => {
  const db = c.get('db')
  const body = await c.req.json<{ name: string; slug?: string }>()

  if (!body.name) {
    return c.json({ success: false, error: 'El nombre es requerido' }, 400)
  }

  const slug = body.slug || generateSlug(body.name)

  const [existing] = await db.select().from(brands).where(eq(brands.slug, slug)).limit(1)
  if (existing) {
    return c.json({ success: false, error: 'Ya existe una marca con ese slug' }, 400)
  }

  const [newBrand] = await db.insert(brands).values({
    name: body.name,
    slug,
  }).returning()

  return c.json({
    success: true,
    data: {
      id: newBrand.id,
      name: newBrand.name,
      slug: newBrand.slug,
      imageUrl: newBrand.imageUrl,
      isActive: newBrand.isActive,
    },
  }, 201)
})

// PUT /v2/brands/:id - Actualizar marca (requiere auth)
brandsRouter.put('/:id', authMiddleware, async (c) => {
  const db = c.get('db')
  const id = parseInt(c.req.param('id'))
  const body = await c.req.json<{ name?: string; slug?: string }>()

  const [existing] = await db.select().from(brands).where(eq(brands.id, id)).limit(1)
  if (!existing) {
    return c.json({ success: false, error: 'Marca no encontrada' }, 404)
  }

  const updates: Partial<typeof brands.$inferInsert> = {
    updatedAt: sql`DATETIME(CURRENT_TIMESTAMP, '-6 hours')`.as('updated_at'),
  }

  if (body.name) updates.name = body.name
  if (body.slug) {
    const [slugExists] = await db.select().from(brands)
      .where(eq(brands.slug, body.slug))
      .limit(1)
    if (slugExists && slugExists.id !== id) {
      return c.json({ success: false, error: 'Ya existe una marca con ese slug' }, 400)
    }
    updates.slug = body.slug
  }

  await db.update(brands).set(updates).where(eq(brands.id, id))

  const [updated] = await db.select().from(brands).where(eq(brands.id, id)).limit(1)

  return c.json({
    success: true,
    data: {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      imageUrl: updated.imageUrl,
      isActive: updated.isActive,
    },
  })
})

// DELETE /v2/brands/:id - Desactivar marca (soft delete, requiere auth)
brandsRouter.delete('/:id', authMiddleware, async (c) => {
  const db = c.get('db')
  const id = parseInt(c.req.param('id'))

  const [existing] = await db.select().from(brands).where(eq(brands.id, id)).limit(1)
  if (!existing) {
    return c.json({ success: false, error: 'Marca no encontrada' }, 404)
  }

  await db.update(brands).set({
    isActive: 0,
    updatedAt: sql`DATETIME(CURRENT_TIMESTAMP, '-6 hours')`,
  }).where(eq(brands.id, id))

  return c.json({ success: true, message: 'Marca desactivada' })
})

// POST /v2/brands/:id/image - Subir imagen
brandsRouter.post('/:id/image', authMiddleware, async (c) => {
  const db = c.get('db')
  const id = parseInt(c.req.param('id'))

  const [existing] = await db.select().from(brands).where(eq(brands.id, id)).limit(1)
  if (!existing) {
    return c.json({ success: false, error: 'Marca no encontrada' }, 404)
  }

  const formData = await c.req.formData()
  const file = formData.get('image') as File | null

  if (!file) {
    return c.json({ success: false, error: 'No se proporcionó imagen' }, 400)
  }

  // Convertir a base64 para almacenar (simplificado)
  const arrayBuffer = await file.arrayBuffer()
  const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
  const imageUrl = `data:${file.type};base64,${base64}`

  await db.update(brands).set({
    imageUrl,
    updatedAt: sql`DATETIME(CURRENT_TIMESTAMP, '-6 hours')`,
  }).where(eq(brands.id, id))

  return c.json({
    success: true,
    data: { imageUrl },
  })
})

// DELETE /v2/brands/:id/image - Eliminar imagen
brandsRouter.delete('/:id/image', authMiddleware, async (c) => {
  const db = c.get('db')
  const id = parseInt(c.req.param('id'))

  const [existing] = await db.select().from(brands).where(eq(brands.id, id)).limit(1)
  if (!existing) {
    return c.json({ success: false, error: 'Marca no encontrada' }, 404)
  }

  await db.update(brands).set({
    imageUrl: null,
    updatedAt: sql`DATETIME(CURRENT_TIMESTAMP, '-6 hours')`,
  }).where(eq(brands.id, id))

  return c.json({ success: true, message: 'Imagen eliminada' })
})

export default brandsRouter
