import { Hono } from 'hono'
import { eq, like, sql, and, or, inArray } from 'drizzle-orm'
import { products, brands, categories, productCategories } from '../db/schema'
import { authMiddleware } from '../middleware/auth'
import type { Database } from '../db'

type Env = {
  Variables: {
    db: Database
    user: { id: number; email: string; role: string }
  }
}

const productsRouter = new Hono<Env>()

// GET /products - Listar todos los productos
productsRouter.get('/', async (c) => {
  const db = c.get('db')

  const result = await db.select().from(products).orderBy(products.name)

  return c.json({
    success: true,
    data: result.map(p => ({
      id: p.id,
      name: p.name,
      barcode: p.barcode,
      brand: p.brand,
      brandId: p.brandId,
      categories: [], // Se puede popular después
      salePrice: p.salePrice,
      stockQuantity: p.stockQuantity,
      image: p.image512,
      internalReference: p.internalReference,
      storehouseId: p.storehouseId,
      enMercadolibre: p.enMercadolibre,
    })),
  })
})

// GET /products/search - Buscar por barcode o nombre
productsRouter.get('/search', async (c) => {
  const db = c.get('db')
  const barcode = c.req.query('barcode')
  const name = c.req.query('name')

  if (barcode) {
    const result = await db.select().from(products).where(eq(products.barcode, barcode)).limit(1)

    if (result.length === 0) {
      return c.json({ success: true, data: null })
    }

    const product = result[0]
    const cats = await db.select({ categoryId: productCategories.categoryId })
      .from(productCategories)
      .where(eq(productCategories.productId, product.id))

    return c.json({
      success: true,
      data: {
        id: product.id,
        name: product.name,
        barcode: product.barcode,
        brand: product.brand,
        brandId: product.brandId,
        categories: cats.map(c => c.categoryId),
        salePrice: product.salePrice,
        stockQuantity: product.stockQuantity,
        image: product.image512,
        internalReference: product.internalReference,
        storehouseId: product.storehouseId,
        enMercadolibre: product.enMercadolibre,
      },
    })
  }

  if (name) {
    const result = await db.select().from(products)
      .where(like(products.name, `%${name}%`))
      .limit(20)

    return c.json({
      success: true,
      data: result.map(p => ({
        id: p.id,
        name: p.name,
        barcode: p.barcode,
        brand: p.brand,
        brandId: p.brandId,
        categories: [],
        salePrice: p.salePrice,
        stockQuantity: p.stockQuantity,
        image: p.image512,
        internalReference: p.internalReference,
        storehouseId: p.storehouseId,
        enMercadolibre: p.enMercadolibre,
      })),
    })
  }

  return c.json({ success: false, error: 'Se requiere barcode o name' }, 400)
})

// GET /products/check-barcode/:barcode - Validar si barcode existe
productsRouter.get('/check-barcode/:barcode', async (c) => {
  const db = c.get('db')
  const barcode = c.req.param('barcode')

  const [existing] = await db.select({ id: products.id })
    .from(products)
    .where(eq(products.barcode, barcode))
    .limit(1)

  return c.json({
    success: true,
    exists: !!existing,
    productId: existing?.id || null,
  })
})

// POST /products/search-advanced - Búsqueda avanzada (v2)
productsRouter.post('/search-advanced', async (c) => {
  const db = c.get('db')
  const body = await c.req.json<{
    query?: string  // Búsqueda general (nombre O barcode)
    name?: string
    barcode?: string
    brandId?: number
    categoryId?: number
    enMercadolibre?: number
    minPrice?: number
    maxPrice?: number
    limit?: number
    offset?: number
  }>()

  const conditions: any[] = []

  // Búsqueda general: nombre O barcode (OR)
  if (body.query) {
    const searchTerm = `%${body.query}%`
    const orCondition = or(
      like(products.name, searchTerm),
      like(products.barcode, searchTerm)
    )
    if (orCondition) {
      conditions.push(orCondition)
    }
  } else {
    // Búsqueda específica (AND)
    if (body.name) {
      conditions.push(like(products.name, `%${body.name}%`))
    }
    if (body.barcode) {
      conditions.push(like(products.barcode, `%${body.barcode}%`))
    }
  }
  if (body.brandId) {
    conditions.push(eq(products.brandId, body.brandId))
  }
  if (body.enMercadolibre !== undefined) {
    conditions.push(eq(products.enMercadolibre, body.enMercadolibre))
  }

  let query = db.select().from(products)

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query
  }

  const limit = body.limit || 50
  const offset = body.offset || 0

  const result = await query.limit(limit).offset(offset)

  // Si hay filtro por categoría, filtrar después
  let filteredResult = result
  if (body.categoryId) {
    const productIdsInCategory = await db.select({ productId: productCategories.productId })
      .from(productCategories)
      .where(eq(productCategories.categoryId, body.categoryId))

    const ids = productIdsInCategory.map(p => p.productId)
    filteredResult = result.filter(p => ids.includes(p.id))
  }

  return c.json({
    success: true,
    data: filteredResult.map(p => ({
      id: p.id,
      name: p.name,
      barcode: p.barcode,
      brand: p.brand,
      brandId: p.brandId,
      categories: [],
      salePrice: p.salePrice,
      stockQuantity: p.stockQuantity,
      image: p.image512,
      internalReference: p.internalReference,
      storehouseId: p.storehouseId,
      enMercadolibre: p.enMercadolibre,
    })),
    total: filteredResult.length,
    _debug: { query: body.query, conditionsCount: conditions.length },
  })
})

// POST /productsTNT - Crear producto (endpoint legacy)
productsRouter.post('/productsTNT', authMiddleware, async (c) => {
  const db = c.get('db')
  const user = c.get('user')
  const body = await c.req.json<{
    name: string
    barcode: string
    brand?: string
    brandId?: number
    salePrice: number
    stockQuantity: number
    image?: string
    internalReference?: string
    storehouseId?: number
    categoryIds?: number[]
  }>()

  if (!body.name || !body.barcode) {
    return c.json({ success: false, error: 'Nombre y código de barras son requeridos' }, 400)
  }

  // Verificar barcode único
  const [existing] = await db.select().from(products).where(eq(products.barcode, body.barcode)).limit(1)
  if (existing) {
    return c.json({ success: false, error: 'Ya existe un producto con ese código de barras' }, 400)
  }

  const [newProduct] = await db.insert(products).values({
    name: body.name,
    barcode: body.barcode,
    brand: body.brand || null,
    brandId: body.brandId || null,
    salePrice: body.salePrice || 0,
    stockQuantity: body.stockQuantity || 0,
    image512: body.image || null,
    internalReference: body.internalReference || null,
    storehouseId: body.storehouseId || 1,
    createdBy: user.email,
  }).returning()

  // Insertar categorías
  if (body.categoryIds && body.categoryIds.length > 0) {
    await db.insert(productCategories).values(
      body.categoryIds.map(categoryId => ({
        productId: newProduct.id,
        categoryId,
      }))
    )
  }

  return c.json({
    success: true,
    data: {
      id: newProduct.id,
      name: newProduct.name,
      barcode: newProduct.barcode,
      brand: newProduct.brand,
      brandId: newProduct.brandId,
      categories: body.categoryIds || [],
      salePrice: newProduct.salePrice,
      stockQuantity: newProduct.stockQuantity,
      image: newProduct.image512,
      internalReference: newProduct.internalReference,
      storehouseId: newProduct.storehouseId,
      enMercadolibre: newProduct.enMercadolibre,
    },
  }, 201)
})

// PUT /editProductTNT/:id - Editar producto (endpoint legacy)
productsRouter.put('/editProductTNT/:id', authMiddleware, async (c) => {
  const db = c.get('db')
  const id = parseInt(c.req.param('id'))
  const body = await c.req.json<{
    name?: string
    salePrice?: number
    stockQuantity?: number
    image?: string
    enMercadolibre?: number
  }>()

  const [existing] = await db.select().from(products).where(eq(products.id, id)).limit(1)
  if (!existing) {
    return c.json({ success: false, error: 'Producto no encontrado' }, 404)
  }

  const updates: Partial<typeof products.$inferInsert> = {
    updatedAt: sql`DATETIME(CURRENT_TIMESTAMP, '-6 hours')`.as('updated_at'),
  }

  if (body.name !== undefined) updates.name = body.name
  if (body.salePrice !== undefined) updates.salePrice = body.salePrice
  if (body.stockQuantity !== undefined) updates.stockQuantity = body.stockQuantity
  if (body.image !== undefined) updates.image512 = body.image
  if (body.enMercadolibre !== undefined) updates.enMercadolibre = body.enMercadolibre

  await db.update(products).set(updates).where(eq(products.id, id))

  const [updated] = await db.select().from(products).where(eq(products.id, id)).limit(1)

  return c.json({
    success: true,
    data: {
      id: updated.id,
      name: updated.name,
      barcode: updated.barcode,
      brand: updated.brand,
      brandId: updated.brandId,
      salePrice: updated.salePrice,
      stockQuantity: updated.stockQuantity,
      image: updated.image512,
      internalReference: updated.internalReference,
      storehouseId: updated.storehouseId,
      enMercadolibre: updated.enMercadolibre,
    },
  })
})

// PUT /products/:id - Actualizar campo específico (enMercadolibre)
productsRouter.put('/:id', authMiddleware, async (c) => {
  const db = c.get('db')
  const id = parseInt(c.req.param('id'))
  const body = await c.req.json<{ enMercadolibre?: number }>()

  const [existing] = await db.select().from(products).where(eq(products.id, id)).limit(1)
  if (!existing) {
    return c.json({ success: false, error: 'Producto no encontrado' }, 404)
  }

  if (body.enMercadolibre !== undefined) {
    await db.update(products).set({
      enMercadolibre: body.enMercadolibre,
      updatedAt: sql`DATETIME(CURRENT_TIMESTAMP, '-6 hours')`,
    }).where(eq(products.id, id))
  }

  return c.json({ success: true })
})

// ==================== V2 ENDPOINTS ====================

// GET /v2/products/:id - Obtener producto con marca y categorías
productsRouter.get('/v2/products/:id', async (c) => {
  const db = c.get('db')
  const id = parseInt(c.req.param('id'))

  const [product] = await db.select().from(products).where(eq(products.id, id)).limit(1)

  if (!product) {
    return c.json({ success: false, error: 'Producto no encontrado' }, 404)
  }

  // Obtener marca
  let brandInfo = null
  if (product.brandId) {
    const [brand] = await db.select().from(brands).where(eq(brands.id, product.brandId)).limit(1)
    if (brand) {
      brandInfo = {
        id: brand.id,
        name: brand.name,
        imageUrl: brand.imageUrl,
      }
    }
  }

  // Obtener categorías
  const productCats = await db.select({ categoryId: productCategories.categoryId })
    .from(productCategories)
    .where(eq(productCategories.productId, id))

  const categoryIds = productCats.map(pc => pc.categoryId)
  let productCategoiesList: { id: number; name: string; slug: string }[] = []

  if (categoryIds.length > 0) {
    const cats = await db.select().from(categories).where(inArray(categories.id, categoryIds))
    productCategoiesList = cats.map(c => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
    }))
  }

  return c.json({
    success: true,
    data: {
      id: product.id,
      name: product.name,
      barcode: product.barcode,
      salePrice: product.salePrice,
      stockQuantity: product.stockQuantity,
      image: product.image512,
      brandId: product.brandId,
      brandInfo,
      categories: productCategoiesList,
      internalReference: product.internalReference,
      storehouseId: product.storehouseId,
      enMercadolibre: product.enMercadolibre,
    },
  })
})

// PUT /v2/products/:id - Actualizar producto con categorías
productsRouter.put('/v2/products/:id', authMiddleware, async (c) => {
  const db = c.get('db')
  const id = parseInt(c.req.param('id'))
  const body = await c.req.json<{
    name?: string
    salePrice?: number
    stockQuantity?: number
    brandId?: number | null
    categoryIds?: number[]
    image?: string
  }>()

  const [existing] = await db.select().from(products).where(eq(products.id, id)).limit(1)
  if (!existing) {
    return c.json({ success: false, error: 'Producto no encontrado' }, 404)
  }

  const updates: Partial<typeof products.$inferInsert> = {
    updatedAt: sql`DATETIME(CURRENT_TIMESTAMP, '-6 hours')`.as('updated_at'),
  }

  if (body.name !== undefined) updates.name = body.name
  if (body.salePrice !== undefined) updates.salePrice = body.salePrice
  if (body.stockQuantity !== undefined) updates.stockQuantity = body.stockQuantity
  if (body.brandId !== undefined) updates.brandId = body.brandId
  if (body.image !== undefined) updates.image512 = body.image

  await db.update(products).set(updates).where(eq(products.id, id))

  // Actualizar categorías si se proporcionan
  if (body.categoryIds !== undefined) {
    await db.delete(productCategories).where(eq(productCategories.productId, id))
    if (body.categoryIds.length > 0) {
      await db.insert(productCategories).values(
        body.categoryIds.map(categoryId => ({
          productId: id,
          categoryId,
        }))
      )
    }
  }

  return c.json({ success: true })
})

// GET /v2/products/by-category/:categoryId
productsRouter.get('/v2/products/by-category/:categoryId', async (c) => {
  const db = c.get('db')
  const categoryId = parseInt(c.req.param('categoryId'))
  const limit = parseInt(c.req.query('limit') || '20')
  const offset = parseInt(c.req.query('offset') || '0')

  const productIdsResult = await db.select({ productId: productCategories.productId })
    .from(productCategories)
    .where(eq(productCategories.categoryId, categoryId))

  const productIds = productIdsResult.map(p => p.productId)

  if (productIds.length === 0) {
    return c.json({ success: true, data: [], total: 0 })
  }

  const result = await db.select().from(products)
    .where(inArray(products.id, productIds))
    .limit(limit)
    .offset(offset)

  return c.json({
    success: true,
    data: result.map(p => ({
      id: p.id,
      name: p.name,
      barcode: p.barcode,
      salePrice: p.salePrice,
      stockQuantity: p.stockQuantity,
      image: p.image512,
      brandId: p.brandId,
    })),
    total: productIds.length,
  })
})

// GET /v2/products/by-brand/:brandId
productsRouter.get('/v2/products/by-brand/:brandId', async (c) => {
  const db = c.get('db')
  const brandId = parseInt(c.req.param('brandId'))
  const limit = parseInt(c.req.query('limit') || '20')
  const offset = parseInt(c.req.query('offset') || '0')

  const result = await db.select().from(products)
    .where(eq(products.brandId, brandId))
    .limit(limit)
    .offset(offset)

  const total = await db.select({ count: sql<number>`count(*)` })
    .from(products)
    .where(eq(products.brandId, brandId))

  return c.json({
    success: true,
    data: result.map(p => ({
      id: p.id,
      name: p.name,
      barcode: p.barcode,
      salePrice: p.salePrice,
      stockQuantity: p.stockQuantity,
      image: p.image512,
      brandId: p.brandId,
    })),
    total: total[0]?.count || 0,
  })
})

// POST /v2/products/:id/categories - Agregar categorías
productsRouter.post('/v2/products/:id/categories', authMiddleware, async (c) => {
  const db = c.get('db')
  const id = parseInt(c.req.param('id'))
  const body = await c.req.json<{ categoryIds: number[] }>()

  const [existing] = await db.select().from(products).where(eq(products.id, id)).limit(1)
  if (!existing) {
    return c.json({ success: false, error: 'Producto no encontrado' }, 404)
  }

  if (!body.categoryIds || body.categoryIds.length === 0) {
    return c.json({ success: false, error: 'Se requieren categoryIds' }, 400)
  }

  // Obtener categorías existentes
  const existingCats = await db.select({ categoryId: productCategories.categoryId })
    .from(productCategories)
    .where(eq(productCategories.productId, id))

  const existingIds = existingCats.map(c => c.categoryId)
  const newIds = body.categoryIds.filter(cid => !existingIds.includes(cid))

  if (newIds.length > 0) {
    await db.insert(productCategories).values(
      newIds.map(categoryId => ({
        productId: id,
        categoryId,
      }))
    )
  }

  return c.json({ success: true })
})

// DELETE /v2/products/:id/categories/:categoryId - Quitar categoría
productsRouter.delete('/v2/products/:id/categories/:categoryId', authMiddleware, async (c) => {
  const db = c.get('db')
  const productId = parseInt(c.req.param('id'))
  const categoryId = parseInt(c.req.param('categoryId'))

  await db.delete(productCategories)
    .where(and(
      eq(productCategories.productId, productId),
      eq(productCategories.categoryId, categoryId)
    ))

  return c.json({ success: true })
})

export default productsRouter
