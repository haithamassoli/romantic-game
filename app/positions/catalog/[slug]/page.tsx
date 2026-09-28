import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CATALOG } from "@/lib/catalog";
import { POSITION_IMAGE_SIZE } from "@/lib/site-images";

// Unknown slugs 404 (Next logs a harmless NoFallbackError for each).
export const dynamicParams = false;

export const generateStaticParams = () =>
  CATALOG.map((p) => ({ slug: p.slug }));

async function find(params: PageProps<"/positions/catalog/[slug]">["params"]) {
  const { slug } = await params;
  const index = CATALOG.findIndex((p) => p.slug === slug);
  if (index < 0) notFound();
  return { index, position: CATALOG[index] };
}

export async function generateMetadata({
  params,
}: PageProps<"/positions/catalog/[slug]">): Promise<Metadata> {
  const { position } = await find(params);
  return {
    title: `${position.name} — موسوعة الوضعيات`,
    description: position.description,
    alternates: { canonical: `/positions/catalog/${position.slug}` },
  };
}

export default async function CatalogPositionPage({
  params,
}: PageProps<"/positions/catalog/[slug]">) {
  const { index, position } = await find(params);
  const prev = CATALOG[index - 1];
  const next = CATALOG[index + 1];

  return (
    <article className="wrap pos-detail">
      <Link className="back-link" href="/positions/catalog">
        <span aria-hidden="true">→</span> موسوعة الوضعيات
      </Link>
      <div className="pos-detail-grid">
        {position.image ? (
          <div className="pos-figure">
            <Image
              src={position.image}
              alt={`رسم توضيحي لوضعية ${position.name}.`}
              {...POSITION_IMAGE_SIZE}
              sizes="(max-width: 720px) 100vw, 45vw"
              loading="eager"
            />
          </div>
        ) : (
          <span className="catalog-blank" aria-hidden="true">
            ✦
          </span>
        )}

        <div className="pos-body">
          <h1>{position.name}</h1>
          <p className="catalog-en" lang="en">
            {position.name_en}
          </p>
          <p className="pos-summary">{position.description}</p>

          {position.variations.length > 0 && (
            <>
              <h2>التنويعات</h2>
              <ul className="catalog-variations">
                {position.variations.map((v) => (
                  <li key={v.name_en}>
                    <h3>{v.name}</h3>
                    <p className="catalog-var">{v.description}</p>
                  </li>
                ))}
              </ul>
            </>
          )}

          <h2>الراحة والسلامة</h2>
          <ul className="pos-care">
            <li>اتفقا على كلمة للتوقف قبل أن تبدآ، وأي ألم يعني التوقف.</li>
            <li>المزلّق والوسائد يسهّلان معظم الوضعيات ويريحان المفاصل.</li>
            <li>إن أجهدت الوضعية الركبتين أو الظهر، جرّبا تنويعًا أخف.</li>
          </ul>

          <p className="catalog-source">
            الاسم والوصف مترجمان عن{" "}
            <a href={position.url} rel="noopener" target="_blank">
              educacionsexual.org
            </a>
            .
          </p>

          <div className="guides-pager">
            {prev && (
              <Link href={`/positions/catalog/${prev.slug}`} rel="prev">
                <small>السابقة</small>
                {prev.name}
              </Link>
            )}
            {next && (
              <Link href={`/positions/catalog/${next.slug}`} rel="next">
                <small>التالية</small>
                {next.name}
              </Link>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
