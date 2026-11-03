import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';
import { validateBackendOrigin } from './src/lib/config/environment.server';

const backendOrigin = validateBackendOrigin(process.env.BACKEND_ORIGIN);
const config: NextConfig = {
  ...(process.env.NEXT_BUILD_STANDALONE === '1'
    ? { output: 'standalone' as const, experimental: { cpus: 2 } }
    : {}),
  outputFileTracingRoot: fileURLToPath(new URL('..', import.meta.url)),
  poweredByHeader: false,
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${backendOrigin}/api/v1/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};
export default config;
