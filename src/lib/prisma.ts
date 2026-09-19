import { PrismaClient } from '@prisma/client'

// ─────────────────────────────────────────
// DEVELOPMENT: Use local SQLite
// PRODUCTION: Use Turso via adapter (see below)
// ─────────────────────────────────────────

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  // When TURSO_DATABASE_URL is set, use Turso adapter
  if (process.env.TURSO_DATABASE_URL && process.env.TURSO_DATABASE_URL.startsWith('libsql://')) {
    try {
      // Dynamic import to avoid breaking local dev without Turso
      const { createClient } = require('@libsql/client')
      const { PrismaLibSQL } = require('@prisma/adapter-libsql')

      const libsql = createClient({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
      })

      const adapter = new PrismaLibSQL(libsql)
      return new PrismaClient({ adapter } as any)
    } catch (e) {
      console.warn('[prisma] Turso adapter failed, falling back to SQLite:', e)
    }
  }

  // Fallback: local SQLite
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
