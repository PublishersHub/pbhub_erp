import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,

  experimental: {
    // Required for standalone output in a monorepo.
    // Tells Next.js to trace dependencies from the monorepo root
    // (two levels up from apps/web/) so the standalone output
    // includes all resolved modules from the pnpm workspace.
    outputFileTracingRoot: path.join(__dirname, '../../'),
  },
};

export default nextConfig;
