import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Portable Node.js runtime for Railway; Vercel can still build this app.
  output: "standalone",
  experimental: {
    turbopackFileSystemCacheForDev: true,
    // Tree-shake icon & UI libraries — eliminates unused exports
    optimizePackageImports: ["lucide-react", "motion/react"],
  },
  // React Compiler: enable after `npm i babel-plugin-react-compiler`
  // reactCompiler: true,
  images: {
    // Existing assets are already web-optimized. Do not silently enable a
    // separately metered Cloudflare Images product during host migration.
    unoptimized: process.env.CLOUDFLARE_BUILD === "1",
    minimumCacheTTL: 86400,
    formats: ["image/avif", "image/webp"],
  },
  compress: true,
  redirects: async () => [
    {
      source: "/:path*",
      has: [{ type: "host", value: "www\\.aimedia\\.global" }],
      destination: "https://aimedia.global/:path*",
      permanent: true,
    },
  ],
  // Performance headers
  headers: async () => [
    {
      source: "/(.*)",
      has: [{ type: "host", value: ".*\\.workers\\.dev" }],
      headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
    },
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        // Keep production protections outside Vercel as well.
        { key: "X-XSS-Protection", value: "1; mode=block" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
      ],
    },
    {
      source: "/(.*)\\.(js|css|woff2|avif|webp|jpg|jpeg|png|svg|ico)",
      headers: [
        { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
      ],
    },
    {
      // Self-hosted Spline scene + runtime wasm. Content-addressed by replace:
      // updating the scene means shipping new files, so immutable is safe.
      source: "/spline/:path*",
      headers: [
        { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
      ],
    },
    ...([['br', 'br'], ['gzip', 'gzip']] as const).map(([suffix, encoding]) => ({
      // Precompressed, versioned scene aliases. Fetch transparently decodes the
      // exact native Spline bytes in browsers, with no runtime or Worker patch.
      source: `/spline/robot-baked-v2-${suffix}.splinecode`,
      headers: [
        { key: 'Content-Type', value: 'application/octet-stream' },
        { key: 'Content-Encoding', value: encoding },
        { key: 'Cache-Control', value: 'public, max-age=31536000, immutable, no-transform' },
      ],
    })),
  ],
};

export default nextConfig;
