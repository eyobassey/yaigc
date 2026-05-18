/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Workspace packages are TypeScript source; let Next.js transpile them.
  transpilePackages: ['@igc/content', '@igc/design-tokens'],
  // No external font requests - fonts self-hosted via next/font/local (chunk 2).
  poweredByHeader: false,
};

export default nextConfig;
