import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,

  // Required for standalone output in a monorepo.
  // Tells Next.js to trace dependencies from the monorepo root
  // (two levels up from apps/web/) so the standalone output
  // includes all resolved modules from the pnpm workspace.
  outputFileTracingRoot: path.join(__dirname, '../../'),
};

export default nextConfig;
