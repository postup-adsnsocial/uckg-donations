import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  async rewrites() {
    const apiUrl =
      process.env.API_URL ??
      process.env.NEXT_PUBLIC_API_URL ??
      'https://uckg-donations.vercel.app';

    return [
      {
        destination: `${apiUrl}/:path*`,
        source: '/api/:path*',
      },
    ];
  },
};

export default nextConfig;
