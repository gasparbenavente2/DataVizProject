import type { NextConfig } from "next";

// Set STATIC_EXPORT=true only for GitHub Pages builds (see .github/workflows/deploy.yml).
// Local dev runs as a normal Next.js server so API routes work.
const isStaticExport = process.env.STATIC_EXPORT === 'true';

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  ...(isStaticExport && {
    output: 'export',
    basePath: '/perspectiva',
    trailingSlash: true,
    env: { NEXT_PUBLIC_BASE_PATH: '/perspectiva' },
  }),
  images: { unoptimized: true },
};

export default nextConfig;
