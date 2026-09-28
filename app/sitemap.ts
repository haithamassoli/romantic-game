import { fetchQuery } from "convex/nextjs";
import type { MetadataRoute } from "next";
import { api } from "@/convex/_generated/api";
import { SITE_URL } from "@/lib/site";

const pages = [
  "",
  "/positions",
  "/play",
  "/play/cards",
  "/play/desires",
  "/play/discover",
  "/play/library",
  "/play/path",
  "/play/wheel",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const positions = await fetchQuery(api.positions.list, {});
  return [
    ...pages.map((path) => ({ url: `${SITE_URL}${path}` })),
    ...positions.map((p) => ({ url: `${SITE_URL}/positions/${p.slug}` })),
  ];
}
