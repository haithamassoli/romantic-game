import type { NextConfig } from "next";

const convex = process.env.NEXT_PUBLIC_CONVEX_URL;

const nextConfig: NextConfig = {
  images: {
    // Drawings uploaded from /admin live in this deployment's Convex file storage.
    remotePatterns: convex ? [new URL(`${convex}/api/storage/**`)] : [],
  },
  // No page address leaves with a link or a request, no MIME guessing, and no
  // other site may frame these pages.
  headers: async () => [
    {
      source: "/:path*",
      headers: [
        { key: "Referrer-Policy", value: "no-referrer" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
      ],
    },
  ],
};

export default nextConfig;
