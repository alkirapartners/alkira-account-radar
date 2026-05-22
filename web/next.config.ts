import type { NextConfig } from "next";

const API_INTERNAL = process.env.RADAR_API_INTERNAL ?? "http://127.0.0.1:8601";

const config: NextConfig = {
  basePath: "/radar",
  assetPrefix: "/radar",
  experimental: { typedRoutes: true },
  async rewrites() {
    return [
      {
        source: "/api/radar/:path*",
        destination: `${API_INTERNAL}/api/radar/:path*`,
        basePath: false,
      },
    ];
  },
};

export default config;
