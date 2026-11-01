import type { NextConfig } from 'next';
import { validateBackendOrigin } from './src/lib/config/environment.server';

const backendOrigin = validateBackendOrigin(process.env.BACKEND_ORIGIN);
const config: NextConfig = {
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
