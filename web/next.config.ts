import type { NextConfig } from "next";

const RADAR_API = process.env.RADAR_API_INTERNAL ?? "http://127.0.0.1:8601";
const BRIEF_API = process.env.BRIEF_API_INTERNAL ?? "http://127.0.0.1:8501";

// In production nginx routes /api/* itself; these rewrites serve local development.
const config: NextConfig = {
  typedRoutes: true,
  async rewrites() {
    return [
      { source: "/api/radar/:path*", destination: `${RADAR_API}/api/radar/:path*` },
      { source: "/api/brief/:path*", destination: `${BRIEF_API}/api/brief/:path*` },
    ];
  },
};

export default config;
