import { Hono } from 'hono'
import { eq, isNull, sql } from 'drizzle-orm'
import { categories, type Category } from '../db/schema'
import { authMiddleware } from '../middleware/auth'
import { generateSlug } from '../utils/slug'
import type { Database } from '../db'

type Env = {
  Variables: {
    db: Database
    user: { id: number; email: string; role: string }
  }
}

type CategoryWithChildren = Category & { children: CategoryWithChildren[] }

const categoriesRouter = new Hono<Env>()

// Helper: construir árbol de categorías
function buildTree(categories: Category[], parentId: number | null = null): CategoryWithChildren[] {
  return categories
    .filter(c => c.parentId === parentId)
    .map(c => ({
      ...c,
      children: buildTree(categories, c.id),
    }))
}

// GET /v2/categories - Listar categorías
categoriesRouter.get('/', async (c) => {
  const db = c.get('db')
  const flat = c.req.query('flat') === 'true'
  const includeInactive = c.req.query('includeInactive') === 'true'

  let query = db.select().from(categories)

  if (!includeInactive) {
    query = query.where(eq(categories.isActive, 1)) as typeof query
  }

  const result = await query.orderBy(categories.name)

  const mapped = result.map(c => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    imageUrl: c.imageUrl,
    parentId: c.parentId,
    isActive: c.isActive,
  }))

  if (flat) {
    return c.json({ success: true, data: mapped })
  }

  // Construir árbol
  const tree = buildTree(result as Category[]).map(c => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    imageUrl: c.imageUrl,
    parentId: c.parentId,
    isActive: c.isActive,
    children: formatChildren(c.children),
  }))

  return c.json({ success: true, data: tree })
})

function formatChildren(children: CategoryWithChildren[]): any[] {
  return children.map(c => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    imageUrl: c.imageUrl,
    parentId: c.parentId,
    isActive: c.isActive,
    children: formatChildren(c.children),
  }))
}

// GET /v2/categories/:id - Obtener categoría por ID
categoriesRouter.get('/:id', async (c) => {
  const db = c.get('db')
  const id = parseInt(c.req.param('id'))

  const [category] = await db.select().from(categories).where(eq(categories.id, id)).limit(1)

  if (!category) {
    return c.json({ success: false, error: 'Categoría no encontrada' }, 404)
  }

  return c.json({
    success: true,
    data: {
      id: category.id,
      name: category.name,
      slug: category.slug,
      imageUrl: category.imageUrl,
      parentId: category.parentId,
      isActive: category.isActive,
    },
  })
})

// POST /v2/categories - Crear categoría (requiere auth)
categoriesRouter.post('/', authMiddleware, async (c) => {
  const db = c.get('db')
  const body = await c.req.json<{ name: string; slug?: string; parentId?: number | null }>()

  if (!body.name) {
    return c.json({ success: false, error: 'El nombre es requerido' }, 400)
  }

  const slug = body.slug || generateSlug(body.name)

  const [existing] = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1)
  if (existing) {
    return c.json({ success: false, error: 'Ya existe una categoría con ese slug' }, 400)
  }

  // Validar parentId si se proporciona
  if (body.parentId) {
    const [parent] = await db.select().from(categories).where(eq(categories.id, body.parentId)).limit(1)
    if (!parent) {
      return c.json({ success: false, error: 'Categoría padre no encontrada' }, 400)
    }
  }

  const [newCategory] = await db.insert(categories).values({
    name: body.name,
    slug,
    parentId: body.parentId || null,
  }).returning()

  return c.json({
    success: true,
    data: {
      id: newCategory.id,
      name: newCategory.name,
      slug: newCategory.slug,
      imageUrl: newCategory.imageUrl,
      parentId: newCategory.parentId,
      isActive: newCategory.isActive,
    },
  }, 201)
})

// PUT /v2/categories/:id - Actualizar categoría (requiere auth)
categoriesRouter.put('/:id', authMiddleware, async (c) => {
  const db = c.get('db')
  const id = parseInt(c.req.param('id'))
  const body = await c.req.json<{ name?: string; slug?: string; parentId?: number | null }>()

  const [existing] = await db.select().from(categories).where(eq(categories.id, id)).limit(1)
  if (!existing) {
    return c.json({ success: false, error: 'Categoría no encontrada' }, 404)
  }

  const updates: Partial<typeof categories.$inferInsert> = {
    updatedAt: sql`DATETIME(CURRENT_TIMESTAMP, '-6 hours')`.as('updated_at'),
  }

  if (body.name) updates.name = body.name
  if (body.slug !== undefined) {
    const [slugExists] = await db.select().from(categories)
      .where(eq(categories.slug, body.slug))
      .limit(1)
    if (slugExists && slugExists.id !== id) {
      return c.json({ success: false, error: 'Ya existe una categoría con ese slug' }, 400)
    }
    updates.slug = body.slug
  }
  if (body.parentId !== undefined) {
    if (body.parentId === id) {
      return c.json({ success: false, error: 'Una categoría no puede ser su propio padre' }, 400)
    }
    updates.parentId = body.parentId
  }

  await db.update(categories).set(updates).where(eq(categories.id, id))

  const [updated] = await db.select().from(categories).where(eq(categories.id, id)).limit(1)

  return c.json({
    success: true,
    data: {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      imageUrl: updated.imageUrl,
      parentId: updated.parentId,
      isActive: updated.isActive,
    },
  })
})

// DELETE /v2/categories/:id - Desactivar categoría (soft delete, requiere auth)
categoriesRouter.delete('/:id', authMiddleware, async (c) => {
  const db = c.get('db')
  const id = parseInt(c.req.param('id'))

  const [existing] = await db.select().from(categories).where(eq(categories.id, id)).limit(1)
  if (!existing) {
    return c.json({ success: false, error: 'Categoría no encontrada' }, 404)
  }

  await db.update(categories).set({
    isActive: 0,
    updatedAt: sql`DATETIME(CURRENT_TIMESTAMP, '-6 hours')`,
  }).where(eq(categories.id, id))

  return c.json({ success: true, message: 'Categoría desactivada' })
})

// POST /v2/categories/:id/image - Subir imagen
categoriesRouter.post('/:id/image', authMiddleware, async (c) => {
  const db = c.get('db')
  const id = parseInt(c.req.param('id'))

  const [existing] = await db.select().from(categories).where(eq(categories.id, id)).limit(1)
  if (!existing) {
    return c.json({ success: false, error: 'Categoría no encontrada' }, 404)
  }

  const formData = await c.req.formData()
  const file = formData.get('image') as File | null

  if (!file) {
    return c.json({ success: false, error: 'No se proporcionó imagen' }, 400)
  }

  const arrayBuffer = await file.arrayBuffer()
  const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
  const imageUrl = `data:${file.type};base64,${base64}`

  await db.update(categories).set({
    imageUrl,
    updatedAt: sql`DATETIME(CURRENT_TIMESTAMP, '-6 hours')`,
  }).where(eq(categories.id, id))

  return c.json({
    success: true,
    data: { imageUrl },
  })
})

// DELETE /v2/categories/:id/image - Eliminar imagen
categoriesRouter.delete('/:id/image', authMiddleware, async (c) => {
  const db = c.get('db')
  const id = parseInt(c.req.param('id'))

  const [existing] = await db.select().from(categories).where(eq(categories.id, id)).limit(1)
  if (!existing) {
    return c.json({ success: false, error: 'Categoría no encontrada' }, 404)
  }

  await db.update(categories).set({
    imageUrl: null,
    updatedAt: sql`DATETIME(CURRENT_TIMESTAMP, '-6 hours')`,
  }).where(eq(categories.id, id))

  return c.json({ success: true, message: 'Imagen eliminada' })
})

export default categoriesRouter
