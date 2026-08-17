import path from 'node:path'

import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'sqlite',
  schema: './db/schema.ts',
  out: './db/migrations',
  dbCredentials: {
    url: process.env.SUBMITDOCK_DB ?? path.join(process.cwd(), 'data', 'submitdock.db'),
  },
  strict: true,
  verbose: true,
})
