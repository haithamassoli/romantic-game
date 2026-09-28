import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ViewTransition } from "react";
import { ILLUSTRATED } from "@/lib/illustrated";
import { POSITION_IMAGE_SIZE } from "@/lib/site-images";
import { CONSTRAINTS, DIFFICULTY } from "@/lib/tags";

export const dynamicParams = false;

export const generateStaticParams = () =>
  ILLUSTRATED.map((p) => ({ slug: p.slug }));

async function find(
  params: PageProps<"/positions/illustrated/[slug]">["params"],
) {
  const { slug } = await params;
  const index = ILLUSTRATED.findIndex((p) => p.slug === slug);
  if (index < 0) notFound();
  return { index, position: ILLUSTRATED[index] };
}

export async function generateMetadata({
  params,
}: PageProps<"/positions/illustrated/[slug]">): Promise<Metadata> {
  const { position } = await find(params);
  return {
    title: `${position.name} — وضعيات مصوّرة`,
    description: position.summary,
    alternates: { canonical: `/positions/illustrated/${position.slug}` },
  };
}

export default async function IllustratedPositionPage({
  params,
}: PageProps<"/positions/illustrated/[slug]">) {
  const { index, position } = await find(params);
  const prev = ILLUSTRATED[index - 1];
  const next = ILLUSTRATED[index + 1];

  return (
    <article className="wrap pos-detail">
      <Link className="back-link" href="/positions/illustrated">
        <span aria-hidden="true">→</span> وضعيات مصوّرة
      </Link>
      <div className="pos-detail-grid">
        <ViewTransition
          name={`cat-img-${position.slug}`}
          share="morph"
          default="none"
        >
          <div className="pos-figure">
            <Image
              src={position.imageUrl}
              alt={position.imageAlt}
              {...POSITION_IMAGE_SIZE}
              sizes="(max-width: 720px) 100vw, 45vw"
              loading="eager"
              unoptimized
            />
          </div>
        </ViewTransition>

        <div className="pos-body">
          <ViewTransition
            name={`cat-title-${position.slug}`}
            share="morph"
            default="none"
          >
            <h1>{position.name}</h1>
          </ViewTransition>
          <p className="catalog-en" lang="en">
            {position.englishName}
          </p>
          <p className="pos-summary">{position.summary}</p>
          <dl className="pos-facts">
            <div>
              <dt>الصعوبة</dt>
              <dd>{DIFFICULTY[position.difficulty]}</dd>
            </div>
            <div>
              <dt>تُجهد</dt>
              <dd>
                {position.constraints.map((c) => CONSTRAINTS[c]).join("، ") ||
                  "لا جهد خاص"}
              </dd>
            </div>
          </dl>

          <p>{position.description}</p>

          <h2>الخطوات</h2>
          <ol className="pos-steps">
            {position.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>

          <h2>الراحة والسلامة</h2>
          <ul className="pos-care">
            {position.care.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>

          <p className="catalog-source">
            الرسم من{" "}
            <a href={position.sourceUrl} rel="noopener" target="_blank">
              {new URL(position.sourceUrl).hostname.replace(/^www\./, "")}
            </a>
            .
          </p>

          <div className="guides-pager">
            {prev && (
              <Link href={`/positions/illustrated/${prev.slug}`} rel="prev">
                <small>السابقة</small>
                {prev.name}
              </Link>
            )}
            {next && (
              <Link href={`/positions/illustrated/${next.slug}`} rel="next">
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
