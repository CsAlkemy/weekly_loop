import type { NextConfig } from "next";

const apiOrigin = process.env.API_ORIGIN ?? "http://localhost:8000";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: { position: "bottom-right" },
  transpilePackages: ["@repo/ui", "@repo/library"],
  async redirects() {
    return [{ source: "/admin/users", destination: "/admin/settings", permanent: false }];
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
