import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { users } from '../db/schema'
import { generateToken, verifyPassword } from '../middleware/auth'
import type { Database } from '../db'

type Env = {
  Bindings: {
    TURSO_CONNECTION_URL: string
    TURSO_AUTH_TOKEN: string
  }
  Variables: {
    db: Database
  }
}

const auth = new Hono<Env>()

// POST /login
auth.post('/login', async (c) => {
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

export default auth
