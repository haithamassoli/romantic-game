"use client";

import Image from "next/image";
import Link from "next/link";
import { useDeferredValue, useState, ViewTransition } from "react";
import type { CatalogPosition } from "@/lib/catalog";
import { POSITION_IMAGE_SIZE } from "@/lib/site-images";
import { positionsLabel } from "@/lib/tags";

type Item = Pick<CatalogPosition, "slug" | "name" | "name_en" | "image">;

export function CatalogGrid({ items }: { items: Item[] }) {
  const [query, setQuery] = useState("");
  const q = useDeferredValue(query.trim().toLowerCase());
  const shown = q
    ? items.filter(
        (p) => p.name.includes(q) || p.name_en.toLowerCase().includes(q),
      )
    : items;

  return (
    <section className="wrap" aria-label="الوضعيات">
      <label className="catalog-search">
        <span className="sr-only">ابحثا عن وضعية</span>
        <input
          type="search"
          placeholder="ابحثا عن وضعية…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <p className="pos-count" aria-live="polite">
        {shown.length === 0
          ? "لا وضعية بهذا الاسم"
          : positionsLabel(shown.length)}
      </p>
      <ul className="pos-grid">
        {shown.map((p, index) => (
          <li key={p.slug}>
            <Link href={`/positions/catalog/${p.slug}`} className="pos-card">
              <ViewTransition
                name={`cat-title-${p.slug}`}
                share="morph"
                default="none"
              >
                <span className="pos-name">{p.name}</span>
              </ViewTransition>
              <span className="catalog-en" lang="en">
                {p.name_en}
              </span>
              {p.image ? (
                <ViewTransition
                  name={`cat-img-${p.slug}`}
                  share="morph"
                  default="none"
                >
                  <Image
                    src={p.image}
                    alt=""
                    {...POSITION_IMAGE_SIZE}
                    sizes="(max-width: 720px) 50vw, (max-width: 1080px) 33vw, 25vw"
                    loading={index < 2 ? "eager" : "lazy"}
                  />
                </ViewTransition>
              ) : (
                <span className="catalog-blank" aria-hidden="true">
                  ✦
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
