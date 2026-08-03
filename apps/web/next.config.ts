import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  eslint: {
    // O lint oficial roda como gate separado; evita a execução legada e redundante do Next 15.
    ignoreDuringBuilds: true,
  },
  output: 'standalone',
  outputFileTracingRoot: path.join(process.cwd(), '../..'),
};

export default nextConfig;
