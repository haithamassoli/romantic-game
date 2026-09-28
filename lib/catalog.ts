// The position catalog at /positions/catalog: names, descriptions and
// variations indexed from educacionsexual.org, with our own drawings.
import data from "../docs/educacionsexual-positions.json" with { type: "json" };

export type CatalogPosition = {
  slug: string;
  name: string;
  name_en: string;
  description: string;
  url: string;
  image?: string;
  variations: { name: string; name_en: string; description: string }[];
};

export const CATALOG_SOURCE = data.source;

/** The source page's address is unique per position, so its last part is the slug. */
export const catalogSlug = (url: string) =>
  new URL(url).pathname.split("/").filter(Boolean).at(-1) ?? "";

export const CATALOG: CatalogPosition[] = data.positions.map((p) => ({
  ...p,
  slug: catalogSlug(p.url),
}));
