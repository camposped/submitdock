import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // better-sqlite3 is a native addon, so it has to stay out of the bundle and
  // be required at runtime instead.
  serverExternalPackages: ['better-sqlite3'],
}

export default nextConfig
