import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  turbopack: {
    resolveAlias: {
      fs: {
        browser: "./lib/shims/browser-fs.ts",
      },
      path: {
        browser: "./lib/shims/browser-path.ts",
      },
    },
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve ??= {};
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }

    return config;
  },
  async redirects() {
    return [
      {
        source: "/tools/gradient-generator",
        destination: "/tools/gradient-genny",
        permanent: true, // 308 redirect
      },
    ];
  },
};

export default nextConfig;
