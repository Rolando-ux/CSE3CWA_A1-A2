import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  async rewrites() {
    // The brief asks for /health; the handler lives with the other API routes.
    return [{ source: "/health", destination: "/api/health" }];
  },
};

export default nextConfig;
