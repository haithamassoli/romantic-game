import type { NextConfig } from "next";

const convex = process.env.NEXT_PUBLIC_CONVEX_URL;

const nextConfig: NextConfig = {
  images: {
    // Drawings uploaded from /admin live in this deployment's Convex file storage.
    remotePatterns: convex ? [new URL(`${convex}/api/storage/**`)] : [],
  },
};

export default nextConfig;
