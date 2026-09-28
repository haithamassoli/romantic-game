import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AUDIENCE,
  type Guide,
  guidesLabel,
  SECTIONS,
  sectionBySlug,
} from "@/lib/guides";

// Unknown slugs 404 (Next logs a harmless NoFallbackError for each).
export const dynamicParams = false;

export const generateStaticParams = () =>
  SECTIONS.map((s) => ({ section: s.slug }));

export async function generateMetadata({
  params,
}: PageProps<"/guides/[section]">): Promise<Metadata> {
  const section = sectionBySlug((await params).section);
  return {
    title: `${section?.title} — مكتبة الأدلة`,
    description: section?.blurb,
    alternates: { canonical: `/guides/${section?.slug}` },
  };
}

const AUDIENCES = Object.keys(AUDIENCE) as Guide["audience"][];

export default async function SectionPage({
  params,
}: PageProps<"/guides/[section]">) {
  const section = sectionBySlug((await params).section);
  if (!section) notFound();

  return (
    <>
      <section className="wrap pos-intro" aria-labelledby="section-title">
        <Link className="back-link" href="/guides">
          <span aria-hidden="true">→</span> كل الأقسام
        </Link>
        <h1 id="section-title">{section.title}</h1>
        <p>{section.blurb}</p>
      </section>

      <nav className="wrap guides-tabs" aria-label="الأقسام">
        {SECTIONS.map((s) => (
          <Link
            key={s.slug}
            href={`/guides/${s.slug}`}
            aria-current={s.slug === section.slug ? "page" : undefined}
          >
            {s.title}
          </Link>
        ))}
      </nav>

      <div className="wrap guides-body">
        <p className="pos-count">{guidesLabel(section.guides.length)}</p>
        {AUDIENCES.map((audience) => {
          const guides = section.guides.filter((g) => g.audience === audience);
          if (guides.length === 0) return null;
          return (
            <section key={audience} aria-labelledby={`aud-${audience}`}>
              <h2 id={`aud-${audience}`} className="guides-group">
                {AUDIENCE[audience]}
              </h2>
              <ul className="guides-list">
                {guides.map((g) => (
                  <li key={g.id}>
                    <Link href={`/guides/${section.slug}/${g.id}`}>
                      <h3>{g.title_ar}</h3>
                      <p>{g.summary_ar}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}
