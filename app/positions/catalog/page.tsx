import type { Metadata } from "next";
import Link from "next/link";
import { CATALOG } from "@/lib/catalog";
import { CatalogGrid } from "./grid";

export const metadata: Metadata = {
  title: "موسوعة الوضعيات",
  alternates: { canonical: "/positions/catalog" },
  description:
    "فهرس عربي لأكثر من خمسمئة وضعية للأزواج البالغين، مع رسم ووصف وتنويعات لكل وضعية.",
};

export default function CatalogPage() {
  return (
    <>
      <section className="wrap pos-intro" aria-labelledby="catalog-title">
        <Link className="back-link" href="/positions">
          <span aria-hidden="true">→</span> دليل الوضعيات
        </Link>
        <h1 id="catalog-title">موسوعة الوضعيات</h1>
        <p>
          {CATALOG.length} وضعية بأسمائها المتداولة، لكل منها وصف قصير وتنويعات
          تغيّر الزاوية أو الإيقاع. ابحثا بالاسم العربي أو الإنجليزي.
        </p>
        <p className="pos-consent">
          ليست كل وضعية لكل جسد. ابدآ بما يريحكما، وأي ألم يعني التوقف.
        </p>
      </section>
      <CatalogGrid
        items={CATALOG.map(({ slug, name, name_en, image }) => ({
          slug,
          name,
          name_en,
          image,
        }))}
      />
    </>
  );
}
