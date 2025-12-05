import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker production builds
  output: "standalone",
  
  // Disable ESLint during build (already checked in dev)
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Disable TypeScript errors during build (for faster builds)
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
