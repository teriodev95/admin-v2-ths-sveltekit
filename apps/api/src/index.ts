import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { eq, like, sql, and, inArray } from 'drizzle-orm'
import { createDb, products, brands, categories, productCategories, users } from './db'
import { authMiddleware, generateToken, verifyPassword } from './middleware/auth'
import { generateSlug } from './utils/slug'
import type { Database } from './db'
import type { Category } from './db/schema'

type Bindings = {
  TURSO_CONNECTION_URL: string
  TURSO_AUTH_TOKEN: string
  IMAGES_BUCKET: R2Bucket
  R2_PUBLIC_URL: string
}

type Variables = {
  db: Database
  user: { id: number; email: string; role: string }
}

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// CORS
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
}))

// Middleware: inicializar DB en cada request
app.use('*', async (c, next) => {
  const db = createDb(c.env.TURSO_CONNECTION_URL, c.env.TURSO_AUTH_TOKEN)
  c.set('db', db)
  await next()
})

// ==================== RUTA RAÍZ ====================
app.get('/', (c) => {
  return c.json({
    name: 'THS Backend API',
    version: '1.0.0',
    endpoints: {
      auth: '/login',
      products: '/products, /productsTNT, /editProductTNT/:id',
      brands: '/v2/brands',
      categories: '/v2/categories',
      productsV2: '/v2/products',
    },
  })
})

// ==================== AUTENTICACIÓN ====================
app.post('/login', async (c) => {
  const db = c.get('db')
  const { email, password } = await c.req.json<{ email: string; password: string }>()

  if (!email || !password) {
    return c.json({ success: false, error: 'Email y contraseña son requeridos' }, 400)
  }

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)

  if (!user) {
    return c.json({ success: false, error: 'Credenciales inválidas' }, 401)
  }

  const isValidPassword = await verifyPassword(password, user.password)

  if (!isValidPassword) {
    return c.json({ success: false, error: 'Credenciales inválidas' }, 401)
  }

  if (user.role !== 'admin') {
    return c.json({ success: false, error: 'Acceso denegado. Se requiere rol de administrador' }, 403)
  }

  const token = await generateToken({
    id: user.id,
    email: user.email,
    role: user.role || 'user',
  })

  return c.json({
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    },
  })
})

// ==================== PRODUCTOS V1 ====================

// GET /products - Listar todos los productos
app.get('/products', async (c) => {
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
      categories: [],
      salePrice: p.salePrice,
      stockQuantity: p.stockQuantity,
      image: p.image512,
      internalReference: p.internalReference,
      storehouseId: p.storehouseId,
      enMercadolibre: p.enMercadolibre,
      visibleEcommerce: p.visibleEcommerce,
    })),
  })
})

// GET /products/search - Buscar por barcode o nombre
app.get('/products/search', async (c) => {
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
        categories: cats.map(cat => cat.categoryId),
        salePrice: product.salePrice,
        stockQuantity: product.stockQuantity,
        image: product.image512,
        internalReference: product.internalReference,
        storehouseId: product.storehouseId,
        enMercadolibre: product.enMercadolibre,
        visibleEcommerce: product.visibleEcommerce,
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
        visibleEcommerce: p.visibleEcommerce,
      })),
    })
  }

  return c.json({ success: false, error: 'Se requiere barcode o name' }, 400)
})

// GET /products/check-barcode/:barcode
app.get('/products/check-barcode/:barcode', async (c) => {
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

// POST /products/search-advanced
app.post('/products/search-advanced', async (c) => {
  const db = c.get('db')
  const body = await c.req.json<{
    query?: string  // Búsqueda general (nombre O barcode)
    name?: string
    barcode?: string
    brandId?: number
    categoryId?: number
    enMercadolibre?: number
    limit?: number
    offset?: number
  }>()

  const conditions = []

  // Búsqueda general: nombre O barcode (OR)
  if (body.query) {
    const searchTerm = `%${body.query}%`
    conditions.push(sql`(${products.name} LIKE ${searchTerm} OR ${products.barcode} LIKE ${searchTerm})`)
  } else {
    if (body.name) conditions.push(like(products.name, `%${body.name}%`))
    if (body.barcode) conditions.push(like(products.barcode, `%${body.barcode}%`))
  }
  if (body.brandId) conditions.push(eq(products.brandId, body.brandId))
  if (body.enMercadolibre !== undefined) conditions.push(eq(products.enMercadolibre, body.enMercadolibre))

  // Contar total de productos (sin limit/offset)
  let countQuery = db.select({ count: sql<number>`COUNT(*)` }).from(products)
  if (conditions.length > 0) {
    countQuery = countQuery.where(and(...conditions)) as typeof countQuery
  }
  const [countResult] = await countQuery
  let total = countResult?.count || 0

  // Obtener productos paginados
  let query = db.select().from(products)
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query
  }

  const limit = body.limit || 50
  const offset = body.offset || 0
  const result = await query.limit(limit).offset(offset)

  let filteredResult = result
  if (body.categoryId) {
    const productIdsInCategory = await db.select({ productId: productCategories.productId })
      .from(productCategories)
      .where(eq(productCategories.categoryId, body.categoryId))

    const ids = productIdsInCategory.map(p => p.productId)
    filteredResult = result.filter(p => ids.includes(p.id))
    // Ajustar total para filtro por categoría
    total = filteredResult.length
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
      visibleEcommerce: p.visibleEcommerce,
    })),
    total,
  })
})

// POST /productsTNT - Crear producto
app.post('/productsTNT', authMiddleware, async (c) => {
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
      visibleEcommerce: newProduct.visibleEcommerce,
    },
  }, 201)
})

// PUT /editProductTNT/:id
app.put('/editProductTNT/:id', authMiddleware, async (c) => {
  const db = c.get('db')
  const id = parseInt(c.req.param('id'))
  const body = await c.req.json<{
    name?: string
    salePrice?: number
    stockQuantity?: number
    image?: string
    enMercadolibre?: number
    visibleEcommerce?: number
  }>()

  const [existing] = await db.select().from(products).where(eq(products.id, id)).limit(1)
  if (!existing) {
    return c.json({ success: false, error: 'Producto no encontrado' }, 404)
  }

  const updates: Record<string, any> = {}
  if (body.name !== undefined) updates.name = body.name
  if (body.salePrice !== undefined) updates.salePrice = body.salePrice
  if (body.stockQuantity !== undefined) updates.stockQuantity = body.stockQuantity
  if (body.image !== undefined) updates.image512 = body.image
  if (body.enMercadolibre !== undefined) updates.enMercadolibre = body.enMercadolibre
  if (body.visibleEcommerce !== undefined) updates.visibleEcommerce = body.visibleEcommerce

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
      visibleEcommerce: updated.visibleEcommerce,
    },
  })
})

// PUT /products/:id
app.put('/products/:id', authMiddleware, async (c) => {
  const db = c.get('db')
  const id = parseInt(c.req.param('id'))
  const body = await c.req.json<{ enMercadolibre?: number; visibleEcommerce?: number }>()

  const [existing] = await db.select().from(products).where(eq(products.id, id)).limit(1)
  if (!existing) {
    return c.json({ success: false, error: 'Producto no encontrado' }, 404)
  }

  const updates: Record<string, any> = {}
  if (body.enMercadolibre !== undefined) updates.enMercadolibre = body.enMercadolibre
  if (body.visibleEcommerce !== undefined) updates.visibleEcommerce = body.visibleEcommerce

  if (Object.keys(updates).length > 0) {
    await db.update(products).set(updates).where(eq(products.id, id))
  }

  return c.json({ success: true })
})

// ==================== MARCAS V2 ====================

// GET /v2/brands
app.get('/v2/brands', async (c) => {
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
      isVisibleWeb: b.isVisibleWeb,
    })),
  })
})

// GET /v2/brands/:id
app.get('/v2/brands/:id', async (c) => {
  const db = c.get('db')
  const id = parseInt(c.req.param('id'))

  const [brand] = await db.select().from(brands).where(eq(brands.id, id)).limit(1)
  if (!brand) {
    return c.json({ success: false, error: 'Marca no encontrada' }, 404)
  }

  return c.json({
    success: true,
    data: { id: brand.id, name: brand.name, slug: brand.slug, imageUrl: brand.imageUrl, isActive: brand.isActive, isVisibleWeb: brand.isVisibleWeb },
  })
})

// POST /v2/brands
app.post('/v2/brands', authMiddleware, async (c) => {
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

  const [newBrand] = await db.insert(brands).values({ name: body.name, slug }).returning()

  return c.json({
    success: true,
    data: { id: newBrand.id, name: newBrand.name, slug: newBrand.slug, imageUrl: newBrand.imageUrl, isActive: newBrand.isActive, isVisibleWeb: newBrand.isVisibleWeb },
  }, 201)
})

// PUT /v2/brands/:id
app.put('/v2/brands/:id', authMiddleware, async (c) => {
  const db = c.get('db')
  const id = parseInt(c.req.param('id'))
  const body = await c.req.json<{ name?: string; slug?: string; isVisibleWeb?: number }>()

  const [existing] = await db.select().from(brands).where(eq(brands.id, id)).limit(1)
  if (!existing) {
    return c.json({ success: false, error: 'Marca no encontrada' }, 404)
  }

  const updates: Record<string, any> = {}
  if (body.name) updates.name = body.name
  if (body.slug) updates.slug = body.slug
  if (body.isVisibleWeb !== undefined) updates.isVisibleWeb = body.isVisibleWeb

  await db.update(brands).set(updates).where(eq(brands.id, id))
  const [updated] = await db.select().from(brands).where(eq(brands.id, id)).limit(1)

  return c.json({
    success: true,
    data: { id: updated.id, name: updated.name, slug: updated.slug, imageUrl: updated.imageUrl, isActive: updated.isActive, isVisibleWeb: updated.isVisibleWeb },
  })
})

// DELETE /v2/brands/:id
app.delete('/v2/brands/:id', authMiddleware, async (c) => {
  const db = c.get('db')
  const id = parseInt(c.req.param('id'))

  const [existing] = await db.select().from(brands).where(eq(brands.id, id)).limit(1)
  if (!existing) {
    return c.json({ success: false, error: 'Marca no encontrada' }, 404)
  }

  await db.update(brands).set({ isActive: 0 }).where(eq(brands.id, id))
  return c.json({ success: true, message: 'Marca desactivada' })
})

// POST /v2/brands/:id/image
app.post('/v2/brands/:id/image', authMiddleware, async (c) => {
  const db = c.get('db')
  const bucket = c.env.IMAGES_BUCKET
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

  // Generar key único para R2
  const ext = file.name.split('.').pop() || 'jpg'
  const key = `brands/${id}/${Date.now()}.${ext}`

  // Subir a R2
  await bucket.put(key, file.stream(), {
    httpMetadata: {
      contentType: file.type,
    },
  })

  // URL pública del bucket (configurar en vars)
  const publicUrl = c.env.R2_PUBLIC_URL || 'https://pub-ths-images.r2.dev'
  const imageUrl = `${publicUrl}/${key}`

  await db.update(brands).set({ imageUrl }).where(eq(brands.id, id))
  return c.json({ success: true, data: { imageUrl } })
})

// DELETE /v2/brands/:id/image
app.delete('/v2/brands/:id/image', authMiddleware, async (c) => {
  const db = c.get('db')
  const bucket = c.env.IMAGES_BUCKET
  const id = parseInt(c.req.param('id'))

  // Obtener la marca para saber el key de la imagen
  const [existing] = await db.select().from(brands).where(eq(brands.id, id)).limit(1)
  if (existing?.imageUrl) {
    // Extraer el key de la URL
    const url = existing.imageUrl
    const keyMatch = url.match(/brands\/\d+\/[\w.]+$/)
    if (keyMatch) {
      await bucket.delete(keyMatch[0])
    }
  }

  await db.update(brands).set({ imageUrl: null }).where(eq(brands.id, id))
  return c.json({ success: true, message: 'Imagen eliminada' })
})

// ==================== CATEGORÍAS V2 ====================

type CategoryWithChildren = Category & { children: CategoryWithChildren[] }

function buildTree(cats: Category[], parentId: number | null = null): CategoryWithChildren[] {
  return cats
    .filter(c => c.parentId === parentId)
    .map(c => ({ ...c, children: buildTree(cats, c.id) }))
}

function formatTree(cats: CategoryWithChildren[]): any[] {
  return cats.map(c => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    imageUrl: c.imageUrl,
    parentId: c.parentId,
    isActive: c.isActive,
    children: formatTree(c.children),
  }))
}

// GET /v2/categories
app.get('/v2/categories', async (c) => {
  const db = c.get('db')
  const flat = c.req.query('flat') === 'true'
  const includeInactive = c.req.query('includeInactive') === 'true'

  let query = db.select().from(categories)
  if (!includeInactive) {
    query = query.where(eq(categories.isActive, 1)) as typeof query
  }

  const result = await query.orderBy(categories.name)

  if (flat) {
    return c.json({
      success: true,
      data: result.map(c => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        imageUrl: c.imageUrl,
        parentId: c.parentId,
        isActive: c.isActive,
      })),
    })
  }

  const tree = formatTree(buildTree(result as Category[]))
  return c.json({ success: true, data: tree })
})

// GET /v2/categories/:id
app.get('/v2/categories/:id', async (c) => {
  const db = c.get('db')
  const id = parseInt(c.req.param('id'))

  const [category] = await db.select().from(categories).where(eq(categories.id, id)).limit(1)
  if (!category) {
    return c.json({ success: false, error: 'Categoría no encontrada' }, 404)
  }

  return c.json({
    success: true,
    data: { id: category.id, name: category.name, slug: category.slug, imageUrl: category.imageUrl, parentId: category.parentId, isActive: category.isActive },
  })
})

// POST /v2/categories
app.post('/v2/categories', authMiddleware, async (c) => {
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

  const [newCategory] = await db.insert(categories).values({
    name: body.name,
    slug,
    parentId: body.parentId || null,
  }).returning()

  return c.json({
    success: true,
    data: { id: newCategory.id, name: newCategory.name, slug: newCategory.slug, imageUrl: newCategory.imageUrl, parentId: newCategory.parentId, isActive: newCategory.isActive },
  }, 201)
})

// PUT /v2/categories/:id
app.put('/v2/categories/:id', authMiddleware, async (c) => {
  const db = c.get('db')
  const id = parseInt(c.req.param('id'))
  const body = await c.req.json<{ name?: string; slug?: string; parentId?: number | null }>()

  const [existing] = await db.select().from(categories).where(eq(categories.id, id)).limit(1)
  if (!existing) {
    return c.json({ success: false, error: 'Categoría no encontrada' }, 404)
  }

  const updates: Record<string, any> = {}
  if (body.name) updates.name = body.name
  if (body.slug !== undefined) updates.slug = body.slug
  if (body.parentId !== undefined) updates.parentId = body.parentId

  await db.update(categories).set(updates).where(eq(categories.id, id))
  const [updated] = await db.select().from(categories).where(eq(categories.id, id)).limit(1)

  return c.json({
    success: true,
    data: { id: updated.id, name: updated.name, slug: updated.slug, imageUrl: updated.imageUrl, parentId: updated.parentId, isActive: updated.isActive },
  })
})

// DELETE /v2/categories/:id
app.delete('/v2/categories/:id', authMiddleware, async (c) => {
  const db = c.get('db')
  const id = parseInt(c.req.param('id'))

  await db.update(categories).set({ isActive: 0 }).where(eq(categories.id, id))
  return c.json({ success: true, message: 'Categoría desactivada' })
})

// POST /v2/categories/:id/image
app.post('/v2/categories/:id/image', authMiddleware, async (c) => {
  const db = c.get('db')
  const id = parseInt(c.req.param('id'))

  const formData = await c.req.formData()
  const file = formData.get('image') as File | null
  if (!file) {
    return c.json({ success: false, error: 'No se proporcionó imagen' }, 400)
  }

  const arrayBuffer = await file.arrayBuffer()
  const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
  const imageUrl = `data:${file.type};base64,${base64}`

  await db.update(categories).set({ imageUrl }).where(eq(categories.id, id))
  return c.json({ success: true, data: { imageUrl } })
})

// DELETE /v2/categories/:id/image
app.delete('/v2/categories/:id/image', authMiddleware, async (c) => {
  const db = c.get('db')
  const id = parseInt(c.req.param('id'))

  await db.update(categories).set({ imageUrl: null }).where(eq(categories.id, id))
  return c.json({ success: true, message: 'Imagen eliminada' })
})

// ==================== PRODUCTOS V2 ====================

// GET /v2/products/:id
app.get('/v2/products/:id', async (c) => {
  const db = c.get('db')
  const id = parseInt(c.req.param('id'))

  const [product] = await db.select().from(products).where(eq(products.id, id)).limit(1)
  if (!product) {
    return c.json({ success: false, error: 'Producto no encontrado' }, 404)
  }

  let brandInfo = null
  if (product.brandId) {
    const [brand] = await db.select().from(brands).where(eq(brands.id, product.brandId)).limit(1)
    if (brand) {
      brandInfo = { id: brand.id, name: brand.name, imageUrl: brand.imageUrl }
    }
  }

  const productCats = await db.select({ categoryId: productCategories.categoryId })
    .from(productCategories)
    .where(eq(productCategories.productId, id))

  const categoryIds = productCats.map(pc => pc.categoryId)
  let productCategoriesList: { id: number; name: string; slug: string }[] = []

  if (categoryIds.length > 0) {
    const cats = await db.select().from(categories).where(inArray(categories.id, categoryIds))
    productCategoriesList = cats.map(c => ({ id: c.id, name: c.name, slug: c.slug }))
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
      categories: productCategoriesList,
      internalReference: product.internalReference,
      storehouseId: product.storehouseId,
      enMercadolibre: product.enMercadolibre,
      visibleEcommerce: product.visibleEcommerce,
      images: product.images ? JSON.parse(product.images) : [],
    },
  })
})

// PUT /v2/products/:id
app.put('/v2/products/:id', authMiddleware, async (c) => {
  const db = c.get('db')
  const id = parseInt(c.req.param('id'))
  const body = await c.req.json<{
    name?: string
    salePrice?: number
    stockQuantity?: number
    brandId?: number | null
    categoryIds?: number[]
    image?: string
    visibleEcommerce?: number
  }>()

  const [existing] = await db.select().from(products).where(eq(products.id, id)).limit(1)
  if (!existing) {
    return c.json({ success: false, error: 'Producto no encontrado' }, 404)
  }

  const updates: Record<string, any> = {}
  if (body.name !== undefined) updates.name = body.name
  if (body.salePrice !== undefined) updates.salePrice = body.salePrice
  if (body.stockQuantity !== undefined) updates.stockQuantity = body.stockQuantity
  if (body.brandId !== undefined) updates.brandId = body.brandId
  if (body.image !== undefined) updates.image512 = body.image
  if (body.visibleEcommerce !== undefined) updates.visibleEcommerce = body.visibleEcommerce

  await db.update(products).set(updates).where(eq(products.id, id))

  if (body.categoryIds !== undefined) {
    await db.delete(productCategories).where(eq(productCategories.productId, id))
    if (body.categoryIds.length > 0) {
      await db.insert(productCategories).values(
        body.categoryIds.map(categoryId => ({ productId: id, categoryId }))
      )
    }
  }

  return c.json({ success: true })
})

// GET /v2/products/by-category/:categoryId
app.get('/v2/products/by-category/:categoryId', async (c) => {
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
      visibleEcommerce: p.visibleEcommerce,
    })),
    total: productIds.length,
  })
})

// GET /v2/products/by-brand/:brandId
app.get('/v2/products/by-brand/:brandId', async (c) => {
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
      visibleEcommerce: p.visibleEcommerce,
    })),
    total: total[0]?.count || 0,
  })
})

// POST /v2/products/:id/categories
app.post('/v2/products/:id/categories', authMiddleware, async (c) => {
  const db = c.get('db')
  const id = parseInt(c.req.param('id'))
  const body = await c.req.json<{ categoryIds: number[] }>()

  if (!body.categoryIds || body.categoryIds.length === 0) {
    return c.json({ success: false, error: 'Se requieren categoryIds' }, 400)
  }

  const existingCats = await db.select({ categoryId: productCategories.categoryId })
    .from(productCategories)
    .where(eq(productCategories.productId, id))

  const existingIds = existingCats.map(c => c.categoryId)
  const newIds = body.categoryIds.filter(cid => !existingIds.includes(cid))

  if (newIds.length > 0) {
    await db.insert(productCategories).values(
      newIds.map(categoryId => ({ productId: id, categoryId }))
    )
  }

  return c.json({ success: true })
})

// DELETE /v2/products/:id/categories/:categoryId
app.delete('/v2/products/:id/categories/:categoryId', authMiddleware, async (c) => {
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

// POST /v2/products/:id/image
app.post('/v2/products/:id/image', authMiddleware, async (c) => {
  const db = c.get('db')
  const bucket = c.env.IMAGES_BUCKET
  const publicUrl = c.env.R2_PUBLIC_URL || 'https://pub-180ece43688c448aa5a33b73e8a33c75.r2.dev'
  const id = parseInt(c.req.param('id'))

  const [existing] = await db.select().from(products).where(eq(products.id, id)).limit(1)
  if (!existing) {
    return c.json({ success: false, error: 'Producto no encontrado' }, 404)
  }

  const formData = await c.req.formData()
  const file = formData.get('image') as File | null
  if (!file) {
    return c.json({ success: false, error: 'No se proporcionó imagen' }, 400)
  }

  // Generar key único para R2
  const ext = file.name.split('.').pop() || 'jpg'
  const key = `productos/${id}/${Date.now()}.${ext}`

  // Subir a R2
  await bucket.put(key, file.stream(), {
    httpMetadata: {
      contentType: file.type,
    },
  })

  // URL pública
  const imageUrl = `${publicUrl}/${key}`

  // Si había una imagen anterior en R2, eliminarla
  if (existing.image512 && existing.image512.startsWith(publicUrl)) {
    const oldKey = existing.image512.replace(`${publicUrl}/`, '')
    try {
      await bucket.delete(oldKey)
    } catch {
      // Ignorar errores al eliminar imagen anterior
    }
  }

  await db.update(products).set({ image512: imageUrl }).where(eq(products.id, id))
  return c.json({ success: true, data: { image: imageUrl } })
})

// DELETE /v2/products/:id/image
app.delete('/v2/products/:id/image', authMiddleware, async (c) => {
  const db = c.get('db')
  const bucket = c.env.IMAGES_BUCKET
  const publicUrl = c.env.R2_PUBLIC_URL || 'https://pub-180ece43688c448aa5a33b73e8a33c75.r2.dev'
  const id = parseInt(c.req.param('id'))

  // Obtener el producto para saber si tiene imagen en R2
  const [existing] = await db.select().from(products).where(eq(products.id, id)).limit(1)
  if (existing?.image512 && existing.image512.startsWith(publicUrl)) {
    const key = existing.image512.replace(`${publicUrl}/`, '')
    try {
      await bucket.delete(key)
    } catch {
      // Ignorar errores al eliminar
    }
  }

  await db.update(products).set({ image512: null }).where(eq(products.id, id))
  return c.json({ success: true, message: 'Imagen eliminada' })
})

// ==================== MÚLTIPLES IMÁGENES ====================

// GET /v2/products/:id/images - Obtener array de imágenes
app.get('/v2/products/:id/images', async (c) => {
  const db = c.get('db')
  const id = parseInt(c.req.param('id'))

  const [product] = await db.select({ images: products.images }).from(products).where(eq(products.id, id)).limit(1)
  if (!product) {
    return c.json({ success: false, error: 'Producto no encontrado' }, 404)
  }

  const images: string[] = product.images ? JSON.parse(product.images) : []
  return c.json({ success: true, data: { images } })
})

// POST /v2/products/:id/images - Agregar imagen al array (máximo 4)
app.post('/v2/products/:id/images', authMiddleware, async (c) => {
  const db = c.get('db')
  const bucket = c.env.IMAGES_BUCKET
  const publicUrl = c.env.R2_PUBLIC_URL || 'https://pub-180ece43688c448aa5a33b73e8a33c75.r2.dev'
  const id = parseInt(c.req.param('id'))

  const [existing] = await db.select({ images: products.images }).from(products).where(eq(products.id, id)).limit(1)
  if (!existing) {
    return c.json({ success: false, error: 'Producto no encontrado' }, 404)
  }

  // Parsear imágenes existentes
  const currentImages: string[] = existing.images ? JSON.parse(existing.images) : []

  if (currentImages.length >= 4) {
    return c.json({ success: false, error: 'Máximo 4 imágenes permitidas' }, 400)
  }

  const formData = await c.req.formData()
  const file = formData.get('image') as File | null
  if (!file) {
    return c.json({ success: false, error: 'No se proporcionó imagen' }, 400)
  }

  // Generar key único para R2
  const ext = file.name.split('.').pop() || 'jpg'
  const key = `productos/${id}/gallery/${Date.now()}.${ext}`

  // Subir a R2
  await bucket.put(key, file.stream(), {
    httpMetadata: {
      contentType: file.type,
    },
  })

  // Agregar URL al array
  const imageUrl = `${publicUrl}/${key}`
  currentImages.push(imageUrl)

  await db.update(products).set({ images: JSON.stringify(currentImages) }).where(eq(products.id, id))

  return c.json({
    success: true,
    data: {
      images: currentImages,
      added: imageUrl,
    },
  })
})

// DELETE /v2/products/:id/images/:index - Eliminar imagen específica del array
app.delete('/v2/products/:id/images/:index', authMiddleware, async (c) => {
  const db = c.get('db')
  const bucket = c.env.IMAGES_BUCKET
  const publicUrl = c.env.R2_PUBLIC_URL || 'https://pub-180ece43688c448aa5a33b73e8a33c75.r2.dev'
  const id = parseInt(c.req.param('id'))
  const index = parseInt(c.req.param('index'))

  const [existing] = await db.select({ images: products.images }).from(products).where(eq(products.id, id)).limit(1)
  if (!existing) {
    return c.json({ success: false, error: 'Producto no encontrado' }, 404)
  }

  const currentImages: string[] = existing.images ? JSON.parse(existing.images) : []

  if (index < 0 || index >= currentImages.length) {
    return c.json({ success: false, error: 'Índice de imagen inválido' }, 400)
  }

  // Obtener URL a eliminar
  const imageUrl = currentImages[index]

  // Eliminar de R2 si es una URL del bucket
  if (imageUrl.startsWith(publicUrl)) {
    const key = imageUrl.replace(`${publicUrl}/`, '')
    try {
      await bucket.delete(key)
    } catch {
      // Ignorar errores al eliminar
    }
  }

  // Remover del array
  currentImages.splice(index, 1)

  await db.update(products).set({ images: JSON.stringify(currentImages) }).where(eq(products.id, id))

  return c.json({
    success: true,
    data: { images: currentImages },
    message: 'Imagen eliminada',
  })
})

// DELETE /v2/products/:id/images - Eliminar todas las imágenes del array
app.delete('/v2/products/:id/images', authMiddleware, async (c) => {
  const db = c.get('db')
  const bucket = c.env.IMAGES_BUCKET
  const publicUrl = c.env.R2_PUBLIC_URL || 'https://pub-180ece43688c448aa5a33b73e8a33c75.r2.dev'
  const id = parseInt(c.req.param('id'))

  const [existing] = await db.select({ images: products.images }).from(products).where(eq(products.id, id)).limit(1)
  if (!existing) {
    return c.json({ success: false, error: 'Producto no encontrado' }, 404)
  }

  const currentImages: string[] = existing.images ? JSON.parse(existing.images) : []

  // Eliminar todas las imágenes de R2
  for (const imageUrl of currentImages) {
    if (imageUrl.startsWith(publicUrl)) {
      const key = imageUrl.replace(`${publicUrl}/`, '')
      try {
        await bucket.delete(key)
      } catch {
        // Ignorar errores al eliminar
      }
    }
  }

  await db.update(products).set({ images: null }).where(eq(products.id, id))

  return c.json({ success: true, message: 'Todas las imágenes eliminadas' })
})

// ==================== MIGRACIÓN DE IMÁGENES ====================

// POST /migrate/product-images - Migrar imágenes de productos de base64 a R2 (por lotes)
app.post('/migrate/product-images', authMiddleware, async (c) => {
  const db = c.get('db')
  const bucket = c.env.IMAGES_BUCKET
  const publicUrl = c.env.R2_PUBLIC_URL || 'https://pub-180ece43688c448aa5a33b73e8a33c75.r2.dev'

  // Obtener parámetro de lote (cuántos procesar por request)
  const batchSize = parseInt(c.req.query('batch') || '5')

  // Obtener solo IDs de productos con base64 (sin cargar imágenes)
  const base64Ids = await db.select({ id: products.id })
    .from(products)
    .where(sql`${products.image512} LIKE 'data:%'`)
    .limit(batchSize)

  if (base64Ids.length === 0) {
    return c.json({
      success: true,
      message: 'No hay más imágenes en base64 para migrar',
      migrated: 0,
      remaining: 0,
    })
  }

  let migrated = 0
  let errors: { id: number; error: string }[] = []

  // Procesar cada producto individualmente
  for (const { id } of base64Ids) {
    try {
      // Cargar solo este producto
      const [product] = await db.select({
        id: products.id,
        image512: products.image512,
      }).from(products).where(eq(products.id, id)).limit(1)

      if (!product || !product.image512) continue

      const base64Data = product.image512
      // Extraer el tipo de contenido y los datos base64
      const matches = base64Data.match(/^data:([^;]+);base64,(.+)$/)

      if (!matches) {
        errors.push({ id: product.id, error: 'Formato base64 inválido' })
        continue
      }

      const contentType = matches[1]
      const base64Content = matches[2]

      // Determinar extensión según content type
      let ext = 'jpg'
      if (contentType.includes('png')) ext = 'png'
      else if (contentType.includes('gif')) ext = 'gif'
      else if (contentType.includes('webp')) ext = 'webp'

      // Convertir base64 a ArrayBuffer
      const binaryString = atob(base64Content)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }

      // Generar key para R2
      const key = `productos/${product.id}/${Date.now()}.${ext}`

      // Subir a R2
      await bucket.put(key, bytes, {
        httpMetadata: {
          contentType,
        },
      })

      // Actualizar producto con nueva URL
      const imageUrl = `${publicUrl}/${key}`
      await db.update(products).set({ image512: imageUrl }).where(eq(products.id, product.id))

      migrated++
    } catch (err) {
      errors.push({ id, error: err instanceof Error ? err.message : 'Error desconocido' })
    }
  }

  // Contar cuántos quedan
  const [remainingCount] = await db.select({ count: sql<number>`COUNT(*)` })
    .from(products)
    .where(sql`${products.image512} LIKE 'data:%'`)

  return c.json({
    success: true,
    message: `Migración de lote completada`,
    migrated,
    processed: base64Ids.length,
    remaining: remainingCount?.count || 0,
    errors: errors.length > 0 ? errors : undefined,
  })
})

// GET /migrate/product-images/status - Ver estado de migración
app.get('/migrate/product-images/status', authMiddleware, async (c) => {
  const db = c.get('db')

  // Usar SQL raw para contar sin cargar todas las imágenes en memoria
  const [totalCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(products)

  const [base64Count] = await db.select({ count: sql<number>`COUNT(*)` })
    .from(products)
    .where(sql`${products.image512} LIKE 'data:%'`)

  const [r2Count] = await db.select({ count: sql<number>`COUNT(*)` })
    .from(products)
    .where(sql`${products.image512} LIKE 'http%'`)

  const [nullCount] = await db.select({ count: sql<number>`COUNT(*)` })
    .from(products)
    .where(sql`${products.image512} IS NULL OR ${products.image512} = ''`)

  // Solo obtener IDs de productos con base64 (sin cargar la imagen)
  const base64Ids = await db.select({ id: products.id })
    .from(products)
    .where(sql`${products.image512} LIKE 'data:%'`)

  return c.json({
    success: true,
    data: {
      total: totalCount?.count || 0,
      withBase64: base64Count?.count || 0,
      withR2Url: r2Count?.count || 0,
      withoutImage: nullCount?.count || 0,
      productIdsWithBase64: base64Ids.map(p => p.id),
    },
  })
})

// ==================== MANEJO DE ERRORES ====================

app.onError((err, c) => {
  console.error('Error:', err)
  return c.json({
    success: false,
    error: err.message || 'Error interno del servidor',
  }, 500)
})

app.notFound((c) => {
  return c.json({
    success: false,
    error: 'Ruta no encontrada',
  }, 404)
})

export default app
