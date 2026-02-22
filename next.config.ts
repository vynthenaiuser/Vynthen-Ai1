import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloudflare Pages compatible configuration
  // Note: When deploying to Cloudflare, use: npx @cloudflare/next-on-pages
  
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  
  // Images configuration for Cloudflare
  images: {
    unoptimized: true, // Cloudflare Pages doesn't support Next.js Image Optimization API
  },
};

export default nextConfig;
