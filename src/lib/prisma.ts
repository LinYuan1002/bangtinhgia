import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  schemaChecked: boolean | undefined
}

function initPrisma(): PrismaClient {
  // 1. Check for Turso (libSQL) connection string in either TURSO_DATABASE_URL or DATABASE_URL
  const tursoUrl =
    process.env.TURSO_DATABASE_URL ||
    (process.env.DATABASE_URL?.startsWith('libsql://') ||
    process.env.DATABASE_URL?.startsWith('https://')
      ? process.env.DATABASE_URL
      : undefined)

  const authToken = process.env.TURSO_AUTH_TOKEN

  if (tursoUrl) {
    try {
      const { createClient } = require('@libsql/client')
      const { PrismaLibSQL } = require('@prisma/adapter-libsql')

      const libsql = createClient({
        url: tursoUrl,
        authToken: authToken,
      })

      const adapter = new PrismaLibSQL(libsql)
      console.log('[prisma] Successfully initialized Prisma with Turso libSQL at', tursoUrl)

      // Trigger background schema check once
      if (!globalForPrisma.schemaChecked) {
        globalForPrisma.schemaChecked = true
        import('./db-init').then(({ ensureDatabaseSchema, seedInitialDataIfEmpty }) => {
          ensureDatabaseSchema(libsql).then((res) => {
            if (res.success) {
              seedInitialDataIfEmpty(libsql).catch(() => {})
            }
          }).catch((e) => {
            console.warn('[prisma] Auto-schema init note:', e.message)
          })
        }).catch(() => {})
      }

      return new PrismaClient({ adapter } as any)
    } catch (e: any) {
      console.warn('[prisma] Failed to initialize Turso adapter:', e.message || e)
    }
  }

  // 2. On Vercel serverless without Turso, filesystem is read-only except /tmp
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
    } catch (err: any) {
      console.warn('[prisma] Vercel SQLite /tmp copy note:', err.message || err)
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
