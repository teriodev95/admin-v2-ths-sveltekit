import { sqliteTable, text, integer, real, primaryKey } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

// Usuarios
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  role: text('role'),
  pin: text('pin'),
  createdAt: text('created_at').notNull().default(sql`DATETIME(CURRENT_TIMESTAMP, '-6 hours')`),
  updatedAt: text('updated_at').notNull().default(sql`DATETIME(CURRENT_TIMESTAMP, '-6 hours')`),
})

// Marcas
export const brands = sqliteTable('brands', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  imageUrl: text('image_url'),
  isActive: integer('is_active').default(1),
  createdAt: text('created_at').notNull().default(sql`DATETIME(CURRENT_TIMESTAMP, '-6 hours')`),
  updatedAt: text('updated_at').notNull().default(sql`DATETIME(CURRENT_TIMESTAMP, '-6 hours')`),
})

// Categorías
export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  imageUrl: text('image_url'),
  parentId: integer('parent_id').references(() => categories.id),
  isActive: integer('is_active').default(1),
  createdAt: text('created_at').notNull().default(sql`DATETIME(CURRENT_TIMESTAMP, '-6 hours')`),
  updatedAt: text('updated_at').notNull().default(sql`DATETIME(CURRENT_TIMESTAMP, '-6 hours')`),
})

// Productos
export const products = sqliteTable('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  barcode: text('barcode'),
  name: text('name'),
  stockQuantity: integer('stock_quantity').default(0),
  cost: real('cost').default(0),
  salePrice: real('sale_price'),
  internalReference: text('internal_reference'),
  storehouseId: integer('storehouse_id'),
  image512: text('image_512'),
  brand: text('brand'),
  brandId: integer('brand_id').references(() => brands.id),
  enMercadolibre: integer('en_mercadolibre').default(0),
  createdBy: text('created_by'),
  createdAt: text('created_at').notNull().default(sql`DATETIME(CURRENT_TIMESTAMP, '-6 hours')`),
  updatedAt: text('updated_at').notNull().default(sql`DATETIME(CURRENT_TIMESTAMP, '-6 hours')`),
})

// Tabla pivote productos-categorías
export const productCategories = sqliteTable('product_categories', {
  productId: integer('product_id').notNull().references(() => products.id),
  categoryId: integer('category_id').notNull().references(() => categories.id),
}, (table) => ({
  pk: primaryKey({ columns: [table.productId, table.categoryId] }),
}))

// Types
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

export type Brand = typeof brands.$inferSelect
export type NewBrand = typeof brands.$inferInsert

export type Category = typeof categories.$inferSelect
export type NewCategory = typeof categories.$inferInsert

export type Product = typeof products.$inferSelect
export type NewProduct = typeof products.$inferInsert

export type ProductCategory = typeof productCategories.$inferSelect
