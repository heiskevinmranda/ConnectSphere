import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [],
  },
  serverExternalPackages: ["bcryptjs", "jsonwebtoken"],
};

export default nextConfig;
