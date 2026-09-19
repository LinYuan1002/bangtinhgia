import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function initPrisma(): PrismaClient {
  // 1. Check for Turso (libSQL) connection string in either TURSO_DATABASE_URL or DATABASE_URL
  const tursoUrl =
    process.env.TURSO_DATABASE_URL ||
    (process.env.DATABASE_URL?.startsWith('libsql://') ||
    process.env.DATABASE_URL?.startsWith('https://')
      ? process.env.DATABASE_URL
      : undefined)

  if (tursoUrl) {
    try {
      const { createClient } = require('@libsql/client')
      const { PrismaLibSQL } = require('@prisma/adapter-libsql')

      const libsql = createClient({
        url: tursoUrl,
        authToken: process.env.TURSO_AUTH_TOKEN,
      })

      const adapter = new PrismaLibSQL(libsql)
      console.log('[prisma] Connected to Turso libSQL at', tursoUrl)
      return new PrismaClient({ adapter } as any)
    } catch (e) {
      console.warn('[prisma] Failed to initialize Turso adapter:', e)
    }
  }

  // 2. On Vercel serverless, the filesystem is read-only except /tmp.
  // If dev.db exists, copy it to /tmp/dev.db so SQLite can read and write without EROFS errors.
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    try {
      const tmpDb = '/tmp/dev.db'
      if (!fs.existsSync(tmpDb)) {
        const candidates = [
          path.join(process.cwd(), 'prisma', 'dev.db'),
          path.join(process.cwd(), 'dev.db'),
          path.resolve(__dirname, '..', '..', 'prisma', 'dev.db'),
          path.resolve(__dirname, 'prisma', 'dev.db'),
        ]
        for (const src of candidates) {
          if (fs.existsSync(src)) {
            fs.copyFileSync(src, tmpDb)
            console.log(`[prisma] Copied SQLite database from ${src} to ${tmpDb}`)
            break
          }
        }
      }

      if (fs.existsSync(tmpDb)) {
        process.env.DATABASE_URL = `file:${tmpDb}`
        return new PrismaClient({
          datasources: { db: { url: `file:${tmpDb}` } },
        })
      }
    } catch (err) {
      console.warn('[prisma] Vercel SQLite /tmp copy failed:', err)
    }
  }

  // 3. Local SQLite default
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

export const prisma = globalForPrisma.prisma ?? initPrisma()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
