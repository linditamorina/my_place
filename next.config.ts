import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // better-sqlite3 është modul nativ: ngarkohet nga node_modules, jo nga bundle-i.
  serverExternalPackages: ["better-sqlite3"],
  experimental: {
    // Dëshmitë e pagesave dhe fotot e prishjeve deri në 5 MB (+ pak hapësirë për multipart).
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
