import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Portable Node.js runtime for Railway; Vercel can still build this app.
  output: "standalone",
  experimental: {
    turbopackFileSystemCacheForDev: true,
    // Tree-shake icon & UI libraries — eliminates unused exports
    optimizePackageImports: ["lucide-react", "@radix-ui/react-icons", "motion/react"],
  },
  // React Compiler: enable after `npm i babel-plugin-react-compiler`
  // reactCompiler: true,
  images: {
    minimumCacheTTL: 86400,
    formats: ["image/avif", "image/webp"],
  },
  compress: true,
  // Performance headers
  headers: async () => [
    {
      source: "/(.*)",
      has: [{ type: "host", value: "aimedia-web-staging.up.railway.app" }],
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
  ],
};

export default nextConfig;
