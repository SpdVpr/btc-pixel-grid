import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // Zakázání ESLint kontroly při buildu
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Zakázání TypeScript kontroly při buildu
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
