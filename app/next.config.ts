import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  devIndicators: false,
  images: { unoptimized: true },
};

export default nextConfig;
