/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@igc/content', '@igc/design-tokens'],
  poweredByHeader: false,

  // Lifted so Server Actions can accept multipart uploads (post-visit
  // report photos). 4 photos at 5MB each plus form fields = ~22MB worst
  // case; round up to 25MB.
  experimental: {
    serverActions: {
      bodySizeLimit: '25mb',
    },
    // @node-rs/argon2 ships a native .node binary that webpack can't
    // bundle. Mark it server-external so Next imports it at runtime.
    serverComponentsExternalPackages: ['@node-rs/argon2'],
  },

  // Long-lived cache for stable brand assets. Lighthouse audit flagged the
  // default 4h TTL Cloudflare was using. These files only change when we
  // rename them (cache-busting via filename), so a 1-year max-age is safe.
  async headers() {
    return [
      {
        source: '/:path(logo|photos|fonts)/:file*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
