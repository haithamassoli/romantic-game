import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ViewTransition } from "react";
import { AUDIENCE, SECTIONS, sectionBySlug } from "@/lib/guides";

// Unknown slugs 404 (Next logs a harmless NoFallbackError for each).
export const dynamicParams = false;

export const generateStaticParams = () =>
  SECTIONS.flatMap((s) =>
    s.guides.map((g) => ({ section: s.slug, guide: g.id })),
  );

async function find(params: PageProps<"/guides/[section]/[guide]">["params"]) {
  const { section: slug, guide: id } = await params;
  const section = sectionBySlug(slug);
  const index = section?.guides.findIndex((g) => g.id === id) ?? -1;
  if (!section || index < 0) notFound();
  return { section, index, guide: section.guides[index] };
}

export async function generateMetadata({
  params,
}: PageProps<"/guides/[section]/[guide]">): Promise<Metadata> {
  const { section, guide } = await find(params);
  return {
    title: `${guide.title_ar} — ${section.title}`,
    description: guide.summary_ar,
    alternates: { canonical: `/guides/${section.slug}/${guide.id}` },
  };
}

export default async function GuidePage({
  params,
}: PageProps<"/guides/[section]/[guide]">) {
  const { section, index, guide } = await find(params);
  const prev = section.guides[index - 1];
  const next = section.guides[index + 1];
  const { source } = guide;

  return (
    <article className="wrap guides-article">
      <Link className="back-link" href={`/guides/${section.slug}`}>
        <span aria-hidden="true">→</span> {section.title}
      </Link>
      <p className="guides-meta">
        <span className="guides-tag">{AUDIENCE[guide.audience]}</span>
        <span className="guides-tag">
          {index + 1} من {section.guides.length}
        </span>
      </p>
      <ViewTransition
        name={`guide-${section.slug}-${guide.id}`}
        share="morph"
        default="none"
      >
        <h1>{guide.title_ar}</h1>
      </ViewTransition>
      <p className="guides-lead">{guide.summary_ar}</p>

      {guide.sections_ar?.map((s) => (
        <section key={s.heading_ar}>
          <h2>{s.heading_ar}</h2>
          <p>{s.text_ar}</p>
        </section>
      ))}

      <h2>خلاصة عملية</h2>
      <ul className="pos-care">
        {guide.points_ar.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>

      <aside className="guides-source" aria-label="المصدر والترخيص">
        <h2>المصدر</h2>
        <dl>
          <dt>العمل</dt>
          <dd>
            <a href={source.url} rel="noopener" target="_blank">
              <bdi>{source.title_en}</bdi>
            </a>
          </dd>
          <dt>المؤلف والناشر</dt>
          <dd>
            <bdi>
              {source.author === source.publisher
                ? source.author
                : `${source.author}, ${source.publisher}`}
            </bdi>
          </dd>
          <dt>الترخيص</dt>
          <dd>
            <a href={source.license_url} rel="noopener license" target="_blank">
              <bdi>{source.license}</bdi>
            </a>
          </dd>
        </dl>
        <p>{source.attribution}</p>
      </aside>

      <div className="guides-pager">
        {prev && (
          <Link href={`/guides/${section.slug}/${prev.id}`} rel="prev">
            <small>السابق</small>
            {prev.title_ar}
          </Link>
        )}
        {next && (
          <Link href={`/guides/${section.slug}/${next.id}`} rel="next">
            <small>التالي</small>
            {next.title_ar}
          </Link>
        )}
      </div>
    </article>
  );
}
