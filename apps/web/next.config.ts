import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const apiProxyUrl = process.env.API_PROXY_URL;
    if (!apiProxyUrl) return [];

    return [
      {
        source: "/api/:path*",
        destination: `${apiProxyUrl}/api/:path*`,
      },
      {
        source: "/files/:path*",
        destination: `${apiProxyUrl}/files/:path*`,
      },
    ];
  },
};

export default nextConfig;
