import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      ],
    },
    {
      source: "/(.*)\\.(js|css|woff2|avif|webp|jpg|png|svg)",
      headers: [
        { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
      ],
    },
  ],
};

export default nextConfig;
