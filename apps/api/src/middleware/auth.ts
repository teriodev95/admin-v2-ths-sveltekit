import { Context, Next } from 'hono'
import * as jose from 'jose'

const JWT_SECRET = new TextEncoder().encode('ths-secret-key-2024')

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ success: false, error: 'Token no proporcionado' }, 401)
  }

  const token = authHeader.substring(7)

  try {
    const { payload } = await jose.jwtVerify(token, JWT_SECRET)
    c.set('user', payload)
    await next()
  } catch {
    return c.json({ success: false, error: 'Token inválido o expirado' }, 401)
  }
}

export async function generateToken(payload: { id: number; email: string; role: string }) {
  return await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET)
}

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function verifyPassword(password: string, storedPassword: string): Promise<boolean> {
  // Comparación directa ya que los passwords están en texto plano en la BD
  return password === storedPassword
}
