/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@igc/content', '@igc/design-tokens'],
  poweredByHeader: false,

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
